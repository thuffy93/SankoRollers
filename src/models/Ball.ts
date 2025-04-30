import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { 
  PhysicsObjectData, 
  addSphereCollider, 
  applyImpulse as physicsApplyImpulse,
  applyForce as physicsApplyForce,
  setLinearVelocity as physicsSetLinearVelocity,
  setAngularVelocity as physicsSetAngularVelocity,
  stopBody,
  resetBody,
  isBodyMoving,
  applyTorque
} from '../systems/PhysicsSystem';

// Type definitions for collision callbacks
export type CollisionCallback = (
  otherObject: PhysicsObjectData,
  collider1: RAPIER.Collider,
  collider2: RAPIER.Collider,
) => void;

// The different collision states
export enum CollisionState {
  BEGIN,
  ONGOING,
  END
}

/**
 * Ball class representing the player-controlled ball in the game.
 * Combines Three.js visuals with Rapier3D physics.
 */
export class Ball {
  // Three.js mesh
  private mesh: THREE.Mesh;
  
  // Rapier physics body
  private body: RAPIER.RigidBody;
  
  // Physics properties
  private world: RAPIER.World;
  private collider: RAPIER.Collider | null = null;
  
  // Ball properties
  private radius: number;
  private material: THREE.Material = new THREE.MeshStandardMaterial(); // Initialize with default material
  
  // Movement properties
  private velocityThreshold: number = 0.01;
  private isInAir: boolean = false;
  
  // Interpolation properties
  private previousPosition: THREE.Vector3 = new THREE.Vector3();
  private previousRotation: THREE.Quaternion = new THREE.Quaternion();
  private interpolationFactor: number = 0.2; // Smoothing factor (0-1)
  
  // Debug visualization
  private debugMode: boolean = false;
  private debugHelpers: THREE.Object3D[] = [];
  
  // Sleep detection
  private sleepTime: number = 0;
  private sleepThreshold: number = 1.0; // Time in seconds to sleep
  private isSleeping: boolean = false;
  
  // Collision detection
  private collisionCallbacks: Map<string, CollisionCallback[]> = new Map();
  private defaultCollisionCallback: CollisionCallback | null = null;
  
  // Physics parameters (as specified in the PRD)
  private static readonly MASS = 1.0;
  private static readonly FRICTION = 0.2;
  private static readonly RESTITUTION = 0.7;
  private static readonly LINEAR_DAMPING = 0.1;
  private static readonly ANGULAR_DAMPING = 0.05;
  
  /**
   * Creates a new Ball instance
   * @param world The Rapier physics world
   * @param position Initial position of the ball
   * @param radius Radius of the ball (default: 0.5)
   * @param color Color of the ball (default: white)
   */
  constructor(
    world: RAPIER.World,
    position: THREE.Vector3,
    radius: number = 0.5,
    color: number = 0xFFFFFF
  ) {
    this.world = world;
    this.radius = radius;
    
    // Create the visual representation
    this.mesh = this.createMesh(position, radius, color);
    
    // Create the physics body with the specified parameters
    this.body = this.createPhysicsBody(position);
    
    // Initialize interpolation with current position and rotation
    this.previousPosition.copy(position);
    this.previousRotation.copy(this.mesh.quaternion);
    
    // Setup collision detection
    this.setupCollisionDetection();
  }
  
  /**
   * Creates the Three.js mesh for the ball
   * @param position Initial position of the mesh
   * @param radius Radius of the ball
   * @param color Color of the ball
   * @returns The created mesh
   */
  private createMesh(
    position: THREE.Vector3,
    radius: number,
    color: number
  ): THREE.Mesh {
    // Create a detailed sphere geometry (32 segments for good quality)
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    
    // Create a physically-based material with appropriate properties
    this.material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3,      // Slightly shiny surface
      metalness: 0.5,      // Somewhat metallic look
      emissive: 0x000000,  // No self-illumination
      flatShading: false   // Smooth shading
    });
    
    // Create the mesh from geometry and material
    const mesh = new THREE.Mesh(geometry, this.material);
    
    // Set initial position
    mesh.position.copy(position);
    
    // Enable shadows
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    return mesh;
  }
  
  /**
   * Initialize the ball by adding it to the scene
   * @param scene The Three.js scene to add the ball to
   */
  initialize(scene: THREE.Scene): void {
    scene.add(this.mesh);
    
    // Add debug visualization if enabled
    if (this.debugMode) {
      this.createDebugVisualization(scene);
    }
  }
  
  /**
   * Creates the physics body for the ball
   * @param position Initial position for the body
   * @returns The created rigid body
   */
  private createPhysicsBody(position: THREE.Vector3): RAPIER.RigidBody {
    // Create a dynamic rigid body with the specified parameters
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(Ball.LINEAR_DAMPING)
      .setAngularDamping(Ball.ANGULAR_DAMPING);
    
    // Create the rigid body in the physics world
    const body = this.world.createRigidBody(bodyDesc);
    
    // Create a collider for the ball with the specified parameters
    this.collider = addSphereCollider(
      this.world,
      body,
      this.radius,
      {
        restitution: Ball.RESTITUTION,
        friction: Ball.FRICTION,
        density: Ball.MASS
      }
    );
    
    // Log physics creation for debugging
    console.log(`Ball physics created with parameters:
      - Mass: ${Ball.MASS}
      - Friction: ${Ball.FRICTION}
      - Restitution: ${Ball.RESTITUTION}
      - Linear Damping: ${Ball.LINEAR_DAMPING}
      - Angular Damping: ${Ball.ANGULAR_DAMPING}
    `);
    
    // Attach mesh reference to the body's userData
    body.userData = {
      type: 'player-ball',
      mesh: this.mesh,
      id: 'player'
    } as PhysicsObjectData;
    
    return body;
  }
  
  /**
   * Set up collision detection for the ball
   */
  private setupCollisionDetection(): void {
    if (!this.collider) {
      console.error('Cannot setup collision detection: ball collider is null');
      return;
    }
    
    // Set up collision groups if needed
    // In Rapier3D-compat, we can use setCollisionGroups for filtering
    // Example: this.collider.setCollisionGroups(0x00000001);
    
    console.log('Ball collision detection system initialized');
  }
  
  /**
   * Create debug visualization elements
   * @param scene The Three.js scene to add the debug elements to
   */
  private createDebugVisualization(scene: THREE.Scene): void {
    // Clear any existing debug helpers
    this.clearDebugVisualization();
    
    // Create a wireframe sphere to represent the physics collider
    const wireframeGeometry = new THREE.SphereGeometry(this.radius, 16, 16);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    const wireframeSphere = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    wireframeSphere.name = 'ball-debug-collider';
    
    // Add the wireframe sphere to the scene and track it
    scene.add(wireframeSphere);
    this.debugHelpers.push(wireframeSphere);
    
    // Create velocity arrow
    const velocityArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      2,
      0xff0000
    );
    velocityArrow.name = 'ball-debug-velocity';
    
    // Add the velocity arrow to the scene and track it
    scene.add(velocityArrow);
    this.debugHelpers.push(velocityArrow);
    
    console.log('Ball debug visualization created');
  }
  
  /**
   * Remove all debug visualization elements
   */
  private clearDebugVisualization(): void {
    // Remove and dispose of all debug helpers
    this.debugHelpers.forEach(helper => {
      if (helper.parent) {
        helper.parent.remove(helper);
      }
      
      // Dispose of geometries and materials if applicable
      if (helper instanceof THREE.Mesh) {
        if (helper.geometry) helper.geometry.dispose();
        if (helper.material) {
          if (Array.isArray(helper.material)) {
            helper.material.forEach(material => material.dispose());
          } else {
            helper.material.dispose();
          }
        }
      }
    });
    
    // Clear the helpers array
    this.debugHelpers = [];
  }
  
  /**
   * Update debug visualization elements
   */
  private updateDebugVisualization(): void {
    if (!this.debugMode || this.debugHelpers.length === 0) return;
    
    // Get the ball's current state
    const position = this.getPosition();
    const velocity = this.getLinearVelocity();
    
    // Update wireframe position
    const wireframeSphere = this.debugHelpers.find(helper => helper.name === 'ball-debug-collider');
    if (wireframeSphere) {
      wireframeSphere.position.copy(position);
    }
    
    // Update velocity arrow
    const velocityArrow = this.debugHelpers.find(helper => helper.name === 'ball-debug-velocity');
    if (velocityArrow && velocityArrow instanceof THREE.ArrowHelper) {
      velocityArrow.position.copy(position);
      
      const velocityLength = velocity.length();
      if (velocityLength > 0.01) {
        // Set arrow direction to normalized velocity
        const direction = velocity.clone().normalize();
        velocityArrow.setDirection(direction);
        
        // Set arrow length proportional to velocity magnitude (clamped)
        const length = Math.min(velocityLength, 5);
        velocityArrow.setLength(length, length * 0.2, length * 0.1);
        
        // Show arrow when moving
        velocityArrow.visible = true;
      } else {
        // Hide arrow when not moving
        velocityArrow.visible = false;
      }
    }
  }
  
  /**
   * Register a callback for a specific collision type
   * @param objectType The type of object to detect collisions with
   * @param callback The function to call when a collision occurs
   */
  registerCollisionCallback(objectType: string, callback: CollisionCallback): void {
    if (!this.collisionCallbacks.has(objectType)) {
      this.collisionCallbacks.set(objectType, []);
    }
    
    this.collisionCallbacks.get(objectType)?.push(callback);
    console.log(`Registered collision callback for object type: ${objectType}`);
  }
  
  /**
   * Register a default callback for all collisions
   * @param callback The function to call when any collision occurs
   */
  registerDefaultCollisionCallback(callback: CollisionCallback): void {
    this.defaultCollisionCallback = callback;
    console.log('Registered default collision callback');
  }
  
  /**
   * Process collision events from the physics system
   */
  processCollisions(): void {
    if (!this.collider) return;
    
    // Check for collisions with other bodies
    this.world.bodies.forEach(otherBody => {
      // Skip our own body
      if (otherBody === this.body) return;
      
      // Check if there's a collision between any of our colliders and any of their colliders
      let collision = false;
      
      // Get all colliders from both bodies and check for intersections
      if (this.body.numColliders() > 0 && otherBody.numColliders() > 0) {
        // Simple proximity check based on positions and approximate dimensions
        const ballPos = this.getPosition();
        const otherPos = new THREE.Vector3(
          otherBody.translation().x,
          otherBody.translation().y,
          otherBody.translation().z
        );
        
        // Calculate distance between objects
        const distance = ballPos.distanceTo(otherPos);
        
        // Approximate collision detection - this is simplified
        // In a real implementation, we'd use proper collision detection from Rapier
        // For now, we'll just use a proximity check
        if (distance < this.radius + 1.0) { // Assume the other object is within 1 unit
          collision = true;
        }
      }
      
      if (!collision) return;
      
      // Skip if no user data
      const otherData = otherBody.userData as PhysicsObjectData;
      if (!otherData) return;
      
      // Get the other collider (just the first one for simplicity)
      let otherCollider: RAPIER.Collider | null = null;
      for (let i = 0; i < otherBody.numColliders(); i++) {
        const collider = otherBody.collider(i);
        if (collider) {
          otherCollider = collider;
          break;
        }
      }
      
      if (!otherCollider || !this.collider) return;
      
      // Call specific callbacks if registered for this object type
      if (otherData.type && this.collisionCallbacks.has(otherData.type)) {
        const callbacks = this.collisionCallbacks.get(otherData.type);
        callbacks?.forEach(callback => {
          callback(otherData, this.collider!, otherCollider!);
        });
      }
      
      // Call the default callback if it exists
      if (this.defaultCollisionCallback) {
        this.defaultCollisionCallback(otherData, this.collider, otherCollider);
      }
    });
  }
  
  /**
   * Get collision information between two objects
   * @returns Object containing contact point and normal estimates
   */
  getCollisionInfo(): {
    contactPoint: THREE.Vector3;
    normal: THREE.Vector3;
  } {
    // Since Rapier3D-compat doesn't expose contact points directly in the same way,
    // we estimate contact information based on the colliding objects' positions
    if (!this.collider) {
      return {
        contactPoint: new THREE.Vector3(),
        normal: new THREE.Vector3()
      };
    }
    
    // Get the ball's position
    const ballPos = this.getPosition();
    
    // The result will be filled in by collision callbacks with proper values
    return {
      contactPoint: ballPos.clone(),
      normal: new THREE.Vector3(0, 1, 0) // Default upward normal
    };
  }
  
  /**
   * Play a collision sound based on estimated collision force
   * @param velocity The ball's velocity magnitude at collision time
   */
  playCollisionSound(velocity: number): void {
    // This is a placeholder for actual sound implementation
    const volume = Math.min(1.0, velocity / 10.0);
    console.log(`Playing collision sound with volume: ${volume}`);
    
    // In a real implementation, we would play a sound with the calculated volume
    // audioSystem.playSound('collision', volume);
  }
  
  /**
   * Check if the ball should enter sleep state
   * @param deltaTime Time since last frame in seconds
   */
  private updateSleepState(deltaTime: number): void {
    // Check if the ball is moving above the threshold
    if (this.isMoving()) {
      // Reset sleep timer and wake up if sleeping
      this.sleepTime = 0;
      
      if (this.isSleeping) {
        this.isSleeping = false;
        console.log('Ball woke up from sleep state');
      }
    } else {
      // Increment sleep timer if not moving
      this.sleepTime += deltaTime;
      
      // Enter sleep state if timer exceeds threshold
      if (this.sleepTime >= this.sleepThreshold && !this.isSleeping) {
        this.isSleeping = true;
        console.log('Ball entered sleep state');
      }
    }
  }
  
  /**
   * Synchronize the mesh position with the physics body
   */
  private syncMeshToBody(): void {
    // Get the physics body's current position and rotation
    const physicsPosition = this.getPosition();
    const physicsRotation = this.body.rotation();
    const physicsQuaternion = new THREE.Quaternion(
      physicsRotation.x,
      physicsRotation.y,
      physicsRotation.z,
      physicsRotation.w
    );
    
    if (this.interpolationFactor <= 0) {
      // No interpolation, directly set position and rotation
      this.mesh.position.copy(physicsPosition);
      this.mesh.quaternion.copy(physicsQuaternion);
    } else {
      // Apply interpolation for smoother visuals
      // Formula: current = previous + (target - previous) * factor
      
      // Interpolate position
      const interpolatedPosition = new THREE.Vector3().copy(this.previousPosition);
      interpolatedPosition.lerp(physicsPosition, this.interpolationFactor);
      this.mesh.position.copy(interpolatedPosition);
      
      // Interpolate rotation
      const interpolatedQuaternion = new THREE.Quaternion().copy(this.previousRotation);
      interpolatedQuaternion.slerp(physicsQuaternion, this.interpolationFactor);
      this.mesh.quaternion.copy(interpolatedQuaternion);
      
      // Store current position and rotation for next frame
      this.previousPosition.copy(this.mesh.position);
      this.previousRotation.copy(this.mesh.quaternion);
    }
  }
  
  /**
   * Updates the ball's visual representation based on physics state,
   * processes collisions, and handles sleep state
   * @param deltaTime Time since last frame in seconds
   */
  update(deltaTime: number = 1/60): void {
    // Skip unnecessary updates if in sleep state
    if (this.isSleeping) {
      // Periodically check if we should wake up
      this.sleepTime += deltaTime;
      
      // Check every 0.5 seconds if we should wake up
      if (this.sleepTime % 0.5 < deltaTime) {
        if (this.isMoving()) {
          this.isSleeping = false;
          this.sleepTime = 0;
          console.log('Ball woke up from sleep state');
        }
      }
      
      return;
    }
    
    // Process any collision events
    this.processCollisions();
    
    // Synchronize the visual mesh with the physics body
    this.syncMeshToBody();
    
    // Update sleep state
    this.updateSleepState(deltaTime);
    
    // Update debug visualization if enabled
    if (this.debugMode) {
      this.updateDebugVisualization();
    }
  }
  
  /**
   * Apply an impulse to move the ball
   * @param direction Direction vector for the impulse
   * @param power Strength of the impulse
   */
  applyImpulse(direction: THREE.Vector3, power: number): void {
    // Normalize the direction vector to ensure consistent impulse strength
    const normalizedDirection = direction.clone().normalize();
    
    // Apply the impulse to the physics body
    physicsApplyImpulse(this.body, normalizedDirection, power);
    
    // Wake up if sleeping
    if (this.isSleeping) {
      this.isSleeping = false;
      this.sleepTime = 0;
    }
    
    console.log(`Applied impulse: direction (${normalizedDirection.x.toFixed(2)}, ${normalizedDirection.y.toFixed(2)}, ${normalizedDirection.z.toFixed(2)}), power: ${power.toFixed(2)}`);
  }
  
  /**
   * Apply force to the ball
   * @param force Force vector to apply
   */
  applyForce(force: THREE.Vector3): void {
    // Apply the force to the physics body
    physicsApplyForce(this.body, force);
    
    // Wake up if sleeping
    if (this.isSleeping) {
      this.isSleeping = false;
      this.sleepTime = 0;
    }
    
    console.log(`Applied force: (${force.x.toFixed(2)}, ${force.y.toFixed(2)}, ${force.z.toFixed(2)})`);
  }
  
  /**
   * Set the linear velocity of the ball directly
   * @param velocity Velocity vector to set
   */
  setLinearVelocity(velocity: THREE.Vector3): void {
    // Set the linear velocity of the physics body
    physicsSetLinearVelocity(this.body, velocity);
    
    // Wake up if sleeping
    if (this.isSleeping) {
      this.isSleeping = false;
      this.sleepTime = 0;
    }
    
    console.log(`Set linear velocity: (${velocity.x.toFixed(2)}, ${velocity.y.toFixed(2)}, ${velocity.z.toFixed(2)})`);
  }
  
  /**
   * Set the angular velocity of the ball
   * @param velocity The angular velocity vector
   */
  setAngularVelocity(velocity: THREE.Vector3): void {
    if (!this.body) return;
    
    // Apply to physics body using PhysicsSystem utility function
    physicsSetAngularVelocity(this.body, velocity);
    
    // Debug output
    if (this.debugMode) {
      console.log(`Angular velocity set: [${velocity.x.toFixed(2)}, ${velocity.y.toFixed(2)}, ${velocity.z.toFixed(2)}]`);
    }
  }
  
  /**
   * Apply spin forces to the ball based on applied impulse
   * @param spin Spin vector (x: horizontal, y: top/back, z: side)
   */
  applySpin(spin: THREE.Vector3): void {
    if (!this.body) return;
    
    // Scale the spin values appropriately
    const scaledSpin = spin.clone();
    
    // Top/back spin (y-axis) affects forward/backward rotation
    if (Math.abs(scaledSpin.y) > 0.01) {
      // Add torque perpendicular to movement direction
      const torque = new THREE.Vector3(
        scaledSpin.y, // Top/back spin affects x-axis rotation
        0,
        0
      );
      applyTorque(this.body, torque);
    }
    
    // Side spin (z-axis) affects left/right drift
    if (Math.abs(scaledSpin.z) > 0.01) {
      const torque = new THREE.Vector3(
        0,
        scaledSpin.z, // Side spin affects y-axis rotation
        0
      );
      applyTorque(this.body, torque);
    }
    
    // Horizontal spin affects side-to-side movement
    if (Math.abs(scaledSpin.x) > 0.01) {
      const torque = new THREE.Vector3(
        0,
        0,
        scaledSpin.x // Horizontal spin affects z-axis rotation
      );
      applyTorque(this.body, torque);
    }
  }
  
  /**
   * Stop all movement of the ball
   */
  stop(): void {
    // Reset both linear and angular velocity to zero
    stopBody(this.body);
    
    // Enter sleep state immediately
    this.isSleeping = true;
    this.sleepTime = this.sleepThreshold;
    
    console.log('Ball stopped');
  }
  
  /**
   * Reset the ball to a specific position with zero velocity
   * @param position Position to reset the ball to
   */
  reset(position: THREE.Vector3): void {
    // Reset the physics body to the specified position with zero velocity
    resetBody(this.body, position);
    
    // Update previous position and rotation for interpolation
    this.previousPosition.copy(position);
    this.previousRotation.set(0, 0, 0, 1);
    
    // Reset sleeping state
    this.isSleeping = false;
    this.sleepTime = 0;
    
    console.log(`Ball reset to position: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
  }
  
  /**
   * Make the ball jump with a vertical impulse
   * @param power Jump power (default: 5.0)
   */
  jump(power: number = 5.0): void {
    // Apply an upward impulse
    this.applyImpulse(new THREE.Vector3(0, 1, 0), power);
    this.isInAir = true;
    
    console.log(`Ball jumped with power: ${power.toFixed(2)}`);
  }
  
  /**
   * Roll the ball in a specific direction
   * @param direction Direction vector for rolling
   * @param power Rolling power (default: 2.0)
   */
  roll(direction: THREE.Vector3, power: number = 2.0): void {
    // Ensure direction vector has no vertical component
    const rollDirection = new THREE.Vector3(direction.x, 0, direction.z).normalize();
    
    // Apply an impulse in the roll direction
    this.applyImpulse(rollDirection, power);
    
    console.log(`Ball rolled with direction: (${rollDirection.x.toFixed(2)}, ${rollDirection.y.toFixed(2)}, ${rollDirection.z.toFixed(2)}), power: ${power.toFixed(2)}`);
  }
  
  /**
   * Check if the ball is currently moving
   * @returns True if the ball is moving, false otherwise
   */
  isMoving(): boolean {
    return isBodyMoving(this.body, this.velocityThreshold);
  }
  
  /**
   * Get ball position in world space
   * @returns Three.js Vector3 with ball position
   */
  getPosition(): THREE.Vector3 {
    const translation = this.body.translation();
    return new THREE.Vector3(translation.x, translation.y, translation.z);
  }
  
  /**
   * Set ball position in world space
   * @param position New position for the ball
   */
  setPosition(position: THREE.Vector3): void {
    this.body.setTranslation({ x: position.x, y: position.y, z: position.z }, true);
  }
  
  /**
   * Get the ball's current linear velocity
   * @returns Three.js Vector3 with velocity
   */
  getLinearVelocity(): THREE.Vector3 {
    const linvel = this.body.linvel();
    return new THREE.Vector3(linvel.x, linvel.y, linvel.z);
  }
  
  /**
   * Get the ball's current angular velocity
   * @returns Three.js Vector3 with angular velocity
   */
  getAngularVelocity(): THREE.Vector3 {
    const angvel = this.body.angvel();
    return new THREE.Vector3(angvel.x, angvel.y, angvel.z);
  }
  
  /**
   * Enable or disable debug visualization
   * @param enabled Whether debug visualization should be enabled
   * @param scene The scene to add debug visuals to (required if enabling)
   */
  setDebugMode(enabled: boolean, scene?: THREE.Scene): void {
    this.debugMode = enabled;
    
    if (enabled && scene) {
      this.createDebugVisualization(scene);
    } else if (!enabled) {
      this.clearDebugVisualization();
    }
    
    console.log(`Debug visualization ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Set the interpolation factor for smoother visuals
   * @param factor Value between 0 (no interpolation) and 1 (max interpolation)
   */
  setInterpolationFactor(factor: number): void {
    // Clamp factor between 0 and 1
    this.interpolationFactor = Math.max(0, Math.min(1, factor));
    console.log(`Interpolation factor set to: ${this.interpolationFactor.toFixed(2)}`);
  }
  
  /**
   * Get the Three.js mesh for the ball
   */
  getMesh(): THREE.Mesh {
    return this.mesh;
  }
  
  /**
   * Get the Rapier rigid body for the ball
   */
  getBody(): RAPIER.RigidBody {
    return this.body;
  }
  
  /**
   * Clean up resources when disposing the ball
   */
  dispose(): void {
    // Clear debug visualization
    this.clearDebugVisualization();
    
    // Clear collision callbacks
    this.collisionCallbacks.clear();
    this.defaultCollisionCallback = null;
    
    // Remove the collider if it exists
    if (this.collider) {
      // In a real implementation, we would remove the collider from the world
      this.collider = null;
    }
    
    // Remove the body from the world
    // Actual removal will be implemented in a later subtask
    
    // Dispose of the mesh's geometry and material
    if (this.mesh) {
      this.mesh.geometry.dispose();
      if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach(material => material.dispose());
      } else {
        this.mesh.material.dispose();
      }
    }
  }
} 