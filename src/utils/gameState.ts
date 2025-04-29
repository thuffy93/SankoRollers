/**
 * Game state management system for Cosmic Rollers
 */

// Possible game states
export enum GameState {
  IDLE = 'IDLE',         // Not currently taking a shot
  AIMING = 'AIMING',     // Player is setting angle
  CHARGING = 'CHARGING', // Player is setting power
  ROLLING = 'ROLLING',   // Ball is in motion
  AIRBORNE = 'AIRBORNE', // Ball is in the air
  COMPLETE = 'COMPLETE', // Hole is completed
}

// Game state manager
export class GameStateManager {
  private currentState: GameState = GameState.IDLE;
  private subscribers: Map<GameState, Array<() => void>> = new Map();
  private exitSubscribers: Map<GameState, Array<() => void>> = new Map();
  private anyStateSubscribers: Array<(state: GameState) => void> = [];

  constructor(initialState: GameState = GameState.IDLE) {
    this.currentState = initialState;
  }

  /**
   * Get the current game state
   */
  public getState(): GameState {
    return this.currentState;
  }

  /**
   * Check if the game is in a specific state
   * @param state The state to check
   */
  public isState(state: GameState): boolean {
    return this.currentState === state;
  }

  /**
   * Transition to a new state
   * @param newState The state to transition to
   */
  public setState(newState: GameState): void {
    // Don't do anything if already in this state
    if (this.currentState === newState) return;

    // Call exit subscribers for the current state
    if (this.exitSubscribers.has(this.currentState)) {
      this.exitSubscribers.get(this.currentState)?.forEach(callback => callback());
    }

    const oldState = this.currentState;
    this.currentState = newState;
    
    // Call enter subscribers for the new state
    if (this.subscribers.has(newState)) {
      this.subscribers.get(newState)?.forEach(callback => callback());
    }

    // Call any-state subscribers
    this.anyStateSubscribers.forEach(callback => callback(newState));
    
    console.log(`Game state changed: ${oldState} -> ${newState}`);
  }

  /**
   * Subscribe to a state change
   * @param state The state to subscribe to
   * @param callback Function to call when entering this state
   */
  public onEnterState(state: GameState, callback: () => void): void {
    if (!this.subscribers.has(state)) {
      this.subscribers.set(state, []);
    }
    this.subscribers.get(state)?.push(callback);
  }

  /**
   * Subscribe to exiting a state
   * @param state The state to watch for exits
   * @param callback Function to call when exiting this state
   */
  public onExitState(state: GameState, callback: () => void): void {
    if (!this.exitSubscribers.has(state)) {
      this.exitSubscribers.set(state, []);
    }
    this.exitSubscribers.get(state)?.push(callback);
  }

  /**
   * Subscribe to any state change
   * @param callback Function called on any state change
   */
  public onStateChange(callback: (state: GameState) => void): void {
    this.anyStateSubscribers.push(callback);
  }
}

// Create and export a singleton instance
export const gameStateManager = new GameStateManager(); 