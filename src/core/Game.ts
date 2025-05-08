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
      
      // Check if ball has stopped (if in ROLLING state)
      if (this.gameStateManager.isState(GameState.ROLLING)) {
        const velocity = this.ball.getVelocity();
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z);
        
        // If ball is very slow, consider it stopped
        if (speed < 0.5) {
          // Mark ball as not moving
          this.ball.setMoving(false);
          
          // Transition to IDLE state directly without emitting an event
          // This avoids the recursive loop that was happening before
          this.gameStateManager.setState(GameState.IDLE);
        }
      }
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

    const position = this.ball.getPosition();
    const bounds = 50; // Arena bounds
    
    if (
      position.x < -bounds || 
      position.x > bounds || 
      position.z < -bounds || 
      position.z > bounds ||
      position.y < -10 // Fell through the floor
    ) {
      console.log('Ball out of bounds, resetting position');
      
      // Reset ball position to center
      this.ball.setPosition(new THREE.Vector3(0, 1, 0));
      
      // Set game state to idle
      this.gameStateManager.setState(GameState.IDLE);
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
   * Fire a shot with the given parameters (for external/debug use)
   */
  public fireShot(power: number = 0.7): void {
    if (this.shotController) {
      // Set up shot parameters
      const options = {
        power: power,
        shotType: ShotType.GROUNDER,
        spinType: SpinType.NONE
      };
      
      // Fire the shot
      this.shotController.fireShot(options);
    }
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
    // Dispose Three.js resources
    this.renderer.dispose();
    
    // Dispose managers
    if (this.inputManager) {
      this.inputManager.dispose();
    }
    
    // Dispose shot controller
    if (this.shotController) {
      this.shotController.dispose();
    }
    
    // Remove event listeners
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    if (this.boundHandlers) {
      this.eventSystem.off(GameEvents.BALL_BOUNCE, this.boundHandlers.ballBounce);
      this.eventSystem.off(GameEvents.BALL_STOPPED, this.boundHandlers.ballStopped);
    }
    
    console.log('Game resources cleaned up');
  }
} 