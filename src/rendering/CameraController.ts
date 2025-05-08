import * as THREE from 'three';

/**
 * Camera modes for different game states
 */
export enum CameraMode {
  FIXED = 'FIXED',       // Static isometric view
  ORBIT = 'ORBIT',       // Orbiting around target (for aiming)
  FOLLOW = 'FOLLOW',     // Following the ball
  TRANSITION = 'TRANSITION' // Transitioning between modes
}

/**
 * CameraController - Manages the game camera with Kirby's Dream Course style
 */
export class CameraController {
  private camera: THREE.Camera;
  private currentMode: CameraMode = CameraMode.FIXED;
  private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private offset: THREE.Vector3 = new THREE.Vector3(15, 15, 15);
  private transitionStartTime: number = 0;
  private transitionDuration: number = 500; // ms
  private startPosition: THREE.Vector3 = new THREE.Vector3();
  private startTarget: THREE.Vector3 = new THREE.Vector3();
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private ballVelocity: THREE.Vector3 | null = null;
  
  // Camera settings
  private distance: number = 25;
  private height: number = 15;
  private followLerp: number = 0.1;
  private orbitSpeed: number = 0.5;
  private orbitAngle: number = 0;
  
  /**
   * Constructor
   */
  constructor(camera: THREE.Camera) {
    this.camera = camera;
    
    // Initialize camera position
    this.positionCameraIsometric(this.target, this.distance);
  }
  
  /**
   * Position camera at true isometric angle
   */
  private positionCameraIsometric(targetPoint: THREE.Vector3, distance: number): void {
    // Classic isometric angle - 45° in horizontal plane, 30° from ground
    const angleHorizontal = Math.PI / 4;  // 45 degrees
    const angleVertical = Math.PI / 6;    // 30 degrees
    
    // Position camera at fixed distance and angles
    this.camera.position.x = targetPoint.x + Math.cos(angleHorizontal) * Math.cos(angleVertical) * distance;
    this.camera.position.y = targetPoint.y + Math.sin(angleVertical) * distance; 
    this.camera.position.z = targetPoint.z + Math.sin(angleHorizontal) * Math.cos(angleVertical) * distance;
    
    // Look at the target point
    this.camera.lookAt(targetPoint);
    
    // Store current offset
    this.offset.copy(this.camera.position).sub(targetPoint);
  }
  
  /**
   * Update camera position and rotation
   */
  public update(): void {
    // Handle camera behavior based on current mode
    switch (this.currentMode) {
      case CameraMode.FIXED:
        // Nothing to do, camera is static
        break;
        
      case CameraMode.ORBIT:
        this.updateOrbitCamera();
        break;
        
      case CameraMode.FOLLOW:
        this.updateFollowCamera();
        break;
        
      case CameraMode.TRANSITION:
        this.updateTransition();
        break;
    }
  }
  
  /**
   * Update camera when in orbit mode (aiming phase)
   */
  private updateOrbitCamera(): void {
    // Increment orbit angle
    this.orbitAngle += this.orbitSpeed * 0.01;
    
    // Calculate new position
    const x = this.target.x + Math.cos(this.orbitAngle) * this.distance;
    const z = this.target.z + Math.sin(this.orbitAngle) * this.distance;
    const y = this.target.y + this.height;
    
    // Update camera position
    this.camera.position.set(x, y, z);
    
    // Look at target
    this.camera.lookAt(this.target);
  }
  
  /**
   * Update camera when following the ball
   */
  private updateFollowCamera(): void {
    // Calculate ideal camera position (current target plus offset)
    const idealPosition = new THREE.Vector3().copy(this.target).add(this.offset);
    
    // If ball has velocity, adjust camera position to look ahead
    if (this.ballVelocity && this.ballVelocity.length() > 0.5) {
      // Create a normalized velocity vector (in XZ plane only)
      const velocityXZ = new THREE.Vector3(this.ballVelocity.x, 0, this.ballVelocity.z).normalize();
      
      // Adjust camera position slightly in the direction of movement
      // This creates a "look ahead" effect common in golf/racing games
      idealPosition.x -= velocityXZ.x * 2;
      idealPosition.z -= velocityXZ.z * 2;
    }
    
    // Smoothly interpolate to ideal position
    this.camera.position.lerp(idealPosition, this.followLerp);
    
    // Look at target
    this.camera.lookAt(this.target);
  }
  
  /**
   * Update camera during transition between modes
   */
  private updateTransition(): void {
    // Calculate elapsed time
    const elapsed = Date.now() - this.transitionStartTime;
    const progress = Math.min(elapsed / this.transitionDuration, 1);
    
    // Interpolate position
    this.camera.position.lerpVectors(
      this.startPosition,
      this.targetPosition,
      progress
    );
    
    // Look at the target
    this.camera.lookAt(this.target);
    
    // Check if transition is complete
    if (progress >= 1) {
      this.currentMode = CameraMode.FOLLOW;
    }
  }
  
  /**
   * Set camera mode
   */
  public setMode(mode: CameraMode): void {
    // Skip if already in this mode
    if (mode === this.currentMode) return;
    
    // Store current position for transitions
    this.startPosition.copy(this.camera.position);
    
    // Update current mode
    this.currentMode = mode;
    
    // Special handling for different modes
    switch (mode) {
      case CameraMode.FIXED:
        this.positionCameraIsometric(this.target, this.distance);
        break;
        
      case CameraMode.ORBIT:
        // Calculate the current angle from position to target
        this.orbitAngle = Math.atan2(
          this.camera.position.z - this.target.z,
          this.camera.position.x - this.target.x
        );
        break;
        
      case CameraMode.FOLLOW:
        // Nothing special needed, update() will handle it
        break;
        
      case CameraMode.TRANSITION:
        // Start transition
        this.transitionStartTime = Date.now();
        break;
    }
  }
  
  /**
   * Set camera target (usually the ball)
   */
  public setTarget(target: THREE.Vector3): void {
    this.target.copy(target);
  }
  
  /**
   * Set ball velocity for look-ahead effect
   */
  public setBallVelocity(velocity: THREE.Vector3): void {
    this.ballVelocity = velocity;
  }
  
  /**
   * Transition to a new mode with smooth camera movement
   */
  public transitionTo(mode: CameraMode): void {
    // Skip if already in this mode
    if (mode === this.currentMode) return;
    
    // Store current position
    this.startPosition.copy(this.camera.position);
    
    // Calculate target position based on new mode
    switch (mode) {
      case CameraMode.FIXED:
        // Target position is isometric view
        this.targetPosition.copy(this.target).add(this.offset);
        break;
        
      case CameraMode.ORBIT:
        // Target position is at orbit angle 0
        this.targetPosition.set(
          this.target.x + this.distance,
          this.target.y + this.height,
          this.target.z
        );
        break;
        
      case CameraMode.FOLLOW:
        // Target position is current offset from target
        this.targetPosition.copy(this.target).add(this.offset);
        break;
    }
    
    // Start transition
    this.currentMode = CameraMode.TRANSITION;
    this.transitionStartTime = Date.now();
  }
  
  /**
   * Get current camera mode
   */
  public getMode(): CameraMode {
    return this.currentMode;
  }
} 