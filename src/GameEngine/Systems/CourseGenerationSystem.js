// src/GameEngine/Systems/CourseGenerationSystem.js
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import System from '../ECS/System';
import Entity from '../ECS/Entity';
import Transform from '../Components/Transform';
import Renderer from '../Components/Renderer';
import Collider from '../Components/Collider';
import Physics from '../Components/Physics';
import PowerUp from '../Components/PowerUp';

/**
 * CourseGenerationSystem - Generates procedural courses
 */
class CourseGenerationSystem extends System {
  /**
   * Create a new course generation system
   * @param {World} world - Reference to the world
   */
  constructor(world) {
    super(world);
    this.requiredComponents = ['Course'];
    this.priority = 20; // Run after physics but before other systems
    
    // Noise generator for terrain
    this.noise = createNoise2D();
    
    // Course elements
    this.courseElements = [];
    this.powerUps = [];
  }
  
  /**
   * Initialize the system
   */
  init() {
    // Listen for hole completed event
    this.world.on('holeCompleted', this.handleHoleCompleted.bind(this));
    
    // Generate initial course if course entity exists
    const entities = this.getCompatibleEntities();
    if (entities.length > 0) {
      this.generateCourse(entities[0]);
    }
  }
  
  /**
   * Update the system
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    // No per-frame updates needed for course generation
    // Course is generated when needed
  }
  
  /**
   * Handle hole completed event
   * @param {Object} data - Event data
   */
  handleHoleCompleted(data) {
    const entity = data.entity;
    const course = data.course;
    
    if (!entity || !course) return;
    
    // Wait a moment before moving to next hole
    setTimeout(() => {
      if (course.holeCompleted && !course.gameCompleted) {
        // Move to next hole
        const success = course.nextHole();
        
        if (success) {
          // Generate new course for next hole
          this.generateCourse(entity);
        }
      }
    }, 3000);
  }
  
  /**
   * Generate a new course
   * @param {Entity} entity - Entity with Course component
   */
  generateCourse(entity) {
    const course = entity.getComponent('Course');
    if (!course) return;
    
    // Clear existing course elements
    this.clearCourse();
    
    // Apply daily modifier
    course.applyDailyModifier();
    
    // Generate terrain
    this.generateTerrain(course);
    
    // Add walls
    this.addWalls(course);
    
    // Add obstacles based on difficulty
    this.addObstacles(course);
    
    // Add power-ups
    this.addPowerUps(course);
    
    // Add the hole (target)
    this.addHole(course);
    
    // Reset ball position
    this.resetBallPosition(entity, course);
    
    // Trigger course generated event
    this.world.triggerEvent('courseGenerated', {
      entity,
      course
    });
  }
  
  /**
   * Clear existing course elements
   */
  clearCourse() {
    // Remove course element entities
    for (const entityId of this.courseElements) {
      const entity = this.world.getEntity(entityId);
      if (entity) {
        this.world.removeEntity(entity);
      }
    }
    
    // Remove power-up entities
    for (const entityId of this.powerUps) {
      const entity = this.world.getEntity(entityId);
      if (entity) {
        this.world.removeEntity(entity);
      }
    }
    
    // Clear arrays
    this.courseElements = [];
    this.powerUps = [];
  }
  
  /**
   * Generate terrain
   * @param {Course} course - Course component
   */
  generateTerrain(course) {
    const size = 30;
    const resolution = 60; // Higher = more detailed
    const geometry = new THREE.PlaneGeometry(size, size, resolution, resolution);
    
    // Apply Perlin noise to vertices
    const vertices = geometry.attributes.position.array;
    const heights = [];
    
    // Use course seed for consistent generation
    const seed = course.seed;
    let currentSeed = seed;
    
    // Simple seeded random function
    const seededRandom = () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
    
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];
      
      // Generate height using noise
      const scale = 0.1; // Scale of noise
      const height = this.noise(x * scale + seed, z * scale + seed) * (0.5 + course.difficulty * 0.3);
      
      // Apply height to y-coordinate (with some smoothing for the center area)
      const distFromCenter = Math.sqrt(x * x + z * z);
      const centerSmoothing = Math.max(0, 1 - distFromCenter / 5); // Smooth center area
      vertices[i + 1] = height * (1 - centerSmoothing * 0.8);
      
      // Store heights for heightfield physics
      heights.push(vertices[i + 1]);
    }
    
    geometry.computeVertexNormals();
    
    // Create terrain mesh
    const material = new THREE.MeshStandardMaterial({
      color: 0x222266,
      roughness: 0.8,
      metalness: 0.2,
      wireframe: false
    });
    
    // Create terrain entity
    const terrainEntity = new Entity();
    
    // Add transform component
    const transform = new Transform({
      position: { x: 0, y: 0, z: 0 },
      rotation: new THREE.Euler(-Math.PI / 2, 0, 0)
    });
    terrainEntity.addComponent('Transform', transform);
    
    // Add renderer component
    const renderer = new Renderer({
      type: 'mesh',
      geometry: geometry,
      material: {
        type: 'MeshStandardMaterial',
        color: 0x222266,
        roughness: 0.8,
        metalness: 0.2
      },
      receiveShadow: true
    });
    terrainEntity.addComponent('Renderer', renderer);
    
    // Add physics component
    const physics = new Physics({
      isStatic: true
    });
    terrainEntity.addComponent('Physics', physics);
    
    // Add collider component
    // Create a simplified collider - in a real game, you'd use a heightfield collider
    const collider = new Collider({
      type: 'box',
      size: { x: size / 2, y: 0.1, z: size / 2 },
      material: 'default'
    });
    terrainEntity.addComponent('Collider', collider);
    
    // Add tag
    terrainEntity.addTag('terrain');
    
    // Add to world
    this.world.addEntity(terrainEntity);
    
    // Store in course elements
    this.courseElements.push(terrainEntity.id);
    
    // Store in course
    course.terrain = terrainEntity.id;
    
    return terrainEntity;
  }
  
  /**
   * Add walls around the course
   * @param {Course} course - Course component
   */
  addWalls(course) {
    const wallMaterial = {
      type: 'MeshStandardMaterial',
      color: 0x6666ff,
      emissive: 0x0000ff,
      emissiveIntensity: 0.2,
      metalness: 0.5,
      roughness: 0.2
    };
    
    const wallHeight = 3;
    const wallThickness = 1;
    const courseSize = 30;
    
    // Wall positions and sizes
    const walls = [
      // Left wall
      {
        size: { x: wallThickness, y: wallHeight, z: courseSize },
        position: { x: -courseSize/2 - wallThickness/2, y: wallHeight/2, z: 0 }
      },
      // Right wall
      {
        size: { x: wallThickness, y: wallHeight, z: courseSize },
        position: { x: courseSize/2 + wallThickness/2, y: wallHeight/2, z: 0 }
      },
      // Back wall
      {
        size: { x: courseSize + wallThickness*2, y: wallHeight, z: wallThickness },
        position: { x: 0, y: wallHeight/2, z: -courseSize/2 - wallThickness/2 }
      },
      // Front wall
      {
        size: { x: courseSize + wallThickness*2, y: wallHeight, z: wallThickness },
        position: { x: 0, y: wallHeight/2, z: courseSize/2 + wallThickness/2 }
      }
    ];
    
    const wallEntities = [];
    
    // Create walls
    for (const wallData of walls) {
      // Create wall entity
      const wallEntity = new Entity();
      
      // Add transform component
      const transform = new Transform({
        position: wallData.position
      });
      wallEntity.addComponent('Transform', transform);
      
      // Add renderer component
      const renderer = new Renderer({
        type: 'mesh',
        geometry: new THREE.BoxGeometry(
          wallData.size.x,
          wallData.size.y,
          wallData.size.z
        ),
        material: wallMaterial,
        castShadow: true,
        receiveShadow: true
      });
      wallEntity.addComponent('Renderer', renderer);
      
      // Add physics component
      const physics = new Physics({
        isStatic: true,
        materialType: 'wall'
      });
      wallEntity.addComponent('Physics', physics);
      
      // Add collider component
      const collider = new Collider({
        type: 'box',
        size: {
          x: wallData.size.x / 2,
          y: wallData.size.y / 2,
          z: wallData.size.z / 2
        },
        material: 'wall'
      });
      wallEntity.addComponent('Collider', collider);
      
      // Add tag
      wallEntity.addTag('wall');
      
      // Add to world
      this.world.addEntity(wallEntity);
      
      // Store in course elements
      this.courseElements.push(wallEntity.id);
      wallEntities.push(wallEntity.id);
    }
    
    // Store in course
    course.walls = wallEntities;
    
    return wallEntities;
  }
  
  /**
   * Add obstacles to the course
   * @param {Course} course - Course component
   */
  addObstacles(course) {
    const numberOfObstacles = 5 + Math.floor(course.difficulty * 3);
    const obstacleEntities = [];
    
    const obstacleMaterial = {
      type: 'MeshStandardMaterial',
      color: 0xff00ff,
      emissive: 0x660066,
      emissiveIntensity: 0.3,
      metalness: 0.7,
      roughness: 0.2
    };
    
    // Use course seed for consistent generation
    const seed = course.seed;
    let currentSeed = seed;
    
    // Simple seeded random function
    const seededRandom = () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
    
    // Add various obstacle types
    for (let i = 0; i < numberOfObstacles; i++) {
      // Create obstacle entity
      const obstacleEntity = new Entity();
      
      // Random obstacle type
      const obstacleType = Math.floor(seededRandom() * 4);
      
      // Add appropriate geometry based on type
      let geometry;
      let colliderType;
      let colliderSize;
      let obstacleY;
      
      switch (obstacleType) {
        case 0: // Box
          const boxSize = 1 + seededRandom() * 2;
          const boxHeight = 0.5 + seededRandom() * 1.5;
          
          geometry = new THREE.BoxGeometry(boxSize, boxHeight, boxSize);
          colliderType = 'box';
          colliderSize = { x: boxSize / 2, y: boxHeight / 2, z: boxSize / 2 };
          obstacleY = boxHeight / 2;
          break;
          
        case 1: // Cylinder
          const cylinderRadius = 0.5 + seededRandom() * 1;
          const cylinderHeight = 0.5 + seededRandom() * 2;
          
          geometry = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, cylinderHeight, 16);
          colliderType = 'cylinder';
          colliderSize = { radius: cylinderRadius, halfHeight: cylinderHeight / 2 };
          obstacleY = cylinderHeight / 2;
          break;
          
        case 2: // Sphere
          const sphereRadius = 0.5 + seededRandom() * 1;
          
          geometry = new THREE.SphereGeometry(sphereRadius, 16, 16);
          colliderType = 'sphere';
          colliderSize = { radius: sphereRadius };
          obstacleY = sphereRadius;
          break;
          
        case 3: // Cone
          const coneRadius = 0.5 + seededRandom() * 1;
          const coneHeight = 1 + seededRandom() * 2;
          
          geometry = new THREE.ConeGeometry(coneRadius, coneHeight, 16);
          colliderType = 'cylinder'; // Approximate with cylinder
          colliderSize = { radius: coneRadius / 2, halfHeight: coneHeight / 2 };
          obstacleY = coneHeight / 2;
          break;
      }
      
      // Position obstacle randomly
      let obstacleX, obstacleZ;
      let validPosition = false;
      
      // Avoid placing obstacles too close to start, hole, or other obstacles
      const minDistanceFromHole = 3;
      const minDistanceFromStart = 3;
      const minDistanceFromOtherObstacles = 2;
      
      // Try to find a valid position
      let attempts = 0;
      while (!validPosition && attempts < 20) {
        obstacleX = (seededRandom() * 2 - 1) * 12; // Range: -12 to 12
        obstacleZ = (seededRandom() * 2 - 1) * 12; // Range: -12 to 12
        
        // Check distance from hole
        const distanceFromHole = Math.sqrt(
          Math.pow(obstacleX - course.holePosition.x, 2) +
          Math.pow(obstacleZ - course.holePosition.z, 2)
        );
        
        // Check distance from start
        const distanceFromStart = Math.sqrt(
          Math.pow(obstacleX - course.startPosition.x, 2) +
          Math.pow(obstacleZ - course.startPosition.z, 2)
        );
        
        // Check distance from other obstacles
        let tooCloseToOtherObstacle = false;
        for (const entityId of obstacleEntities) {
          const entity = this.world.getEntity(entityId);
          if (entity) {
            const transform = entity.getComponent('Transform');
            if (transform) {
              const distance = Math.sqrt(
                Math.pow(obstacleX - transform.position.x, 2) +
                Math.pow(obstacleZ - transform.position.z, 2)
              );
              
              if (distance < minDistanceFromOtherObstacles) {
                tooCloseToOtherObstacle = true;
                break;
              }
            }
          }
        }
        
        // Check if position is valid
        validPosition = distanceFromHole >= minDistanceFromHole &&
                         distanceFromStart >= minDistanceFromStart &&
                         !tooCloseToOtherObstacle;
        
        attempts++;
      }
      
      // If no valid position found, skip this obstacle
      if (!validPosition) continue;
      
      // Add transform component
      const transform = new Transform({
        position: { x: obstacleX, y: obstacleY, z: obstacleZ },
        rotation: new THREE.Euler(0, seededRandom() * Math.PI * 2, 0)
      });
      obstacleEntity.addComponent('Transform', transform);
      
      // Add renderer component
      const renderer = new Renderer({
        type: 'mesh',
        geometry: geometry,
        material: obstacleMaterial,
        castShadow: true,
        receiveShadow: true
      });
      obstacleEntity.addComponent('Renderer', renderer);
      
      // Add physics component
      const physics = new Physics({
        isStatic: true,
        materialType: 'obstacle'
      });
      obstacleEntity.addComponent('Physics', physics);
      
      // Add collider component
      const collider = new Collider({
        type: colliderType,
        size: colliderSize,
        material: 'obstacle'
      });
      obstacleEntity.addComponent('Collider', collider);
      
      // Add tag
      obstacleEntity.addTag('obstacle');
      
      // Add to world
      this.world.addEntity(obstacleEntity);
      
      // Store in course elements
      this.courseElements.push(obstacleEntity.id);
      obstacleEntities.push(obstacleEntity.id);
    }
    
    // Add special obstacles based on difficulty
    if (course.difficulty >= 2) {
      const movingPlatformEntity = this.addMovingPlatform(course);
      obstacleEntities.push(movingPlatformEntity.id);
    }
    
    if (course.difficulty >= 3) {
      const rotatingObstacleEntity = this.addRotatingObstacle(course);
      obstacleEntities.push(rotatingObstacleEntity.id);
    }
    
    // Store in course
    course.obstacles = obstacleEntities;
    
    return obstacleEntities;
  }
  
  /**
   * Add a moving platform
   * @param {Course} course - Course component
   * @returns {Entity} Moving platform entity
   */
  addMovingPlatform(course) {
    // Create platform entity
    const platformEntity = new Entity();
    
    // Platform properties
    const platformMaterial = {
      type: 'MeshStandardMaterial',
      color: 0x00ffff,
      emissive: 0x006666,
      emissiveIntensity: 0.3,
      metalness: 0.5,
      roughness: 0.2
    };
    
    // Use course seed for consistent generation
    const seed = course.seed;
    let currentSeed = seed + 1000; // Offset to get different random sequence
    
    // Simple seeded random function
    const seededRandom = () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
    
    // Position platform
    const platformX = (seededRandom() * 2 - 1) * 8; // Range: -8 to 8
    const platformY = 0.25;
    const platformZ = (seededRandom() * 2 - 1) * 8; // Range: -8 to 8
    
    // Platform size
    const platformWidth = 3;
    const platformHeight = 0.5;
    const platformDepth = 3;
    
    // Movement properties
    const movementAxis = seededRandom() < 0.5 ? 'x' : 'z';
    const movementRange = 5;
    const movementSpeed = 0.03;
    
    // Add transform component
    const transform = new Transform({
      position: { x: platformX, y: platformY, z: platformZ }
    });
    platformEntity.addComponent('Transform', transform);
    
    // Add renderer component
    const renderer = new Renderer({
      type: 'mesh',
      geometry: new THREE.BoxGeometry(platformWidth, platformHeight, platformDepth),
      material: platformMaterial,
      castShadow: true,
      receiveShadow: true
    });
    platformEntity.addComponent('Renderer', renderer);
    
    // Add physics component
    const physics = new Physics({
      isKinematic: true,
      materialType: 'obstacle'
    });
    platformEntity.addComponent('Physics', physics);
    
    // Add collider component
    const collider = new Collider({
      type: 'box',
      size: { 
        x: platformWidth / 2, 
        y: platformHeight / 2, 
        z: platformDepth / 2 
      },
      material: 'obstacle'
    });
    platformEntity.addComponent('Collider', collider);
    
    // Add custom data for movement
    platformEntity.addComponent('MovingPlatform', {
      axis: movementAxis,
      minPosition: movementAxis === 'x' ? platformX - movementRange : platformZ - movementRange,
      maxPosition: movementAxis === 'x' ? platformX + movementRange : platformZ + movementRange,
      speed: movementSpeed,
      direction: 1
    });
    
    // Add tags
    platformEntity.addTag('obstacle');
    platformEntity.addTag('moving');
    
    // Add to world
    this.world.addEntity(platformEntity);
    
    // Store in course elements
    this.courseElements.push(platformEntity.id);
    
    return platformEntity;
  }
  
  /**
   * Add a rotating obstacle
   * @param {Course} course - Course component
   * @returns {Entity} Rotating obstacle entity
   */
  addRotatingObstacle(course) {
    // Create obstacle container entity
    const rotatorEntity = new Entity();
    
    // Rotator properties
    const rotatorMaterial = {
      type: 'MeshStandardMaterial',
      color: 0xff6600,
      emissive: 0x662200,
      emissiveIntensity: 0.3,
      metalness: 0.6,
      roughness: 0.3
    };
    
    // Use course seed for consistent generation
    const seed = course.seed + 2000; // Offset to get different random sequence
    let currentSeed = seed;
    
    // Simple seeded random function
    const seededRandom = () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
    
    // Position rotator
    const rotatorX = (seededRandom() * 2 - 1) * 8; // Range: -8 to 8
    const rotatorY = 0.5;
    const rotatorZ = (seededRandom() * 2 - 1) * 8; // Range: -8 to 8
    
    // Rotator dimensions
    const baseRadius = 0.5;
    const baseHeight = 0.5;
    const armLength = 5;
    const armWidth = 0.5;
    const armHeight = 0.5;
    
    // Add transform component
    const transform = new Transform({
      position: { x: rotatorX, y: rotatorY, z: rotatorZ }
    });
    rotatorEntity.addComponent('Transform', transform);
    
    // Add rotation data
    rotatorEntity.addComponent('RotatingObstacle', {
      speed: 0.03 * (seededRandom() * 0.5 + 0.75), // Random speed between 0.0225 and 0.0375
      axis: 'y'
    });
    
    // Add tags
    rotatorEntity.addTag('obstacle');
    rotatorEntity.addTag('rotating');
    
    // Add to world
    this.world.addEntity(rotatorEntity);
    
    // Create base part
    const baseEntity = new Entity();
    
    // Add transform component (relative to rotator)
    const baseTransform = new Transform({
      position: { x: 0, y: 0, z: 0 }
    });
    baseEntity.addComponent('Transform', baseTransform);
    
    // Add renderer component
    const baseRenderer = new Renderer({
      type: 'mesh',
      geometry: new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 16),
      material: rotatorMaterial,
      castShadow: true,
      receiveShadow: true
    });
    baseEntity.addComponent('Renderer', baseRenderer);
    
    // Add physics component
    const basePhysics = new Physics({
      isKinematic: true,
      materialType: 'obstacle'
    });
    baseEntity.addComponent('Physics', basePhysics);
    
    // Add collider component
    const baseCollider = new Collider({
      type: 'cylinder',
      size: { 
        radius: baseRadius,
        halfHeight: baseHeight / 2
      },
      material: 'obstacle'
    });
    baseEntity.addComponent('Collider', baseCollider);
    
    // Add tags
    baseEntity.addTag('obstacle');
    baseEntity.addTag('rotatingPart');
    
    // Link to parent
    baseEntity.parent = rotatorEntity.id;
    
    // Add to world
    this.world.addEntity(baseEntity);
    
    // Store in course elements
    this.courseElements.push(baseEntity.id);
    
    // Create arm part
    const armEntity = new Entity();
    
    // Add transform component (relative to rotator)
    const armTransform = new Transform({
      position: { x: armLength / 2, y: armHeight / 2, z: 0 }
    });
    armEntity.addComponent('Transform', armTransform);
    
    // Add renderer component
    const armRenderer = new Renderer({
      type: 'mesh',
      geometry: new THREE.BoxGeometry(armLength, armHeight, armWidth),
      material: rotatorMaterial,
      castShadow: true,
      receiveShadow: true
    });
    armEntity.addComponent('Renderer', armRenderer);
    
    // Add physics component
    const armPhysics = new Physics({
      isKinematic: true,
      materialType: 'obstacle'
    });
    armEntity.addComponent('Physics', armPhysics);
    
    // Add collider component
    const armCollider = new Collider({
      type: 'box',
      size: { 
        x: armLength / 2,
        y: armHeight / 2,
        z: armWidth / 2
      },
      material: 'obstacle'
    });
    armEntity.addComponent('Collider', armCollider);
    
    // Add tags
    armEntity.addTag('obstacle');
    armEntity.addTag('rotatingPart');
    
    // Link to parent
    armEntity.parent = rotatorEntity.id;
    
    // Add to world
    this.world.addEntity(armEntity);
    
    // Store in course elements
    this.courseElements.push(armEntity.id);
    this.courseElements.push(rotatorEntity.id);
    
    return rotatorEntity;
  }
  
  /**
   * Add power-ups to the course
   * @param {Course} course - Course component
   */
  addPowerUps(course) {
    const powerUpTypes = ['rocketDash', 'stickyMode', 'bouncy', 'gravityFlip'];
    const numberOfPowerUps = 1 + Math.floor(Math.random() * 2); // 1-2 power-ups per course
    const powerUpEntities = [];
    
    // Use course seed for consistent generation
    const seed = course.seed + 3000; // Offset to get different random sequence
    let currentSeed = seed;
    
    // Simple seeded random function
    const seededRandom = () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
    
    for (let i = 0; i < numberOfPowerUps; i++) {
      // Select a random power-up type
      const powerUpType = powerUpTypes[Math.floor(seededRandom() * powerUpTypes.length)];
      
      // Create power-up entity
      const powerUpEntity = new Entity();
      
      // Get power-up color
      let powerUpColor;
      switch (powerUpType) {
        case 'rocketDash':
          powerUpColor = 0xff0000;
          break;
        case 'stickyMode':
          powerUpColor = 0x00ff00;
          break;
        case 'bouncy':
          powerUpColor = 0x0000ff;
          break;
        case 'gravityFlip':
          powerUpColor = 0xffff00;
          break;
        default:
          powerUpColor = 0xffffff;
          break;
      }
      
      // Position power-up randomly
      let powerUpX, powerUpZ;
      let validPosition = false;
      
      // Avoid placing power-ups too close to hole, start, or obstacles
      const minDistanceFromHole = 3;
      const minDistanceFromStart = 3;
      const minDistanceFromObstacles = 2;
      
      // Try to find a valid position
      let attempts = 0;
      while (!validPosition && attempts < 20) {
        powerUpX = (seededRandom() * 2 - 1) * 12; // Range: -12 to 12
        powerUpZ = (seededRandom() * 2 - 1) * 12; // Range: -12 to 12
        
        // Check distance from hole
        const distanceFromHole = Math.sqrt(
          Math.pow(powerUpX - course.holePosition.x, 2) +
          Math.pow(powerUpZ - course.holePosition.z, 2)
        );
        
        // Check distance from start
        const distanceFromStart = Math.sqrt(
          Math.pow(powerUpX - course.startPosition.x, 2) +
          Math.pow(powerUpZ - course.startPosition.z, 2)
        );
        
        // Check distance from obstacles (simplified)
        let tooCloseToObstacle = false;
        for (const entityId of course.obstacles || []) {
          const entity = this.world.getEntity(entityId);
          if (entity) {
            const transform = entity.getComponent('Transform');
            if (transform) {
              const distance = Math.sqrt(
                Math.pow(powerUpX - transform.position.x, 2) +
                Math.pow(powerUpZ - transform.position.z, 2)
              );
              
              if (distance < minDistanceFromObstacles) {
                tooCloseToObstacle = true;
                break;
              }
            }
          }
        }
        
        // Check if position is valid
        validPosition = distanceFromHole >= minDistanceFromHole &&
                         distanceFromStart >= minDistanceFromStart &&
                         !tooCloseToObstacle;
        
        attempts++;
      }
      
      // If no valid position found, skip this power-up
      if (!validPosition) continue;
      
      // Add transform component
      const transform = new Transform({
        position: { x: powerUpX, y: 0.5, z: powerUpZ }
      });
      powerUpEntity.addComponent('Transform', transform);
      
      // Add renderer component
      const renderer = new Renderer({
        type: 'mesh',
        geometry: new THREE.SphereGeometry(0.3, 16, 16),
        material: {
          type: 'MeshBasicMaterial',
          color: powerUpColor,
          emissive: powerUpColor,
          emissiveIntensity: 0.5
        }
      });
      powerUpEntity.addComponent('Renderer', renderer);
      
      // Add physics component
      const physics = new Physics({
        isStatic: true,
        isTrigger: true
      });
      powerUpEntity.addComponent('Physics', physics);
      
      // Add collider component
      const collider = new Collider({
        type: 'sphere',
        size: { radius: 0.3 },
        isTrigger: true
      });
      powerUpEntity.addComponent('Collider', collider);
      
      // Add power-up component
      const powerUp = new PowerUp({
        type: powerUpType,
        duration: powerUpType === 'rocketDash' ? 3 :
                  powerUpType === 'stickyMode' ? 5 :
                  powerUpType === 'bouncy' ? 10 :
                  powerUpType === 'gravityFlip' ? 4 : 5
      });
      powerUpEntity.addComponent('PowerUp', powerUp);
      
      // Add floating animation data
      powerUpEntity.addComponent('FloatingObject', {
        initialY: 0.5,
        floatHeight: 0.2,
        floatSpeed: 1 + seededRandom(),
        rotationSpeed: 0.5 + seededRandom()
      });
      
      // Add tags
      powerUpEntity.addTag('powerUp');
      powerUpEntity.addTag(powerUpType);
      
      // Add to world
      this.world.addEntity(powerUpEntity);
      
      // Store in power-ups
      this.powerUps.push(powerUpEntity.id);
      powerUpEntities.push(powerUpEntity.id);
    }
    
    // Store in course
    course.powerUps = powerUpEntities;
    
    return powerUpEntities;
  }
  
  /**
   * Add a hole (target) to the course
   * @param {Course} course - Course component
   */
  addHole(course) {
    // Create hole entity
    const holeEntity = new Entity();
    
    // Use course seed for consistent generation
    const seed = course.seed + 5000; // Offset to get different random sequence
    let currentSeed = seed;
    
    // Simple seeded random function
    const seededRandom = () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
    
    // Position hole far from the start
    let holeX, holeZ;
    const minDistanceFromStart = 15; // Ensure hole is at least 15 units from start
    const maxDistanceFromStart = 25; // But not more than 25 units away
    
    let validPosition = false;
    let attempts = 0;
    
    while (!validPosition && attempts < 30) {
      holeX = (seededRandom() * 2 - 1) * 12; // Range: -12 to 12
      holeZ = (seededRandom() * 2 - 1) * 12; // Range: -12 to 12
      
      // Check distance from start
      const distanceFromStart = Math.sqrt(
        Math.pow(holeX - course.startPosition.x, 2) +
        Math.pow(holeZ - course.startPosition.z, 2)
      );
      
      validPosition = distanceFromStart >= minDistanceFromStart &&
                     distanceFromStart <= maxDistanceFromStart;
      
      attempts++;
    }
    
    // If no valid position found, use a fallback
    if (!validPosition) {
      holeX = 10;
      holeZ = 10;
    }
    
    // Store hole position in course
    course.holePosition = { x: holeX, z: holeZ };
    
    // Add transform component
    const transform = new Transform({
      position: { x: holeX, y: 0.01, z: holeZ }, // Slightly above ground to avoid z-fighting
      rotation: new THREE.Euler(-Math.PI / 2, 0, 0) // Rotate to face up
    });
    holeEntity.addComponent('Transform', transform);
    
    // Add renderer component
    const renderer = new Renderer({
      type: 'mesh',
      geometry: new THREE.CircleGeometry(0.7, 32),
      material: {
        type: 'MeshBasicMaterial',
        color: 0x000000
      }
    });
    holeEntity.addComponent('Renderer', renderer);
    
    // Add physics component
    const physics = new Physics({
      isStatic: true,
      isTrigger: true
    });
    holeEntity.addComponent('Physics', physics);
    
    // Add collider component
    const collider = new Collider({
      type: 'cylinder', // Using cylinder for hole
      size: { radius: 0.7, halfHeight: 0.1 },
      isTrigger: true
    });
    holeEntity.addComponent('Collider', collider);
    
    // Add tags
    holeEntity.addTag('hole');
    
    // Add to world
    this.world.addEntity(holeEntity);
    
    // Store in course elements
    this.courseElements.push(holeEntity.id);
    
    // Add flag pole
    const flagEntity = new Entity();
    
    // Add transform component
    const flagTransform = new Transform({
      position: { x: holeX, y: 1, z: holeZ }
    });
    flagEntity.addComponent('Transform', flagTransform);
    
    // Add renderer component for flag pole
    const flagPoleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2, 8);
    const flagMaterial = {
      type: 'MeshBasicMaterial',
      color: 0xffffff
    };
    
    const flagPoleRenderer = new Renderer({
      type: 'mesh',
      geometry: flagPoleGeometry,
      material: flagMaterial
    });
    flagEntity.addComponent('Renderer', flagPoleRenderer);
    
    // Add flag
    const flagPlaneEntity = new Entity();
    
    // Add transform component (relative to flag pole)
    const flagPlaneTransform = new Transform({
      position: { x: 0.5, y: 0.7, z: 0 }
    });
    flagPlaneEntity.addComponent('Transform', flagPlaneTransform);
    
    // Add renderer component for flag
    const flagGeometry = new THREE.PlaneGeometry(1, 0.6);
    const flagPlaneMaterial = {
      type: 'MeshBasicMaterial',
      color: 0xff0000,
      side: THREE.DoubleSide
    };
    
    const flagPlaneRenderer = new Renderer({
      type: 'mesh',
      geometry: flagGeometry,
      material: flagPlaneMaterial
    });
    flagPlaneEntity.addComponent('Renderer', flagPlaneRenderer);
    
    // Link flag to flag pole
    flagPlaneEntity.parent = flagEntity.id;
    
    // Add tags
    flagEntity.addTag('flagPole');
    flagPlaneEntity.addTag('flag');
    
    // Add to world
    this.world.addEntity(flagEntity);
    this.world.addEntity(flagPlaneEntity);
    
    // Store in course elements
    this.courseElements.push(flagEntity.id);
    this.courseElements.push(flagPlaneEntity.id);
    
    return holeEntity;
  }
  
  /**
   * Reset ball position
   * @param {Entity} entity - Entity with Course component
   * @param {Course} course - Course component
   */
  resetBallPosition(entity, course) {
    // Get transform component
    const transform = entity.getComponent('Transform');
    if (!transform) return;
    
    // Reset position to start position
    transform.position.set(
      course.startPosition.x,
      course.startPosition.y,
      course.startPosition.z
    );
    
    // Reset rotation
    transform.rotation.set(0, 0, 0, 1);
    
    // Update matrix
    transform.updateMatrix();
    
    // Reset physics if present
    const physics = entity.getComponent('Physics');
    if (physics) {
      physics.velocity.set(0, 0, 0);
      physics.angularVelocity.set(0, 0, 0);
      physics.forces.set(0, 0, 0);
      physics.torque.set(0, 0, 0);
    }
  }
  
  /**
   * Get daily modifier based on date
   * @returns {string} Daily modifier
   */
  getDailyModifier() {
    return Course.generateDailyModifier();
  }
  
  /**
   * Dispose resources
   */
  dispose() {
    // Clear course elements
    this.clearCourse();
    
    // Remove event listeners
    this.world.off('holeCompleted', this.handleHoleCompleted);
  }
}

export default CourseGenerationSystem;