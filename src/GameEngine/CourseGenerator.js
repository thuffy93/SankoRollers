// src/GameEngine/CourseGenerator.js
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

class CourseGenerator {
  constructor(scene, physics, difficulty = 1, dailyModifier = null) {
    this.scene = scene;
    this.physics = physics;
    this.difficulty = difficulty;
    this.dailyModifier = dailyModifier;
    this.noise = createNoise2D();
    this.courseElements = [];
    this.powerUps = [];
    this.holePosition = null;
  }

  // Simple seeded random number generator
  seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // Generate a complete course
  generateCourse(seed = Date.now()) {
    // Use seed for deterministic generation
    const originalRandom = Math.random;
    let currentSeed = seed;
    
    // Override Math.random with our seeded version
    Math.random = () => {
      currentSeed++;
      return this.seededRandom(currentSeed);
    };
    
    // Clear any existing course elements
    this.clearCourse();
    
    // Generate terrain
    this.generateTerrain();
    
    // Add walls
    this.addWalls();
    
    // Add obstacles based on difficulty
    this.addObstacles();
    
    // Add power-ups
    this.addPowerUps();
    
    // Add the hole (target)
    this.addHole();
    
    // Apply daily modifier effects if any
    this.applyDailyModifier();
    
    return {
      courseElements: this.courseElements,
      powerUps: this.powerUps,
      holePosition: this.holePosition
    };
  }
  
  // Clear existing course
  clearCourse() {
    // Remove existing elements from scene
    this.courseElements.forEach(element => {
      this.scene.remove(element);
    });
    
    this.powerUps.forEach(powerUp => {
      this.scene.remove(powerUp.mesh);
    });
    
    this.courseElements = [];
    this.powerUps = [];
    this.holePosition = null;
  }
  
  // Replace the entire generateTerrain method in CourseGenerator.js with this version:

  generateTerrain() {
    const size = 30;
    const resolution = 60; // higher = more detailed
    const geometry = new THREE.PlaneGeometry(size, size, resolution, resolution);
    
    // Apply Perlin noise to vertices
    const vertices = geometry.attributes.position.array;
    const heights = [];
    
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];
      
      // Generate height using noise
      const scale = 0.1; // scale of noise
      const height = this.noise(x * scale, z * scale) * (0.5 + this.difficulty * 0.3);
      
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
    
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    
    this.scene.add(terrain);
    this.courseElements.push(terrain);
    
    // Create a simple floor plane first (this is the guaranteed collision surface)
    const floorGeometry = new THREE.PlaneGeometry(size, size);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x222266,
      transparent: true,
      opacity: 0, // Make it invisible
      side: THREE.DoubleSide
    });
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0; // Position at y=0
    this.scene.add(floor);
    this.courseElements.push(floor);
    
    // Create physics for terrain
    if (this.physics && this.physics.initialized) {
      console.log("Creating terrain physics");
      
      // Create a simple physics plane for the ground
      const groundBody = this.physics.createStaticBody(floor, {
        shape: 'cuboid',
        halfExtents: { x: size/2, y: 0.1, z: size/2 },
        material: 'default'
      });
      
      // Log that the ground has been created
      console.log("Ground physics created:", groundBody);
      
      // Optional: Add more specific collision shapes for the terrain features
      // This is less critical since we have the guaranteed floor now
    }
    
    return terrain;
  }
  
  // Add surrounding walls
  addWalls() {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x6666ff,
      emissive: 0x0000ff,
      emissiveIntensity: 0.2,
      metalness: 0.5,
      roughness: 0.2
    });
    
    const wallHeight = 3;
    const wallThickness = 1;
    const courseSize = 30;
    
    // Left wall
    const leftWall = this.createWall(
      wallThickness, wallHeight, courseSize, 
      -courseSize/2 - wallThickness/2, wallHeight/2, 0
    );
    
    // Right wall
    const rightWall = this.createWall(
      wallThickness, wallHeight, courseSize,
      courseSize/2 + wallThickness/2, wallHeight/2, 0
    );
    
    // Back wall
    const backWall = this.createWall(
      courseSize + wallThickness*2, wallHeight, wallThickness,
      0, wallHeight/2, -courseSize/2 - wallThickness/2
    );
    
    // Front wall
    const frontWall = this.createWall(
      courseSize + wallThickness*2, wallHeight, wallThickness,
      0, wallHeight/2, courseSize/2 + wallThickness/2
    );
    
    // Apply common properties and add to scene
    [leftWall, rightWall, backWall, frontWall].forEach(wall => {
      wall.material = wallMaterial;
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.scene.add(wall);
      this.courseElements.push(wall);
      
      // Add physics to wall
      if (this.physics) {
        this.physics.createStaticBody(wall, {
          shape: 'cuboid',
          halfExtents: {
            x: wall.geometry.parameters.width / 2,
            y: wall.geometry.parameters.height / 2,
            z: wall.geometry.parameters.depth / 2
          },
          material: 'wall'
        });
      }
    });
  }
  
  // Create a wall mesh
  createWall(width, height, depth, x, y, z) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const wall = new THREE.Mesh(geometry);
    wall.position.set(x, y, z);
    return wall;
  }
  
  // Add obstacles based on difficulty
  addObstacles() {
    const numberOfObstacles = 5 + Math.floor(this.difficulty * 3);
    
    const obstacleMaterial = new THREE.MeshStandardMaterial({
      color: 0xff00ff,
      emissive: 0x660066,
      emissiveIntensity: 0.3,
      metalness: 0.7,
      roughness: 0.2
    });
    
    // Add various obstacle types
    for (let i = 0; i < numberOfObstacles; i++) {
      const obstacleType = Math.floor(Math.random() * 4);
      let obstacle;
      
      switch (obstacleType) {
        case 0: // Box
          obstacle = this.createBoxObstacle(obstacleMaterial);
          break;
        case 1: // Cylinder
          obstacle = this.createCylinderObstacle(obstacleMaterial);
          break;
        case 2: // Ramp
          obstacle = this.createRampObstacle(obstacleMaterial);
          break;
        case 3: // Sphere
          obstacle = this.createSphereObstacle(obstacleMaterial);
          break;
      }
      
      // Position the obstacle randomly
      do {
        obstacle.position.x = (Math.random() - 0.5) * 25;
        obstacle.position.z = (Math.random() - 0.5) * 25;
      } while (this.isTooCloseToHole(obstacle.position) || this.isTooCloseToStart(obstacle.position));
      
      obstacle.castShadow = true;
      obstacle.receiveShadow = true;
      
      this.scene.add(obstacle);
      this.courseElements.push(obstacle);
    }
    
    // Add special obstacles based on difficulty
    if (this.difficulty >= 2) {
      this.addMovingPlatforms();
    }
    
    if (this.difficulty >= 3) {
      this.addRotatingObstacles();
    }
  }
  
  // Create box obstacle
  createBoxObstacle(material) {
    const size = 1 + Math.random() * 2;
    const height = 0.5 + Math.random() * 1.5;
    const geometry = new THREE.BoxGeometry(size, height, size);
    const obstacle = new THREE.Mesh(geometry, material);
    obstacle.position.y = height / 2;
    return obstacle;
  }
  
  // Create cylinder obstacle
  createCylinderObstacle(material) {
    const radius = 0.5 + Math.random() * 1;
    const height = 0.5 + Math.random() * 2;
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 16);
    const obstacle = new THREE.Mesh(geometry, material);
    obstacle.position.y = height / 2;
    return obstacle;
  }
  
  // Create ramp obstacle
  createRampObstacle(material) {
    const width = 1 + Math.random() * 2;
    const height = 0.3 + Math.random() * 1;
    const depth = 2 + Math.random() * 3;
    
    // Create a custom geometry for the ramp
    const geometry = new THREE.BufferGeometry();
    
    // Define vertices for a wedge shape
    const vertices = new Float32Array([
      // Front face (triangle)
      -width/2, 0, depth/2,
      width/2, 0, depth/2,
      0, height, depth/2,
      
      // Back face (triangle)
      -width/2, 0, -depth/2,
      width/2, 0, -depth/2,
      0, height, -depth/2,
      
      // Bottom face (rectangle)
      -width/2, 0, depth/2,
      width/2, 0, depth/2,
      -width/2, 0, -depth/2,
      width/2, 0, -depth/2,
      
      // Left face (triangle)
      -width/2, 0, depth/2,
      -width/2, 0, -depth/2,
      0, height, -depth/2,
      0, height, depth/2,
      
      // Right face (triangle)
      width/2, 0, depth/2,
      width/2, 0, -depth/2,
      0, height, -depth/2,
      0, height, depth/2
    ]);
    
    // Define indices to create the faces
    const indices = [
      // Front face
      0, 1, 2,
      
      // Back face
      3, 5, 4,
      
      // Bottom face
      6, 8, 7,
      7, 8, 9,
      
      // Left face
      10, 11, 12,
      10, 12, 13,
      
      // Right face
      14, 16, 15,
      14, 17, 16
    ];
    
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    
    const obstacle = new THREE.Mesh(geometry, material);
    obstacle.rotation.y = Math.random() * Math.PI * 2; // Random rotation
    
    return obstacle;
  }
  
  // Create sphere obstacle
  createSphereObstacle(material) {
    const radius = 0.5 + Math.random() * 1;
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    const obstacle = new THREE.Mesh(geometry, material);
    obstacle.position.y = radius;
    return obstacle;
  }
  
  // Add moving platforms (for higher difficulties)
  addMovingPlatforms() {
    // Implementation for moving platforms
    // This would typically involve setting up animation paths
    // and update loops for moving obstacles
    
    // Placeholder for moving platform implementation
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x006666,
      emissiveIntensity: 0.3
    });
    
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.5, 3),
      platformMaterial
    );
    
    platform.position.set(0, 0.25, 8);
    platform.userData.isMoving = true;
    platform.userData.movementRange = { min: -5, max: 5 };
    platform.userData.movementAxis = 'x';
    platform.userData.speed = 0.03;
    platform.userData.direction = 1;
    
    this.scene.add(platform);
    this.courseElements.push(platform);
  }
  
  // Add rotating obstacles (for highest difficulties)
  addRotatingObstacles() {
    // Implementation for rotating obstacles
    const rotatorMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0x662200,
      emissiveIntensity: 0.3
    });
    
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.5, 16),
      rotatorMaterial
    );
    
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.5, 0.5),
      rotatorMaterial
    );
    
    arm.position.x = 3;
    
    const rotator = new THREE.Group();
    rotator.add(base);
    rotator.add(arm);
    
    rotator.position.set(-5, 0.5, -7);
    rotator.userData.isRotating = true;
    rotator.userData.rotationSpeed = 0.02;
    
    this.scene.add(rotator);
    this.courseElements.push(rotator);
  }
  
  // Add power-ups
  addPowerUps() {
    const powerUpTypes = ['rocketDash', 'stickyMode', 'bouncy', 'gravityFlip'];
    const numberOfPowerUps = 1 + Math.floor(Math.random() * 2); // 1-2 power-ups
    
    for (let i = 0; i < numberOfPowerUps; i++) {
      const powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
      
      // Create power-up mesh
      const geometry = new THREE.SphereGeometry(0.3, 16, 16);
      let material;
      
      // Different colors for different power-ups
      switch (powerUpType) {
        case 'rocketDash':
          material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
          break;
        case 'stickyMode':
          material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
          break;
        case 'bouncy':
          material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
          break;
        case 'gravityFlip':
          material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
          break;
      }
      
      const powerUpMesh = new THREE.Mesh(geometry, material);
      
      // Position the power-up
      do {
        powerUpMesh.position.x = (Math.random() - 0.5) * 25;
        powerUpMesh.position.z = (Math.random() - 0.5) * 25;
        powerUpMesh.position.y = 0.5;
      } while (this.isTooCloseToHole(powerUpMesh.position) || this.isTooCloseToStart(powerUpMesh.position));
      
      // Add floating animation
      powerUpMesh.userData.floatHeight = 0.5;
      powerUpMesh.userData.floatSpeed = 0.01;
      powerUpMesh.userData.initialY = powerUpMesh.position.y;
      powerUpMesh.userData.floatTime = Math.random() * Math.PI * 2; // Random start phase
      
      this.scene.add(powerUpMesh);
      this.powerUps.push({
        type: powerUpType,
        mesh: powerUpMesh,
        collected: false
      });
    }
  }
  
  // Add hole (target)
  addHole() {
    // Create hole geometry
    const holeGeometry = new THREE.CircleGeometry(0.7, 32);
    const holeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const hole = new THREE.Mesh(holeGeometry, holeMaterial);
    
    // Position the hole far from the start
    let x, z;
    do {
      x = (Math.random() - 0.5) * 25;
      z = (Math.random() - 0.5) * 25;
    } while (Math.sqrt(x*x + z*z) < 15); // Ensure hole is at least 15 units from start
    
    hole.position.set(x, 0.01, z); // Slightly above ground to avoid z-fighting
    hole.rotation.x = -Math.PI / 2;
    
    // Create flag
    const flagPoleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2, 8);
    const flagPole = new THREE.Mesh(
      flagPoleGeometry,
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    flagPole.position.set(x, 1, z);
    
    const flagGeometry = new THREE.PlaneGeometry(1, 0.6);
    const flag = new THREE.Mesh(
      flagGeometry,
      new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide })
    );
    flag.position.set(0.5, 0.7, 0);
    flagPole.add(flag);
    
    this.holePosition = { x, z };
    this.scene.add(hole);
    this.scene.add(flagPole);
    this.courseElements.push(hole);
    this.courseElements.push(flagPole);
  }
  
  // Apply daily modifier effects
  applyDailyModifier() {
    if (!this.dailyModifier) return;
    
    // Apply modifier effects based on the type
    switch (this.dailyModifier) {
      case 'zeroG':
        // Lower gravity - implemented in physics system
        console.log('Zero-G modifier applied');
        break;
      
      case 'bouncy':
        // Increase rebound force - implemented in physics system
        console.log('Bouncy modifier applied');
        break;
      
      case 'foggy':
        // Add fog to the scene
        this.scene.fog = new THREE.FogExp2(0x9999ff, 0.05);
        console.log('Foggy modifier applied');
        break;
      
      case 'nightMode':
        // Darken the scene and add glowing elements
        this.scene.background = new THREE.Color(0x000022);
        
        // Add point lights to obstacles for visibility
        this.courseElements.forEach(element => {
          if (element.type === 'Mesh' && 
              element.geometry.type !== 'PlaneGeometry' && 
              element.geometry.type !== 'CircleGeometry') {
            
            const light = new THREE.PointLight(0xffffaa, 1, 5);
            light.position.set(0, 1, 0);
            element.add(light);
          }
        });
        
        console.log('Night Mode modifier applied');
        break;
      
      case 'windyCourse':
        // Add wind effect - implemented in physics system
        // Visual indicator: swaying flag
        if (this.holePosition) {
          const flag = this.courseElements.find(element => 
            element.type === 'Group' && element.position.x === this.holePosition.x
          );
          
          if (flag) {
            flag.userData.isSwaying = true;
            flag.userData.swaySpeed = 0.05;
            flag.userData.swayAmount = 0.2;
          }
        }
        
        console.log('Windy Course modifier applied');
        break;
      
      case 'mirrorMode':
        // Flip course layout
        this.courseElements.forEach(element => {
          if (element.position) {
            element.position.x = -element.position.x;
          }
        });
        
        this.powerUps.forEach(powerUp => {
          if (powerUp.mesh && powerUp.mesh.position) {
            powerUp.mesh.position.x = -powerUp.mesh.position.x;
          }
        });
        
        if (this.holePosition) {
          this.holePosition.x = -this.holePosition.x;
        }
        
        console.log('Mirror Mode modifier applied');
        break;
      
      default:
        console.log(`Unknown modifier: ${this.dailyModifier}`);
        break;
    }
  }
  
  // Check if a position is too close to the hole
  isTooCloseToHole(position) {
    if (!this.holePosition) return false;
    
    const distance = Math.sqrt(
      Math.pow(position.x - this.holePosition.x, 2) + 
      Math.pow(position.z - this.holePosition.z, 2)
    );
    
    return distance < 3; // Minimum 3 units away from hole
  }
  
  // Check if a position is too close to the starting position
  isTooCloseToStart(position) {
    const distance = Math.sqrt(
      Math.pow(position.x, 2) + 
      Math.pow(position.z, 2)
    );
    
    return distance < 3; // Minimum 3 units away from start
  }
  
  // Update method to animate moving/rotating obstacles and power-ups
  update(deltaTime) {
    // Update moving platforms
    this.courseElements.forEach(element => {
      if (element.userData.isMoving) {
        const axis = element.userData.movementAxis || 'x';
        const range = element.userData.movementRange || { min: -5, max: 5 };
        const speed = element.userData.speed || 0.03;
        
        // Update position
        element.position[axis] += speed * element.userData.direction;
        
        // Reverse direction at boundaries
        if (element.position[axis] > range.max) {
          element.position[axis] = range.max;
          element.userData.direction = -1;
        } else if (element.position[axis] < range.min) {
          element.position[axis] = range.min;
          element.userData.direction = 1;
        }
        
        // Update physics body position if using physics
        if (this.physics) {
          this.physics.removeBody(element);
          this.physics.createKinematicBody(element, {
            shape: 'cuboid',
            halfExtents: {
              x: element.geometry.parameters.width / 2,
              y: element.geometry.parameters.height / 2,
              z: element.geometry.parameters.depth / 2
            },
            material: 'obstacle'
          });
        }
      }
      
      if (element.userData.isRotating) {
        const speed = element.userData.rotationSpeed || 0.02;
        element.rotation.y += speed;
        
        // Update physics for children if using physics
        if (this.physics && element.children) {
          element.children.forEach(child => {
            if (child.isMesh) {
              this.physics.removeBody(child);
              
              // Determine shape based on geometry
              if (child.geometry.type === 'BoxGeometry') {
                this.physics.createKinematicBody(child, {
                  shape: 'cuboid',
                  halfExtents: {
                    x: child.geometry.parameters.width / 2 * child.scale.x,
                    y: child.geometry.parameters.height / 2 * child.scale.y,
                    z: child.geometry.parameters.depth / 2 * child.scale.z
                  },
                  material: 'obstacle'
                });
              } else if (child.geometry.type === 'CylinderGeometry') {
                this.physics.createKinematicBody(child, {
                  shape: 'cylinder',
                  halfHeight: child.geometry.parameters.height / 2 * child.scale.y,
                  radius: child.geometry.parameters.radiusTop * Math.max(child.scale.x, child.scale.z),
                  material: 'obstacle'
                });
              }
            }
          });
        }
      }
      
      if (element.userData.isSwaying) {
        const amount = element.userData.swayAmount || 0.1;
        const speed = element.userData.swaySpeed || 0.02;
        element.rotation.z = Math.sin(Date.now() * speed) * amount;
      }
    });
    
    // Animate power-ups (floating effect)
    this.powerUps.forEach(powerUp => {
      if (!powerUp.collected && powerUp.mesh) {
        const mesh = powerUp.mesh;
        if (mesh.userData.initialY !== undefined) {
          // Update float time
          mesh.userData.floatTime += deltaTime * mesh.userData.floatSpeed;
          
          // Apply floating animation
          const floatHeight = mesh.userData.floatHeight || 0.5;
          const initialY = mesh.userData.initialY;
          
          mesh.position.y = initialY + Math.sin(mesh.userData.floatTime) * floatHeight;
          
          // Rotate slowly
          mesh.rotation.y += deltaTime * 0.5;
          
          // Update physics body position if using physics
          if (this.physics) {
            this.physics.removeBody(mesh);
            this.physics.createStaticBody(mesh, {
              shape: 'ball',
              radius: 0.3,
              isSensor: true,
              material: 'default'
            });
          }
        }
      }
    });
  }
  
  // Get daily modifier from Pyth Entropy (simplified version)
  static getDailyModifier(entropy) {
    const modifiers = [
      'zeroG',
      'bouncy',
      'foggy',
      'nightMode',
      'windyCourse',
      'mirrorMode'
    ];
    
    // In a real implementation, this would use the Pyth Entropy
    // For now, we'll just use a simple hash of the entropy value
    const modifierIndex = Math.abs(entropy) % modifiers.length;
    return modifiers[modifierIndex];
  }
}

export default CourseGenerator;