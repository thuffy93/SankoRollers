import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Scene as GameScene } from './Scene';
import { Course } from '../models/Course';
import { CourseLoader } from '../models/CourseLoader';
import { CourseConfig } from '../models/CourseConfig';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { MaterialManager } from '../models/MaterialManager';

/**
 * Test scene for course loading system
 */
export class CourseLoaderTestScene implements GameScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private physics: PhysicsSystem;
  private materialManager: MaterialManager;
  private courseLoader: CourseLoader;
  private course: Course | null = null;
  
  // Lighting
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  
  // Camera controls
  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private cameraDistance = 50;
  private cameraHeight = 30;
  private cameraAngle = 0;
  
  // Test ball for demonstrating physics
  private testBall: {
    mesh: THREE.Mesh;
    body: RAPIER.RigidBody;
  } | null = null;
  
  /**
   * Create a new course loader test scene
   */
  constructor() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      60, // FOV
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.1, // Near plane
      1000 // Far plane
    );
    
    // Set initial camera position
    this.updateCameraPosition();
    
    // Initialize lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    
    // Setup lighting
    this.setupLighting();
    
    // Create physics system
    this.physics = new PhysicsSystem();
    
    // Create material manager
    this.materialManager = new MaterialManager();
    
    // Create course loader
    this.courseLoader = new CourseLoader(
      this.scene,
      this.physics.getWorld(),
      this.materialManager
    );
  }
  
  /**
   * Setup scene lighting
   */
  private setupLighting(): void {
    // Add ambient light to scene
    this.scene.add(this.ambientLight);
    
    // Configure directional light (sun)
    this.directionalLight.position.set(50, 50, 50);
    this.directionalLight.castShadow = true;
    
    // Configure shadow properties
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 200;
    this.directionalLight.shadow.camera.left = -50;
    this.directionalLight.shadow.camera.right = 50;
    this.directionalLight.shadow.camera.top = 50;
    this.directionalLight.shadow.camera.bottom = -50;
    
    this.scene.add(this.directionalLight);
  }
  
  /**
   * Update camera position based on orbit controls
   */
  private updateCameraPosition(): void {
    const x = Math.sin(this.cameraAngle) * this.cameraDistance;
    const z = Math.cos(this.cameraAngle) * this.cameraDistance;
    
    this.camera.position.set(x, this.cameraHeight, z);
    this.camera.lookAt(this.cameraTarget);
  }
  
  /**
   * Initialize the scene
   */
  init(): void {
    // Load test course
    this.loadTestCourse();
    
    // Create test ball
    this.createTestBall();
    
    console.log('Course loader test scene initialized');
  }
  
  /**
   * Load a test course configuration
   */
  private loadTestCourse(): void {
    try {
      // Sample course configuration
      const testCourseConfig: CourseConfig = {
        name: 'Test Course',
        difficulty: 'easy',
        par: 3,
        
        // Terrain
        terrain: [
          {
            id: 'main-terrain',
            position: { x: 0, y: 0, z: 0 },
            geometry: 'flat',
            dimensions: {
              width: 50,
              height: 0.5,
              depth: 50
            },
            materialType: 'fairway'
          },
          {
            id: 'green',
            position: { x: 0, y: 0.1, z: -15 },
            geometry: 'flat',
            dimensions: {
              width: 10,
              height: 0.2,
              depth: 10
            },
            materialType: 'green'
          },
          {
            id: 'sand-trap',
            position: { x: 15, y: 0.1, z: 0 },
            geometry: 'flat',
            dimensions: {
              width: 8,
              height: 0.3,
              depth: 8
            },
            materialType: 'sand'
          }
        ],
        
        // Walls
        walls: [
          {
            id: 'wall-1',
            position: { x: -10, y: 1, z: 10 },
            type: 'straight',
            dimensions: {
              length: 10,
              height: 2,
              thickness: 0.5
            },
            rotation: { x: 0, y: 0.3, z: 0 },
            materialType: 'wall'
          },
          {
            id: 'wall-2',
            position: { x: 10, y: 1, z: 10 },
            type: 'curved',
            dimensions: {
              length: 0, // Not used for curved walls
              height: 2,
              thickness: 0.5
            },
            materialType: 'stone',
            curve: {
              radius: 5,
              angleStart: 0,
              angleEnd: Math.PI, // 180 degrees
              segments: 12
            }
          }
        ],
        
        // Obstacles
        obstacles: [
          {
            id: 'obstacle-box',
            position: { x: -5, y: 1, z: 0 },
            type: 'box',
            dimensions: {
              width: 2,
              height: 2,
              depth: 2
            },
            rotation: { x: 0, y: 0.5, z: 0 },
            materialType: 'wood'
          },
          {
            id: 'obstacle-cylinder',
            position: { x: 5, y: 1.5, z: 5 },
            type: 'cylinder',
            dimensions: {
              radius: 1,
              height: 3
            },
            materialType: 'metal'
          },
          {
            id: 'obstacle-sphere',
            position: { x: 0, y: 1, z: 10 },
            type: 'sphere',
            dimensions: {
              radius: 1.5
            },
            materialType: 'rubber'
          }
        ],
        
        // Targets
        targets: [
          {
            id: 'target-1',
            position: { x: -10, y: 0.5, z: -5 },
            type: 'standard',
            radius: 1,
            value: 100,
            materialType: 'target'
          },
          {
            id: 'target-2',
            position: { x: 10, y: 0.5, z: -8 },
            type: 'bonus',
            radius: 0.8,
            value: 200,
            materialType: 'target'
          }
        ],
        
        // Goal
        goal: {
          position: { x: 0, y: 0.1, z: -15 },
          radius: 1.5,
          materialType: 'goal'
        },
        
        // Boundaries
        boundaries: {
          minX: -25,
          maxX: 25,
          minY: -10,
          maxY: 50,
          minZ: -25,
          maxZ: 25,
          wallHeight: 4,
          wallMaterialType: 'wall'
        }
      };
      
      // Load the course
      this.course = this.courseLoader.loadCourse(testCourseConfig);
      
      // Set camera target to the course center
      this.cameraTarget.set(0, 0, 0);
      
    } catch (error) {
      console.error('Error loading test course:', error);
    }
  }
  
  /**
   * Create a test ball to show physics interactions
   */
  private createTestBall(): void {
    // Create ball mesh
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.3,
      roughness: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    this.scene.add(mesh);
    
    // Create ball physics
    const ballBody = this.physics.createDynamicBody(
      new THREE.Vector3(0, 10, 10), // Start position high above the course
      { type: 'ball', id: 'test-ball', mesh }
    );
    
    // Add collider
    this.physics.addSphereCollider(
      ballBody,
      0.5, // Ball radius
      { friction: 0.5, restitution: 0.7 }
    );
    
    // Store ball for updates
    this.testBall = {
      mesh,
      body: ballBody
    };
  }
  
  /**
   * Drop a new test ball from above
   */
  private dropNewBall(): void {
    if (!this.testBall) return;
    
    // Random position on the course
    const x = Math.random() * 30 - 15;
    const z = Math.random() * 30 - 15;
    
    // Reset position to above the course
    this.testBall.body.setTranslation(
      { x, y: 10, z },
      true
    );
    
    // Reset velocities
    this.testBall.body.setLinvel(
      { x: 0, y: 0, z: 0 },
      true
    );
    
    this.testBall.body.setAngvel(
      { x: 0, y: 0, z: 0 },
      true
    );
  }
  
  /**
   * Update the scene
   * @param deltaTime Time since last frame in seconds
   */
  update(deltaTime: number): void {
    // Update physics
    this.physics.update(deltaTime);
    
    // Rotate camera slowly
    this.cameraAngle += deltaTime * 0.1;
    this.updateCameraPosition();
    
    // Drop a new ball every 5 seconds
    if (Math.floor(Date.now() / 5000) % 2 === 0) {
      this.dropNewBall();
    }
  }
  
  /**
   * Render the scene
   * @param renderer THREE.js renderer
   */
  render(renderer: THREE.WebGLRenderer): void {
    renderer.render(this.scene, this.camera);
  }
  
  /**
   * Handle window resize
   * @param width New width
   * @param height New height
   */
  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    // Dispose of course
    if (this.course) {
      this.course.dispose();
    }
    
    // Dispose of physics
    this.physics.dispose();
    
    // Dispose of THREE.js objects
    this.scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) object.geometry.dispose();
        
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });
  }
} 