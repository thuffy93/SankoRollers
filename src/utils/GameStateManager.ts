/**
 * Game state enum
 */
export enum GameState {
  IDLE = 'IDLE',           // Waiting for player input
  AIMING = 'AIMING',       // Player is aiming shot
  CHARGING = 'CHARGING',   // Player is selecting power
  ROLLING = 'ROLLING',     // Ball is in motion
  PAUSED = 'PAUSED'        // Game is paused
}

/**
 * Type for state change callback
 */
type StateChangeCallback = () => void;

import { EventSystem, GameEvents } from './EventSystem';

/**
 * GameStateManager - Singleton to manage game state transitions
 */
export class GameStateManager {
  private static instance: GameStateManager | null = null;
  private currentState: GameState = GameState.IDLE;
  private previousState: GameState = GameState.IDLE;
  private eventSystem: EventSystem;
  
  // Event listeners
  private onEnterListeners: Map<GameState, StateChangeCallback[]> = new Map();
  private onExitListeners: Map<GameState, StateChangeCallback[]> = new Map();
  
  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    this.eventSystem = EventSystem.getInstance();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    
    return GameStateManager.instance;
  }
  
  /**
   * Get the current game state
   */
  public getState(): GameState {
    return this.currentState;
  }
  
  /**
   * Get the previous game state
   */
  public getPreviousState(): GameState {
    return this.previousState;
  }
  
  /**
   * Check if current state matches the specified state
   */
  public isState(state: GameState): boolean {
    return this.currentState === state;
  }
  
  /**
   * Set the game state
   */
  public setState(newState: GameState): void {
    // Skip if state hasn't changed
    if (newState === this.currentState) return;
    
    // Store previous state
    this.previousState = this.currentState;
    
    // Call exit listeners for the old state
    this.callExitListeners(this.currentState);
    
    // Update current state
    this.currentState = newState;
    
    // Call enter listeners for the new state
    this.callEnterListeners(this.currentState);
    
    // Emit state change event through EventSystem
    this.eventSystem.emit(GameEvents.STATE_CHANGE, {
      current: this.currentState,
      previous: this.previousState
    });
    
    // Also dispatch a DOM event for legacy UI components
    const event = new CustomEvent('stateChange', {
      detail: { state: this.currentState }
    });
    window.dispatchEvent(event);
    
    // Log state change
    console.log(`Game state changed: ${this.previousState} -> ${this.currentState}`);
  }
  
  /**
   * Add a listener for when a state is entered
   */
  public onEnterState(state: GameState, callback: StateChangeCallback): void {
    if (!this.onEnterListeners.has(state)) {
      this.onEnterListeners.set(state, []);
    }
    
    this.onEnterListeners.get(state)!.push(callback);
  }
  
  /**
   * Add a listener for when a state is exited
   */
  public onExitState(state: GameState, callback: StateChangeCallback): void {
    if (!this.onExitListeners.has(state)) {
      this.onExitListeners.set(state, []);
    }
    
    this.onExitListeners.get(state)!.push(callback);
  }
  
  /**
   * Remove an enter state listener
   */
  public removeEnterStateListener(state: GameState, callback: StateChangeCallback): void {
    if (!this.onEnterListeners.has(state)) return;
    
    const listeners = this.onEnterListeners.get(state)!;
    const index = listeners.indexOf(callback);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }
  
  /**
   * Remove an exit state listener
   */
  public removeExitStateListener(state: GameState, callback: StateChangeCallback): void {
    if (!this.onExitListeners.has(state)) return;
    
    const listeners = this.onExitListeners.get(state)!;
    const index = listeners.indexOf(callback);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }
  
  /**
   * Call all enter listeners for a state
   */
  private callEnterListeners(state: GameState): void {
    if (!this.onEnterListeners.has(state)) return;
    
    const listeners = this.onEnterListeners.get(state)!;
    listeners.forEach(callback => callback());
  }
  
  /**
   * Call all exit listeners for a state
   */
  private callExitListeners(state: GameState): void {
    if (!this.onExitListeners.has(state)) return;
    
    const listeners = this.onExitListeners.get(state)!;
    listeners.forEach(callback => callback());
  }
  
  /**
   * Reset the state manager (for testing or game reset)
   */
  public static resetInstance(): void {
    GameStateManager.instance = null;
  }
} 