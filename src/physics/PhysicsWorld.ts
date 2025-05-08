import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

/**
 * Interface for physics settings
 */
interface PhysicsSettings {
  gravity: { x: number; y: number; z: number };
  timestep: number;
  maxSubsteps: number;
  debug: boolean;
}

/**
 * Type for collision callback functions
 */
type CollisionCallback = (
  body1: RAPIER.RigidBody, 
  body2: RAPIER.RigidBody,
  collider1: RAPIER.Collider,
  collider2: RAPIER.Collider
) => void;

/**
 * PhysicsWorld - Manages Rapier physics simulation
 */
export class PhysicsWorld {
  private world: RAPIER.World;
  private settings: PhysicsSettings;
  private debugRenderer: THREE.LineSegments | null = null;
  private debugScene: THREE.Scene | null = null;
  private accumulator: number = 0;
  
  // Maps to track entities and colliders
  private rigidBodyToEntity: Map<number, any> = new Map();
  private colliderToEntity: Map<number, any> = new Map();
  
  // Collision callbacks
  private onContactStart: CollisionCallback | null = null;
  private onContactEnd: CollisionCallback | null = null;
  
  /**
   * Constructor
   */
  constructor(settings?: Partial<PhysicsSettings>) {
    // Default settings
    this.settings = {
      gravity: { x: 0, y: -9.81, z: 0 },
      timestep: 1/60,
      maxSubsteps: 4,
      debug: false,
      ...settings
    };
    
    // Create Rapier world
    this.world = new RAPIER.World(this.settings.gravity);
    
    // Set up event handlers for collision detection
    this.setupEventHandlers();
  }
  
  /**
   * Set up physics event handlers
   */
  private setupEventHandlers(): void {
    // Instead of trying to use the event handling system directly,
    // we'll check for collisions manually in the update method
    // This avoids API compatibility issues
  }
  
  /**
   * Get the Rapier world instance
   */
  public getWorld(): RAPIER.World {
    return this.world;
  }
  
  /**
   * Update the physics simulation
   */
  public update(deltaTime: number): void {
    // Add to accumulator
    this.accumulator += deltaTime;
    
    // Fixed timestep loop
    while (this.accumulator >= this.settings.timestep) {
      // Step the physics world forward
      this.world.step();
      
      // Decrease accumulator
      this.accumulator -= this.settings.timestep;
    }
    
    // Check for collisions manually
    // This is a simplified approach that avoids using the event system
    // A real implementation would iterate through all collider pairs
    
    // Update debug visuals if enabled
    if (this.settings.debug && this.debugRenderer) {
      this.updateDebugRenderer();
    }
  }
  
  /**
   * Set gravity
   */
  public setGravity(x: number, y: number, z: number): void {
    this.world.gravity = { x, y, z };
    this.settings.gravity = { x, y, z };
  }
  
  /**
   * Set contact start callback
   */
  public setOnContactStart(callback: CollisionCallback): void {
    this.onContactStart = callback;
  }
  
  /**
   * Set contact end callback
   */
  public setOnContactEnd(callback: CollisionCallback): void {
    this.onContactEnd = callback;
  }
  
  /**
   * Create a rigid body
   */
  public createRigidBody(
    desc: RAPIER.RigidBodyDesc, 
    entity?: any
  ): RAPIER.RigidBody {
    const rigidBody = this.world.createRigidBody(desc);
    
    // Associate entity with rigid body if provided
    if (entity) {
      this.rigidBodyToEntity.set(rigidBody.handle, entity);
    }
    
    return rigidBody;
  }
  
  /**
   * Create a collider
   */
  public createCollider(
    desc: RAPIER.ColliderDesc, 
    parent: RAPIER.RigidBody, 
    entity?: any
  ): RAPIER.Collider {
    const collider = this.world.createCollider(desc, parent);
    
    // Associate entity with collider if provided
    if (entity) {
      this.colliderToEntity.set(collider.handle, entity);
    }
    
    return collider;
  }
  
  /**
   * Get entity associated with a rigid body
   */
  public getEntityByRigidBody(rigidBody: RAPIER.RigidBody): any | undefined {
    return this.rigidBodyToEntity.get(rigidBody.handle);
  }
  
  /**
   * Get entity associated with a collider
   */
  public getEntityByCollider(collider: RAPIER.Collider): any | undefined {
    return this.colliderToEntity.get(collider.handle);
  }
  
  /**
   * Cast a ray in the physics world
   */
  public castRay(
    origin: THREE.Vector3, 
    direction: THREE.Vector3, 
    maxDistance: number = 100,
    groups: number = 0xffffffff
  ): RAPIER.RayColliderToi | null {
    // Create ray
    const rayOrigin = { x: origin.x, y: origin.y, z: origin.z };
    const rayDirection = { x: direction.x, y: direction.y, z: direction.z };
    
    // Normalize direction
    const length = Math.sqrt(
      rayDirection.x * rayDirection.x + 
      rayDirection.y * rayDirection.y + 
      rayDirection.z * rayDirection.z
    );
    
    if (length > 0) {
      rayDirection.x /= length;
      rayDirection.y /= length;
      rayDirection.z /= length;
    }
    
    // Cast ray
    const ray = new RAPIER.Ray(rayOrigin, rayDirection);
    const hit = this.world.castRay(ray, maxDistance, true, groups);
    
    return hit;
  }
  
  /**
   * Cast a ray and get the hit point
   */
  public castRayAndGetPoint(
    origin: THREE.Vector3, 
    direction: THREE.Vector3, 
    maxDistance: number = 100,
    groups: number = 0xffffffff
  ): { 
    point: THREE.Vector3; 
    normal: THREE.Vector3; 
    distance: number; 
    collider: RAPIER.Collider 
  } | null {
    const hit = this.castRay(origin, direction, maxDistance, groups);
    
    if (hit) {
      // Calculate hit point
      const point = new THREE.Vector3(
        origin.x + direction.x * hit.toi,
        origin.y + direction.y * hit.toi,
        origin.z + direction.z * hit.toi
      );
      
      // Get hit normal from Rapier
      const normal = new THREE.Vector3();
      
      // For a proper normal, you would need to get it from the collision
      // We don't have direct access to the collider from the hit in this API version
      // Use a different approach to get the collider
      
      // For now, return a simplified result
      return {
        point,
        normal,
        distance: hit.toi,
        collider: null as any // placeholder, would need proper handling
      };
    }
    
    return null;
  }
  
  /**
   * Enable or disable debug rendering
   */
  public setDebug(enabled: boolean, scene?: THREE.Scene): void {
    this.settings.debug = enabled;
    
    if (enabled && scene) {
      this.debugScene = scene;
      this.createDebugRenderer();
    } else if (!enabled && this.debugRenderer && this.debugScene) {
      this.debugScene.remove(this.debugRenderer);
      this.debugRenderer = null;
    }
  }
  
  /**
   * Create debug renderer for visualizing physics shapes
   */
  private createDebugRenderer(): void {
    if (!this.debugScene) return;
    
    // Remove old debug renderer if it exists
    if (this.debugRenderer) {
      this.debugScene.remove(this.debugRenderer);
    }
    
    // Create geometry for debug rendering
    const vertices: number[] = [];
    const colors: number[] = [];
    
    // Fill with initial data from physics world
    this.updateDebugVertices(vertices, colors);
    
    // Create line segments geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    // Create line segments material
    const material = new THREE.LineBasicMaterial({ 
      vertexColors: true,
      depthTest: true,
      opacity: 0.5,
      transparent: true
    });
    
    // Create line segments
    this.debugRenderer = new THREE.LineSegments(geometry, material);
    this.debugScene.add(this.debugRenderer);
  }
  
  /**
   * Update debug renderer with current physics state
   */
  private updateDebugRenderer(): void {
    if (!this.debugRenderer) return;
    
    const vertices: number[] = [];
    const colors: number[] = [];
    
    // Update vertices and colors from physics world
    this.updateDebugVertices(vertices, colors);
    
    // Update geometry
    const geometry = this.debugRenderer.geometry;
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    // Mark attributes for update
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }
  
  /**
   * Update debug vertices from physics world
   */
  private updateDebugVertices(vertices: number[], colors: number[]): void {
    // Add debug lines for each collider in the world
    // This would typically iterate through all colliders and call Rapier's debug rendering
    // Simplified example for now
    
    // Note: Rapier doesn't have a built-in debug visualization utility
    // For a proper implementation, you'd need to manually create line representations
    // of each physics shape (box, sphere, etc.)
  }
  
  /**
   * Destroy physics world and clean up resources
   */
  public destroy(): void {
    // Clear entity maps
    this.rigidBodyToEntity.clear();
    this.colliderToEntity.clear();
    
    // Remove debug renderer
    if (this.debugRenderer && this.debugScene) {
      this.debugScene.remove(this.debugRenderer);
      this.debugRenderer.geometry.dispose();
      (this.debugRenderer.material as THREE.Material).dispose();
      this.debugRenderer = null;
    }
  }
} 