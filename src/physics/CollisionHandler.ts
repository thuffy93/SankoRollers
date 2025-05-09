import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventSystem, GameEvents } from '../utils/EventSystem';
import { BallEntity } from '../entities/BallEntity';
import { GameStateManager, GameState } from '../utils/GameStateManager';

/**
 * Configuration for collision detection
 */
export interface CollisionConfig {
  boostSpeedThreshold: number;
  ballStopThreshold: number;
  minBounceVelocity: number;
}

/**
 * CollisionHandler - Centralizes collision detection and response logic
 * 
 * This class handles collision events from the physics system and
 * implements appropriate responses based on game state.
 */
export class CollisionHandler {
  private eventSystem: EventSystem;
  private gameStateManager: GameStateManager;
  private ball: BallEntity;
  private physicsWorld: RAPIER.World;
  private config: CollisionConfig;
  
  // Store for active collisions
  private activeCollisions: Set<number> = new Set();
  
  /**
   * Constructor
   */
  constructor(
    world: RAPIER.World,
    ball: BallEntity,
    config?: Partial<CollisionConfig>
  ) {
    this.physicsWorld = world;
    this.ball = ball;
    this.eventSystem = EventSystem.getInstance();
    this.gameStateManager = GameStateManager.getInstance();
    
    // Default configuration
    this.config = {
      boostSpeedThreshold: 2.0,     // Min velocity for boost opportunities
      ballStopThreshold: 0.15,      // Velocity below which ball is considered stopped
      minBounceVelocity: 1.0,       // Min velocity for bounce events
      ...config
    };
    
    console.log("CollisionHandler initialized with config:", this.config);
  }
  
  /**
   * Process collision events that happened this frame
   * Call this from the game update loop
   */
  public processCollisions(): void {
    try {
      // Alternative approach to detect collisions by monitoring velocity changes
      const rigidBody = this.ball.getRigidBody();
      const ballPos = rigidBody.translation();
      
      // Get ball velocity
      const velocity = this.ball.getVelocity();
      const speed = velocity.length();
      
      // Check for rapid velocity changes which indicate collisions
      if (speed > this.config.minBounceVelocity && 
          this.gameStateManager.isState(GameState.ROLLING)) {
        
        // Consider this a potential boost opportunity
        if (speed > this.config.boostSpeedThreshold) {
          // Transition to BOOST_READY state
          this.gameStateManager.setState(GameState.BOOST_READY);
          
          // Emit event with collision data for boost handling
          this.eventSystem.emit(GameEvents.BALL_BOUNCE, {
            velocity,
            position: new THREE.Vector3(ballPos.x, ballPos.y, ballPos.z),
            normal: new THREE.Vector3(0, 1, 0), // Default normal
            collisionId: Date.now() // Unique ID
          });
          
          console.log(`Boost opportunity detected: speed=${speed.toFixed(2)}`);
        }
      }
    } catch (error) {
      console.error("Error processing collisions:", error);
    }
  }
  
  /**
   * Check if ball has stopped moving
   * Call this from the game update loop
   */
  public checkBallStopped(): void {
    // Only check when in ROLLING state
    if (!this.gameStateManager.isState(GameState.ROLLING) && 
        !this.gameStateManager.isState(GameState.BOOST_READY)) return;
    
    // Get current velocity
    const velocity = this.ball.getVelocity();
    const speed = velocity.length();
    
    // Perform a more reliable stop check
    if (speed < this.config.ballStopThreshold) {
      // Double check that it's not just momentarily slow
      // For example, at the peak of an arc
      if (this.isGrounded()) {
        console.log(`Ball has stopped: speed=${speed.toFixed(2)}`);
        
        // Zero out any remaining velocity to ensure it's really stopped
        this.zeroOutBallVelocity();
        
        // Update ball state
        this.ball.setMoving(false);
        
        // Emit ball stopped event
        this.eventSystem.emit(GameEvents.BALL_STOPPED, this.ball.getPosition());
        
        // Transition to IDLE state
        this.gameStateManager.setState(GameState.IDLE);
      }
    }
  }
  
  /**
   * Check if ball is on the ground
   */
  private isGrounded(): boolean {
    const position = this.ball.getPosition();
    const radius = this.ball.getRadius();
    const velocity = this.ball.getVelocity();
    
    // Ball is considered grounded if:
    // 1. Vertical velocity is very small
    // 2. Position is close to the ground (accounting for radius)
    const isNearGround = position.y <= radius + 0.1;
    const hasSmallVerticalVelocity = Math.abs(velocity.y) < 0.1;
    
    return isNearGround && hasSmallVerticalVelocity;
  }
  
  /**
   * Zero out ball velocity completely
   */
  private zeroOutBallVelocity(): void {
    const rigidBody = this.ball.getRigidBody();
    rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }
  
  /**
   * Update method to be called every frame
   */
  public update(): void {
    // Process any collisions that happened this frame
    this.processCollisions();
    
    // Check if ball has stopped
    this.checkBallStopped();
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    this.activeCollisions.clear();
  }
} 