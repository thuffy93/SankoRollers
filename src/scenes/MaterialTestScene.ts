import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Scene as GameScene } from './Scene';
import { MaterialTest } from '../components/MaterialTest';
import { PhysicsSystem } from '../systems/PhysicsSystem';

/**
 * Scene for testing different physics materials
 */
export class MaterialTestScene implements GameScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private physics: PhysicsSystem;
  private materialTest: MaterialTest;
  
  // Lighting
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  
  // Camera controls
  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private cameraDistance = 40;
  private cameraHeight = 20;
  private cameraAngle = 0;
  
  // Testing controls
  private testTimer = 0;
  private testInterval = 3; // seconds
  
  /**
   * Create a new material test scene
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
    
    // Create material test
    this.materialTest = new MaterialTest(this.scene, this.physics.getWorld());
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
    
    // Add a helper for the light (uncomment for debugging)
    // const helper = new THREE.DirectionalLightHelper(this.directionalLight, 5);
    // this.scene.add(helper);
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
    console.log('Material test scene initialized');
  }
  
  /**
   * Update the scene
   * @param deltaTime Time since last frame in seconds
   */
  update(deltaTime: number): void {
    // Update physics
    this.physics.update(deltaTime);
    
    // Update material test
    this.materialTest.update();
    
    // Rotate camera slowly
    this.cameraAngle += deltaTime * 0.1;
    this.updateCameraPosition();
    
    // Periodically apply an impulse to test balls
    this.testTimer += deltaTime;
    if (this.testTimer >= this.testInterval) {
      this.materialTest.applyTestImpulse();
      this.testTimer = 0;
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
    // Dispose of material test
    this.materialTest.dispose();
    
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