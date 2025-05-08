import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

/**
 * TerrainEntity - Represents the terrain that the ball rolls on
 */
export class TerrainEntity {
  private scene: THREE.Scene;
  private world: RAPIER.World;
  private mesh: THREE.Mesh;
  private rigidBody: RAPIER.RigidBody;
  private collider: RAPIER.Collider;
  
  // Terrain properties
  private width: number = 20;
  private depth: number = 20;
  private segments: number = 32;
  private friction: number = 0.8;
  private restitution: number = 0.2;
  
  /**
   * Constructor
   */
  constructor(scene: THREE.Scene, world: RAPIER.World) {
    this.scene = scene;
    this.world = world;
    
    // Create terrain mesh
    this.createMesh();
    
    // Create physics body and collider
    this.createPhysics();
  }
  
  /**
   * Create the terrain mesh
   */
  private createMesh(): void {
    // Create flat terrain geometry
    // For now, we'll use a simple plane, but later we can use a heightmap
    const geometry = new THREE.PlaneGeometry(
      this.width, this.depth, this.segments, this.segments
    );
    
    // Create terrain material
    const material = new THREE.MeshStandardMaterial({
      color: 0x00aa00, // Green
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    
    // Create mesh
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    this.mesh.receiveShadow = true;
    
    // Add to scene
    this.scene.add(this.mesh);
    
    // Add grid helper for visualization
    const gridHelper = new THREE.GridHelper(this.width, this.segments);
    this.scene.add(gridHelper);
    
    // Add ground plane (for aesthetic)
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x445544,
      roughness: 1.0,
      metalness: 0.0,
      side: THREE.DoubleSide
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01; // Slightly below terrain
    ground.receiveShadow = true;
    this.scene.add(ground);
  }
  
  /**
   * Create physics body and collider
   */
  private createPhysics(): void {
    // Create a static rigid body for the terrain
    const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
    this.rigidBody = this.world.createRigidBody(rigidBodyDesc);
    
    // Create a cuboid collider for the flat terrain
    // Note: Using half extents for cuboid (half of width/height)
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      this.width / 2, 0.1, this.depth / 2 // Half extents (x, y, z)
    )
      .setTranslation(0, -0.1, 0) // Slight offset to align with visual mesh
      .setFriction(this.friction)
      .setRestitution(this.restitution);
    
    this.collider = this.world.createCollider(colliderDesc, this.rigidBody);
  }
  
  /**
   * Create a heightmap terrain (for more complex terrain)
   * This would replace the current flat terrain
   */
  public createHeightmapTerrain(heightData: Float32Array, width: number, depth: number): void {
    // Remove existing terrain
    this.scene.remove(this.mesh);
    
    // Create new geometry from heightmap
    const geometry = new THREE.PlaneGeometry(
      width, depth, this.segments, this.segments
    );
    
    // Apply height data to vertices
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < heightData.length; i++) {
      // In PlaneGeometry, the y component is the height (when rotated)
      vertices[i * 3 + 2] = heightData[i];
    }
    
    // Update geometry
    geometry.computeVertexNormals();
    
    // Create new mesh
    const material = new THREE.MeshStandardMaterial({
      color: 0x00aa00,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.receiveShadow = true;
    
    // Add to scene
    this.scene.add(this.mesh);
    
    // Create heightfield collider
    // Note: Rapier requires a specific format for heightfield data
    // This would need to be implemented based on Rapier's requirements
  }
  
  /**
   * Update method - called every frame
   */
  public update(): void {
    // Nothing to update for static terrain
    // But we'll keep this method for consistency
  }
  
  /**
   * Get rigid body
   */
  public getRigidBody(): RAPIER.RigidBody {
    return this.rigidBody;
  }
  
  /**
   * Get collider
   */
  public getCollider(): RAPIER.Collider {
    return this.collider;
  }
  
  /**
   * Get terrain mesh
   */
  public getMesh(): THREE.Mesh {
    return this.mesh;
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    // Remove from scene
    this.scene.remove(this.mesh);
    
    // Dispose geometry and material
    this.mesh.geometry.dispose();
    
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach(material => material.dispose());
    } else {
      this.mesh.material.dispose();
    }
  }
} 