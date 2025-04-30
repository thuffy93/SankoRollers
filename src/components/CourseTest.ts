import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Course, TerrainSection, Obstacle, Wall, Target } from '../models/Course';
import { TerrainGenerator } from '../models/TerrainGenerator';
import { WallGenerator } from '../models/WallGenerator';
import { createStaticBody, addBoxCollider } from '../systems/PhysicsSystem';

/**
 * Test component for the Course system
 */
export class CourseTest {
  private scene: THREE.Scene;
  private world: RAPIER.World;
  private course: Course;
  private terrainGenerator: TerrainGenerator;
  private wallGenerator: WallGenerator;
  
  /**
   * Create a new CourseTest instance
   * @param scene THREE.js scene
   * @param world Rapier physics world
   */
  constructor(scene: THREE.Scene, world: RAPIER.World) {
    this.scene = scene;
    this.world = world;
    
    // Create a new course
    this.course = new Course(
      scene,
      world,
      'Test Course',
      'easy',
      3
    );
    
    // Create generators
    this.terrainGenerator = new TerrainGenerator(world);
    this.wallGenerator = new WallGenerator(world);
    
    // Set up the test environment
    this.setupTestEnvironment();
  }
  
  /**
   * Set up the test environment
   */
  private setupTestEnvironment(): void {
    console.log('Setting up Course test environment');
    
    // Create a flat terrain as the base
    this.createFlatBaseTerrain();
    
    // Create a heightmap terrain for hills
    this.createHeightmapTerrain();
    
    // Create walls and boundaries
    this.createWallsAndBoundaries();
    
    // Set goal position
    this.course.setGoalPosition(new THREE.Vector3(0, 0, -20));
    
    // Create goal visualization
    this.createGoalVisualization();
  }
  
  /**
   * Create flat base terrain
   */
  private createFlatBaseTerrain(): void {
    // Create a flat terrain section
    const flatTerrain = this.terrainGenerator.generateFlatTerrain(
      'base-terrain',
      new THREE.Vector3(0, -0.1, 0), // Slightly below zero to avoid z-fighting
      {
        width: 50,
        depth: 50,
        materialType: 'grass',
        friction: 0.5,
        restitution: 0.3
      }
    );
    
    // Add to course
    this.course.addTerrain(flatTerrain);
    
    console.log('Added flat base terrain');
  }
  
  /**
   * Create heightmap terrain for hills
   */
  private createHeightmapTerrain(): void {
    // Generate a perlin noise heightmap
    const heightmapData = this.terrainGenerator.generatePerlinHeightmap(
      32, // width
      32, // depth
      {
        scale: 10, // Scale of the noise
        octaves: 3, // Number of noise layers
        persistence: 0.5, // How much each octave contributes
        lacunarity: 2.0, // How frequency increases with each octave
        seed: 12345 // Random seed for reproducibility
      }
    );
    
    // Create heightmap terrain section
    const heightmapTerrain = this.terrainGenerator.generateHeightmapTerrain(
      'hill-terrain',
      new THREE.Vector3(-15, 0, -15), // Position to the left and back
      heightmapData,
      {
        width: 20,
        depth: 20,
        minHeight: 0,
        maxHeight: 4, // Maximum height of hills
        materialType: 'grass',
        friction: 0.6, // Slightly more friction on hills
        restitution: 0.2 // Less bounce on hills
      }
    );
    
    // Add to course
    this.course.addTerrain(heightmapTerrain);
    
    console.log('Added heightmap terrain (hills)');
  }
  
  /**
   * Create walls and boundaries for the course
   */
  private createWallsAndBoundaries(): void {
    // Create boundary walls
    const boundaryWalls = this.wallGenerator.generateBoundary(
      'main-boundary',
      new THREE.Vector3(0, 0, 0), // Center of the course
      new THREE.Vector3(50, 2, 50), // Size of the boundary (width, height, length)
      {
        height: 2,
        thickness: 1,
        materialType: 'stone',
        color: 0x555555,
        friction: 0.3,
        restitution: 0.5
      }
    );
    
    // Add all boundary walls to the course
    boundaryWalls.forEach(wall => {
      this.course.addWall(wall);
    });
    
    // Create some internal walls for obstacles
    
    // A straight wall as an obstacle
    const obstacleWall = this.wallGenerator.generateStraightWall(
      'obstacle-wall-1',
      new THREE.Vector3(5, 1, 10), // Position
      new THREE.Euler(0, Math.PI / 4, 0), // Rotated 45 degrees
      {
        length: 8,
        height: 2,
        thickness: 0.5,
        materialType: 'wood',
        color: 0x8B4513, // Brown
        friction: 0.4,
        restitution: 0.2
      }
    );
    this.course.addWall(obstacleWall);
    
    // A curved wall
    const curvedWall = this.wallGenerator.generateCurvedWall(
      'curved-wall-1',
      new THREE.Vector3(-10, 0, 5), // Position
      {
        radius: 8,
        angleStart: Math.PI / 4, // 45 degrees
        angleEnd: Math.PI * 3/4, // 135 degrees
        height: 2,
        thickness: 0.5,
        materialType: 'metal',
        color: 0x999999, // Silver
        friction: 0.2,
        restitution: 0.8
      }
    );
    this.course.addWall(curvedWall);
    
    // A glass barrier
    const glassWall = this.wallGenerator.generateStraightWall(
      'glass-wall-1',
      new THREE.Vector3(0, 1, -10), // Position
      new THREE.Euler(0, 0, 0), // No rotation
      {
        length: 10,
        height: 1.5,
        thickness: 0.3,
        materialType: 'glass',
        friction: 0.1,
        restitution: 0.9
      }
    );
    this.course.addWall(glassWall);
    
    // Set course boundaries to match the physical walls
    this.course.setBoundaries({
      minX: -25,
      maxX: 25,
      minY: -5, // Allow for falling below terrain a bit
      maxY: 20, // Allow for high jumps
      minZ: -25,
      maxZ: 25
    });
    
    console.log('Added walls and boundaries');
  }
  
  /**
   * Create a visual representation of the goal
   */
  private createGoalVisualization(): void {
    const goalPosition = this.course.getGoalPosition();
    
    // Create a target looking mesh (red cylinder)
    const goalGeometry = new THREE.CylinderGeometry(1, 1, 0.2, 32);
    const goalMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000,
      roughness: 0.5,
      metalness: 0.5,
      emissive: 0x440000
    });
    const goalMesh = new THREE.Mesh(goalGeometry, goalMaterial);
    
    // Position the goal
    goalMesh.position.copy(goalPosition);
    
    // Add a collider for the goal
    const goalBody = createStaticBody(
      this.world,
      goalPosition,
      { type: 'goal', id: 'goal' }
    );
    
    const goalCollider = addBoxCollider(
      this.world,
      goalBody,
      { x: 1, y: 0.1, z: 1 }, // Size
      { friction: 0.2, restitution: 0.3 } // Properties
    );
    
    // Set the goal with mesh and collider
    this.course.setGoalPosition(goalPosition, goalMesh, goalCollider);
    
    console.log('Added goal visualization');
  }
  
  /**
   * Get the course instance
   * @returns Course instance
   */
  getCourse(): Course {
    return this.course;
  }
  
  /**
   * Update the course test
   * @param deltaTime Time since last update
   */
  update(deltaTime: number = 1/60): void {
    // Call the course update method
    this.course.update(deltaTime);
  }
  
  /**
   * Dispose of resources
   */
  dispose(): void {
    // The course's dispose method will clean up all elements
    this.course.dispose();
  }
} 