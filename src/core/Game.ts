import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { AssetManager } from './AssetManager';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { SceneRenderer } from '../rendering/SceneRenderer';
import { CameraController, CameraMode } from '../rendering/CameraController';
import { BallEntity } from '../entities/BallEntity';
import { TerrainEntity } from '../entities/TerrainEntity';
import { ShotController } from '../gameplay/shot/ShotController';
import { ShotType, SpinType } from '../gameplay/shot/ShotTypes';
import { GameStateManager, GameState } from '../utils/GameStateManager';
import { InputManager } from '../utils/InputManager';
import { EventSystem, GameEvents } from '../utils/EventSystem';
import { CollisionHandler } from '../physics/CollisionHandler';

/**
 * Main Game class that handles initialization and game loop
 */
export class Game {
  private static instance: Game | null = null;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cameraController: CameraController;
  private physicsWorld: PhysicsWorld;
  private assetManager: AssetManager;
  private gameStateManager: GameStateManager;
  private inputManager: InputManager;
  private eventSystem: EventSystem;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private shotController: ShotController;
  private ball: BallEntity;
  private terrain: TerrainEntity;
  private lastFrameTime: number = 0;
  private isInitialized: boolean = false;
  private boundHandlers: { ballBounce: (collisionData: any) => void; ballStopped: () => void } | null = null;
  private collisionHandler: CollisionHandler;
  private idleDebounceActive: boolean = false;
  private isResettingBall: boolean = false;

  /**
   * Private constructor (using singleton pattern)
   */
  private constructor(container: HTMLElement) {
    // Create WebGL renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: container as HTMLCanvasElement,
      antialias: true 
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, 0.1, 1000
    );
    
    // Initialize managers
    this.assetManager = new AssetManager();
    this.gameStateManager = GameStateManager.getInstance();
    this.eventSystem = EventSystem.getInstance();
    this.inputManager = InputManager.getInstance();
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Global access for debugging
    (window as any).game = this;
    
    this.isInitialized = true;
  }

  /**
   * Initialize the game
   */
  public static async initialize(container: HTMLElement): Promise<() => void> {
    // Create game instance if it doesn't exist
    if (!Game.instance) {
      Game.instance = new Game(container);
      await Game.instance.setup();
      Game.instance.start();
    }
    
    // Return cleanup function
    return () => {
      if (Game.instance) {
        Game.instance.stop();
        Game.instance.cleanup();
        Game.instance = null;
      }
    };
  }

  /**
   * Setup game components
   */
  private async setup(): Promise<void> {
    // Initialize Rapier physics (must be async)
    await RAPIER.init();
    this.physicsWorld = new PhysicsWorld();
    
    // Setup camera controller
    this.cameraController = new CameraController(this.camera);
    
    // Create lighting
    this.setupLighting();
    
    // Create game entities
    this.createEntities();
    
    // Initialize the collision handler
    this.collisionHandler = new CollisionHandler(
      this.physicsWorld.getWorld(),
      this.ball,
      {
        boostSpeedThreshold: 2.0,
        ballStopThreshold: 0.15,
        minBounceVelocity: 1.0
      }
    );
    
    // Setup shot controller
    this.shotController = new ShotController(
      this.scene,
      this.ball.getRigidBody(),
      this.physicsWorld.getWorld()
    );
    
    // Initialize the input manager
    this.inputManager.initialize();
    
    // Setup state change listener
    this.gameStateManager.onEnterState(GameState.AIMING, this.handleEnterAimingState.bind(this));
    this.gameStateManager.onEnterState(GameState.SHOT_PANEL, this.handleEnterShotPanelState.bind(this));
    this.gameStateManager.onEnterState(GameState.CHARGING, this.handleEnterChargingState.bind(this));
    this.gameStateManager.onEnterState(GameState.ROLLING, this.handleEnterRollingState.bind(this));
    this.gameStateManager.onEnterState(GameState.BOOST_READY, this.handleEnterBoostReadyState.bind(this));
    this.gameStateManager.onEnterState(GameState.IDLE, this.handleEnterIdleState.bind(this));
    
    // Create bound event handlers to avoid creating new functions on each bind
    const boundBallBounceHandler = this.handleBallBounce.bind(this);
    const boundBallStoppedHandler = this.handleBallStopped.bind(this);

    // Listen for ball bounce events from physics
    this.eventSystem.on(GameEvents.BALL_BOUNCE, boundBallBounceHandler);

    // Listen for ball stopped event from physics
    this.eventSystem.on(GameEvents.BALL_STOPPED, boundBallStoppedHandler);

    // Store the bound handlers for cleanup
    this.boundHandlers = {
      ballBounce: boundBallBounceHandler,
      ballStopped: boundBallStoppedHandler
    };
    
    // Set initial game state
    this.gameStateManager.setState(GameState.IDLE);
    
    console.log('Game setup complete');
  }

  /**
   * Create lighting for the scene
   */
  private setupLighting(): void {
    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    // Directional light for shadows and highlights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    this.scene.add(directionalLight);
  }

  /**
   * Create game entities
   */
  private createEntities(): void {
    // Create ball entity
    this.ball = new BallEntity(this.scene, this.physicsWorld.getWorld());
    
    // Create terrain entity
    this.terrain = new TerrainEntity(this.scene, this.physicsWorld.getWorld());
  }

  /**
   * Handle entering idle state
   */
  private handleEnterIdleState(): void {
    // The ball has stopped or the shot was canceled
    // In a full game, this is where we would check for hole completion, etc.
  }
  
  /**
   * Handle entering aiming state (Phase 1)
   */
  private handleEnterAimingState(): void {
    // Ensure camera is in aim mode
    this.cameraController.setMode(CameraMode.ORBIT);
  }
  
  /**
   * Handle entering shot panel state (Phase 2)
   */
  private handleEnterShotPanelState(): void {
    // Keep camera in aim mode during guide selection
    this.cameraController.setMode(CameraMode.ORBIT);
  }
  
  /**
   * Handle entering charging state (Phase 3)
   */
  private handleEnterChargingState(): void {
    // Keep camera in aim mode during power selection
    this.cameraController.setMode(CameraMode.ORBIT);
  }
  
  /**
   * Handle entering rolling state (Phase 4a)
   */
  private handleEnterRollingState(): void {
    // Switch camera to follow mode
    this.cameraController.setMode(CameraMode.FOLLOW);
    
    // Set ball to moving using the proper method
    this.ball.setMoving(true);
  }
  
  /**
   * Handle entering boost ready state (Phase 4b)
   */
  private handleEnterBoostReadyState(): void {
    // Ball has hit a surface and can be boosted
    
    // In a full implementation, you might want to:
    // - Slow down time slightly
    // - Add visual effects to the ball
    // - Show boost prompt UI
    
    console.log('Boost opportunity available!');
  }
  
  /**
   * Handle ball bounce events from physics
   * This is crucial for the boost mechanic in Phase 4
   */
  private handleBallBounce(collisionData: any): void {
    // Only check for boost in ROLLING state
    if (!this.gameStateManager.isState(GameState.ROLLING)) return;
    
    // Get velocity to check if the ball has enough speed for a boost
    const velocity = this.ball.getVelocity();
    const speed = velocity.length();
    
    // Only allow boost at meaningful speeds (avoid small bumps)
    if (speed > 2.0) {
      // Trigger boost opportunity
      this.gameStateManager.setState(GameState.BOOST_READY);
      
      // Emit event with collision data for ShotController
      this.eventSystem.emit(GameEvents.BALL_BOUNCE, collisionData);
    }
  }
  
  /**
   * Handle ball stopped events from physics
   */
  private handleBallStopped(): void {
    // Transition to IDLE state if we're currently in ROLLING or BOOST_READY
    if (this.gameStateManager.isState(GameState.ROLLING) || 
        this.gameStateManager.isState(GameState.BOOST_READY)) {
      
      // Reset the ball's moving flag using the proper method
      this.ball.setMoving(false);
      
      // Transition to idle state
      this.gameStateManager.setState(GameState.IDLE);
      
      console.log('Ball stopped rolling');
    }
  }

  /**
   * Start the game loop
   */
  private start(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      requestAnimationFrame(this.update.bind(this));
      console.log('Game loop started');
    }
  }

  /**
   * Stop the game loop
   */
  private stop(): void {
    this.isRunning = false;
    console.log('Game loop stopped');
  }

  /**
   * Main update method called each frame
   */
  private update(timestamp: number): void {
    if (!this.isInitialized) return;
    
    // Calculate delta time
    const deltaTime = (timestamp - this.lastFrameTime) / 1000;
    this.lastFrameTime = timestamp;
    
    // Update input manager for continuous key handling
    this.inputManager.update();
    
    // Update physics
    if (this.physicsWorld) {
      this.physicsWorld.update(deltaTime);
    }
    
    // Update shot controller
    if (this.shotController) {
      this.shotController.update(deltaTime);
    }
    
    // Update ball position to match physics
    if (this.ball) {
      this.ball.update();
      
      // Check for out of bounds
      this.checkBallOutOfBounds();
    }
    
    // Update collision handling
    if (this.collisionHandler) {
      this.collisionHandler.update();
    }
    
    // Update camera to follow ball
    if (this.cameraController) {
      this.cameraController.update();
    }
    
    // Render scene
    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
    
    // Handle state-specific updates
    this.handleStateSpecificUpdates(deltaTime);
    
    // Handle idle actions
    this.handleIdleActions();
    
    // Request next frame
    if (this.isRunning) {
      requestAnimationFrame(this.update.bind(this));
    }
  }

  /**
   * Check if ball is out of bounds and reset if necessary
   */
  private checkBallOutOfBounds(): void {
    if (!this.ball) return;
    
    // Skip check if we're already resetting
    if (this.isResettingBall) return;

    const position = this.ball.getPosition();
    const bounds = 50; // Arena bounds
    
    const isOutOfBounds = 
      position.x < -bounds || 
      position.x > bounds || 
      position.z < -bounds || 
      position.z > bounds ||
      position.y < -10; // Fell through the floor
    
    if (isOutOfBounds) {
      console.log('Ball out of bounds, resetting position');
      
      // Set the resetting flag to prevent duplicate resets
      this.isResettingBall = true;
      
      // Reset ball position and stop all movement
      this.ball.reset(); // Uses the ball's internal reset which also zeros velocity
      
      // Set game state to idle - only if not already in IDLE
      if (!this.gameStateManager.isState(GameState.IDLE)) {
        this.gameStateManager.setState(GameState.IDLE);
      }
      
      // Clear the resetting flag after a longer delay
      // This ensures we don't have overlapping reset operations
      setTimeout(() => {
        this.isResettingBall = false;
      }, 500); // Increased from 100ms to 500ms for more robust debouncing
    }
  }

  /**
   * Handle state-specific updates that need to happen each frame
   */
  private handleStateSpecificUpdates(deltaTime: number): void {
    const currentState = this.gameStateManager.getState();
    
    switch (currentState) {
      case GameState.BOOST_READY:
        // Check for boost window timeout
        // The actual timeout is handled in ShotController
        break;
        
      case GameState.ROLLING:
        // Handle ball physics while rolling
        // Check for bounce opportunities
        break;
    }
  }

  /**
   * Handle actions for the IDLE state
   */
  private handleIdleActions(): void {
    // Only process idle actions when actually in IDLE state
    if (this.gameStateManager.getState() !== GameState.IDLE) return;
    
    // Check for space key to start a new shot
    if (this.inputManager.isKeyDown('Space')) {
      // Debounce to prevent multiple shots
      if (!this.idleDebounceActive) {
        // Start a new shot - this will transition to the SELECTING_TYPE state
        this.shotController.startShot();
        
        // Add a simple debounce to prevent immediate re-activation
        this.idleDebounceActive = true;
        setTimeout(() => {
          this.idleDebounceActive = false;
        }, 300); // 300ms debounce
      }
    }
  }

  /**
   * Fire a shot with a given power (for testing or AI)
   */
  public fireShot(power: number = 0.7): void {
    // This method is kept for backwards compatibility
    // It's now simplified to just start the shot sequence
    this.shotController.startShot();
    
    // TODO: In the future, we may want to implement a way to programmatically
    // set shot parameters including power, but this requires changes to the
    // ShotController interface.
  }

  /**
   * Handle window resize
   */
  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    // Remove event listeners for window resize
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    
    // Remove event listeners for game events
    if (this.boundHandlers) {
      this.eventSystem.off(GameEvents.BALL_BOUNCE, this.boundHandlers.ballBounce);
      this.eventSystem.off(GameEvents.BALL_STOPPED, this.boundHandlers.ballStopped);
      this.boundHandlers = null;
    }
    
    // Dispose collision handler
    if (this.collisionHandler) {
      this.collisionHandler.dispose();
    }
    
    // Dispose of game entities
    if (this.ball) {
      this.ball.dispose();
    }
    
    if (this.terrain) {
      this.terrain.dispose();
    }
    
    // Dispose of the shot controller
    if (this.shotController) {
      this.shotController.dispose();
    }
    
    // Dispose of the physics world
    if (this.physicsWorld) {
      this.physicsWorld.destroy();
    }
    
    // Dispose of renderers
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    // Remove global reference
    (window as any).game = null;
    
    console.log('Game resources cleaned up');
  }
} 