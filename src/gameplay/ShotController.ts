import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GameState, GameStateManager } from '../utils/GameStateManager';
import { EventSystem, GameEvents } from '../utils/EventSystem';

/**
 * Enum for different shot types
 */
export enum ShotType {
  GROUNDER = 'GROUNDER', // Ball rolls along the ground (like Kirby's Dream Course)
  FLY = 'FLY'            // Ball follows an arc trajectory (like Kirby's Dream Course)
}

/**
 * Enum for spin types
 */
export enum SpinType {
  NONE = 'NONE',      // No spin
  LEFT = 'LEFT',      // Left horizontal spin
  RIGHT = 'RIGHT',    // Right horizontal spin
  TOP = 'TOP',        // Top spin (for FLY shots)
  BACK = 'BACK'       // Back spin (for FLY shots)
}

/**
 * Interface for shot options
 */
interface ShotOptions {
  power?: number;
  angle?: number;
  shotType?: ShotType;
  spinType?: SpinType;
  spinIntensity?: number;
}

/**
 * ShotController - Handles player shot mechanics
 */
export class ShotController {
  private scene: THREE.Scene;
  private ballBody: RAPIER.RigidBody;
  private world: RAPIER.World;
  private shotType: ShotType = ShotType.GROUNDER;
  private spinType: SpinType = SpinType.NONE;
  private power: number = 0;
  private angle: number = 0;
  private spinIntensity: number = 0;
  private powerCharging: boolean = false;
  private gameStateManager: GameStateManager;
  private eventSystem: EventSystem;
  
  // Shot parameters
  private maxPower: number = 30;
  private minPower: number = 5;
  private aimSensitivity: number = 0.05;
  private powerChargeRate: number = 0.4; // How fast power increases per second
  private groundShotHeight: number = 0.1;
  private flyShotHeight: number = 6.0;
  
  // Aiming arrow (for visualization)
  private aimArrow: THREE.ArrowHelper;
  private aimArrowLength: number = 3;
  private aimArrowColor: number = 0xff0000;
  private powerBarElement: HTMLElement | null = null;
  
  /**
   * Constructor
   */
  constructor(
    scene: THREE.Scene, 
    ballBody: RAPIER.RigidBody, 
    world: RAPIER.World
  ) {
    this.scene = scene;
    this.ballBody = ballBody;
    this.world = world;
    this.gameStateManager = GameStateManager.getInstance();
    this.eventSystem = EventSystem.getInstance();
    
    // Create aim arrow
    this.aimArrow = this.createAimArrow();
    this.scene.add(this.aimArrow);
    
    // Get power bar element
    this.powerBarElement = document.getElementById('power-bar');
    
    // Initialize input handling
    this.setupEventListeners();
  }
  
  /**
   * Create arrow helper for aiming visualization
   */
  private createAimArrow(): THREE.ArrowHelper {
    const origin = new THREE.Vector3(0, 0.1, 0);
    const direction = new THREE.Vector3(1, 0, 0);
    const arrow = new THREE.ArrowHelper(
      direction.normalize(),
      origin,
      this.aimArrowLength,
      this.aimArrowColor,
      0.5, // Head length
      0.3  // Head width
    );
    
    arrow.visible = false;
    return arrow;
  }
  
  /**
   * Set up event listeners for event system
   */
  private setupEventListeners(): void {
    // Listen for aiming events
    this.eventSystem.on(GameEvents.SHOT_AIM, this.handleAim.bind(this));
    
    // Listen for power change events
    this.eventSystem.on(GameEvents.SHOT_POWER_CHANGE, this.handlePowerChange.bind(this));
    
    // Listen for shot execution events
    this.eventSystem.on(GameEvents.SHOT_EXECUTE, this.handleShotExecute.bind(this));
    
    // Listen for shot cancel events
    this.eventSystem.on(GameEvents.SHOT_CANCEL, this.handleShotCancel.bind(this));
    
    // Listen for game state changes to show/hide arrow
    this.gameStateManager.onEnterState(GameState.AIMING, () => {
      this.startAiming();
    });
    
    this.gameStateManager.onExitState(GameState.AIMING, () => {
      this.stopAiming();
    });
    
    console.log('ShotController event listeners set up');
  }
  
  /**
   * Handle aiming input
   */
  private handleAim(direction: number): void {
    // Only handle aiming in aiming state
    if (!this.gameStateManager.isState(GameState.AIMING)) {
      // If in IDLE state, transition to AIMING
      if (this.gameStateManager.isState(GameState.IDLE)) {
        this.gameStateManager.setState(GameState.AIMING);
      } else {
        return;
      }
    }
    
    // Update angle based on direction (-1 for left, 1 for right)
    this.angle += direction * this.aimSensitivity;
    
    // Keep angle between 0 and 2π
    this.angle = (this.angle + Math.PI * 2) % (Math.PI * 2);
    
    // Update aim arrow
    this.updateAimArrow();
    
    // Debug output
    console.log(`Aiming: ${this.angle.toFixed(2)} radians`);
  }
  
  /**
   * Handle power change input
   */
  private handlePowerChange(value: number): void {
    // Only handle power in aiming state
    if (!this.gameStateManager.isState(GameState.AIMING)) {
      return;
    }
    
    if (value === 0) {
      // Start charging
      this.powerCharging = true;
      this.power = this.minPower / this.maxPower; // Start at minimum power
      
      // Change state to CHARGING
      this.gameStateManager.setState(GameState.CHARGING);
    } else {
      // Increment power
      this.power = Math.min(1, this.power + value);
    }
    
    // Update UI
    this.updatePowerUI();
    
    // Update aim arrow length
    this.updateAimArrow();
  }
  
  /**
   * Handle shot execution input
   */
  private handleShotExecute(): void {
    // Only execute shot in aiming or charging state
    if (!(this.gameStateManager.isState(GameState.AIMING) || 
          this.gameStateManager.isState(GameState.CHARGING))) {
      return;
    }
    
    // Stop charging
    this.powerCharging = false;
    
    // Execute the shot
    this.executeShot();
    
    // Change state to ROLLING
    this.gameStateManager.setState(GameState.ROLLING);
  }
  
  /**
   * Handle shot cancel input
   */
  private handleShotCancel(): void {
    // Only cancel in aiming or charging state
    if (!(this.gameStateManager.isState(GameState.AIMING) || 
          this.gameStateManager.isState(GameState.CHARGING))) {
      return;
    }
    
    // Stop charging
    this.powerCharging = false;
    
    // Reset power
    this.power = 0;
    
    // Update UI
    this.updatePowerUI();
    
    // Change state to IDLE
    this.gameStateManager.setState(GameState.IDLE);
  }
  
  /**
   * Enter aiming mode
   */
  public startAiming(): void {
    // Reset shot parameters
    this.power = 0;
    
    // Update UI
    this.updatePowerUI();
    
    // Make aim arrow visible
    this.updateAimArrow();
    this.aimArrow.visible = true;
    
    console.log('Started aiming mode');
  }
  
  /**
   * Exit aiming mode
   */
  public stopAiming(): void {
    // Hide aim arrow
    this.aimArrow.visible = false;
    
    // Stop charging if we were
    this.powerCharging = false;
    
    console.log('Stopped aiming mode');
  }
  
  /**
   * Update aim arrow position and rotation
   */
  private updateAimArrow(): void {
    // Get ball position
    const ballPosition = this.ballBody.translation();
    const arrowPosition = new THREE.Vector3(
      ballPosition.x, 
      ballPosition.y + 0.1, // Slightly above ball
      ballPosition.z
    );
    
    // Set arrow position
    this.aimArrow.position.copy(arrowPosition);
    
    // Set arrow direction based on angle
    const direction = new THREE.Vector3(
      Math.cos(this.angle),
      0,
      Math.sin(this.angle)
    );
    
    // Set arrow direction
    this.aimArrow.setDirection(direction.normalize());
    
    // Set arrow length based on power
    const length = Math.max(0.5, this.power * this.aimArrowLength);
    this.aimArrow.setLength(length, 0.5, 0.3);
  }
  
  /**
   * Update power UI element (if it exists)
   */
  private updatePowerUI(): void {
    if (this.powerBarElement) {
      const powerPercent = this.power * 100;
      this.powerBarElement.style.width = `${powerPercent}%`;
      
      // Change color based on power
      if (powerPercent < 33) {
        this.powerBarElement.style.backgroundColor = '#00aa00'; // Green
      } else if (powerPercent < 66) {
        this.powerBarElement.style.backgroundColor = '#aaaa00'; // Yellow
      } else {
        this.powerBarElement.style.backgroundColor = '#aa0000'; // Red
      }
    }
  }
  
  /**
   * Set aim angle in radians
   */
  public setAngle(angle: number): void {
    this.angle = angle;
    if (this.aimArrow.visible) {
      this.updateAimArrow();
    }
  }
  
  /**
   * Set shot power (0-1 range)
   */
  public setPower(power: number): void {
    // Clamp power between 0 and 1
    this.power = Math.max(0, Math.min(1, power));
    
    if (this.aimArrow.visible) {
      this.updateAimArrow();
    }
    
    // Update UI
    this.updatePowerUI();
  }
  
  /**
   * Set shot type
   */
  public setShotType(type: ShotType): void {
    this.shotType = type;
  }
  
  /**
   * Set spin type
   */
  public setSpinType(type: SpinType, intensity: number = 0.5): void {
    this.spinType = type;
    // Clamp intensity between 0 and 1
    this.spinIntensity = Math.max(0, Math.min(1, intensity));
  }
  
  /**
   * Execute shot with current parameters
   */
  public executeShot(): void {
    // Hide aiming arrow
    this.aimArrow.visible = false;
    
    // Calculate shot direction
    const direction = new THREE.Vector3(
      Math.cos(this.angle),
      0,
      Math.sin(this.angle)
    );
    
    // Calculate shot power and height based on shot type
    let shotHeight = this.groundShotHeight;
    if (this.shotType === ShotType.FLY) {
      shotHeight = this.flyShotHeight;
    }
    
    // Calculate shot vector
    const shotPower = this.minPower + (this.maxPower - this.minPower) * this.power;
    const shotVector = new THREE.Vector3(
      direction.x * shotPower,
      shotHeight * this.power, // Scale height with power
      direction.z * shotPower
    );
    
    // Apply impulse to ball
    this.ballBody.applyImpulse(
      { x: shotVector.x, y: shotVector.y, z: shotVector.z }, 
      true
    );
    
    // Apply spin based on spin type
    if (this.spinType !== SpinType.NONE) {
      this.applySpinToShot(direction);
    }
    
    // Reset shot parameters
    this.power = 0;
    this.updatePowerUI();
    
    console.log(`Shot executed: Power=${shotPower.toFixed(2)}, Angle=${this.angle.toFixed(2)}`);
  }
  
  /**
   * Apply appropriate spin force based on spin type
   */
  private applySpinToShot(direction: THREE.Vector3): void {
    // Calculate spin force based on spin type and intensity
    const spinForce = new THREE.Vector3();
    const spinStrength = 2.0 * this.spinIntensity;
    
    switch (this.spinType) {
      case SpinType.LEFT:
        // Spin around y-axis (left spin)
        spinForce.set(0, spinStrength, 0);
        break;
        
      case SpinType.RIGHT:
        // Spin around y-axis (right spin)
        spinForce.set(0, -spinStrength, 0);
        break;
        
      case SpinType.TOP:
        // Top spin (affects fly shots)
        // Calculate perpendicular vector to direction on xz plane
        const perpVector = new THREE.Vector3(-direction.z, 0, direction.x);
        spinForce.copy(perpVector).multiplyScalar(spinStrength);
        break;
        
      case SpinType.BACK:
        // Back spin (affects fly shots)
        const perpVectorBack = new THREE.Vector3(-direction.z, 0, direction.x);
        spinForce.copy(perpVectorBack).multiplyScalar(-spinStrength);
        break;
        
      default:
        // No spin
        return;
    }
    
    // Apply torque impulse for spin
    this.ballBody.applyTorqueImpulse(
      { x: spinForce.x, y: spinForce.y, z: spinForce.z },
      true
    );
  }
  
  /**
   * Update method called once per frame
   */
  public update(deltaTime: number): void {
    // Update power while charging
    if (this.powerCharging) {
      // Increment power based on time
      this.power = Math.min(1, this.power + this.powerChargeRate * deltaTime);
      
      // Update UI
      this.updatePowerUI();
      
      // Update aim arrow
      this.updateAimArrow();
    }
    
    // Update position of aim arrow if visible
    if (this.aimArrow.visible) {
      const ballPosition = this.ballBody.translation();
      this.aimArrow.position.set(
        ballPosition.x,
        ballPosition.y + 0.1,
        ballPosition.z
      );
    }
  }
  
  /**
   * Fire a shot with the given options
   */
  public fireShot(options: ShotOptions = {}): void {
    // Set options if provided
    if (options.angle !== undefined) {
      this.setAngle(options.angle);
    }
    
    if (options.power !== undefined) {
      this.setPower(options.power);
    }
    
    if (options.shotType !== undefined) {
      this.setShotType(options.shotType);
    }
    
    if (options.spinType !== undefined) {
      this.setSpinType(options.spinType, options.spinIntensity);
    }
    
    // Enter aiming state
    this.gameStateManager.setState(GameState.AIMING);
    
    // Execute shot
    this.executeShot();
    
    // Transition to rolling state
    this.gameStateManager.setState(GameState.ROLLING);
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    // Remove aim arrow from scene
    if (this.aimArrow && this.aimArrow.parent) {
      this.aimArrow.parent.remove(this.aimArrow);
    }
    
    // Remove event listeners
    this.eventSystem.off(GameEvents.SHOT_AIM, this.handleAim.bind(this));
    this.eventSystem.off(GameEvents.SHOT_POWER_CHANGE, this.handlePowerChange.bind(this));
    this.eventSystem.off(GameEvents.SHOT_EXECUTE, this.handleShotExecute.bind(this));
    this.eventSystem.off(GameEvents.SHOT_CANCEL, this.handleShotCancel.bind(this));
  }
} 