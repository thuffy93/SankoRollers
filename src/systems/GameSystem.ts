import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { 
  createPhysicsWorld, 
  initRapier,
} from './PhysicsSystem';
import { createRenderer } from './RenderSystem';
import { TestEnvironment } from '../components/TestEnvironment';
import { DebugRenderer } from './DebugRenderer';

let animationFrameId: number;
let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let world: RAPIER.World;
let testEnvironment: TestEnvironment;
let debugRenderer: DebugRenderer;

export async function initializeGame(container: HTMLDivElement): Promise<() => void> {
  // Wait for Rapier to initialize
  await initRapier();
  
  // Create scene, camera, and renderer
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB); // Sky blue background
  
  // Create isometric camera
  const aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 1000);
  camera.position.set(10, 10, 10);
  camera.lookAt(0, 0, 0);

  // Initialize renderer
  renderer = createRenderer(container);
  
  // Initialize physics
  world = createPhysicsWorld();
  
  // Add lighting
  setupLighting();
  
  // Create test environment
  testEnvironment = new TestEnvironment(scene, world);
  testEnvironment.initialize();
  
  // Initialize debug renderer
  debugRenderer = new DebugRenderer(
    scene, 
    world, 
    createPhysicsObject
  );

  // Start the animation loop
  startAnimationLoop();

  // Set up resize handler
  const handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  
  window.addEventListener('resize', handleResize);

  // Return cleanup function
  return () => {
    // Stop animation loop
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    
    // Dispose resources
    debugRenderer.dispose();
    testEnvironment.dispose();
    
    // Remove event listeners
    window.removeEventListener('resize', handleResize);
    
    // Dispose of resources
    renderer.dispose();
    
    // Remove renderer from DOM
    if (container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement);
    }
  };
}

/**
 * Callback for creating physics objects from the debug UI
 */
function createPhysicsObject(position: THREE.Vector3, isBox: boolean): void {
  if (isBox) {
    // Create a random sized cube
    const size = 0.3 + Math.random() * 0.5;
    const color = Math.random() * 0xffffff;
    testEnvironment.createCube(position, new THREE.Vector3(size, size, size), color);
  } else {
    // Create a random sized sphere
    const radius = 0.3 + Math.random() * 0.5;
    const color = Math.random() * 0xffffff;
    testEnvironment.createSphere(position, radius, color);
  }
}

function setupLighting(): void {
  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  // Add directional light (sun)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 20, 15);
  directionalLight.castShadow = true;
  
  // Configure shadow properties
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 20;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -20;
  
  scene.add(directionalLight);
}

function startAnimationLoop() {
  const animate = () => {
    // Step the physics world
    world.step();
    
    // Update test environment
    testEnvironment.update();
    
    // Update debug visualization
    debugRenderer.update();
    
    // Render the scene
    renderer.render(scene, camera);
    
    // Continue animation loop
    animationFrameId = requestAnimationFrame(animate);
  };
  
  animate();
} 