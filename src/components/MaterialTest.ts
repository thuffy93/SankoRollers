import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Course } from '../models/Course';
import { TerrainGenerator } from '../models/TerrainGenerator';
import { WallGenerator } from '../models/WallGenerator';
import { MaterialManager, DEFAULT_MATERIALS } from '../models/MaterialManager';
import { createDynamicBody, addSphereCollider } from '../systems/PhysicsSystem';

/**
 * Test component for the material system
 */
export class MaterialTest {
  private scene: THREE.Scene;
  private world: RAPIER.World;
  private course: Course;
  private terrainGenerator: TerrainGenerator;
  private wallGenerator: WallGenerator;
  private materialManager: MaterialManager;
  
  // Test balls for different materials
  private testBalls: {
    mesh: THREE.Mesh;
    body: RAPIER.RigidBody;
    collider: RAPIER.Collider;
    surfaceId: string;
  }[] = [];
  
  /**
   * Create a new MaterialTest
   * @param scene THREE.js scene
   * @param world RAPIER physics world
   */
  constructor(scene: THREE.Scene, world: RAPIER.World) {
    this.scene = scene;
    this.world = world;
    
    // Create material manager
    this.materialManager = new MaterialManager();
    
    // Create a course with our material manager
    this.course = new Course(
      scene,
      world,
      'Material Test Course',
      'easy',
      3,
      this.materialManager
    );
    
    // Create generators with material manager
    this.terrainGenerator = new TerrainGenerator(world, this.materialManager);
    this.wallGenerator = new WallGenerator(world, this.materialManager);
    
    // Set up the material test environment
    this.setupTestEnvironment();
  }
  
  /**
   * Set up the test environment with various material surfaces
   */
  private setupTestEnvironment(): void {
    // Create different terrain sections with varied materials
    this.createTerrainSections();
    
    // Create walls with various materials
    this.createWalls();
    
    // Create test balls on different materials
    this.createTestBalls();
    
    console.log('Material test environment setup complete');
  }
  
  /**
   * Create terrain sections with different materials for testing
   */
  private createTerrainSections(): void {
    // Array of material types to test
    const terrainMaterials = [
      'grass', 'fairway', 'green', 'rough', 'sand', 'ice', 'mud'
    ];
    
    // Size of each terrain section
    const sectionSize = 10;
    
    // Position terrain sections in a grid
    let xPos = -((terrainMaterials.length - 1) * sectionSize) / 2;
    
    // Create a terrain section for each material
    terrainMaterials.forEach((materialType, index) => {
      const position = new THREE.Vector3(xPos, 0, 0);
      
      // Generate flat terrain with this material
      const terrain = this.terrainGenerator.generateFlatTerrain(
        `terrain-${materialType}`,
        position,
        {
          width: sectionSize,
          depth: sectionSize,
          materialType: materialType,
          widthSegments: 1,
          depthSegments: 1
        }
      );
      
      // Add terrain to course
      this.course.addTerrain(terrain);
      
      // Create a label for this material
      this.createTerrainLabel(position, materialType);
      
      // Move to next position
      xPos += sectionSize;
    });
    
    console.log('Created terrain sections with different materials');
  }
  
  /**
   * Create a text label for a terrain material
   * @param position Position of the terrain
   * @param materialType Material type name
   */
  private createTerrainLabel(position: THREE.Vector3, materialType: string): void {
    // Create a canvas for the label
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = 256;
    canvas.height = 64;
    
    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(materialType.toUpperCase(), canvas.width / 2, canvas.height / 2);
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create sprite material
    const material = new THREE.SpriteMaterial({ map: texture });
    
    // Create sprite
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.position.y = 0.1; // Slightly above the terrain
    
    // Scale the sprite
    sprite.scale.set(3, 0.75, 1);
    
    // Add to scene
    this.scene.add(sprite);
  }
  
  /**
   * Create walls with different materials
   */
  private createWalls(): void {
    // Array of material types for walls
    const wallMaterials = [
      'wall', 'metal', 'wood', 'stone', 'glass', 'rubber'
    ];
    
    // Create walls in a circular arrangement
    const radius = 25;
    const wallLength = 5;
    const wallHeight = 3;
    
    // Create a wall for each material
    wallMaterials.forEach((materialType, index) => {
      // Calculate position around the circle
      const angle = (index / wallMaterials.length) * Math.PI * 2;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      
      // Position and rotation
      const position = new THREE.Vector3(x, wallHeight / 2, z);
      const rotation = new THREE.Euler(0, angle + Math.PI / 2, 0);
      
      // Generate wall with this material
      const wall = this.wallGenerator.generateStraightWall(
        `wall-${materialType}`,
        position,
        rotation,
        {
          length: wallLength,
          height: wallHeight,
          thickness: 1,
          materialType: materialType
        }
      );
      
      // Add wall to course
      this.course.addWall(wall);
      
      // Create a label for this wall
      this.createWallLabel(position, materialType);
    });
    
    console.log('Created walls with different materials');
  }
  
  /**
   * Create a text label for a wall material
   * @param position Position of the wall
   * @param materialType Material type name
   */
  private createWallLabel(position: THREE.Vector3, materialType: string): void {
    // Create a canvas for the label
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = 256;
    canvas.height = 64;
    
    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(materialType.toUpperCase(), canvas.width / 2, canvas.height / 2);
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create sprite material
    const material = new THREE.SpriteMaterial({ map: texture });
    
    // Create sprite
    const sprite = new THREE.Sprite(material);
    
    // Position above the wall
    const labelPos = position.clone();
    labelPos.y += 2;
    sprite.position.copy(labelPos);
    
    // Scale the sprite
    sprite.scale.set(3, 0.75, 1);
    
    // Add to scene
    this.scene.add(sprite);
  }
  
  /**
   * Create test balls on different surfaces to demonstrate material physics
   */
  private createTestBalls(): void {
    // Array of terrain materials to place balls on
    const terrainMaterials = [
      'grass', 'fairway', 'green', 'rough', 'sand', 'ice', 'mud'
    ];
    
    // Size of each terrain section
    const sectionSize = 10;
    
    // Position terrain sections in a grid (must match the terrain creation)
    let xPos = -((terrainMaterials.length - 1) * sectionSize) / 2;
    
    // Create a test ball for each material
    terrainMaterials.forEach((materialType, index) => {
      // Ball position above the terrain
      const position = new THREE.Vector3(xPos, 1, 0);
      
      // Create ball with standard properties
      const geometry = new THREE.SphereGeometry(0.5, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.3,
        roughness: 0.2
      });
      const ballMesh = new THREE.Mesh(geometry, material);
      
      // Create physics for the ball
      const body = createDynamicBody(
        this.world,
        position,
        { type: 'test-ball', id: `ball-${materialType}` }
      );
      
      // Add collider for the ball
      const collider = addSphereCollider(
        this.world,
        body,
        0.5, // Ball radius
        { 
          friction: 0.5,
          restitution: 0.5
        }
      );
      
      // Set initial position
      body.setTranslation(position, true);
      
      // Add mesh to scene
      this.scene.add(ballMesh);
      
      // Store for updating
      this.testBalls.push({
        mesh: ballMesh,
        body,
        collider,
        surfaceId: materialType
      });
      
      // Move to next position
      xPos += sectionSize;
    });
    
    console.log('Created test balls on different surfaces');
  }
  
  /**
   * Update method to be called every frame
   */
  update(): void {
    // Update ball meshes to match their physics bodies
    this.testBalls.forEach(ball => {
      const position = ball.body.translation();
      ball.mesh.position.set(position.x, position.y, position.z);
      
      const rotation = ball.body.rotation();
      ball.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    });
  }
  
  /**
   * Apply an impulse to each ball to demonstrate physics differences
   */
  applyTestImpulse(): void {
    // Apply the same impulse to each ball
    this.testBalls.forEach(ball => {
      // Create a consistent impulse for testing
      const impulse = new RAPIER.Vector3(0, 2, -5);
      
      // Apply impulse at ball center
      ball.body.applyImpulse(impulse, true);
    });
    
    console.log('Applied test impulse to all balls');
  }
  
  /**
   * Dispose of resources
   */
  dispose(): void {
    // Remove test balls
    this.testBalls.forEach(ball => {
      this.scene.remove(ball.mesh);
      this.world.removeRigidBody(ball.body);
    });
    
    // Clear the course
    this.course.dispose();
  }
} 