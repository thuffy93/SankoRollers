import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { 
  createPhysicsWorld, 
  initRapier,
} from './PhysicsSystem';
import { createRenderer } from './RenderSystem';
import { TestEnvironment } from '../components/TestEnvironment';
import { BallTest } from '../components/BallTest';
import { DebugRenderer } from './DebugRenderer';
import { IsometricCamera, CameraController, CameraState, Easing } from './CameraSystem';

// Game state enum
export enum GameState {
  IDLE = 'idle',
  AIMING = 'aiming',
  SHOT_IN_PROGRESS = 'shot-in-progress',
  BALL_AT_REST = 'ball-at-rest'
}

let animationFrameId: number;
let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: IsometricCamera;
let cameraController: CameraController;
let world: RAPIER.World;
let testEnvironment: TestEnvironment;
let ballTest: BallTest;
let debugRenderer: DebugRenderer;
let lastTime: number = 0;

// Game state tracking
let gameState: GameState = GameState.IDLE;
let previousGameState: GameState = GameState.IDLE;

// Performance monitoring
let frameCount = 0;
let lastFpsTime = 0;
let fps = 0;
const FPS_UPDATE_INTERVAL = 1000; // Update FPS every second

export async function initializeGame(container: HTMLDivElement): Promise<() => void> {
  // Wait for Rapier to initialize
  await initRapier();
  
  // Create scene, camera, and renderer
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB); // Sky blue background
  
  // Create isometric camera
  const aspectRatio = window.innerWidth / window.innerHeight;
  camera = new IsometricCamera(aspectRatio);
  
  // Initialize renderer
  renderer = createRenderer(container);
  
  // Initialize physics
  world = createPhysicsWorld();
  
  // Add lighting
  setupLighting();
  
  // Create test environment
  testEnvironment = new TestEnvironment(scene, world);
  testEnvironment.initialize();
  
  // Create ball test
  ballTest = new BallTest(scene, world);
  ballTest.initialize();
  
  // Get the ball mesh to follow with the camera
  const ball = ballTest.getBall();
  if (ball) {
    // Create camera controller to follow the ball
    // Use an offset that gives a good view for the isometric camera
    const cameraOffset = new THREE.Vector3(8, 8, 8);
    cameraController = new CameraController(
      camera,
      ball.getMesh(),
      cameraOffset,
      0.05 // Lower smoothing factor for more gentle camera movement
    );
    
    // Set up camera boundaries based on the test environment dimensions
    // In a real game, these would be based on the level bounds
    setupCameraBoundaries();
    
    // Set up collision objects to prevent camera from going through walls
    setupCameraCollisions();
    
    // Set up important objects for visibility optimization
    setupVisibilityOptimization(ball.getMesh());
    
    // Set up performance optimization based on device capabilities
    setupPerformanceOptimization();
    
    // Set up event listeners for game state changes
    setupGameStateListeners();
    
    // Update the camera state to match the initial game state
    updateCameraStateForGameState(gameState);
  } else {
    // If no ball is available, just position the camera with a static position
    camera.setPosition(10, 5, 10);
    console.warn('No ball found for camera to follow');
  }
  
  // Initialize debug renderer
  debugRenderer = new DebugRenderer(
    scene, 
    world, 
    createPhysicsObject
  );

  // Start the animation loop
  lastTime = performance.now();
  lastFpsTime = lastTime;
  startAnimationLoop();

  // Set up resize handler
  const handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.updateAspectRatio(width / height);
    renderer.setSize(width, height);
  };
  
  window.addEventListener('resize', handleResize);
  
  // Set up keyboard controls for camera optimization options
  setupKeyboardControls();

  // Return cleanup function
  return () => {
    // Stop animation loop
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    
    // Dispose resources
    debugRenderer.dispose();
    ballTest.dispose();
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
 * Set up camera boundaries based on the environment
 */
function setupCameraBoundaries(): void {
  if (!cameraController) return;
  
  // Define camera boundaries based on the level
  // In a more complex game, these could be calculated from the level geometry
  const boundaries = {
    minX: -50,
    maxX: 50,
    minZ: -50,
    maxZ: 50,
    minY: 0,    // Prevent camera from going below ground
    maxY: 30    // Prevent camera from going too high
  };
  
  // Set boundaries and buffer zone
  cameraController.setBoundaries(boundaries);
  cameraController.setBoundaryBuffer(5); // 5 units buffer from edges
  
  console.log('Camera boundaries configured:', boundaries);
}

/**
 * Set up collision objects to prevent camera from clipping through geometry
 */
function setupCameraCollisions(): void {
  if (!cameraController) return;
  
  // Get objects that the camera should avoid
  // This could be walls, large obstacles, etc.
  const collisionObjects: THREE.Object3D[] = [];
  
  // In a real game, you would have a more structured way to identify collidable objects
  // For simplicity, we'll assume that major objects in the scene should be avoided
  scene.traverse((object) => {
    // Example condition: large meshes that aren't the ground plane
    if (
      object instanceof THREE.Mesh && 
      (object.name.includes('wall') || 
      object.name.includes('obstacle'))
    ) {
      collisionObjects.push(object);
    }
  });
  
  // Set collision objects and minimum distance
  cameraController.setCollisionObjects(collisionObjects);
  cameraController.setCollisionDistance(3); // Keep 3 units away from objects
  
  console.log(`Camera collision avoidance set up with ${collisionObjects.length} objects`);
}

/**
 * Set up visibility optimization for key game objects
 * @param ballMesh The main ball mesh to track
 */
function setupVisibilityOptimization(ballMesh: THREE.Object3D): void {
  if (!cameraController) return;
  
  // Identify important objects that should always be visible
  const importantObjects: THREE.Object3D[] = [ballMesh];
  
  // In a real game, you'd also add targets, goal locations, etc.
  scene.traverse((object) => {
    if (
      object instanceof THREE.Mesh && 
      (object.name.includes('target') || 
       object.name.includes('goal') ||
       object.name.includes('hole'))
    ) {
      importantObjects.push(object);
    }
  });
  
  // Identify potential obstacle objects
  const obstacleObjects: THREE.Object3D[] = [];
  scene.traverse((object) => {
    if (
      object instanceof THREE.Mesh && 
      (object.name.includes('wall') || 
       object.name.includes('obstacle') ||
       object.name.includes('tree') ||
       object.name.includes('building'))
    ) {
      obstacleObjects.push(object);
    }
  });
  
  // Set objects in camera controller
  cameraController.setImportantObjects(importantObjects);
  cameraController.setObstacleObjects(obstacleObjects);
  
  // Enable automatic visibility adjustment
  cameraController.setAutomaticVisibilityAdjustment(true, 3.0);
  
  console.log(`Visibility optimization set up with ${importantObjects.length} important objects and ${obstacleObjects.length} potential obstacles`);
}

/**
 * Set up performance optimization based on device capabilities
 */
function setupPerformanceOptimization(): void {
  if (!cameraController) return;
  
  // Detect if we're running on a low-end device
  // This is a simple heuristic and could be improved with more sophisticated detection
  const isLowEndDevice = 
    navigator.hardwareConcurrency <= 4 ||  // 4 or fewer cores
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent); // Mobile device
  
  if (isLowEndDevice) {
    // Enable high performance mode with lower target FPS on low-end devices
    cameraController.setPerformanceMode(true, 30);
    console.log('Performance optimization enabled for low-end device');
  } else {
    // Standard performance mode on higher-end devices
    cameraController.setPerformanceMode(false, 60);
    console.log('Standard performance mode enabled for high-end device');
  }
}

/**
 * Set up keyboard controls for toggling camera features
 */
function setupKeyboardControls(): void {
  window.addEventListener('keydown', (event) => {
    // O - Toggle automatic visibility adjustment
    if (event.code === 'KeyO' && cameraController) {
      const currentState = cameraController.getIsAutomaticVisibilityAdjustment();
      cameraController.setAutomaticVisibilityAdjustment(!currentState);
    }
    
    // P - Toggle performance mode
    if (event.code === 'KeyP' && cameraController) {
      const currentState = cameraController.getIsHighPerformanceMode();
      cameraController.setPerformanceMode(!currentState);
    }
  });
}

/**
 * Set up event listeners for game state changes to trigger camera transitions
 */
function setupGameStateListeners(): void {
  if (!ballTest || !cameraController) return;
  
  // Add event listeners for user input to change game state
  window.addEventListener('keydown', (event) => {
    // Example: Pressing spacebar toggles between IDLE and AIMING state
    if (event.code === 'Space') {
      if (gameState === GameState.IDLE || gameState === GameState.BALL_AT_REST) {
        setGameState(GameState.AIMING);
      } else if (gameState === GameState.AIMING) {
        // Simulate shot being taken
        const ball = ballTest.getBall();
        if (ball) {
          // Apply a random impulse to simulate a shot
          const direction = new THREE.Vector3(Math.random() - 0.5, 0.3, Math.random() - 0.5).normalize();
          ball.applyImpulse(direction, 5.0);
          setGameState(GameState.SHOT_IN_PROGRESS);
        }
      }
    }
    
    // Example: 'R' key to reset the ball (for testing)
    if (event.code === 'KeyR') {
      const ball = ballTest.getBall();
      if (ball) {
        ball.reset(new THREE.Vector3(0, 5, 0));
        setGameState(GameState.IDLE);
      }
    }
  });
  
  // We'll check the ball's movement state in the animation loop
  // to automatically transition to BALL_AT_REST when appropriate
}

/**
 * Update the camera state based on the game state
 * @param state The current game state
 */
function updateCameraStateForGameState(state: GameState): void {
  if (!cameraController) return;
  
  switch (state) {
    case GameState.IDLE:
      cameraController.transitionToState(CameraState.IDLE, 1.0, Easing.easeInOutCubic);
      break;
      
    case GameState.AIMING:
      // When aiming, zoom out and position the camera for a better view
      cameraController.transitionToState(CameraState.AIMING, 1.0, Easing.easeInOut);
      break;
      
    case GameState.SHOT_IN_PROGRESS:
      // When the ball is in motion, follow more closely
      cameraController.transitionToState(CameraState.IN_FLIGHT, 0.5, Easing.easeInOutCubic);
      break;
      
    case GameState.BALL_AT_REST:
      // When the ball comes to rest, zoom in slightly
      cameraController.transitionToState(CameraState.AT_REST, 1.0, Easing.easeInOutCubic);
      break;
  }
}

/**
 * Set the game state and trigger appropriate camera transitions
 * @param newState The new game state
 */
function setGameState(newState: GameState): void {
  // Skip if same state
  if (newState === gameState) return;
  
  previousGameState = gameState;
  gameState = newState;
  
  console.log(`Game state changed from ${previousGameState} to ${gameState}`);
  
  // Update camera state to match
  updateCameraStateForGameState(gameState);
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
  const animate = (time: number) => {
    // Calculate deltaTime in seconds
    const deltaTime = (time - lastTime) / 1000;
    lastTime = time;
    
    // Step the physics world
    world.step();
    
    // Update test environment
    testEnvironment.update();
    
    // Update ball test with delta time
    ballTest.update(deltaTime);
    
    // Check ball state to update game state if needed
    checkBallState();
    
    // Update camera controller if it exists
    if (cameraController) {
      cameraController.updateCameraPosition(deltaTime);
    }
    
    // Update debug visualization
    debugRenderer.update();
    
    // Render the scene
    renderer.render(scene, camera.getCamera());
    
    // Update FPS counter
    frameCount++;
    if (time - lastFpsTime > FPS_UPDATE_INTERVAL) {
      fps = Math.round((frameCount * 1000) / (time - lastFpsTime));
      lastFpsTime = time;
      frameCount = 0;
      
      // Log FPS or display it in debug overlay
      console.log(`Current FPS: ${fps}`);
      
      // Optionally adjust performance settings based on FPS
      if (cameraController && fps < 30) {
        cameraController.setPerformanceMode(true, 30); // Switch to high performance mode if FPS drops
      }
    }
    
    // Continue animation loop
    animationFrameId = requestAnimationFrame(animate);
  };
  
  animationFrameId = requestAnimationFrame(animate);
}

/**
 * Check the ball's state to automatically update game state when needed
 */
function checkBallState(): void {
  if (!ballTest) return;
  
  const ball = ballTest.getBall();
  if (!ball) return;
  
  // If ball is in motion and has stopped
  if (gameState === GameState.SHOT_IN_PROGRESS && !ball.isMoving()) {
    // Ball has come to rest
    setGameState(GameState.BALL_AT_REST);
  }
  
  // If ball is supposed to be at rest but is moving (e.g., was hit by something)
  if (gameState === GameState.BALL_AT_REST && ball.isMoving()) {
    // Ball is in motion again
    setGameState(GameState.SHOT_IN_PROGRESS);
  }
} 