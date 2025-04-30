import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Course, TerrainSection, Wall, Obstacle, Target } from './Course';
import { TerrainGenerator } from './TerrainGenerator';
import { WallGenerator } from './WallGenerator';
import { MaterialManager } from './MaterialManager';
import { 
  CourseConfig, 
  TerrainConfig, 
  WallConfig, 
  ObstacleConfig, 
  TargetConfig, 
  GoalConfig,
  BoundariesConfig,
  configToVector3,
  configToEuler,
  BoxDimensions,
  CylinderDimensions,
  SphereDimensions
} from './CourseConfig';
import { createStaticBody, addBoxCollider, addSphereCollider, addCylinderCollider } from '../systems/PhysicsSystem';

/**
 * Error thrown when course validation fails
 */
export class CourseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CourseValidationError';
  }
}

/**
 * Class for loading courses from configuration objects
 */
export class CourseLoader {
  private scene: THREE.Scene;
  private world: RAPIER.World;
  private materialManager: MaterialManager;
  private terrainGenerator: TerrainGenerator;
  private wallGenerator: WallGenerator;
  
  /**
   * Create a new CourseLoader
   * @param scene THREE.js scene
   * @param world Rapier physics world
   * @param materialManager Optional material manager to use
   */
  constructor(
    scene: THREE.Scene, 
    world: RAPIER.World,
    materialManager?: MaterialManager
  ) {
    this.scene = scene;
    this.world = world;
    this.materialManager = materialManager || new MaterialManager();
    this.terrainGenerator = new TerrainGenerator(world, this.materialManager);
    this.wallGenerator = new WallGenerator(world, this.materialManager);
  }
  
  /**
   * Load a course from a configuration object
   * @param config Course configuration
   * @returns The loaded course
   * @throws CourseValidationError if validation fails
   */
  public loadCourse(config: CourseConfig): Course {
    // Validate configuration
    this.validateConfig(config);
    
    // Create a new course
    const course = new Course(
      this.scene,
      this.world,
      config.name,
      config.difficulty,
      config.par,
      this.materialManager
    );
    
    // Load course elements
    this.loadTerrain(course, config.terrain);
    
    if (config.walls && config.walls.length > 0) {
      this.loadWalls(course, config.walls);
    }
    
    if (config.obstacles && config.obstacles.length > 0) {
      this.loadObstacles(course, config.obstacles);
    }
    
    if (config.targets && config.targets.length > 0) {
      this.loadTargets(course, config.targets);
    }
    
    // Set goal position
    this.setupGoal(course, config.goal);
    
    // Set boundaries
    if (config.boundaries) {
      this.setupBoundaries(course, config.boundaries);
    }
    
    console.log(`Course '${config.name}' loaded successfully`);
    
    // Return the loaded course
    return course;
  }
  
  /**
   * Validate course configuration
   * @param config Course configuration
   * @throws CourseValidationError if validation fails
   */
  private validateConfig(config: CourseConfig): void {
    const errors: string[] = [];
    
    // Check required fields
    if (!config.name) {
      errors.push('Course name is required');
    }
    
    if (!config.difficulty) {
      errors.push('Course difficulty is required');
    }
    
    if (config.par === undefined || config.par <= 0) {
      errors.push('Course par must be a positive number');
    }
    
    // Check terrain
    if (!config.terrain || config.terrain.length === 0) {
      errors.push('Course must have at least one terrain section');
    }
    
    // Check goal
    if (!config.goal || !config.goal.position) {
      errors.push('Course must have a goal position');
    }
    
    // If there are errors, throw a validation error
    if (errors.length > 0) {
      throw new CourseValidationError(`Course validation failed: ${errors.join(', ')}`);
    }
  }
  
  /**
   * Load terrain sections
   * @param course Course to load terrain into
   * @param terrainConfigs Terrain configurations
   */
  private loadTerrain(course: Course, terrainConfigs: TerrainConfig[]): void {
    for (const config of terrainConfigs) {
      try {
        const position = configToVector3(config.position);
        
        // Create terrain based on geometry type
        let terrain: TerrainSection;
        
        if (config.geometry === 'flat') {
          terrain = this.terrainGenerator.generateFlatTerrain(
            config.id,
            position,
            {
              width: config.dimensions.width,
              depth: config.dimensions.depth,
              materialType: config.materialType
            }
          );
        } else if (config.geometry === 'heightmap' && config.heightmapData) {
          // Convert 2D array of height values to Float32Array
          const heightValues = this.flattenHeightmapData(config.heightmapData);
          
          terrain = this.terrainGenerator.generateHeightmapTerrain(
            config.id,
            position,
            heightValues,
            {
              width: config.dimensions.width,
              depth: config.dimensions.depth,
              materialType: config.materialType
            }
          );
        } else {
          console.warn(`Unsupported terrain geometry type: ${config.geometry}`);
          continue;
        }
        
        // Add terrain to course
        course.addTerrain(terrain);
      } catch (error) {
        console.error(`Error loading terrain '${config.id}':`, error);
      }
    }
  }
  
  /**
   * Load walls
   * @param course Course to load walls into
   * @param wallConfigs Wall configurations
   */
  private loadWalls(course: Course, wallConfigs: WallConfig[]): void {
    for (const config of wallConfigs) {
      try {
        const position = configToVector3(config.position);
        let wall: Wall;
        
        if (config.type === 'straight') {
          const rotation = config.rotation 
            ? configToEuler(config.rotation) 
            : new THREE.Euler();
            
          wall = this.wallGenerator.generateStraightWall(
            config.id,
            position,
            rotation,
            {
              length: config.dimensions.length,
              height: config.dimensions.height,
              thickness: config.dimensions.thickness,
              materialType: config.materialType
            }
          );
        } else if (config.type === 'curved' && config.curve) {
          wall = this.wallGenerator.generateCurvedWall(
            config.id,
            position,
            {
              radius: config.curve.radius,
              angleStart: config.curve.angleStart,
              angleEnd: config.curve.angleEnd,
              segments: config.curve.segments,
              height: config.dimensions.height,
              thickness: config.dimensions.thickness,
              materialType: config.materialType
            }
          );
        } else {
          console.warn(`Unsupported wall type: ${config.type}`);
          continue;
        }
        
        // Add wall to course
        course.addWall(wall);
      } catch (error) {
        console.error(`Error loading wall '${config.id}':`, error);
      }
    }
  }
  
  /**
   * Load obstacles
   * @param course Course to load obstacles into
   * @param obstacleConfigs Obstacle configurations
   */
  private loadObstacles(course: Course, obstacleConfigs: ObstacleConfig[]): void {
    for (const config of obstacleConfigs) {
      try {
        const position = configToVector3(config.position);
        const rotation = config.rotation 
          ? configToEuler(config.rotation)
          : new THREE.Euler();
        
        // Create obstacle based on type
        const obstacle = this.createObstacle(
          config.id,
          position,
          rotation,
          config.type,
          config.dimensions,
          config.materialType
        );
        
        // Add obstacle to course
        course.addObstacle(obstacle);
      } catch (error) {
        console.error(`Error loading obstacle '${config.id}':`, error);
      }
    }
  }
  
  /**
   * Load targets
   * @param course Course to load targets into
   * @param targetConfigs Target configurations
   */
  private loadTargets(course: Course, targetConfigs: TargetConfig[]): void {
    for (const config of targetConfigs) {
      try {
        const position = configToVector3(config.position);
        
        // Create target
        const target: Target = {
          id: config.id,
          position: position.clone(),
          isHit: false
        };
        
        // Create visual representation
        const geometry = new THREE.SphereGeometry(config.radius, 16, 16);
        const material = config.materialType && this.materialManager
          ? this.materialManager.createThreeMaterial(config.materialType)
          : new THREE.MeshStandardMaterial({ 
              color: 0xff0000,
              emissive: 0x330000
            });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        target.mesh = mesh;
        
        // Create collider
        const body = createStaticBody(
          this.world,
          position,
          { type: 'target', id: config.id } 
        );
        
        const collider = addSphereCollider(
          this.world,
          body,
          config.radius,
          { isSensor: true } // Make it a sensor so it doesn't affect physics
        );
        
        target.collider = collider;
        
        // Add target to course
        course.addTarget(target);
      } catch (error) {
        console.error(`Error loading target '${config.id}':`, error);
      }
    }
  }
  
  /**
   * Setup goal
   * @param course Course to setup goal in
   * @param goalConfig Goal configuration
   */
  private setupGoal(course: Course, goalConfig: GoalConfig): void {
    try {
      const position = configToVector3(goalConfig.position);
      
      // Create visual representation
      const geometry = new THREE.CylinderGeometry(
        goalConfig.radius,
        goalConfig.radius,
        0.2,
        32
      );
      
      const material = goalConfig.materialType && this.materialManager
        ? this.materialManager.createThreeMaterial(goalConfig.materialType)
        : new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            emissive: 0x330000,
            roughness: 0.5,
            metalness: 0.5
          });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      
      // Create collider
      const body = createStaticBody(
        this.world,
        position,
        { type: 'goal', id: 'goal' }
      );
      
      const collider = addBoxCollider(
        this.world,
        body,
        { x: goalConfig.radius, y: 0.1, z: goalConfig.radius },
        { isSensor: true } // Make it a sensor so it doesn't affect physics
      );
      
      // Set goal position with mesh and collider
      course.setGoalPosition(position, mesh, collider);
    } catch (error) {
      console.error('Error setting up goal:', error);
    }
  }
  
  /**
   * Setup boundaries
   * @param course Course to setup boundaries in
   * @param boundariesConfig Boundaries configuration
   */
  private setupBoundaries(course: Course, boundariesConfig: BoundariesConfig): void {
    try {
      // Set course boundaries
      course.setBoundaries({
        minX: boundariesConfig.minX,
        maxX: boundariesConfig.maxX,
        minY: boundariesConfig.minY,
        maxY: boundariesConfig.maxY,
        minZ: boundariesConfig.minZ,
        maxZ: boundariesConfig.maxZ
      });
      
      // Optionally create wall boundaries
      if (boundariesConfig.wallHeight) {
        const wallHeight = boundariesConfig.wallHeight;
        const materialType = boundariesConfig.wallMaterialType || 'wall';
        
        // Calculate size
        const width = boundariesConfig.maxX - boundariesConfig.minX;
        const depth = boundariesConfig.maxZ - boundariesConfig.minZ;
        const centerX = (boundariesConfig.minX + boundariesConfig.maxX) / 2;
        const centerZ = (boundariesConfig.minZ + boundariesConfig.maxZ) / 2;
        
        // Generate boundary walls
        const walls = this.wallGenerator.generateBoundary(
          'boundary',
          new THREE.Vector3(centerX, 0, centerZ),
          new THREE.Vector3(width, wallHeight, depth),
          {
            height: wallHeight,
            thickness: 1,
            materialType: materialType
          }
        );
        
        // Add walls to course
        walls.forEach(wall => course.addWall(wall));
      }
    } catch (error) {
      console.error('Error setting up boundaries:', error);
    }
  }
  
  /**
   * Create obstacle from configuration
   * @param id Obstacle ID
   * @param position Position
   * @param rotation Rotation
   * @param type Obstacle type
   * @param dimensions Dimensions
   * @param materialType Material type
   * @returns Created obstacle
   */
  private createObstacle(
    id: string,
    position: THREE.Vector3,
    rotation: THREE.Euler,
    type: string,
    dimensions: any,
    materialType: string
  ): Obstacle {
    let geometry: THREE.BufferGeometry;
    let mesh: THREE.Mesh;
    let body: RAPIER.RigidBody;
    let collider: RAPIER.Collider;
    
    // Create body
    body = createStaticBody(
      this.world,
      position,
      { type: 'obstacle', id }
    );
    
    // Get material properties
    let friction = 0.3;
    let restitution = 0.5;
    
    if (this.materialManager) {
      const properties = this.materialManager.getPhysicsProperties(materialType);
      friction = properties.friction;
      restitution = properties.restitution;
    }
    
    // Create geometry and collider based on type
    if (type === 'box') {
      const { width, height, depth } = dimensions as BoxDimensions;
      
      // Create geometry
      geometry = new THREE.BoxGeometry(width, height, depth);
      
      // Create collider
      collider = addBoxCollider(
        this.world,
        body,
        { x: width / 2, y: height / 2, z: depth / 2 },
        { friction, restitution }
      );
    } else if (type === 'cylinder') {
      const { radius, height, radialSegments } = dimensions as CylinderDimensions;
      
      // Create geometry
      geometry = new THREE.CylinderGeometry(
        radius, 
        radius, 
        height, 
        radialSegments || 32
      );
      
      // Create collider
      collider = addCylinderCollider(
        this.world,
        body,
        height / 2,
        radius,
        { friction, restitution }
      );
    } else if (type === 'sphere') {
      const { radius, widthSegments, heightSegments } = dimensions as SphereDimensions;
      
      // Create geometry
      geometry = new THREE.SphereGeometry(
        radius, 
        widthSegments || 32, 
        heightSegments || 16
      );
      
      // Create collider
      collider = addSphereCollider(
        this.world,
        body,
        radius,
        { friction, restitution }
      );
    } else {
      throw new Error(`Unsupported obstacle type: ${type}`);
    }
    
    // Create material
    const material = this.materialManager 
      ? this.materialManager.createThreeMaterial(materialType)
      : new THREE.MeshStandardMaterial({ color: 0x999999 });
    
    // Create mesh
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.rotation.copy(rotation);
    
    // Set shadows
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Create obstacle
    const obstacle: Obstacle = {
      id,
      position: position.clone(),
      type: type as any,
      dimensions,
      rotation: rotation.clone(),
      mesh,
      collider,
      materialType
    };
    
    // Apply material if materialManager is provided
    if (this.materialManager && mesh && collider) {
      this.materialManager.applyMaterialToObstacle(mesh, collider, materialType);
    }
    
    return obstacle;
  }
  
  /**
   * Convert 2D heightmap data to Float32Array
   * @param heightmapData 2D array of height values
   * @returns Float32Array of height values
   */
  private flattenHeightmapData(heightmapData: number[][]): Float32Array {
    const width = heightmapData.length;
    const height = heightmapData[0].length;
    const data = new Float32Array(width * height);
    
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < height; z++) {
        data[x + z * width] = heightmapData[x][z];
      }
    }
    
    return data;
  }
} 