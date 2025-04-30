import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Ball } from '../models/Ball';
import { TestEnvironment } from '../components/TestEnvironment';
import { BallTest } from '../components/BallTest';
import { CourseTest } from '../components/CourseTest';
import { TerrainGenerator } from '../models/TerrainGenerator';
import { 
  createPhysicsWorld, 
  initRapier,
} from './PhysicsSystem';
import { createRenderer } from './RenderSystem';
import { DebugRenderer } from './DebugRenderer';
import { IsometricCamera, CameraController, CameraState, Easing } from './CameraSystem';
import { ShotStateMachine, ShotState, ShotParameters } from './ShotSystem';
import { AimingSystem } from './AimingSystem';
import { PowerMeterSystem } from './PowerMeterSystem';
import { SpinControlSystem } from './SpinControlSystem';
import { InputManager } from './InputManager';
import { InputHelpDisplay } from './InputHelpDisplay';
import { FeedbackSystem, FeedbackType } from './FeedbackSystem';
import { ShotResultsSystem } from './ShotResultsSystem';
import { UIManager, UIState } from './UIManager';
import { UICoordinator } from './ui/UICoordinator';

// Game state enum
export enum GameState {
  IDLE = 'idle',
  AIMING = 'aiming',
  SHOT_IN_PROGRESS = 'shot-in-progress',
  BALL_AT_REST = 'ball-at-rest',
  OUT_OF_BOUNDS = 'out-of-bounds',  // New state for out of bounds
  RECOVERY = 'recovery',            // New state for ball recovery
  COURSE_COMPLETE = 'course-complete' // New state for completing the course
}

let animationFrameId: number;
let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: IsometricCamera;
let cameraController: CameraController;
let world: RAPIER.World;
let testEnvironment: TestEnvironment;
let courseTest: CourseTest;
let ballTest: BallTest;
let debugRenderer: DebugRenderer;
let lastTime: number = 0;

// Game state tracking
let gameState: GameState = GameState.IDLE;
let previousGameState: GameState = GameState.IDLE;

// Shot system
let shotSystem: ShotStateMachine;

// Aiming system
let aimingSystem: AimingSystem;

// Power meter system
let powerMeterSystem: PowerMeterSystem;

// Spin control system
let spinControlSystem: SpinControlSystem;

// Input systems
let inputManager: InputManager;
let inputHelpDisplay: InputHelpDisplay;

// Feedback system
let feedbackSystem: FeedbackSystem;

// ShotResultsSystem
let shotResultsSystem: ShotResultsSystem | null = null;

// UI systems
let uiManager: UIManager;
let uiCoordinator: UICoordinator;

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
  
  // Create course test
  courseTest = new CourseTest(scene, world);
  
  // Create ball test
  ballTest = new BallTest(scene, world);
  ballTest.initialize();
  
  // Get the ball mesh to follow with the camera
  const ball = ballTest.getBall();
  if (ball) {
    // Initialize the shot system with the ball
    shotSystem = new ShotStateMachine(ball);
    
    // Initialize the aiming system
    aimingSystem = new AimingSystem(scene, shotSystem, ball);
    
    // Initialize the power meter system
    powerMeterSystem = new PowerMeterSystem(scene, shotSystem);
    
    // Connect PowerMeterSystem to UICoordinator
    if (uiCoordinator) {
      uiCoordinator.setPowerMeterSystem(powerMeterSystem);
    }
    
    // Initialize the spin control system
    spinControlSystem = new SpinControlSystem(scene, shotSystem);
    
    // Initialize input systems
    inputManager = new InputManager();
    inputHelpDisplay = new InputHelpDisplay(scene);
    
    // Set up input manager callbacks
    setupInputManager();
    
    // Register a device change listener
    inputManager.setOnDeviceChangeCallback((device) => {
      console.log(`Active input device changed to: ${device}`);
      inputHelpDisplay.setDevice(device);
      
      // Update UI manager with new input device
      if (uiManager) {
        uiManager.updateInputDevice(device);
      }
    });
    
    // Register a state change listener for the shot system
    shotSystem.addStateChangeListener((prevState, newState, params) => {
      handleShotStateChange(prevState, newState, params);
      
      // Update input manager with new state
      inputManager.setShotState(newState);
      
      // Update help display with new state
      inputHelpDisplay.setState(newState);
      
      // Update UI manager with new shot state
      uiManager.updateShotState(newState);
      
      // If we have angle parameters in aiming, update the angle indicator
      if (newState === ShotState.POWER && params && params.angle) {
        const angle = Math.atan2(params.angle.y, params.angle.x);
        uiCoordinator.updateAimAngle(angle);
      }
    });
    
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

  // Create feedback system instance
  feedbackSystem = new FeedbackSystem(scene, camera);

  // Create ShotResultsSystem
  shotResultsSystem = new ShotResultsSystem(scene, camera);
  if (ballTest) {
    const ball = ballTest.getBall();
    if (ball) {
      shotResultsSystem.setBall(ball);
    }
  }

  // Initialize UI Manager
  uiManager = new UIManager(scene, container);
  
  // Initialize UI Coordinator
  uiCoordinator = new UICoordinator(uiManager);
  
  // Set up menu UIs
  uiCoordinator.setupAllMenus();

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
    if (aimingSystem) {
      aimingSystem.dispose();
    }
    
    if (powerMeterSystem) {
      powerMeterSystem.dispose();
    }
    
    if (spinControlSystem) {
      spinControlSystem.dispose();
    }
    
    debugRenderer.dispose();
    ballTest.dispose();
    courseTest.dispose();
    
    // Remove event listeners
    window.removeEventListener('resize', handleResize);
    
    // Dispose of resources
    renderer.dispose();
    
    // Remove renderer from DOM
    if (container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement);
    }
    
    // Dispose input systems
    if (inputManager) {
      inputManager.dispose();
    }
    
    if (inputHelpDisplay) {
      inputHelpDisplay.dispose();
    }
    
    // Clean up UI coordinator
    if (uiCoordinator) {
      uiCoordinator.dispose();
    }
    
    // Clean up UI manager
    if (uiManager) {
      uiManager.dispose();
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
 * Set up event listeners for game state changes
 */
function setupGameStateListeners(): void {
  // We'll add mock input for testing the shot system
  // In a real game, this would be connected to user input
  
  // Set up key bindings for testing the shot system
  window.addEventListener('keydown', (event) => {
    switch (event.key) {
      case ' ': // Space to initiate a shot or continue to next phase
        handleShotKeyInput();
        break;
      case 'Escape': // Escape to cancel shot
        if (shotSystem && shotSystem.getState() !== ShotState.IDLE && 
            shotSystem.getState() !== ShotState.EXECUTING) {
          shotSystem.cancelShot();
        }
        break;
      case 'Backspace': // Backspace to go back to previous shot state
        if (shotSystem) {
          shotSystem.goToPreviousState();
        }
        break;
      case 'Enter': // Enter to confirm the current shot phase
        // In aiming state, confirm the aim and move to power selection
        if (shotSystem && shotSystem.getState() === ShotState.AIMING && aimingSystem) {
          aimingSystem.confirmAim();
        } else if (shotSystem && shotSystem.getState() === ShotState.SPIN && spinControlSystem) {
          spinControlSystem.confirmSpin();
        }
        break;
    }
  });
  
  // Add shot state change listener to update stroke counter
  shotSystem.addStateChangeListener((prevState, newState) => {
    updateStrokeCounter(newState);
  });
}

/**
 * Handle key input for shot control
 */
function handleShotKeyInput(): void {
  if (!shotSystem) return;
  
  switch (shotSystem.getState()) {
    case ShotState.IDLE:
      // Start the shot process
      shotSystem.enterAimingState();
      setGameState(GameState.AIMING);
      break;
      
    case ShotState.AIMING:
      // In the real implementation, this is handled by the aiming system
      // confirmAim() is called by the user when they're done aiming
      break;
      
    case ShotState.POWER:
      // In the real implementation, this is handled by the power meter system
      // selectPower() is called by the user when they're done with power selection
      if (powerMeterSystem) {
        powerMeterSystem.selectPower();
      }
      break;
      
    case ShotState.SPIN:
      // In the real implementation, this is handled by the spin control system
      // confirmSpin() is called by the user when they're done with spin selection
      if (spinControlSystem) {
        spinControlSystem.confirmSpin();
      }
      break;
  }
}

/**
 * Handle shot state changes
 */
function handleShotStateChange(
  prevState: ShotState, 
  newState: ShotState,
  params?: ShotParameters
): void {
  console.log(`Shot system state changed: ${prevState} -> ${newState}`);
  
  // Update game state based on shot state
  switch (newState) {
    case ShotState.IDLE:
      if (gameState === GameState.SHOT_IN_PROGRESS) {
        setGameState(GameState.BALL_AT_REST);
        
        // Stop tracking the shot and show results
        if (shotResultsSystem) {
          shotResultsSystem.stopTracking();
        }
        
        // Show feedback when ball comes to rest
        if (feedbackSystem && ballTest) {
          const ball = ballTest.getBall();
          if (ball) {
            const position = ball.getPosition();
            feedbackSystem.showFeedback(FeedbackType.BALL_STOPPED, position);
          }
        }
      } else if (gameState === GameState.AIMING) {
        setGameState(GameState.IDLE);
      }
      break;
      
    case ShotState.AIMING:
      setGameState(GameState.AIMING);
      break;
      
    case ShotState.EXECUTING:
      setGameState(GameState.SHOT_IN_PROGRESS);
      
      // Start tracking the shot
      if (shotResultsSystem && params) {
        shotResultsSystem.startTracking(params);
      }
      
      // Show shot feedback
      if (feedbackSystem && params && ballTest) {
        const ball = ballTest.getBall();
        if (ball) {
          // Get position from the ball
          const position = ball.getPosition();
          // Show feedback effect at the ball's position
          feedbackSystem.showFeedback(
            FeedbackType.SHOT_EXECUTED, 
            position, 
            { power: params.power, direction: new THREE.Vector3(
              Math.sin(params.angle.x),
              0.1,
              Math.cos(params.angle.x)
            )}
          );
        }
      }
      break;
  }
  
  // Update camera based on the new state if needed
  if (cameraController) {
    // Adjust camera parameters based on shot state
    switch (newState) {
      case ShotState.AIMING:
        // Move camera to a good position for aiming
        cameraController.setStatePreset(CameraState.AIMING, {
          offset: new THREE.Vector3(10, 8, 10),
          smoothingFactor: 0.1
        });
        cameraController.transitionToState(CameraState.AIMING, 1.0, Easing.easeInOutCubic);
        break;
        
      case ShotState.POWER:
        // Position power meter in front of the camera
        if (powerMeterSystem && camera) {
          const cameraPos = new THREE.Vector3();
          camera.getCamera().getWorldPosition(cameraPos);
          
          // Position the meter slightly in front of camera
          const cameraDirection = new THREE.Vector3(0, 0, -1);
          cameraDirection.applyQuaternion(camera.getCamera().quaternion);
          
          const meterPosition = cameraPos.clone().add(
            cameraDirection.multiplyScalar(5) // 5 units in front of camera
          );
          
          powerMeterSystem.positionMeter(meterPosition, cameraPos);
        }
        break;
        
      case ShotState.SPIN:
        // Position spin control in front of the camera
        if (spinControlSystem && camera) {
          const cameraPos = new THREE.Vector3();
          camera.getCamera().getWorldPosition(cameraPos);
          
          // Position the control slightly in front of camera
          const cameraDirection = new THREE.Vector3(0, 0, -1);
          cameraDirection.applyQuaternion(camera.getCamera().quaternion);
          
          const controlPosition = cameraPos.clone().add(
            cameraDirection.multiplyScalar(5) // 5 units in front of camera
          );
          
          spinControlSystem.positionControls(controlPosition, cameraPos);
        }
        break;
        
      case ShotState.EXECUTING:
        // Move camera to a position to follow the ball in flight
        cameraController.setStatePreset(CameraState.IN_FLIGHT, {
          offset: new THREE.Vector3(6, 6, 6),
          smoothingFactor: 0.05
        });
        cameraController.transitionToState(CameraState.IN_FLIGHT, 0.5, Easing.easeInOutCubic);
        break;
        
      case ShotState.IDLE:
        // Return to default camera position
        cameraController.transitionToState(CameraState.IDLE, 1.0, Easing.easeInOutCubic);
        break;
    }
    
    // Update the help display position based on the camera
    if (inputHelpDisplay && camera) {
      const cameraPos = new THREE.Vector3();
      camera.getCamera().getWorldPosition(cameraPos);
      
      // Position the display slightly in front of camera
      const cameraDirection = new THREE.Vector3(0, 0, -1);
      cameraDirection.applyQuaternion(camera.getCamera().quaternion);
      
      const displayPosition = cameraPos.clone().add(
        cameraDirection.multiplyScalar(7) // 7 units in front of camera
      );
      displayPosition.y += 2; // Position above other UI elements
      
      inputHelpDisplay.positionDisplay(displayPosition, cameraPos);
    }
  }
  
  // Update UI with angle information when transitioning to power selection
  if (uiCoordinator && newState === ShotState.POWER && params && params.angle) {
    const angle = Math.atan2(params.angle.y, params.angle.x);
    uiCoordinator.updateAimAngle(angle);
  }
}

/**
 * Update camera state based on game state
 */
function updateCameraStateForGameState(state: GameState): void {
  if (!cameraController) return;
  
  switch (state) {
    case GameState.IDLE:
      cameraController.transitionToState(CameraState.IDLE, 1.0, Easing.easeInOutCubic);
      break;
      
    case GameState.AIMING:
      cameraController.transitionToState(CameraState.AIMING, 1.0, Easing.easeInOutCubic);
      break;
      
    case GameState.SHOT_IN_PROGRESS:
      cameraController.transitionToState(CameraState.IN_FLIGHT, 0.5, Easing.easeInOutCubic);
      break;
      
    case GameState.BALL_AT_REST:
      cameraController.transitionToState(CameraState.AT_REST, 1.0, Easing.easeInOutCubic);
      break;
      
    case GameState.OUT_OF_BOUNDS:
      // Use an overview camera for out of bounds
      cameraController.transitionToState(CameraState.OVERVIEW, 1.0, Easing.easeInOutCubic);
      break;
      
    case GameState.RECOVERY:
      // Use aiming camera for recovery
      cameraController.transitionToState(CameraState.AIMING, 1.0, Easing.easeInOutCubic);
      break;
      
    case GameState.COURSE_COMPLETE:
      // Use celebration camera for course complete
      cameraController.transitionToState(CameraState.OVERVIEW, 1.0, Easing.easeInOutCubic);
      break;
  }
}

/**
 * Set the game state and handle transitions
 */
function setGameState(newState: GameState): void {
  // Store previous state
  const prevState = gameState;
  
  // Skip if state hasn't changed
  if (prevState === newState) return;
  
  console.log(`Game state changing from ${prevState} to ${newState}`);
  
  // Update state
  previousGameState = gameState;
  gameState = newState;
  
  // Update UI manager with new game state
  if (uiManager) {
    uiManager.updateGameState(newState);
  }
  
  // Sync shot system with the new game state
  if (shotSystem) {
    shotSystem.syncWithGameState(gameState);
  }
  
  // Update camera based on the new state
  updateCameraStateForGameState(newState);
}

/**
 * Start the animation loop
 */
function startAnimationLoop() {
  const animate = (time: number) => {
    // Calculate delta time in seconds
    const deltaTime = (time - lastTime) / 1000;
    lastTime = time;
    
    // Performance monitoring
    frameCount++;
    if (time - lastFpsTime > FPS_UPDATE_INTERVAL) {
      fps = Math.round((frameCount * 1000) / (time - lastFpsTime));
      lastFpsTime = time;
      frameCount = 0;
      
      // Log FPS
      // console.log(`FPS: ${fps}`);
    }
    
    // Update physics world
    world.step();
    
    // Update the course test
    courseTest.update(deltaTime);
    
    // Update the ball test
    ballTest.update(deltaTime);
    
    // Update the shot system
    if (shotSystem) {
      shotSystem.update(deltaTime);
    }
    
    // Update the aiming system
    if (aimingSystem) {
      aimingSystem.update();
    }
    
    // Update the power meter system and pass camera position for billboard effect
    if (powerMeterSystem && camera) {
      const cameraPos = new THREE.Vector3();
      camera.getCamera().getWorldPosition(cameraPos);
      powerMeterSystem.update(deltaTime, cameraPos);
    }
    
    // Update the spin control system and pass camera position for billboard effect
    if (spinControlSystem && camera) {
      const cameraPos = new THREE.Vector3();
      camera.getCamera().getWorldPosition(cameraPos);
      spinControlSystem.update(deltaTime, cameraPos);
    }
    
    // Check ball state and update game state if needed
    checkBallState();
    
    // Update the camera controller
    if (cameraController) {
      cameraController.updateCameraPosition(deltaTime);
    }
    
    // Update the debug renderer
    debugRenderer.update();
    
    // Update the input manager
    if (inputManager) {
      inputManager.update(deltaTime);
    }
    
    // Update the help display
    if (inputHelpDisplay && camera) {
      const cameraPos = new THREE.Vector3();
      camera.getCamera().getWorldPosition(cameraPos);
      inputHelpDisplay.update(deltaTime);
    }
    
    // Update feedback system
    if (feedbackSystem) {
      feedbackSystem.update(deltaTime);
    }
    
    // Update ShotResultsSystem
    if (shotResultsSystem) {
      shotResultsSystem.update(deltaTime);
    }
    
    // Update UI manager
    if (uiManager) {
      uiManager.update(deltaTime);
    }
    
    // Update game based on state
    if (gameState === GameState.AIMING) {
      // Update aiming UI
      updateAimingUI(deltaTime);
    }
    
    // Render the scene
    renderer.render(scene, camera.getCamera());
    
    // Request next frame
    animationFrameId = requestAnimationFrame(animate);
  };
  
  // Start the animation loop
  animationFrameId = requestAnimationFrame(animate);
}

/**
 * Check the ball's state to automatically update game state when needed
 */
function checkBallState(): void {
  if (!ballTest) return;
  
  const ball = ballTest.getBall();
  if (!ball) return;
  
  // Get ball position
  const position = ball.getPosition();
  
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
  
  // Get course boundaries
  const boundaries = courseTest.getCourse().getBoundaries();
  
  // Check for out of bounds using course boundaries
  if (gameState === GameState.SHOT_IN_PROGRESS || gameState === GameState.BALL_AT_REST) {
    const isOutOfBounds = 
      position.x < boundaries.minX || position.x > boundaries.maxX || 
      position.z < boundaries.minZ || position.z > boundaries.maxZ ||
      position.y < boundaries.minY; // Fell below minimum height
      
    if (isOutOfBounds) {
      handleOutOfBounds();
    }
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

/**
 * Create physics objects for test purposes
 */
function createPhysicsObject(position: THREE.Vector3, isBox: boolean): void {
  if (isBox) {
    // Create a random sized cube
    const size = 0.3 + Math.random() * 0.5;
    const color = Math.random() * 0xffffff;
    // Create a cube directly 
    const geometry = new THREE.BoxGeometry(size * 2, size * 2, size * 2);
    const material = new THREE.MeshStandardMaterial({ color });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.copy(position);
    cube.castShadow = true;
    cube.receiveShadow = true;
    scene.add(cube);
  } else {
    // Create a random sized sphere
    const radius = 0.3 + Math.random() * 0.5;
    const color = Math.random() * 0xffffff;
    // Create a sphere directly
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    scene.add(sphere);
  }
}

/**
 * Set up the input manager with callbacks for each action
 */
function setupInputManager(): void {
  if (!inputManager || !shotSystem) return;
  
  // Set up default bindings with callbacks for all shot actions
  inputManager.setupDefaultBindings({
    // General actions
    onStartShot: () => {
      if (shotSystem.getState() === ShotState.IDLE) {
        shotSystem.enterAimingState();
      }
    },
    onConfirm: () => {
      // Different confirmation based on the current state
      switch (shotSystem.getState()) {
        case ShotState.AIMING:
          if (aimingSystem) aimingSystem.confirmAim();
          break;
        case ShotState.POWER:
          if (powerMeterSystem) powerMeterSystem.selectPower();
          break;
        case ShotState.SPIN:
          if (spinControlSystem) spinControlSystem.confirmSpin();
          break;
      }
    },
    onCancel: () => {
      if (shotSystem.getState() !== ShotState.IDLE && 
          shotSystem.getState() !== ShotState.EXECUTING) {
        shotSystem.cancelShot();
      }
    },
    onBack: () => {
      shotSystem.goToPreviousState();
    },
    onReset: () => {
      // Reset based on state
      if (shotSystem.getState() === ShotState.SPIN && spinControlSystem) {
        spinControlSystem.resetSpin();
      }
    },
    
    // Aiming actions
    onAim: (direction) => {
      if (shotSystem.getState() === ShotState.AIMING && aimingSystem) {
        aimingSystem.adjustAimDirection(direction);
      }
    },
    onAimPosition: (position) => {
      if (shotSystem.getState() === ShotState.AIMING && aimingSystem) {
        aimingSystem.setAimFromScreenPosition(position);
      }
    },
    
    // Power actions
    onPowerSelect: () => {
      if (shotSystem.getState() === ShotState.POWER && powerMeterSystem) {
        powerMeterSystem.selectPower();
      }
    },
    
    // Spin actions
    onSpin: (direction) => {
      if (shotSystem.getState() === ShotState.SPIN && spinControlSystem) {
        spinControlSystem.addSpin(direction);
      }
    },
    onSpinPosition: (position) => {
      if (shotSystem.getState() === ShotState.SPIN && spinControlSystem) {
        const normalizedPosition = new THREE.Vector2(
          THREE.MathUtils.clamp(position.x, -1, 1),
          THREE.MathUtils.clamp(position.y, -1, 1)
        );
        
        // Convert 2D position to 3D spin vector
        const spinVector = new THREE.Vector3(
          normalizedPosition.x * 0.5, // Left/Right spin
          normalizedPosition.y * 0.7, // Top/Back spin
          0 // No side spin from 2D position
        );
        
        spinControlSystem.setSpin(spinVector);
      }
    }
  });
  
  // Set initial shot state
  inputManager.setShotState(shotSystem.getState());
}

// Add a function to handle out of bounds conditions
function handleOutOfBounds(): void {
  console.log('Ball went out of bounds!');
  
  // Set game state to out of bounds
  setGameState(GameState.OUT_OF_BOUNDS);
  
  // Stop ball physics
  if (ballTest) {
    const ball = ballTest.getBall();
    if (ball) {
      ball.stop();
    }
  }
  
  // Show out of bounds feedback
  if (feedbackSystem && ballTest) {
    const ball = ballTest.getBall();
    if (ball) {
      const position = ball.getPosition();
      // Use ball collision effect temporarily for out of bounds
      feedbackSystem.showFeedback(
        FeedbackType.BALL_COLLISION, 
        position,
        { color: 0xFF0000, intensity: 2.0, duration: 2.0 }
      );
    }
  }
  
  // After a delay, initiate recovery sequence
  setTimeout(() => {
    recoverBall();
  }, 2000);
}

// Add a function to handle ball recovery
function recoverBall(): void {
  console.log('Recovering ball...');
  
  // Set game state to recovery
  setGameState(GameState.RECOVERY);
  
  // Reset ball to last valid position or a safe position
  if (ballTest) {
    const ball = ballTest.getBall();
    if (ball) {
      // In a real game, we would use the last valid position
      // For now, just reset to a safe position
      const safePosition = new THREE.Vector3(0, 1, 0);
      ball.reset(safePosition);
      
      console.log('Ball reset to safe position', safePosition);
      
      // After a brief delay, transition to aiming state
      setTimeout(() => {
        setGameState(GameState.AIMING);
      }, 1000);
    }
  }
}

// Add this function to update angle during aiming
function updateAimingUI(deltaTime: number): void {
  if (!aimingSystem || !uiCoordinator || gameState !== GameState.AIMING) return;
  
  // We need to get the current angle from AimingSystem
  // Since getAimDirection doesn't exist, we can use the ShotParameters from the shotSystem
  const shotSystem = aimingSystem['shotSystem']; // Access internal reference
  if (shotSystem) {
    const params = shotSystem.getShotParameters();
    if (params && params.angle) {
      const angle = Math.atan2(params.angle.y, params.angle.x);
      uiCoordinator.updateAimAngle(angle);
    }
  }
}

// Add this function to update the stroke counter when a shot is executed
function updateStrokeCounter(shotState: ShotState): void {
  if (!uiCoordinator) return;
  
  if (shotState === ShotState.EXECUTING) {
    // Stroke counter UI will already be updated through UI Manager's shot state change event
    // But we can add game-specific logic here, such as updating par values
    
    // Get the stroke counter from UI Coordinator
    const strokeCounter = uiCoordinator.getStrokeCounter();
    
    // For now we just use a fixed par value of 3
    // In a more complete game, this would be set based on the current hole/level
    strokeCounter.setPar(3);
  }
} 