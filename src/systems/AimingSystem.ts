import * as THREE from 'three';
import { ShotState, ShotParameters, ShotStateMachine } from './ShotSystem';
import { Ball } from '../models/Ball';

/**
 * System to handle aiming visualization and input for shots
 */
export class AimingSystem {
  // Reference to the scene for adding visual elements
  private scene: THREE.Scene;
  
  // Reference to the shot system
  private shotSystem: ShotStateMachine;
  
  // Reference to the ball for positioning visuals
  private ball: Ball | null = null;
  
  // Arrow for aim direction visualization
  private aimArrow: THREE.ArrowHelper | null = null;
  
  // Trajectory line for shot preview
  private trajectoryLine: THREE.Line | null = null;
  
  // Current aim angle (in radians, in the XZ plane)
  private currentAngle: number = 0;
  
  // Flag to track if the system is currently in aiming mode
  private isAiming: boolean = false;
  
  // Input tracking
  private inputStartPosition: THREE.Vector2 = new THREE.Vector2();
  private isInputActive: boolean = false;
  
  // Sensitivity for mouse/touch input
  private rotationSensitivity: number = 0.01;
  
  // Arrow appearance settings
  private readonly ARROW_LENGTH: number = 3;
  private readonly ARROW_COLOR: number = 0xffff00;
  private readonly ARROW_HEAD_LENGTH: number = 0.5;
  private readonly ARROW_HEAD_WIDTH: number = 0.3;
  
  // Trajectory appearance settings
  private readonly TRAJECTORY_POINTS: number = 15;
  private readonly TRAJECTORY_COLOR: number = 0x00ff00;
  private readonly TRAJECTORY_MAX_DISTANCE: number = 20;
  
  /**
   * Create a new AimingSystem
   * @param scene The THREE.js scene
   * @param shotSystem The shot state machine 
   * @param ball The ball object
   */
  constructor(scene: THREE.Scene, shotSystem: ShotStateMachine, ball?: Ball) {
    this.scene = scene;
    this.shotSystem = shotSystem;
    
    if (ball) {
      this.setBall(ball);
    }
    
    // Register a listener for the shot system state changes
    this.shotSystem.addStateChangeListener(this.handleShotStateChange.bind(this));
    
    // Create visual elements
    this.createVisuals();
    
    // Set up event listeners for input
    this.setupEventListeners();
  }
  
  /**
   * Set the ball reference
   * @param ball The ball object
   */
  public setBall(ball: Ball): void {
    this.ball = ball;
    this.updateVisualsPosition();
  }
  
  /**
   * Create the visual elements for aiming
   */
  private createVisuals(): void {
    // Create aim arrow
    const arrowDirection = new THREE.Vector3(1, 0, 0).normalize();
    const arrowOrigin = new THREE.Vector3(0, 0, 0);
    
    this.aimArrow = new THREE.ArrowHelper(
      arrowDirection,
      arrowOrigin,
      this.ARROW_LENGTH,
      this.ARROW_COLOR,
      this.ARROW_HEAD_LENGTH,
      this.ARROW_HEAD_WIDTH
    );
    
    // Initialize but don't add to scene yet
    this.aimArrow.visible = false;
    
    // Create trajectory line
    const points = this.generateTrajectoryPoints(this.currentAngle);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: this.TRAJECTORY_COLOR,
      linewidth: 2,
      opacity: 0.7,
      transparent: true
    });
    
    this.trajectoryLine = new THREE.Line(geometry, material);
    this.trajectoryLine.visible = false;
    
    // Add to scene
    this.scene.add(this.aimArrow);
    this.scene.add(this.trajectoryLine);
  }
  
  /**
   * Set up event listeners for user input
   */
  private setupEventListeners(): void {
    // Mouse events
    window.addEventListener('mousedown', this.handleMouseDown.bind(this));
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    window.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Touch events for mobile devices
    window.addEventListener('touchstart', this.handleTouchStart.bind(this));
    window.addEventListener('touchmove', this.handleTouchMove.bind(this));
    window.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Keyboard events
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  /**
   * Handle shot state changes to show/hide aiming visuals
   */
  private handleShotStateChange(prevState: ShotState, newState: ShotState): void {
    if (newState === ShotState.AIMING) {
      this.startAiming();
    } else if (prevState === ShotState.AIMING) {
      this.stopAiming();
    }
  }
  
  /**
   * Start the aiming mode
   */
  public startAiming(): void {
    this.isAiming = true;
    
    // Show aiming visuals
    if (this.aimArrow) {
      this.aimArrow.visible = true;
    }
    
    if (this.trajectoryLine) {
      this.trajectoryLine.visible = true;
    }
    
    // Get the initial angle from the shot system or use default
    const shotParams = this.shotSystem.getShotParameters();
    this.currentAngle = shotParams.angle.x || 0;
    
    // Update visuals with current angle
    this.updateAimRotation(this.currentAngle);
    this.updateVisualsPosition();
    
    console.log('Aiming started with angle:', this.currentAngle);
  }
  
  /**
   * End the aiming mode
   */
  public stopAiming(): void {
    this.isAiming = false;
    
    // Hide aiming visuals
    if (this.aimArrow) {
      this.aimArrow.visible = false;
    }
    
    if (this.trajectoryLine) {
      this.trajectoryLine.visible = false;
    }
    
    // Reset input state
    this.isInputActive = false;
  }
  
  /**
   * Complete the aiming process and move to the next shot phase
   */
  public confirmAim(): void {
    if (!this.isAiming) return;
    
    // Pass the current angle to the shot system
    const angle = new THREE.Vector2(this.currentAngle, 0);
    this.shotSystem.setAngleAndContinue(angle);
    
    console.log('Aim confirmed with angle:', this.currentAngle);
  }
  
  /**
   * Update the rotation of the aiming visuals
   * @param angle The angle in radians
   */
  private updateAimRotation(angle: number): void {
    // Update the current angle
    this.currentAngle = angle;
    
    // Calculate the direction vector from the angle
    const direction = new THREE.Vector3(
      Math.sin(angle),
      0,
      Math.cos(angle)
    ).normalize();
    
    // Update the arrow direction
    if (this.aimArrow) {
      this.aimArrow.setDirection(direction);
    }
    
    // Update the trajectory line
    if (this.trajectoryLine) {
      const points = this.generateTrajectoryPoints(angle);
      const geometry = this.trajectoryLine.geometry;
      
      // Update the points in the existing geometry
      const positionAttribute = geometry.getAttribute('position');
      for (let i = 0; i < points.length; i++) {
        if (i < positionAttribute.count) {
          positionAttribute.setXYZ(i, points[i].x, points[i].y, points[i].z);
        }
      }
      positionAttribute.needsUpdate = true;
    }
  }
  
  /**
   * Update the position of the visuals based on the ball position
   */
  private updateVisualsPosition(): void {
    if (!this.ball) return;
    
    const ballPosition = this.ball.getPosition();
    
    // Position the arrow at the ball
    if (this.aimArrow) {
      // Raise the arrow slightly above the ball to be visible
      const arrowPosition = ballPosition.clone().add(new THREE.Vector3(0, 0.1, 0));
      this.aimArrow.position.copy(arrowPosition);
    }
    
    // Update the trajectory line starting point
    if (this.trajectoryLine) {
      this.updateAimRotation(this.currentAngle); // Regenerate trajectory from new position
    }
  }
  
  /**
   * Generate points for the trajectory line
   * @param angle The aim angle in radians
   * @returns Array of Vector3 points
   */
  private generateTrajectoryPoints(angle: number): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    
    if (!this.ball) {
      return points;
    }
    
    // Get the ball position as the starting point
    const startPosition = this.ball.getPosition().clone();
    startPosition.y += 0.1; // Slight offset to avoid z-fighting with ground
    
    // Calculate the direction vector from the angle
    const direction = new THREE.Vector3(
      Math.sin(angle),
      0,
      Math.cos(angle)
    ).normalize();
    
    // Generate points along the trajectory
    for (let i = 0; i < this.TRAJECTORY_POINTS; i++) {
      const t = (i / (this.TRAJECTORY_POINTS - 1)) * this.TRAJECTORY_MAX_DISTANCE;
      const point = startPosition.clone().add(direction.clone().multiplyScalar(t));
      
      // Add a slight arc to the trajectory (optional)
      // This is a simple parabola, could be replaced with physics-based prediction
      const arc = 0.1 * t * (this.TRAJECTORY_MAX_DISTANCE - t) / this.TRAJECTORY_MAX_DISTANCE;
      point.y += arc;
      
      points.push(point);
    }
    
    return points;
  }
  
  /**
   * Handle mouse down events
   */
  private handleMouseDown(event: MouseEvent): void {
    if (!this.isAiming) return;
    
    this.isInputActive = true;
    this.inputStartPosition.set(event.clientX, event.clientY);
  }
  
  /**
   * Handle mouse move events
   */
  private handleMouseMove(event: MouseEvent): void {
    if (!this.isAiming || !this.isInputActive) return;
    
    // Calculate the delta from the start position
    const deltaX = event.clientX - this.inputStartPosition.x;
    
    // Update the angle based on mouse movement
    this.updateAngleFromInput(deltaX);
    
    // Update the start position for next move
    this.inputStartPosition.set(event.clientX, event.clientY);
  }
  
  /**
   * Handle mouse up events
   */
  private handleMouseUp(): void {
    this.isInputActive = false;
  }
  
  /**
   * Handle touch start events
   */
  private handleTouchStart(event: TouchEvent): void {
    if (!this.isAiming || event.touches.length === 0) return;
    
    this.isInputActive = true;
    this.inputStartPosition.set(
      event.touches[0].clientX,
      event.touches[0].clientY
    );
  }
  
  /**
   * Handle touch move events
   */
  private handleTouchMove(event: TouchEvent): void {
    if (!this.isAiming || !this.isInputActive || event.touches.length === 0) return;
    
    // Calculate the delta from the start position
    const deltaX = event.touches[0].clientX - this.inputStartPosition.x;
    
    // Update the angle based on touch movement
    this.updateAngleFromInput(deltaX);
    
    // Update the start position for next move
    this.inputStartPosition.set(
      event.touches[0].clientX,
      event.touches[0].clientY
    );
  }
  
  /**
   * Handle touch end events
   */
  private handleTouchEnd(): void {
    this.isInputActive = false;
  }
  
  /**
   * Handle keyboard events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isAiming) return;
    
    switch (event.key) {
      case 'ArrowLeft':
        // Rotate aim left
        this.updateAngleFromInput(-10);
        break;
      
      case 'ArrowRight':
        // Rotate aim right
        this.updateAngleFromInput(10);
        break;
      
      case 'Enter':
        // Confirm aim
        this.confirmAim();
        break;
    }
  }
  
  /**
   * Update the aiming angle based on input
   * @param deltaX Change in X position from input
   */
  private updateAngleFromInput(deltaX: number): void {
    // Convert the delta to an angle change based on sensitivity
    const deltaAngle = deltaX * this.rotationSensitivity;
    
    // Update the angle and normalize to keep it in the range [0, 2π]
    this.currentAngle = (this.currentAngle + deltaAngle) % (Math.PI * 2);
    
    // If angle is negative, wrap it to positive
    if (this.currentAngle < 0) {
      this.currentAngle += Math.PI * 2;
    }
    
    // Update visuals with the new angle
    this.updateAimRotation(this.currentAngle);
  }
  
  /**
   * Update method to be called every frame
   */
  public update(): void {
    if (!this.isAiming) return;
    
    // Update visuals position if the ball has moved
    this.updateVisualsPosition();
  }
  
  /**
   * Dispose of resources when no longer needed
   */
  public dispose(): void {
    // Remove event listeners
    window.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    window.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    window.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    
    window.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    window.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    window.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    
    // Remove visuals from scene
    if (this.aimArrow) {
      this.scene.remove(this.aimArrow);
      this.aimArrow = null;
    }
    
    if (this.trajectoryLine) {
      this.scene.remove(this.trajectoryLine);
      this.trajectoryLine = null;
    }
    
    // Remove shot system listener
    this.shotSystem.removeStateChangeListener(this.handleShotStateChange.bind(this));
  }
  
  /**
   * Update the aiming angle based on directional input
   * @param direction Input direction vector (x, y)
   */
  public adjustAimDirection(direction: THREE.Vector2): void {
    if (!this.isAiming) return;
    
    // Convert the direction input to an angle change based on sensitivity
    const deltaAngle = direction.x * this.rotationSensitivity;
    
    // Update the angle and normalize to keep it in the range [0, 2π]
    this.currentAngle = (this.currentAngle + deltaAngle) % (Math.PI * 2);
    
    // If angle is negative, wrap it to positive
    if (this.currentAngle < 0) {
      this.currentAngle += Math.PI * 2;
    }
    
    // Update visuals with the new angle
    this.updateAimRotation(this.currentAngle);
    
    console.log(`Aim adjusted by ${deltaAngle.toFixed(3)} to ${this.currentAngle.toFixed(3)}`);
  }
  
  /**
   * Set the aim direction based on a screen position (for mouse/touch input)
   * @param position Normalized screen position (-1 to 1 for both x and y)
   */
  public setAimFromScreenPosition(position: THREE.Vector2): void {
    if (!this.isAiming || !this.ball) return;
    
    // Convert 2D screen position to an angle in the XZ plane
    // This is a simplified conversion that assumes the camera is 
    // generally looking in a predictable direction
    
    // Calculate angle from position
    // In this simplified model, we're treating x as left/right
    // and y as forward/backward in the world XZ plane
    const angle = Math.atan2(position.x, -position.y);
    
    // Update the current angle
    this.currentAngle = angle;
    
    // Update visuals
    this.updateAimRotation(this.currentAngle);
    
    console.log(`Aim set from screen position [${position.x.toFixed(2)}, ${position.y.toFixed(2)}] to angle ${angle.toFixed(3)}`);
  }
} 