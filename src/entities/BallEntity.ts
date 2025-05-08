import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventSystem, GameEvents } from '../utils/EventSystem';

/**
 * BallEntity - Represents the player-controlled ball
 */
export class BallEntity {
  private scene: THREE.Scene;
  private world: RAPIER.World;
  private mesh: THREE.Mesh;
  private rigidBody: RAPIER.RigidBody;
  private collider: RAPIER.Collider;
  private radius: number = 0.5;
  private isMoving: boolean = false;
  private minVelocityThreshold: number = 0.1;
  private tempVec3: THREE.Vector3 = new THREE.Vector3();
  private eventSystem: EventSystem;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3();
  
  // Ball physics properties
  private restitution: number = 0.7; // Bounciness
  private friction: number = 0.3;    // Surface friction
  private mass: number = 1;          // Mass in kg
  private linearDamping: number = 0.5; // Resistance to linear movement
  private angularDamping: number = 0.2; // Resistance to rotation
  
  /**
   * Constructor
   */
  constructor(scene: THREE.Scene, world: RAPIER.World) {
    this.scene = scene;
    this.world = world;
    this.eventSystem = EventSystem.getInstance();
    
    // Create ball mesh
    this.createMesh();
    
    // Create physics body and collider
    this.createPhysics();
  }
  
  /**
   * Create the ball mesh
   */
  private createMesh(): void {
    // Create ball geometry
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
    
    // Create ball material
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.3,
      roughness: 0.2,
    });
    
    // Create mesh
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = false;
    
    // Add to scene
    this.scene.add(this.mesh);
  }
  
  /**
   * Create physics body and collider
   */
  private createPhysics(): void {
    // Create rigid body
    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, this.radius + 0.01, 0) // Slightly above ground
      .setLinearDamping(this.linearDamping)
      .setAngularDamping(this.angularDamping)
      .setCcdEnabled(true); // Continuous collision detection for fast objects
    
    this.rigidBody = this.world.createRigidBody(rigidBodyDesc);
    
    // Create collider
    const colliderDesc = RAPIER.ColliderDesc.ball(this.radius)
      .setRestitution(this.restitution)
      .setFriction(this.friction)
      .setDensity(this.mass);
    
    this.collider = this.world.createCollider(colliderDesc, this.rigidBody);
  }
  
  /**
   * Update ball position and rotation based on physics
   */
  public update(): void {
    // Get position from physics
    const position = this.rigidBody.translation();
    this.mesh.position.set(position.x, position.y, position.z);
    
    // Get rotation from physics (quaternion)
    const rotation = this.rigidBody.rotation();
    this.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    
    // Check if ball has stopped moving
    this.checkIfStopped();
  }
  
  /**
   * Apply impulse force to the ball
   */
  public applyImpulse(impulse: THREE.Vector3, point?: THREE.Vector3): void {
    // Convert impulse to Rapier format
    const rapierImpulse = { x: impulse.x, y: impulse.y, z: impulse.z };
    
    // Apply impulse at center of mass if no point specified
    if (!point) {
      this.rigidBody.applyImpulse(rapierImpulse, true);
      this.isMoving = true;
    } else {
      // Convert point to Rapier format
      const rapierPoint = { x: point.x, y: point.y, z: point.z };
      
      // Apply impulse at specific point
      this.rigidBody.applyImpulseAtPoint(rapierImpulse, rapierPoint, true);
      this.isMoving = true;
    }
    
    // Emit the ball moving event
    this.eventSystem.emit(GameEvents.BALL_MOVING);
  }
  
  /**
   * Apply torque to the ball (for spin)
   */
  public applyTorque(torque: THREE.Vector3): void {
    // Convert torque to Rapier format
    const rapierTorque = { x: torque.x, y: torque.y, z: torque.z };
    
    // Apply torque
    this.rigidBody.applyTorqueImpulse(rapierTorque, true);
  }
  
  /**
   * Set the ball position
   */
  public setPosition(position: THREE.Vector3): void {
    // Update physics body position
    this.rigidBody.setTranslation(
      { x: position.x, y: position.y, z: position.z },
      true // Wake the body
    );
    
    // Update mesh position
    this.mesh.position.copy(position);
  }
  
  /**
   * Get the ball position
   */
  public getPosition(): THREE.Vector3 {
    // Get position from physics
    const position = this.rigidBody.translation();
    return new THREE.Vector3(position.x, position.y, position.z);
  }
  
  /**
   * Get the ball's velocity vector
   */
  public getVelocity(): THREE.Vector3 {
    if (!this.rigidBody) {
      return new THREE.Vector3();
    }
    
    const velocity = this.rigidBody.linvel();
    return new THREE.Vector3(velocity.x, velocity.y, velocity.z);
  }
  
  /**
   * Get the ball angular velocity
   */
  public getAngularVelocity(): THREE.Vector3 {
    // Get angular velocity from physics
    const angVel = this.rigidBody.angvel();
    return new THREE.Vector3(angVel.x, angVel.y, angVel.z);
  }
  
  /**
   * Reset the ball to starting position
   */
  public reset(): void {
    // Stop all movement
    this.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    
    // Reset position
    this.setPosition(new THREE.Vector3(0, this.radius + 0.01, 0));
    
    // Reset flag
    this.isMoving = false;
  }
  
  /**
   * Check if the ball has stopped moving
   */
  private checkIfStopped(): void {
    if (!this.isMoving) return;
    
    // Get current velocity
    const velocity = this.getVelocity();
    const speed = velocity.length();
    
    // Check if below threshold and not in air
    if (speed < this.minVelocityThreshold) {
      // Ball has stopped
      this.isMoving = false;
      
      // Emit ball stopped event through the event system
      this.eventSystem.emit(GameEvents.BALL_STOPPED, this.getPosition());
    }
  }
  
  /**
   * Get the rigid body
   */
  public getRigidBody(): RAPIER.RigidBody {
    return this.rigidBody;
  }
  
  /**
   * Get the collider
   */
  public getCollider(): RAPIER.Collider {
    return this.collider;
  }
  
  /**
   * Get the mesh
   */
  public getMesh(): THREE.Mesh {
    return this.mesh;
  }
  
  /**
   * Get the ball radius
   */
  public getRadius(): number {
    return this.radius;
  }
  
  /**
   * Get whether the ball is moving
   */
  public isMovingState(): boolean {
    return this.isMoving;
  }
  
  /**
   * Set whether the ball is moving or not
   */
  public setMoving(isMoving: boolean): void {
    // Only update if the state is changing
    if (this.isMoving !== isMoving) {
      this.isMoving = isMoving;
      
      // Update the camera target based on movement state
      if (this.isMoving) {
        // When moving, target the actual position
        this.cameraTarget = this.getPosition();
      } else {
        // When stopped, keep the last position as target
        this.cameraTarget = this.getPosition().clone();
        
        // Don't emit the event here - let the Game class handle it
        // This was causing an infinite recursion loop
        // this.eventSystem.emit(GameEvents.BALL_STOPPED);
      }
    }
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    // Remove mesh from scene
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
    
    // Dispose geometry and material
    if (this.mesh) {
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
      
      if (this.mesh.material) {
        if (Array.isArray(this.mesh.material)) {
          this.mesh.material.forEach(material => material.dispose());
        } else {
          this.mesh.material.dispose();
        }
      }
    }
  }
} 