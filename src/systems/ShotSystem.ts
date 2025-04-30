import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Ball } from '../models/Ball';
import { GameState } from './GameSystem';
import { CameraState } from './CameraSystem';

/**
 * Enum for the different states of the shot process
 */
export enum ShotState {
  IDLE = 'idle',           // Player can initiate a shot
  AIMING = 'aiming',       // Player is selecting the angle for the shot
  POWER = 'power',         // Player is selecting the power level for the shot
  SPIN = 'spin',           // Player is selecting the spin for the shot
  EXECUTING = 'executing'  // Shot is being executed (ball in motion)
}

/**
 * Interface for shot parameters determined through user input
 */
export interface ShotParameters {
  angle: THREE.Vector2;      // XZ-plane angle for the shot direction
  power: number;             // Shot power (0-1 normalized value)
  spin: THREE.Vector3;       // Spin force to apply (x,y,z components)
  position: THREE.Vector3;   // The position the shot is executed from
}

/**
 * Callback function type for state transitions
 */
export type ShotStateChangeCallback = (
  prevState: ShotState,
  newState: ShotState,
  params?: ShotParameters
) => void;

/**
 * Shot State Machine class to manage the shot process flow
 */
export class ShotStateMachine {
  // Current state
  private currentState: ShotState = ShotState.IDLE;
  
  // Shot parameters being built up through the states
  private shotParams: ShotParameters = {
    angle: new THREE.Vector2(0, 0),
    power: 0,
    spin: new THREE.Vector3(0, 0, 0),
    position: new THREE.Vector3(0, 0, 0)
  };
  
  // Listeners for state changes
  private stateChangeListeners: ShotStateChangeCallback[] = [];
  
  // Reference to the ball object to get position and apply forces
  private ball: Ball | null = null;

  // Maximum values for shot parameters to scale user input
  private maxPower: number = 10;
  private maxSpin: number = 5;

  /**
   * Create a new ShotStateMachine
   * @param ball The ball object to control
   */
  constructor(ball?: Ball) {
    if (ball) {
      this.setBall(ball);
    }
  }

  /**
   * Set the ball object for this shot system
   * @param ball The ball to control
   */
  public setBall(ball: Ball): void {
    this.ball = ball;
    // Initialize shot position based on current ball position
    if (this.ball) {
      this.shotParams.position.copy(this.ball.getPosition());
    }
  }

  /**
   * Get the current shot state
   * @returns The current ShotState
   */
  public getState(): ShotState {
    return this.currentState;
  }

  /**
   * Get the current shot parameters
   * @returns The current ShotParameters
   */
  public getShotParameters(): ShotParameters {
    return {
      angle: this.shotParams.angle.clone(),
      power: this.shotParams.power,
      spin: this.shotParams.spin.clone(),
      position: this.shotParams.position.clone()
    };
  }

  /**
   * Add a listener for state change events
   * @param callback Function to call when state changes
   */
  public addStateChangeListener(callback: ShotStateChangeCallback): void {
    this.stateChangeListeners.push(callback);
  }

  /**
   * Remove a state change listener
   * @param callback The listener function to remove
   */
  public removeStateChangeListener(callback: ShotStateChangeCallback): void {
    const index = this.stateChangeListeners.indexOf(callback);
    if (index !== -1) {
      this.stateChangeListeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of a state change
   * @param prevState The previous state
   * @param newState The new state
   */
  private notifyStateChange(prevState: ShotState, newState: ShotState): void {
    for (const listener of this.stateChangeListeners) {
      listener(prevState, newState, this.getShotParameters());
    }
  }

  /**
   * Transition to a new state if valid
   * @param newState The state to transition to
   * @returns True if transition was successful
   */
  private transitionToState(newState: ShotState): boolean {
    // Check if this is a valid transition
    if (!this.isValidTransition(newState)) {
      console.warn(`Invalid shot state transition from ${this.currentState} to ${newState}`);
      return false;
    }

    const prevState = this.currentState;
    this.currentState = newState;
    
    // If we're moving to EXECUTING, update the final shot position from the ball
    if (newState === ShotState.EXECUTING && this.ball) {
      this.shotParams.position.copy(this.ball.getPosition());
    }

    // Notify listeners of the state change
    this.notifyStateChange(prevState, newState);
    console.log(`Shot state changed from ${prevState} to ${newState}`);
    
    return true;
  }

  /**
   * Check if a transition to the target state is valid
   * @param targetState The state to transition to
   * @returns True if transition is valid
   */
  private isValidTransition(targetState: ShotState): boolean {
    // Define valid transitions from each state
    switch (this.currentState) {
      case ShotState.IDLE:
        // From IDLE, can only go to AIMING
        return targetState === ShotState.AIMING;
      
      case ShotState.AIMING:
        // From AIMING, can go to POWER or back to IDLE (cancel)
        return targetState === ShotState.POWER || targetState === ShotState.IDLE;
      
      case ShotState.POWER:
        // From POWER, can go to SPIN, EXECUTING (skip spin), or back to AIMING
        return targetState === ShotState.SPIN || 
               targetState === ShotState.EXECUTING || 
               targetState === ShotState.AIMING;
      
      case ShotState.SPIN:
        // From SPIN, can only go to EXECUTING or back to POWER
        return targetState === ShotState.EXECUTING || targetState === ShotState.POWER;
      
      case ShotState.EXECUTING:
        // From EXECUTING, can only go back to IDLE (when shot is complete)
        return targetState === ShotState.IDLE;
      
      default:
        return false;
    }
  }

  /**
   * Enter the aiming state to begin shot setup
   * @returns True if state transition was successful
   */
  public enterAimingState(): boolean {
    // Can only enter aiming from IDLE state
    if (this.currentState !== ShotState.IDLE) {
      console.warn(`Cannot enter aiming state from ${this.currentState}`);
      return false;
    }

    return this.transitionToState(ShotState.AIMING);
  }

  /**
   * Set the angle for the shot and move to the power selection state
   * @param angle The angle in the XZ plane (Vector2)
   * @returns True if state transition was successful
   */
  public setAngleAndContinue(angle: THREE.Vector2): boolean {
    // Can only set angle in AIMING state
    if (this.currentState !== ShotState.AIMING) {
      console.warn(`Cannot set angle in ${this.currentState} state`);
      return false;
    }

    // Update the angle parameter
    this.shotParams.angle.copy(angle);
    
    // Move to the next state (POWER)
    return this.transitionToState(ShotState.POWER);
  }

  /**
   * Set the power for the shot and move to the spin selection state
   * @param power Normalized power value (0-1)
   * @param skipSpin Whether to skip the spin state and execute immediately
   * @returns True if state transition was successful
   */
  public setPowerAndContinue(power: number, skipSpin: boolean = false): boolean {
    // Can only set power in POWER state
    if (this.currentState !== ShotState.POWER) {
      console.warn(`Cannot set power in ${this.currentState} state`);
      return false;
    }

    // Clamp power between 0 and 1
    this.shotParams.power = Math.max(0, Math.min(1, power));
    
    // Move to the next state (SPIN or EXECUTING if skipping spin)
    if (skipSpin) {
      return this.transitionToState(ShotState.EXECUTING);
    } else {
      return this.transitionToState(ShotState.SPIN);
    }
  }

  /**
   * Set the spin for the shot and execute
   * @param spin The spin vector
   * @returns True if state transition was successful
   */
  public setSpinAndExecute(spin: THREE.Vector3): boolean {
    // Can only set spin in SPIN state
    if (this.currentState !== ShotState.SPIN) {
      console.warn(`Cannot set spin in ${this.currentState} state`);
      return false;
    }

    // Update the spin parameter
    this.shotParams.spin.copy(spin);
    
    // Move to execution state
    return this.transitionToState(ShotState.EXECUTING);
  }

  /**
   * Execute the shot with the current parameters
   * @returns True if the shot was executed successfully
   */
  public executeShot(): boolean {
    // Can only execute shot in EXECUTING state
    if (this.currentState !== ShotState.EXECUTING) {
      console.warn(`Cannot execute shot in ${this.currentState} state`);
      return false;
    }

    if (!this.ball) {
      console.error('Cannot execute shot: ball is not set');
      return false;
    }

    try {
      // Calculate the 3D direction vector from the 2D angle (in XZ plane)
      const direction = new THREE.Vector3(
        Math.sin(this.shotParams.angle.x),
        0.1, // Slight upward angle
        Math.cos(this.shotParams.angle.x)
      ).normalize();

      // Scale the power - applying a non-linear curve for more natural feel
      // Power ranges from 0-1, we apply a quadratic curve to make fine control easier
      const powerCurve = (this.shotParams.power * this.shotParams.power) * 0.8 + this.shotParams.power * 0.2;
      const scaledPower = powerCurve * this.maxPower;
      
      // Log details before executing physics
      console.log(`Executing shot with parameters:
        - Direction: [${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)}]
        - Power: ${this.shotParams.power.toFixed(2)} (scaled: ${scaledPower.toFixed(2)})
        - Spin: [${this.shotParams.spin.x.toFixed(2)}, ${this.shotParams.spin.y.toFixed(2)}, ${this.shotParams.spin.z.toFixed(2)}]
        - Position: [${this.shotParams.position.x.toFixed(2)}, ${this.shotParams.position.y.toFixed(2)}, ${this.shotParams.position.z.toFixed(2)}]
      `);
      
      // Apply the shot impulse to the ball
      this.ball.applyImpulse(direction, scaledPower);
      
      // Apply the spin if it's significant
      if (this.shotParams.spin.lengthSq() > 0.01) {
        // Scale spin based on power - more powerful shots can have more spin
        const spinPowerFactor = 0.7 + this.shotParams.power * 0.3; // 0.7-1.0 range
        const scaledSpin = this.shotParams.spin.clone().multiplyScalar(this.maxSpin * spinPowerFactor);
        
        // Apply complex spin physics
        this.ball.applySpin(scaledSpin);
        
        // Also set the angular velocity for immediate visual feedback
        this.ball.setAngularVelocity(scaledSpin);
        
        console.log(`Applied spin: [${scaledSpin.x.toFixed(2)}, ${scaledSpin.y.toFixed(2)}, ${scaledSpin.z.toFixed(2)}]`);
      }

      return true;
    } catch (error) {
      console.error('Error executing shot:', error);
      return false;
    }
  }

  /**
   * Reset to idle state when the shot is complete
   */
  public resetToIdle(): boolean {
    // Reset shot parameters for the next shot
    this.shotParams = {
      angle: new THREE.Vector2(0, 0),
      power: 0,
      spin: new THREE.Vector3(0, 0, 0),
      position: this.ball ? this.ball.getPosition().clone() : new THREE.Vector3(0, 0, 0)
    };
    
    // Transition back to idle state
    return this.transitionToState(ShotState.IDLE);
  }

  /**
   * Cancel the current shot and return to idle state
   */
  public cancelShot(): boolean {
    if (this.currentState === ShotState.EXECUTING) {
      console.warn('Cannot cancel shot while executing');
      return false;
    }
    
    // Reset shot parameters and return to idle
    return this.resetToIdle();
  }

  /**
   * Go back to the previous state in the shot sequence
   */
  public goToPreviousState(): boolean {
    switch (this.currentState) {
      case ShotState.POWER:
        return this.transitionToState(ShotState.AIMING);
      case ShotState.SPIN:
        return this.transitionToState(ShotState.POWER);
      default:
        console.warn(`Cannot go back from ${this.currentState} state`);
        return false;
    }
  }

  /**
   * Map GameState to corresponding ShotState
   * @param gameState The current game state
   */
  public syncWithGameState(gameState: GameState): void {
    switch (gameState) {
      case GameState.AIMING:
        if (this.currentState === ShotState.IDLE) {
          this.enterAimingState();
        }
        break;
      case GameState.SHOT_IN_PROGRESS:
        if (this.currentState !== ShotState.EXECUTING) {
          // Force transition to EXECUTING if game state says a shot is in progress
          this.currentState = ShotState.EXECUTING;
        }
        break;
      case GameState.BALL_AT_REST:
      case GameState.IDLE:
        if (this.currentState === ShotState.EXECUTING) {
          this.resetToIdle();
        }
        break;
    }
  }
  
  /**
   * Update the shot system (called every frame)
   * @param deltaTime Time since last update
   */
  public update(deltaTime: number): void {
    // If we're in executing state and the ball has stopped moving,
    // automatically transition back to idle
    if (this.currentState === ShotState.EXECUTING && 
        this.ball && 
        !this.ball.isMoving()) {
      this.resetToIdle();
    }
    
    // Update ball position for next shot
    if (this.ball && this.currentState === ShotState.IDLE) {
      this.shotParams.position.copy(this.ball.getPosition());
    }
  }
} 