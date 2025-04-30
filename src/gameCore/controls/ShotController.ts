import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GameState, gameStateManager } from '../../utils/gameState';
import { EventType, eventsManager } from '../../utils/events';
import { PhysicsConfig } from '../../utils/physicsConfig';
import { InputState } from './types';
import { TrajectoryVisualizer } from './TrajectoryVisualizer';

/**
 * Controls shot mechanics and ball physics
 * Enhanced to better match Kirby's Dream Course mechanics
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
  
  // Kirby's Dream Course style shot control parameters
  private oscillateSpeed: number = 0.05; // Speed of the power meter oscillation
  private powerIncreasing: boolean = true; // Whether power is going up or down
  private targetPadding: number = 0.6; // Distance to stay away from target when hit
  private hitPositionOffset: { x: number, y: number } = { x: 0, y: 0 }; // Offset for Kirby-style hit position
  private maxBounces: number = 3; // Maximum mid-shot bounces like in Dream Course
  private currentBounces: number = 0;
  private canBounce: boolean = true; // Whether bounce ability is available
  private bounceTimeout: number = 300; // Minimum time between bounces (ms)
  
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
      
      // Update hit position offset for Kirby-style hit control
      this.hitPositionOffset = {
        x: this.inputState.spinDirection.x * 0.3, // 0.3 is the scaling factor
        y: this.inputState.spinDirection.y * 0.3
      };
    });
    
    eventsManager.subscribe(EventType.SHOT_EXECUTE, (payload) => {
      this.executeShot();
    });
    
    eventsManager.subscribe(EventType.SHOT_BOUNCE_REQUESTED, () => {
      this.applyBounce();
    });
    
    // Reset bounce count when ball stops
    eventsManager.subscribe(EventType.BALL_STOPPED, () => {
      this.currentBounces = 0;
      this.canBounce = true;
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
      
      // Reset Kirby-style parameters
      this.powerIncreasing = true;
      this.hitPositionOffset = { x: 0, y: 0 };
      this.currentBounces = 0;
      this.canBounce = true;
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
        this.inputState.power,
        this.hitPositionOffset // Pass hit position for accurate trajectory
      );
    }
  }
  
  /**
   * Execute shot based on current input state
   * Enhanced to match Kirby's Dream Course shot mechanics
   */
  private executeShot(): void {
    const shotPhysics = PhysicsConfig.shot;
    const force = this.inputState.power * shotPhysics.powerMultiplier;
    
    // Calculate direction vector from angle
    const directionX = Math.cos(this.inputState.angle);
    const directionZ = Math.sin(this.inputState.angle);
    
    // Apply hit position offset for Kirby-style hit control
    // This affects the direction of the shot, simulating hitting Kirby at different spots
    const adjustedDirX = directionX + this.hitPositionOffset.x * 0.3;
    const adjustedDirZ = directionZ + this.hitPositionOffset.y * 0.3;
    
    // Apply impulse to ball with Kirby-style hit mechanics
    this.playerBallBody.applyImpulse(
      { 
        x: adjustedDirX * force,
        y: 0.2 * force, // Slightly higher upward component like in Dream Course
        z: adjustedDirZ * force 
      },
      true
    );
    
    // Apply spin if active - more pronounced effect like in Dream Course
    if (this.inputState.spinning) {
      const spinForce = force * shotPhysics.spinMultiplier * 1.5; // Increased spin effect
      
      this.playerBallBody.applyTorqueImpulse(
        {
          x: this.inputState.spinDirection.y * spinForce,
          y: 0,
          z: -this.inputState.spinDirection.x * spinForce
        },
        true
      );
    }
    
    // Reset bounce count for new shot
    this.currentBounces = 0;
    this.canBounce = true;
    
    // Publish shot started event
    eventsManager.publish(EventType.SHOT_STARTED, {
      power: this.inputState.power,
      angle: this.inputState.angle,
      spinning: this.inputState.spinning,
      spinDirection: this.inputState.spinDirection,
      hitPosition: this.hitPositionOffset
    });
    
    // Transition to rolling state
    gameStateManager.setState(GameState.ROLLING);
  }
  
  /**
   * Apply bounce impulse during a shot
   * Enhanced to match Kirby's Dream Course mid-shot jump
   */
  private applyBounce(): void {
    if (!gameStateManager.isState(GameState.ROLLING) || !this.canBounce) return;
    
    // Check if we've exceeded max bounces
    if (this.currentBounces >= this.maxBounces) return;
    
    const shotPhysics = PhysicsConfig.shot;
    const velocity = this.playerBallBody.linvel();
    
    // Only allow bounce if moving slowly enough (prevents excessive bouncing at high speeds)
    const speed = Math.sqrt(
      velocity.x * velocity.x + 
      velocity.y * velocity.y + 
      velocity.z * velocity.z
    );
    
    // Different bounce mechanics based on current state
    if (speed < 15) {
      // Determine bounce force based on current velocity
      let bounceForce = shotPhysics.bounceImpulse;
      
      // Higher bounce if already moving upward (like in Dream Course)
      if (velocity.y > 0) {
        bounceForce *= 1.2;
      }
      
      // Add horizontal momentum preservation like in Dream Course
      this.playerBallBody.applyImpulse(
        { 
          x: velocity.x * 0.1, // Preserve some horizontal momentum
          y: bounceForce, 
          z: velocity.z * 0.1  // Preserve some horizontal momentum
        },
        true
      );
      
      // Increment bounce count
      this.currentBounces++;
      
      // Add cooldown to prevent spam-bouncing
      this.canBounce = false;
      setTimeout(() => {
        this.canBounce = true;
      }, this.bounceTimeout);
      
      // Publish bounce event
      eventsManager.publish(EventType.SHOT_BOUNCE, { 
        position: this.playerBallBody.translation(),
        bounceCount: this.currentBounces
      });
    }
  }
  
  /**
   * Update power meter based on Kirby's Dream Course oscillation
   */
  public updatePowerMeter(): number {
    // Kirby-style oscillating power meter
    if (gameStateManager.isState(GameState.CHARGING)) {
      // In Kirby's Dream Course, the power oscillates up and down automatically
      if (this.powerIncreasing) {
        this.inputState.power += 2;
        if (this.inputState.power >= 100) {
          this.powerIncreasing = false;
        }
      } else {
        this.inputState.power -= 2;
        if (this.inputState.power <= 0) {
          this.powerIncreasing = true;
        }
      }
      
      // Publish power change event
      eventsManager.publish(EventType.POWER_CHANGED, { power: this.inputState.power });
      
      // Update trajectory with new power
      this.updateTrajectoryPreview();
    }
    
    return this.inputState.power;
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
   * Perform a Kirby-style stop when hitting a target
   */
  public stopOnTargetHit(): void {
    // In Kirby's Dream Course, Kirby stops when hitting a target
    this.playerBallBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.playerBallBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    
    // Transition back to idle state
    gameStateManager.setState(GameState.IDLE);
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    this.trajectoryVisualizer.dispose();
  }
  
  /**
   * Get current input state
   */
  public getInputState(): InputState {
    return { ...this.inputState };
  }
}