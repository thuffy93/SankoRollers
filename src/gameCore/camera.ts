import * as THREE from 'three';
import { GameState, gameStateManager } from '../utils/gameState';
import { PhysicsConfig } from '../utils/physicsConfig';

// Camera modes
export enum CameraMode {
  FIXED = 'FIXED',         // Static position
  ORBIT = 'ORBIT',         // User-controlled orbit
  FOLLOW = 'FOLLOW',       // Following the ball
  TRANSITION = 'TRANSITION' // Transitioning between modes
}

/**
 * Camera controller for smooth transitions and following
 */
export class CameraController {
  private camera: THREE.Camera;
  private currentMode: CameraMode = CameraMode.FIXED;
  private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private targetPosition: THREE.Vector3 = new THREE.Vector3(15, 15, 15);
  private transitionStartTime: number = 0;
  private transitionDuration: number = 1000; // ms
  private startPosition: THREE.Vector3 = new THREE.Vector3();
  private startTarget: THREE.Vector3 = new THREE.Vector3();
  private ballVelocity: THREE.Vector3 | null = null;
  
  constructor(camera: THREE.Camera) {
    this.camera = camera;
    
    // Set up game state listeners
    this.setupStateListeners();
  }
  
  /**
   * Set up game state change listeners
   */
  private setupStateListeners(): void {
    // When entering aiming state, move to aiming position
    gameStateManager.onEnterState(GameState.AIMING, () => {
      this.transitionTo(CameraMode.ORBIT);
    });
    
    // When ball is rolling, follow the ball
    gameStateManager.onEnterState(GameState.ROLLING, () => {
      this.transitionTo(CameraMode.FOLLOW);
    });
    
    // When back to idle, return to orbit mode
    gameStateManager.onEnterState(GameState.IDLE, () => {
      this.transitionTo(CameraMode.ORBIT);
    });
  }
  
  /**
   * Transition to a new camera mode
   */
  public transitionTo(mode: CameraMode): void {
    // Don't transition if already in this mode
    if (this.currentMode === mode) return;
    
    console.log(`Camera transitioning: ${this.currentMode} -> ${mode}`);
    
    // Store starting position and target for smooth transition
    this.startPosition = this.camera.position.clone();
    this.startTarget = this.target.clone();
    
    // Set new mode
    this.currentMode = CameraMode.TRANSITION;
    this.transitionStartTime = Date.now();
    
    // Store the target mode
    setTimeout(() => {
      this.currentMode = mode;
    }, this.transitionDuration);
  }
  
  /**
   * Update the ball position we're following
   */
  public updateBallPosition(position: THREE.Vector3, velocity?: THREE.Vector3): void {
    // Update target to follow
    this.target = position.clone();
    
    // Update velocity if provided
    if (velocity) {
      this.ballVelocity = velocity.clone();
    }
  }
  
  /**
   * Update camera position and rotation
   */
  public update(): void {
    if (this.currentMode === CameraMode.FOLLOW) {
      this.updateFollowCamera();
    }
    else if (this.currentMode === CameraMode.TRANSITION) {
      this.updateTransitionCamera();
    }
  }
  
  /**
   * Update camera when following the ball
   */
  private updateFollowCamera(): void {
    const config = PhysicsConfig.camera;
    
    // Calculate ideal camera position
    const idealOffset = this.calculateCameraOffset();
    const idealHeight = this.calculateCameraHeight();
    
    const idealPosition = new THREE.Vector3(
      this.target.x + idealOffset.x,
      this.target.y + idealHeight,
      this.target.z + idealOffset.y  // Vector2 has x and y, not z
    );
    
    // Smoothly interpolate to ideal position
    this.camera.position.lerp(idealPosition, config.followLerp);
    
    // Look at the ball
    this.camera.lookAt(this.target);
  }
  
  /**
   * Update camera during transitions
   */
  private updateTransitionCamera(): void {
    const elapsedTime = Date.now() - this.transitionStartTime;
    const progress = Math.min(elapsedTime / this.transitionDuration, 1);
    
    // Use easing function for smoother transitions
    const easedProgress = this.easeInOutCubic(progress);
    
    // For each transition target, calculate based on game state
    let targetPosition = new THREE.Vector3();
    let targetLookAt = new THREE.Vector3();
    
    const config = PhysicsConfig.camera;
    
    // Determine target based on next mode
    switch(gameStateManager.getState()) {
      case GameState.AIMING:
      case GameState.CHARGING:
      case GameState.IDLE:
        // Orbit camera position
        targetPosition = new THREE.Vector3(
          this.target.x + config.aimingDistance,
          this.target.y + config.aimingHeight,
          this.target.z + config.aimingDistance
        );
        targetLookAt = this.target.clone();
        break;
        
      case GameState.ROLLING:
        // Follow camera position - calculate ideal offset based on velocity
        const idealOffset = this.calculateCameraOffset();
        const idealHeight = this.calculateCameraHeight();
        
        targetPosition = new THREE.Vector3(
          this.target.x + idealOffset.x,
          this.target.y + idealHeight,
          this.target.z + idealOffset.y
        );
        targetLookAt = this.target.clone();
        break;
        
      default:
        // Default camera position
        targetPosition = new THREE.Vector3(15, 15, 15);
        targetLookAt = new THREE.Vector3(0, 0, 0);
    }
    
    // Interpolate position
    this.camera.position.lerpVectors(this.startPosition, targetPosition, easedProgress);
    
    // Look at target
    const currentLookAt = new THREE.Vector3();
    currentLookAt.lerpVectors(this.startTarget, targetLookAt, easedProgress);
    this.camera.lookAt(currentLookAt);
    
    this.targetPosition = targetPosition;
  }
  
  /**
   * Easing function for smoother camera transitions
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Calculate camera offset based on terrain and movement
   */
  private calculateCameraOffset(): THREE.Vector2 {
    const config = PhysicsConfig.camera;
    
    // Default follow distance
    let offsetX = -config.followDistance;
    let offsetZ = -config.followDistance;
    
    // If we have access to ball velocity, position camera behind movement
    if (this.ballVelocity && this.ballVelocity.length() > 0.5) {
      // Normalize velocity in XZ plane
      const velXZ = new THREE.Vector2(this.ballVelocity.x, this.ballVelocity.z);
      
      if (velXZ.length() > 0.5) {
        velXZ.normalize();
        
        // Position camera behind direction of movement
        offsetX = -velXZ.x * config.followDistance;
        offsetZ = -velXZ.y * config.followDistance;
      }
    }
    
    return new THREE.Vector2(offsetX, offsetZ);
  }

  /**
   * Calculate camera height based on terrain
   */
  private calculateCameraHeight(): number {
    const config = PhysicsConfig.camera;
    
    // Default height
    let height = config.followHeight;
    
    // Adjust height based on ball's altitude
    // This gives a better view when the ball is elevated
    if (this.target.y > 2.0) {
      // Gradually increase camera height when ball goes higher
      height = config.followHeight + (this.target.y - 2.0) * 0.7;
    }
    
    return height;
  }
}

/**
 * Initialize the camera with an isometric view
 * @returns The camera object and controller
 */
export function initCamera() {
  // Create perspective camera with Kirby-like isometric view
  const camera = new THREE.PerspectiveCamera(
    45, // FOV
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1, // Near clipping plane
    1000 // Far clipping plane
  );
  
  // Set initial camera position for isometric view
  // Position the camera at an angle to mimic the isometric view in Kirby's Dream Course
  camera.position.set(15, 15, 15);
  
  // Look at the center of the scene
  camera.lookAt(new THREE.Vector3(0, 0, 0));
  
  // Create camera controller
  const cameraController = new CameraController(camera);
  
  return { camera, cameraController };
} 