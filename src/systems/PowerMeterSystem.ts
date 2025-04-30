import * as THREE from 'three';
import { ShotState, ShotStateMachine } from './ShotSystem';

/**
 * Enum for the different states of the power meter
 */
export enum PowerMeterState {
  IDLE = 'idle',           // Meter is not active
  INCREASING = 'increasing', // Meter is filling up
  DECREASING = 'decreasing', // Meter is emptying
  SELECTED = 'selected'    // Power has been selected
}

/**
 * System to handle power selection for shots with a visual meter
 */
export class PowerMeterSystem {
  // Reference to the scene for adding visual elements
  private scene: THREE.Scene;
  
  // Reference to the shot system
  private shotSystem: ShotStateMachine;
  
  // Container for all power meter visuals
  private container: THREE.Group;
  
  // Visual elements
  private meterBackground!: THREE.Mesh;
  private meterFill!: THREE.Mesh;
  private meterFrame!: THREE.LineSegments;
  
  // State and animation parameters
  private state: PowerMeterState = PowerMeterState.IDLE;
  private currentPower: number = 0; // 0.0 to 1.0
  private fillSpeed: number = 0.8; // How fast the meter fills (units per second)
  private oscillationTime: number = 2; // Time for a complete fill-empty cycle (seconds)
  private autoOscillate: boolean = true; // Whether the meter automatically oscillates
  
  // Animation timing
  private animationTime: number = 0;
  
  // Positioning and sizing
  private readonly METER_WIDTH: number = 4;
  private readonly METER_HEIGHT: number = 0.4;
  private readonly METER_DEPTH: number = 0.1;
  private readonly METER_POSITION_Y: number = 2; // Height above the ground
  
  // Appearance settings
  private readonly BACKGROUND_COLOR: number = 0x333333;
  private readonly FILL_COLOR: number = 0xff3333;
  private readonly FRAME_COLOR: number = 0xffffff;
  private readonly OPTIMAL_ZONE_COLOR: number = 0x00ff00;
  
  // Visual feedback settings
  private readonly OPTIMAL_POWER_MIN: number = 0.7;
  private readonly OPTIMAL_POWER_MAX: number = 0.9;
  
  // Animation settings for selection feedback
  private pulseAnimation: boolean = false;
  private pulseSpeed: number = 10;
  private pulseIntensity: number = 0.3;
  private pulseTime: number = 0;
  
  /**
   * Create a new PowerMeterSystem
   * @param scene The THREE.js scene
   * @param shotSystem The shot state machine
   */
  constructor(scene: THREE.Scene, shotSystem: ShotStateMachine) {
    this.scene = scene;
    this.shotSystem = shotSystem;
    
    // Create container for all meter visuals
    this.container = new THREE.Group();
    this.container.visible = false;
    this.scene.add(this.container);
    
    // Register a listener for the shot system state changes
    this.shotSystem.addStateChangeListener(this.handleShotStateChange.bind(this));
    
    // Create visual elements
    this.createMeterVisuals();
    
    // Set up event listeners for input
    this.setupEventListeners();
  }
  
  /**
   * Create the visual elements for the power meter
   */
  private createMeterVisuals(): void {
    // Create meter background (empty meter)
    const backgroundGeometry = new THREE.BoxGeometry(
      this.METER_WIDTH, 
      this.METER_HEIGHT, 
      this.METER_DEPTH
    );
    const backgroundMaterial = new THREE.MeshBasicMaterial({
      color: this.BACKGROUND_COLOR,
      transparent: true,
      opacity: 0.7
    });
    this.meterBackground = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    this.container.add(this.meterBackground);
    
    // Create meter fill (power indicator)
    const fillGeometry = new THREE.BoxGeometry(
      0.01, // Start with minimal width, will be scaled
      this.METER_HEIGHT * 0.8, // Slightly smaller than background
      this.METER_DEPTH * 1.1 // Slightly deeper to avoid z-fighting
    );
    
    // Use a gradient texture for the fill to indicate power levels
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: this.FILL_COLOR,
      transparent: true,
      opacity: 0.9
    });
    
    this.meterFill = new THREE.Mesh(fillGeometry, fillMaterial);
    this.meterFill.position.x = -this.METER_WIDTH / 2; // Start at left edge
    this.container.add(this.meterFill);
    
    // Create a frame/border for the meter
    const frameGeometry = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(
        this.METER_WIDTH * 1.02, // Slightly larger than background
        this.METER_HEIGHT * 1.02,
        this.METER_DEPTH * 1.05
      )
    );
    const frameMaterial = new THREE.LineBasicMaterial({
      color: this.FRAME_COLOR,
      linewidth: 2 // Note: linewidth only works in WebGLRenderer2
    });
    this.meterFrame = new THREE.LineSegments(frameGeometry, frameMaterial);
    this.container.add(this.meterFrame);
    
    // Add optimal zone indicator
    this.addOptimalZoneIndicator();
    
    // Position the container
    this.container.position.set(0, this.METER_POSITION_Y, 0);
  }
  
  /**
   * Add visual indicator for the optimal power zone
   */
  private addOptimalZoneIndicator(): void {
    // Create a visual indicator for the optimal power zone
    const optimalWidth = (this.OPTIMAL_POWER_MAX - this.OPTIMAL_POWER_MIN) * this.METER_WIDTH;
    const optimalGeometry = new THREE.BoxGeometry(
      optimalWidth,
      this.METER_HEIGHT * 0.2, // Thinner than the fill
      this.METER_DEPTH * 1.2 // Slightly deeper to be visible
    );
    
    const optimalMaterial = new THREE.MeshBasicMaterial({
      color: this.OPTIMAL_ZONE_COLOR,
      transparent: true,
      opacity: 0.5
    });
    
    const optimalZone = new THREE.Mesh(optimalGeometry, optimalMaterial);
    
    // Position at the correct spot along the meter (based on OPTIMAL_POWER_MIN)
    const optimalXPosition = 
      -this.METER_WIDTH / 2 + // Start position (left edge)
      this.OPTIMAL_POWER_MIN * this.METER_WIDTH + // Offset by min optimal percentage
      optimalWidth / 2; // Center within the optimal zone
    
    optimalZone.position.set(
      optimalXPosition,
      -this.METER_HEIGHT * 0.4, // Position above or below the meter
      0
    );
    
    this.container.add(optimalZone);
  }
  
  /**
   * Set up event listeners for user input
   */
  private setupEventListeners(): void {
    // Space bar, mouse click or touch for power selection
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('mousedown', this.handleMouseDown.bind(this));
    window.addEventListener('touchstart', this.handleTouchStart.bind(this));
  }
  
  /**
   * Handle shot state changes to show/hide power meter
   */
  private handleShotStateChange(prevState: ShotState, newState: ShotState): void {
    if (newState === ShotState.POWER) {
      this.startPowerSelection();
    } else if (prevState === ShotState.POWER) {
      this.stopPowerSelection();
    }
  }
  
  /**
   * Start the power selection mode
   */
  public startPowerSelection(): void {
    // Reset power and animation state
    this.currentPower = 0;
    this.animationTime = 0;
    this.pulseAnimation = false;
    
    // Set initial state
    this.state = this.autoOscillate ? PowerMeterState.INCREASING : PowerMeterState.IDLE;
    
    // Show power meter
    this.container.visible = true;
    
    // Ensure meter is at the starting position
    this.updateMeterFill(0);
    
    console.log('Power selection started');
  }
  
  /**
   * Stop the power selection mode
   */
  public stopPowerSelection(): void {
    // Hide power meter
    this.container.visible = false;
    
    // Reset to idle state
    this.state = PowerMeterState.IDLE;
    
    console.log('Power selection stopped');
  }
  
  /**
   * Select the current power level
   */
  public selectPower(): void {
    if (this.state === PowerMeterState.IDLE || this.state === PowerMeterState.SELECTED) {
      return;
    }
    
    // Stop the animation
    this.state = PowerMeterState.SELECTED;
    
    // Start pulse animation for visual feedback
    this.pulseAnimation = true;
    this.pulseTime = 0;
    
    // Pass power to shot system
    this.shotSystem.setPowerAndContinue(this.currentPower);
    
    console.log('Power selected:', this.currentPower);
  }
  
  /**
   * Handle keyboard events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Only process if in power selection mode
    if (!this.container.visible || this.shotSystem.getState() !== ShotState.POWER) {
      return;
    }
    
    switch (event.key) {
      case ' ': // Space bar
        // Select current power
        this.selectPower();
        break;
    }
  }
  
  /**
   * Handle mouse click events
   */
  private handleMouseDown(): void {
    // Only process if in power selection mode
    if (!this.container.visible || this.shotSystem.getState() !== ShotState.POWER) {
      return;
    }
    
    this.selectPower();
  }
  
  /**
   * Handle touch events for mobile devices
   */
  private handleTouchStart(): void {
    // Only process if in power selection mode
    if (!this.container.visible || this.shotSystem.getState() !== ShotState.POWER) {
      return;
    }
    
    this.selectPower();
  }
  
  /**
   * Update the power meter fill based on current power
   * @param power The power level (0-1)
   */
  private updateMeterFill(power: number): void {
    // Clamp power to 0-1 range
    const clampedPower = Math.max(0, Math.min(1, power));
    
    // Determine fill width based on power
    const fillWidth = clampedPower * this.METER_WIDTH;
    
    // Update scale to match the power level
    this.meterFill.scale.x = fillWidth;
    
    // Update position to grow from left to right
    const fillHalfWidth = fillWidth / 2;
    const leftEdge = -this.METER_WIDTH / 2;
    this.meterFill.position.x = leftEdge + fillHalfWidth;
    
    // Update color based on power level (optional)
    this.updateFillColor(clampedPower);
  }
  
  /**
   * Update the fill color based on power level
   * @param power The power level (0-1)
   */
  private updateFillColor(power: number): void {
    // Optional: Change color based on power level
    // For example, green for optimal, yellow for medium, red for too high
    let color: number;
    
    if (power >= this.OPTIMAL_POWER_MIN && power <= this.OPTIMAL_POWER_MAX) {
      // In the optimal zone - green
      color = 0x00ff00;
    } else if (power < this.OPTIMAL_POWER_MIN) {
      // Low power - interpolate between red and yellow
      const t = power / this.OPTIMAL_POWER_MIN;
      color = this.lerpColor(0xff0000, 0xffff00, t);
    } else {
      // High power - interpolate between yellow and red
      const t = (power - this.OPTIMAL_POWER_MAX) / (1 - this.OPTIMAL_POWER_MAX);
      color = this.lerpColor(0xffff00, 0xff0000, t);
    }
    
    // Only update if material exists
    if (this.meterFill.material instanceof THREE.MeshBasicMaterial) {
      this.meterFill.material.color.setHex(color);
    }
  }
  
  /**
   * Linearly interpolate between two colors
   * @param color1 First color as hex
   * @param color2 Second color as hex
   * @param t Interpolation factor (0-1)
   * @returns Interpolated color as hex
   */
  private lerpColor(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 255;
    const g1 = (color1 >> 8) & 255;
    const b1 = color1 & 255;
    
    const r2 = (color2 >> 16) & 255;
    const g2 = (color2 >> 8) & 255;
    const b2 = color2 & 255;
    
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    return (r << 16) | (g << 8) | b;
  }
  
  /**
   * Position the power meter relative to the camera or a target object
   * @param position The position to place the meter
   * @param lookAt Optional object or position for the meter to face
   */
  public positionMeter(position: THREE.Vector3, lookAt?: THREE.Vector3 | THREE.Object3D): void {
    this.container.position.copy(position);
    
    if (lookAt) {
      if (lookAt instanceof THREE.Vector3) {
        this.container.lookAt(lookAt);
      } else {
        this.container.lookAt(lookAt.position);
      }
    }
  }
  
  /**
   * Update method to be called every frame
   * @param deltaTime Time since last frame in seconds
   * @param cameraPosition Optional camera position to face the meter towards
   */
  public update(deltaTime: number, cameraPosition?: THREE.Vector3): void {
    if (!this.container.visible) return;
    
    // Always face the camera if position is provided
    if (cameraPosition) {
      this.container.lookAt(cameraPosition);
    }
    
    // Handle different states
    switch (this.state) {
      case PowerMeterState.INCREASING:
        this.updateIncreasing(deltaTime);
        break;
        
      case PowerMeterState.DECREASING:
        this.updateDecreasing(deltaTime);
        break;
        
      case PowerMeterState.SELECTED:
        this.updateSelected(deltaTime);
        break;
    }
    
    // Update the visual element
    this.updateMeterFill(this.currentPower);
  }
  
  /**
   * Update the meter when it's in the increasing state
   * @param deltaTime Time since last frame
   */
  private updateIncreasing(deltaTime: number): void {
    // Update animation time
    this.animationTime += deltaTime;
    
    if (this.autoOscillate) {
      // Oscillate based on time
      const normalizedTime = (this.animationTime % this.oscillationTime) / this.oscillationTime;
      
      if (normalizedTime < 0.5) {
        // First half of cycle: increasing
        this.currentPower = normalizedTime * 2; // Map 0-0.5 to 0-1
      } else {
        // Switch to decreasing phase
        this.state = PowerMeterState.DECREASING;
      }
    } else {
      // Linear increase based on fill speed
      this.currentPower += this.fillSpeed * deltaTime;
      
      // Cap at maximum and switch to decreasing if needed
      if (this.currentPower >= 1.0) {
        this.currentPower = 1.0;
        this.state = PowerMeterState.DECREASING;
      }
    }
  }
  
  /**
   * Update the meter when it's in the decreasing state
   * @param deltaTime Time since last frame
   */
  private updateDecreasing(deltaTime: number): void {
    // Update animation time
    this.animationTime += deltaTime;
    
    if (this.autoOscillate) {
      // Oscillate based on time
      const normalizedTime = (this.animationTime % this.oscillationTime) / this.oscillationTime;
      
      if (normalizedTime >= 0.5) {
        // Second half of cycle: decreasing
        this.currentPower = 1 - ((normalizedTime - 0.5) * 2); // Map 0.5-1 to 1-0
      } else {
        // Switch to increasing phase
        this.state = PowerMeterState.INCREASING;
      }
    } else {
      // Linear decrease based on fill speed
      this.currentPower -= this.fillSpeed * deltaTime;
      
      // Cap at minimum and switch to increasing if needed
      if (this.currentPower <= 0.0) {
        this.currentPower = 0.0;
        this.state = PowerMeterState.INCREASING;
      }
    }
  }
  
  /**
   * Update the meter when the power has been selected
   * @param deltaTime Time since last frame
   */
  private updateSelected(deltaTime: number): void {
    // Handle pulse animation for visual feedback
    if (this.pulseAnimation) {
      this.pulseTime += deltaTime * this.pulseSpeed;
      
      // Pulsing effect on opacity and scale
      const pulseValue = Math.sin(this.pulseTime) * this.pulseIntensity;
      
      // Apply pulse effect
      if (this.meterFill.material instanceof THREE.MeshBasicMaterial) {
        this.meterFill.material.opacity = 0.9 + pulseValue;
      }
      
      // Scale pulse effect
      const scaleMultiplier = 1 + pulseValue;
      this.meterFill.scale.y = scaleMultiplier;
      this.meterFill.scale.z = scaleMultiplier;
      
      // Keep the original x scale based on power
      this.updateMeterFill(this.currentPower);
    }
  }
  
  /**
   * Dispose of resources when no longer needed
   */
  public dispose(): void {
    // Remove event listeners
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    window.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    
    // Remove from scene
    this.scene.remove(this.container);
    
    // Dispose geometries and materials
    this.meterBackground.geometry.dispose();
    if (this.meterBackground.material instanceof THREE.Material) {
      this.meterBackground.material.dispose();
    }
    
    this.meterFill.geometry.dispose();
    if (this.meterFill.material instanceof THREE.Material) {
      this.meterFill.material.dispose();
    }
    
    this.meterFrame.geometry.dispose();
    if (this.meterFrame.material instanceof THREE.Material) {
      this.meterFrame.material.dispose();
    }
    
    // Remove shot system listener
    this.shotSystem.removeStateChangeListener(this.handleShotStateChange.bind(this));
  }
} 