import * as THREE from 'three';

/**
 * Represents the state of the camera
 */
export enum CameraState {
  IDLE = 'idle',
  AIMING = 'aiming', 
  IN_FLIGHT = 'in-flight',
  AT_REST = 'at-rest'
}

/**
 * Easing function type for camera transitions
 */
type EasingFunction = (t: number) => number;

/**
 * Easing functions for camera transitions
 */
export const Easing = {
  // Linear interpolation
  linear: (t: number): number => t,
  
  // Quadratic easing in/out
  easeInOut: (t: number): number => {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  },
  
  // Cubic easing in/out
  easeInOutCubic: (t: number): number => {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },
  
  // Exponential easing in/out
  easeInOutExpo: (t: number): number => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  }
};

/**
 * Class to handle the isometric camera functionality
 */
export class IsometricCamera {
  // The camera instance
  private camera: THREE.PerspectiveCamera;
  
  // Container to manage position and rotation together
  private cameraContainer: THREE.Object3D;
  
  // Camera configuration
  private readonly FOV = 50;
  private readonly NEAR = 0.1;
  private readonly FAR = 1000;
  
  // Isometric angle parameters (in radians)
  private readonly ISO_ANGLE_X = Math.PI / 4; // 45 degrees
  private readonly ISO_ANGLE_Y = Math.PI / 4; // 45 degrees
  
  // Distance from the target
  private readonly CAMERA_DISTANCE = 20;
  
  // Frustum culling optimization
  private frustum: THREE.Frustum;
  private projectionMatrix: THREE.Matrix4;
  
  /**
   * Initialize a new isometric camera
   * @param aspectRatio - The aspect ratio of the viewport (width/height)
   */
  constructor(aspectRatio: number) {
    // Create the camera with proper field of view
    this.camera = new THREE.PerspectiveCamera(
      this.FOV,
      aspectRatio,
      this.NEAR,
      this.FAR
    );
    
    // Create a container for the camera to manage position and rotation
    this.cameraContainer = new THREE.Object3D();
    this.cameraContainer.add(this.camera);
    
    // Position the camera at a fixed distance
    this.camera.position.set(0, 0, this.CAMERA_DISTANCE);
    
    // Set up initial isometric rotation
    this.setupIsometricAngle();
    
    // Initialize frustum culling tools
    this.frustum = new THREE.Frustum();
    this.projectionMatrix = new THREE.Matrix4();
    
    // Update the frustum
    this.updateFrustum();
  }
  
  /**
   * Sets up the camera rotation to achieve isometric view
   */
  private setupIsometricAngle(): void {
    // Rotate the container to achieve the isometric angle
    this.cameraContainer.rotation.x = this.ISO_ANGLE_X;
    this.cameraContainer.rotation.y = this.ISO_ANGLE_Y;
    
    // Update the camera and container matrices
    this.cameraContainer.updateMatrixWorld();
    this.camera.updateProjectionMatrix();
  }
  
  /**
   * Position the camera target at specific world coordinates
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   */
  public setPosition(x: number, y: number, z: number): void {
    this.cameraContainer.position.set(x, y, z);
    this.cameraContainer.updateMatrixWorld();
    
    // Update the frustum when the camera moves
    this.updateFrustum();
  }
  
  /**
   * Update the camera's aspect ratio (e.g., after window resize)
   * @param aspectRatio - The new aspect ratio (width/height)
   */
  public updateAspectRatio(aspectRatio: number): void {
    this.camera.aspect = aspectRatio;
    this.camera.updateProjectionMatrix();
    
    // Update the frustum when projection changes
    this.updateFrustum();
  }
  
  /**
   * Update the camera frustum for culling optimizations
   */
  private updateFrustum(): void {
    // Get the camera's world matrix
    this.camera.updateMatrixWorld();
    
    // Get the projection matrix
    this.projectionMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    
    // Update the frustum
    this.frustum.setFromProjectionMatrix(this.projectionMatrix);
  }
  
  /**
   * Check if an object is visible in the camera frustum
   * @param object - The object to check
   * @returns True if the object is in the frustum
   */
  public isObjectVisible(object: THREE.Object3D): boolean {
    // For objects with geometry, check against their bounding sphere
    if (object instanceof THREE.Mesh && object.geometry.boundingSphere) {
      const boundingSphere = object.geometry.boundingSphere.clone();
      boundingSphere.applyMatrix4(object.matrixWorld);
      return this.frustum.intersectsSphere(boundingSphere);
    }
    
    // For other objects, use their world position
    const position = new THREE.Vector3();
    object.getWorldPosition(position);
    return this.frustum.containsPoint(position);
  }
  
  /**
   * Get the camera instance
   * @returns THREE.PerspectiveCamera
   */
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
  
  /**
   * Get the camera container
   * @returns THREE.Object3D
   */
  public getContainer(): THREE.Object3D {
    return this.cameraContainer;
  }
  
  /**
   * Test the camera by rendering a static scene with placeholder objects
   * @param scene - The THREE.Scene to add test objects to
   */
  public addTestObjects(scene: THREE.Scene): void {
    // Add a grid for reference
    const gridHelper = new THREE.GridHelper(20, 20);
    scene.add(gridHelper);
    
    // Add a sphere to represent the ball
    const ballGeometry = new THREE.SphereGeometry(1, 32, 32);
    const ballMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    scene.add(ball);
  }
}

/**
 * Camera controller for smoothly following a target object
 */
export class CameraController {
  // The camera to control
  private camera: IsometricCamera;
  
  // The target object to follow
  private target: THREE.Object3D;
  
  // Camera offset from target
  private offset: THREE.Vector3;
  
  // Smoothing factor for camera movement (0-1)
  // Lower = smoother/slower, Higher = responsive/faster
  private smoothingFactor: number;
  
  // Current target position for interpolation
  private currentTargetPosition: THREE.Vector3;
  
  // Course boundaries
  private boundaries: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    minY?: number; // Optional vertical boundaries
    maxY?: number;
  };
  
  // Buffer zone for smoother transitions near edges
  private boundaryBuffer: number;
  
  // Collision prevention
  private collisionObjects: THREE.Object3D[] = [];
  private collisionRaycaster: THREE.Raycaster;
  private collisionDistance: number = 5; // Minimum distance to objects
  
  // Camera state
  private state: CameraState = CameraState.IDLE;
  
  // Transition properties
  private isTransitioning: boolean = false;
  private transitionStartPosition: THREE.Vector3 = new THREE.Vector3();
  private transitionTargetPosition: THREE.Vector3 = new THREE.Vector3();
  private transitionStartTime: number = 0;
  private transitionDuration: number = 1.0; // Default 1 second
  private currentTransitionTime: number = 0;
  private transitionEasing: EasingFunction = Easing.easeInOut;
  
  // Camera presets for different states
  private statePresets: Record<CameraState, {
    offset: THREE.Vector3;
    smoothingFactor: number;
  }> = {
    [CameraState.IDLE]: {
      offset: new THREE.Vector3(8, 8, 8),
      smoothingFactor: 0.05
    },
    [CameraState.AIMING]: {
      offset: new THREE.Vector3(10, 12, 10), // Higher and further back for better view
      smoothingFactor: 0.03
    },
    [CameraState.IN_FLIGHT]: {
      offset: new THREE.Vector3(6, 6, 6), // Closer to follow the action
      smoothingFactor: 0.1 // More responsive during flight
    },
    [CameraState.AT_REST]: {
      offset: new THREE.Vector3(8, 8, 8),
      smoothingFactor: 0.05
    }
  };
  
  // Performance optimization
  private lastUpdateTime: number = 0;
  private updateInterval: number = 1000 / 60; // Target 60 FPS by default
  private isHighPerformanceMode: boolean = false;
  
  // Gameplay visibility optimization
  private importantObjects: THREE.Object3D[] = [];
  private obstacleObjects: THREE.Object3D[] = [];
  private objectVisibilityRaycaster: THREE.Raycaster;
  private isAutomaticVisibilityAdjustment: boolean = false;
  private visibilityAdjustmentAmount: number = 2.0; // How much to adjust height
  
  /**
   * Create a new camera controller
   * @param camera - The IsometricCamera instance to control
   * @param target - The target object to follow
   * @param offset - Optional offset from target
   * @param smoothingFactor - Optional smoothing factor (0-1)
   */
  constructor(
    camera: IsometricCamera,
    target: THREE.Object3D,
    offset: THREE.Vector3 = new THREE.Vector3(0, 5, 0),
    smoothingFactor: number = 0.1
  ) {
    this.camera = camera;
    this.target = target;
    this.offset = offset.clone();
    this.smoothingFactor = smoothingFactor;
    
    // Initialize current target position with target's current position
    this.currentTargetPosition = new THREE.Vector3();
    this.currentTargetPosition.copy(target.position);
    
    // Initialize boundaries with default values (large area)
    this.boundaries = {
      minX: -100,
      maxX: 100,
      minZ: -100,
      maxZ: 100
    };
    
    // Default boundary buffer (units)
    this.boundaryBuffer = 5;
    
    // Initialize raycasters
    this.collisionRaycaster = new THREE.Raycaster();
    this.objectVisibilityRaycaster = new THREE.Raycaster();
    
    // Set initial camera position
    this.updateCameraPosition(0);
  }
  
  /**
   * Set course boundaries to constrain camera movement
   * @param boundaries - Object with min/max values for each axis
   */
  public setBoundaries(boundaries: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    minY?: number;
    maxY?: number;
  }): void {
    this.boundaries = boundaries;
  }
  
  /**
   * Set the buffer zone for smoothing transitions near boundaries
   * @param buffer - Buffer distance in world units
   */
  public setBoundaryBuffer(buffer: number): void {
    this.boundaryBuffer = buffer;
  }
  
  /**
   * Add objects to avoid when positioning the camera
   * @param objects - Array of THREE.Object3D objects to avoid
   */
  public setCollisionObjects(objects: THREE.Object3D[]): void {
    this.collisionObjects = objects;
  }
  
  /**
   * Add a single object to avoid when positioning the camera
   * @param object - THREE.Object3D object to avoid
   */
  public addCollisionObject(object: THREE.Object3D): void {
    this.collisionObjects.push(object);
  }
  
  /**
   * Set minimum distance to keep from collision objects
   * @param distance - Distance in world units
   */
  public setCollisionDistance(distance: number): void {
    this.collisionDistance = distance;
  }
  
  /**
   * Set important objects that should always be kept visible
   * @param objects - Array of important objects
   */
  public setImportantObjects(objects: THREE.Object3D[]): void {
    this.importantObjects = objects;
  }
  
  /**
   * Add an important object that should be kept visible
   * @param object - The object to add
   */
  public addImportantObject(object: THREE.Object3D): void {
    if (!this.importantObjects.includes(object)) {
      this.importantObjects.push(object);
    }
  }
  
  /**
   * Set objects that might obstruct the view
   * @param objects - Array of potential obstacle objects
   */
  public setObstacleObjects(objects: THREE.Object3D[]): void {
    this.obstacleObjects = objects;
  }
  
  /**
   * Add an object that might obstruct the view
   * @param object - The object to add as a potential obstacle
   */
  public addObstacleObject(object: THREE.Object3D): void {
    if (!this.obstacleObjects.includes(object)) {
      this.obstacleObjects.push(object);
    }
  }
  
  /**
   * Enable or disable automatic visibility adjustment
   * @param enabled - Whether to enable automatic adjustment
   * @param adjustmentAmount - How much to adjust height (default: 2.0)
   */
  public setAutomaticVisibilityAdjustment(enabled: boolean, adjustmentAmount: number = 2.0): void {
    this.isAutomaticVisibilityAdjustment = enabled;
    this.visibilityAdjustmentAmount = adjustmentAmount;
    console.log(`Automatic visibility adjustment ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Check if automatic visibility adjustment is enabled
   * @returns Whether automatic visibility adjustment is enabled
   */
  public getIsAutomaticVisibilityAdjustment(): boolean {
    return this.isAutomaticVisibilityAdjustment;
  }
  
  /**
   * Set performance mode
   * @param highPerformance - Whether to enable high performance mode
   * @param targetFPS - Target FPS (default: 60)
   */
  public setPerformanceMode(highPerformance: boolean, targetFPS: number = 60): void {
    this.isHighPerformanceMode = highPerformance;
    this.updateInterval = 1000 / targetFPS;
    console.log(`Performance mode set to ${highPerformance ? 'high' : 'normal'}, target FPS: ${targetFPS}`);
  }
  
  /**
   * Check if high performance mode is enabled
   * @returns Whether high performance mode is enabled
   */
  public getIsHighPerformanceMode(): boolean {
    return this.isHighPerformanceMode;
  }
  
  /**
   * Update the camera preset for a specific state
   * @param state - The camera state to update
   * @param preset - New preset values
   */
  public setStatePreset(
    state: CameraState, 
    preset: { offset?: THREE.Vector3; smoothingFactor?: number }
  ): void {
    if (preset.offset) {
      this.statePresets[state].offset = preset.offset.clone();
    }
    
    if (preset.smoothingFactor !== undefined) {
      this.statePresets[state].smoothingFactor = preset.smoothingFactor;
    }
  }
  
  /**
   * Transition to a new camera state with animation
   * @param newState - The state to transition to
   * @param duration - Duration of transition in seconds (default: 1.0)
   * @param easing - Easing function to use (default: easeInOut)
   */
  public transitionToState(
    newState: CameraState,
    duration: number = 1.0,
    easing: EasingFunction = Easing.easeInOut
  ): void {
    // Don't transition if already in this state
    if (this.state === newState && !this.isTransitioning) {
      return;
    }
    
    // Get the preset for the new state
    const preset = this.statePresets[newState];
    
    // Start a new transition
    this.startTransition(
      // Calculate new target position based on new offset
      this.calculatePositionWithOffset(preset.offset),
      duration,
      easing
    );
    
    // Set the new state immediately
    this.state = newState;
    
    // Update the offset and smoothing factor for future updates
    // (These will take effect after the transition is complete)
    this.offset.copy(preset.offset);
    this.smoothingFactor = preset.smoothingFactor;
    
    console.log(`Transitioning camera to state: ${newState}`);
  }
  
  /**
   * Calculate a position using a specific offset from the target
   * @param specificOffset - The offset to use
   * @returns The calculated position
   */
  private calculatePositionWithOffset(specificOffset: THREE.Vector3): THREE.Vector3 {
    const position = new THREE.Vector3();
    position.copy(this.target.position);
    position.add(specificOffset);
    return position;
  }
  
  /**
   * Start a camera transition to a new position
   * @param targetPosition - The target position to transition to
   * @param duration - Duration of transition in seconds
   * @param easing - Easing function to use
   */
  private startTransition(
    targetPosition: THREE.Vector3,
    duration: number,
    easing: EasingFunction
  ): void {
    // Store current camera position as start position
    this.transitionStartPosition.copy(this.currentTargetPosition);
    
    // Store target position
    this.transitionTargetPosition.copy(targetPosition);
    
    // Set up timing
    this.transitionStartTime = performance.now() / 1000; // Convert to seconds
    this.transitionDuration = duration;
    this.currentTransitionTime = 0;
    
    // Set easing function
    this.transitionEasing = easing;
    
    // Flag that we're transitioning
    this.isTransitioning = true;
  }
  
  /**
   * Update the camera transition
   * @param currentTime - Current time in seconds
   * @returns true if the transition is still in progress
   */
  private updateTransition(currentTime: number): boolean {
    // Calculate elapsed time
    this.currentTransitionTime = currentTime - this.transitionStartTime;
    
    // Check if transition is complete
    if (this.currentTransitionTime >= this.transitionDuration) {
      // Snap to final position
      this.currentTargetPosition.copy(this.transitionTargetPosition);
      this.isTransitioning = false;
      return false;
    }
    
    // Calculate interpolation factor with easing
    const t = this.currentTransitionTime / this.transitionDuration;
    const easedT = this.transitionEasing(t);
    
    // Interpolate position
    this.currentTargetPosition.lerpVectors(
      this.transitionStartPosition,
      this.transitionTargetPosition,
      easedT
    );
    
    // Update camera position 
    this.camera.setPosition(
      this.currentTargetPosition.x,
      this.currentTargetPosition.y,
      this.currentTargetPosition.z
    );
    
    // Transition still in progress
    return true;
  }
  
  /**
   * Calculate the desired camera position based on target position and offset
   * @returns THREE.Vector3 representing the desired position
   */
  private calculateDesiredPosition(): THREE.Vector3 {
    // Create new vector to store result
    const desiredPosition = new THREE.Vector3();
    
    // Get the target's current position
    desiredPosition.copy(this.target.position);
    
    // Add the offset
    desiredPosition.add(this.offset);
    
    return desiredPosition;
  }
  
  /**
   * Check if important objects are visible and adjust camera if needed
   * @param position - The current camera position
   * @returns Adjusted position to ensure visibility
   */
  private ensureObjectsVisible(position: THREE.Vector3): THREE.Vector3 {
    // Skip if automatic adjustment is disabled or no important objects
    if (!this.isAutomaticVisibilityAdjustment || this.importantObjects.length === 0) {
      return position.clone();
    }
    
    // Get the camera and target world positions
    const cameraWorldPos = new THREE.Vector3();
    this.camera.getCamera().getWorldPosition(cameraWorldPos);
    
    // Check each important object
    let needsAdjustment = false;
    
    for (const object of this.importantObjects) {
      // Skip if the object is already visible
      if (this.camera.isObjectVisible(object)) {
        continue;
      }
      
      // Get the object's world position
      const objectWorldPos = new THREE.Vector3();
      object.getWorldPosition(objectWorldPos);
      
      // Direction to the object
      const direction = new THREE.Vector3().subVectors(objectWorldPos, cameraWorldPos).normalize();
      
      // Check for obstacles between camera and object
      this.objectVisibilityRaycaster.set(cameraWorldPos, direction);
      const intersects = this.objectVisibilityRaycaster.intersectObjects(this.obstacleObjects, true);
      
      if (intersects.length > 0) {
        needsAdjustment = true;
        break;
      }
    }
    
    // If any important object is not visible, adjust the camera height
    if (needsAdjustment) {
      const adjustedPosition = position.clone();
      adjustedPosition.y += this.visibilityAdjustmentAmount;
      
      // Ensure we stay within boundaries
      if (
        this.boundaries.maxY !== undefined &&
        adjustedPosition.y > this.boundaries.maxY - this.boundaryBuffer
      ) {
        adjustedPosition.y = this.boundaries.maxY - this.boundaryBuffer;
      }
      
      return adjustedPosition;
    }
    
    return position.clone();
  }
  
  /**
   * Constrain a position to stay within the defined boundaries
   * @param position - The position to constrain
   * @returns The constrained position
   */
  private applyBoundaryConstraints(position: THREE.Vector3): THREE.Vector3 {
    // Create a copy to avoid modifying the original
    const constrainedPosition = position.clone();
    
    // Apply X constraints
    constrainedPosition.x = Math.max(
      this.boundaries.minX + this.boundaryBuffer,
      Math.min(constrainedPosition.x, this.boundaries.maxX - this.boundaryBuffer)
    );
    
    // Apply Z constraints
    constrainedPosition.z = Math.max(
      this.boundaries.minZ + this.boundaryBuffer,
      Math.min(constrainedPosition.z, this.boundaries.maxZ - this.boundaryBuffer)
    );
    
    // Apply Y constraints if defined
    if (
      this.boundaries.minY !== undefined &&
      this.boundaries.maxY !== undefined
    ) {
      constrainedPosition.y = Math.max(
        this.boundaries.minY + this.boundaryBuffer,
        Math.min(constrainedPosition.y, this.boundaries.maxY - this.boundaryBuffer)
      );
    }
    
    return constrainedPosition;
  }
  
  /**
   * Check if a position would cause the camera to clip through objects
   * and adjust it if necessary
   * @param position - The target position to check
   * @returns Adjusted position to prevent clipping
   */
  private preventCollisions(position: THREE.Vector3): THREE.Vector3 {
    // If no collision objects, just return the original position
    if (this.collisionObjects.length === 0) {
      return position.clone();
    }
    
    // Calculate direction from camera to target
    const cameraWorldPos = new THREE.Vector3();
    const targetWorldPos = new THREE.Vector3();
    
    // Get world positions
    this.camera.getCamera().getWorldPosition(cameraWorldPos);
    this.target.getWorldPosition(targetWorldPos);
    
    // Direction from camera to target
    const direction = new THREE.Vector3().subVectors(targetWorldPos, cameraWorldPos).normalize();
    
    // Set up raycaster from camera position in direction of target
    this.collisionRaycaster.set(cameraWorldPos, direction);
    
    // Check for intersections with collision objects
    const intersects = this.collisionRaycaster.intersectObjects(this.collisionObjects, true);
    
    // If we have intersections closer than our min distance, adjust position
    if (intersects.length > 0 && intersects[0].distance < this.collisionDistance) {
      // Get the closest intersection
      const intersection = intersects[0];
      
      // Calculate adjusted position that's at the minimum distance from the intersection point
      // Move back along the direction vector
      const adjustedPosition = new THREE.Vector3().copy(position);
      const adjustment = direction.clone().multiplyScalar(
        this.collisionDistance - intersection.distance
      );
      
      // Apply adjustment
      adjustedPosition.sub(adjustment);
      
      return adjustedPosition;
    }
    
    // No collision adjustment needed
    return position.clone();
  }
  
  /**
   * Update camera position with interpolation, boundary constraints, and collision prevention
   * @param deltaTime - Time elapsed since last update (for potential future use with variable smoothing)
   */
  public updateCameraPosition(deltaTime: number): void {
    const currentTime = performance.now();
    
    // Skip update if in high performance mode and not enough time has passed
    if (this.isHighPerformanceMode && (currentTime - this.lastUpdateTime) < this.updateInterval) {
      return;
    }
    
    // Update last update time
    this.lastUpdateTime = currentTime;
    
    // Current time in seconds (for transitions)
    const currentTimeSeconds = currentTime / 1000;
    
    // Handle transitions if active
    if (this.isTransitioning) {
      const stillTransitioning = this.updateTransition(currentTimeSeconds);
      if (stillTransitioning) {
        // Skip normal update while transitioning
        return;
      }
    }
    
    // Calculate where we want the camera to be
    const desiredPosition = this.calculateDesiredPosition();
    
    // Apply boundary constraints
    const constrainedPosition = this.applyBoundaryConstraints(desiredPosition);
    
    // Ensure important objects are visible
    const visibilityAdjustedPosition = this.ensureObjectsVisible(constrainedPosition);
    
    // Prevent collisions with objects
    const safePosition = this.preventCollisions(visibilityAdjustedPosition);
    
    // Interpolate between current and safe position
    this.currentTargetPosition.lerp(safePosition, this.smoothingFactor);
    
    // Update camera position
    this.camera.setPosition(
      this.currentTargetPosition.x,
      this.currentTargetPosition.y,
      this.currentTargetPosition.z
    );
  }
  
  /**
   * Get the current camera state
   * @returns The current camera state
   */
  public getState(): CameraState {
    return this.state;
  }
  
  /**
   * Change the target object for the camera to follow
   * @param newTarget - The new target object
   */
  public setTarget(newTarget: THREE.Object3D): void {
    this.target = newTarget;
  }
  
  /**
   * Adjust the offset from the target
   * @param newOffset - The new offset vector
   */
  public setOffset(newOffset: THREE.Vector3): void {
    this.offset.copy(newOffset);
  }
  
  /**
   * Adjust the smoothing factor
   * @param factor - New smoothing factor (0-1)
   */
  public setSmoothingFactor(factor: number): void {
    // Clamp between 0 and 1
    this.smoothingFactor = Math.max(0, Math.min(1, factor));
  }
  
  /**
   * Check if the camera would show out-of-bounds areas
   * @returns True if the camera is showing out-of-bounds areas
   */
  public isShowingOutOfBounds(): boolean {
    // Get camera frustum corners in world space
    // Note: This is a simplified check based on camera position only
    const cameraPosition = new THREE.Vector3();
    this.camera.getCamera().getWorldPosition(cameraPosition);
    
    // Check if camera is outside boundaries
    return (
      cameraPosition.x < this.boundaries.minX ||
      cameraPosition.x > this.boundaries.maxX ||
      cameraPosition.z < this.boundaries.minZ ||
      cameraPosition.z > this.boundaries.maxZ
    );
  }
} 