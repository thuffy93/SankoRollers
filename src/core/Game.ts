import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { AssetManager } from './AssetManager';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { SceneRenderer } from '../rendering/SceneRenderer';
import { CameraController } from '../rendering/CameraController';
import { BallEntity } from '../entities/BallEntity';
import { TerrainEntity } from '../entities/TerrainEntity';
import { ShotController } from '../gameplay/ShotController';
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
    
    // Listen for ball stopped event from physics
    this.eventSystem.on(GameEvents.BALL_STOPPED, this.handleBallStopped.bind(this));
    
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
   * Handle ball stopped event
   */
  private handleBallStopped(): void {
    // If in ROLLING state, return to IDLE
    if (this.gameStateManager.isState(GameState.ROLLING)) {
      this.gameStateManager.setState(GameState.IDLE);
      
      console.log('Ball stopped, returning to IDLE state');
    }
  }

  /**
   * Start the game loop
   */
  private start(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      requestAnimationFrame(this.gameLoop.bind(this));
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
   * Main game loop
   */
  private gameLoop(currentTime: number): void {
    if (!this.isRunning) return;
    
    // Calculate delta time in seconds
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    // Update input manager
    this.inputManager.update();
    
    // Update physics world
    this.physicsWorld.update(deltaTime);
    
    // Update entities
    this.ball.update();
    this.terrain.update();
    
    // Update camera controller
    this.cameraController.update();
    
    // Update shot controller with delta time
    this.shotController.update(deltaTime);
    
    // Check if ball has stopped (if in ROLLING state)
    if (this.gameStateManager.isState(GameState.ROLLING)) {
      const velocity = this.ball.getVelocity();
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z);
      
      // If ball is very slow, emit ball stopped event
      if (speed < 0.5) {
        this.eventSystem.emit(GameEvents.BALL_STOPPED);
      }
    }
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
    
    // Continue game loop
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  /**
   * Fire a shot with the specified power
   * 
   * Note: This method is mainly for backward compatibility with the UI button
   */
  public fireShot(power: number): void {
    if (!this.shotController) {
      console.error("Shot controller not initialized");
      return;
    }
    
    // Ensure power is between 0 and 1
    const normalizedPower = Math.max(0, Math.min(1, power));
    
    // Use the shot controller to fire the shot
    this.shotController.fireShot({ power: normalizedPower });
    
    console.log(`Shot fired with power: ${normalizedPower}`);
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
    this.eventSystem.off(GameEvents.BALL_STOPPED, this.handleBallStopped.bind(this));
    
    console.log('Game resources cleaned up');
  }
} 