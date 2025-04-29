import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GameState, gameStateManager } from '../../utils/gameState';
import { EventType, eventsManager } from '../../utils/events';
import { PhysicsConfig } from '../../utils/physicsConfig';
import { InputState } from './types';
import { TrajectoryVisualizer } from './TrajectoryVisualizer';

/**
 * Controls shot mechanics and ball physics
 */
export class ShotController {
  private playerBallBody: RAPIER.RigidBody;
  private world: RAPIER.World;
  private trajectoryVisualizer: TrajectoryVisualizer;
  private inputState: InputState = {
    power: 0,
    angle: 0,
    spinning: false,
    spinDirection: { x: 0, y: 0 }
  };
  
  constructor(
    scene: THREE.Scene, 
    playerBallBody: RAPIER.RigidBody,
    world: RAPIER.World
  ) {
    this.playerBallBody = playerBallBody;
    this.world = world;
    this.trajectoryVisualizer = new TrajectoryVisualizer(scene);
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Set up game state listeners
    this.setupStateListeners();
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for input events
    eventsManager.subscribe(EventType.ANGLE_CHANGED, (payload) => {
      this.inputState.angle = payload.angle;
      this.updateTrajectoryPreview();
    });
    
    eventsManager.subscribe(EventType.POWER_CHANGED, (payload) => {
      this.inputState.power = payload.power;
      this.updateTrajectoryPreview();
    });
    
    eventsManager.subscribe(EventType.SPIN_UPDATED, (payload) => {
      this.inputState.spinning = payload.spinning;
      this.inputState.spinDirection = payload.direction;
    });
    
    eventsManager.subscribe(EventType.SHOT_EXECUTE, (payload) => {
      this.executeShot();
    });
    
    eventsManager.subscribe(EventType.SHOT_BOUNCE_REQUESTED, () => {
      this.applyBounce();
    });
  }
  
  /**
   * Set up game state listeners
   */
  private setupStateListeners(): void {
    // Reset input state when entering IDLE state
    gameStateManager.onEnterState(GameState.IDLE, () => {
      this.inputState.power = 0;
      this.inputState.angle = 0;
      this.inputState.spinning = false;
      this.inputState.spinDirection = { x: 0, y: 0 };
      this.trajectoryVisualizer.hideTrajectory();
    });
    
    // Show trajectory when entering AIMING state
    gameStateManager.onEnterState(GameState.AIMING, () => {
      this.updateTrajectoryPreview();
    });
    
    // Hide trajectory when leaving AIMING or CHARGING state
    gameStateManager.onExitState(GameState.AIMING, () => {
      if (!gameStateManager.isState(GameState.CHARGING)) {
        this.trajectoryVisualizer.hideTrajectory();
      }
    });
    
    gameStateManager.onExitState(GameState.CHARGING, () => {
      this.trajectoryVisualizer.hideTrajectory();
    });
    
    // Start monitoring ball velocity when in ROLLING state
    gameStateManager.onEnterState(GameState.ROLLING, () => {
      this.startBallVelocityCheck();
    });
  }
  
  /**
   * Update the trajectory preview
   */
  private updateTrajectoryPreview(): void {
    const position = this.playerBallBody.translation();
    const positionVector = new THREE.Vector3(position.x, position.y, position.z);
    
    // Update trajectory visualization
    if (gameStateManager.isState(GameState.AIMING) || 
        gameStateManager.isState(GameState.CHARGING)) {
      this.trajectoryVisualizer.showTrajectory(
        positionVector,
        this.inputState.angle,
        this.inputState.power
      );
    }
  }
  
  /**
   * Execute shot based on current input state
   */
  private executeShot(): void {
    const shotPhysics = PhysicsConfig.shot;
    const force = this.inputState.power * shotPhysics.powerMultiplier;
    
    // Calculate direction vector from angle
    const directionX = Math.cos(this.inputState.angle);
    const directionZ = Math.sin(this.inputState.angle);
    
    // Apply impulse to ball
    this.playerBallBody.applyImpulse(
      { 
        x: directionX * force,
        y: 0.1 * force, // Small upward component
        z: directionZ * force 
      },
      true
    );
    
    // Apply spin if active
    if (this.inputState.spinning) {
      const spinForce = force * shotPhysics.spinMultiplier;
      
      this.playerBallBody.applyTorqueImpulse(
        {
          x: this.inputState.spinDirection.y * spinForce,
          y: 0,
          z: -this.inputState.spinDirection.x * spinForce
        },
        true
      );
    }
    
    // Publish shot started event
    eventsManager.publish(EventType.SHOT_STARTED, {
      power: this.inputState.power,
      angle: this.inputState.angle,
      spinning: this.inputState.spinning,
      spinDirection: this.inputState.spinDirection
    });
    
    // Transition to rolling state
    gameStateManager.setState(GameState.ROLLING);
  }
  
  /**
   * Apply bounce impulse during a shot
   */
  private applyBounce(): void {
    if (!gameStateManager.isState(GameState.ROLLING)) return;
    
    const shotPhysics = PhysicsConfig.shot;
    const velocity = this.playerBallBody.linvel();
    
    // Only allow bounce if moving slowly enough
    const speed = Math.sqrt(
      velocity.x * velocity.x + 
      velocity.y * velocity.y + 
      velocity.z * velocity.z
    );
    
    if (speed < 10) {
      // Apply upward impulse
      this.playerBallBody.applyImpulse(
        { x: 0, y: shotPhysics.bounceImpulse, z: 0 },
        true
      );
      
      // Publish bounce event
      eventsManager.publish(EventType.SHOT_BOUNCE, { 
        position: this.playerBallBody.translation()
      });
    }
  }
  
  /**
   * Start checking ball velocity to determine when it stops
   */
  private startBallVelocityCheck(): void {
    const checkVelocity = () => {
      if (!gameStateManager.isState(GameState.ROLLING)) return;
      
      const velocity = this.playerBallBody.linvel();
      const speed = Math.sqrt(
        velocity.x * velocity.x + 
        velocity.y * velocity.y + 
        velocity.z * velocity.z
      );
      
      // Check if ball has stopped
      if (speed < PhysicsConfig.shot.minVelocityToStop) {
        // Ensure ball has actually stopped by zeroing velocity
        this.playerBallBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
        this.playerBallBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
        
        // Publish ball stopped event
        eventsManager.publish(EventType.BALL_STOPPED, {
          position: this.playerBallBody.translation()
        });
        
        // Transition back to idle state
        gameStateManager.setState(GameState.IDLE);
      } else {
        // Continue checking
        requestAnimationFrame(checkVelocity);
      }
    };
    
    // Start checking
    requestAnimationFrame(checkVelocity);
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    this.trajectoryVisualizer.dispose();
  }
} 