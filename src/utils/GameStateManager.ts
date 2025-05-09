/**
 * Game state enum
 */
export enum GameState {
  IDLE = 'IDLE',               // Waiting for player input
  SELECTING_TYPE = 'SELECTING_TYPE', // New Phase 0: Player is selecting shot type (grounder/fly)
  AIMING = 'AIMING',           // Phase 1: Player is selecting direction
  SHOT_PANEL = 'SHOT_PANEL',   // Phase 2: Player is selecting guide length (short/long)
  CHARGING = 'CHARGING',       // Phase 3: Player is selecting power and spin
  ROLLING = 'ROLLING',         // Phase 4a: Ball is in motion (regular rolling)
  BOOST_READY = 'BOOST_READY', // Phase 4b: Ball can be boosted at bounce point
  PAUSED = 'PAUSED'            // Game is paused
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
  
  // Valid state transitions (for validation)
  private validTransitions: Map<GameState, GameState[]> = new Map();
  
  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    this.eventSystem = EventSystem.getInstance();
    this.initializeValidTransitions();
  }
  
  /**
   * Initialize valid state transitions map
   */
  private initializeValidTransitions(): void {
    // Define which state transitions are valid
    this.validTransitions.set(GameState.IDLE, [
      GameState.SELECTING_TYPE,  // Start shot selection
      GameState.PAUSED           // Pause game
    ]);
    
    this.validTransitions.set(GameState.SELECTING_TYPE, [
      GameState.IDLE,        // Cancel shot
      GameState.AIMING,      // Confirm shot type, move to aiming
      GameState.PAUSED       // Pause game
    ]);
    
    this.validTransitions.set(GameState.AIMING, [
      GameState.IDLE,           // Cancel shot
      GameState.SELECTING_TYPE, // Go back to shot type selection
      GameState.SHOT_PANEL,     // Confirm direction, move to guide selection
      GameState.PAUSED          // Pause game
    ]);
    
    this.validTransitions.set(GameState.SHOT_PANEL, [
      GameState.IDLE,          // Cancel shot
      GameState.AIMING,        // Go back to aiming
      GameState.CHARGING,      // Confirm guide, move to power selection
      GameState.PAUSED         // Pause game
    ]);
    
    this.validTransitions.set(GameState.CHARGING, [
      GameState.IDLE,        // Cancel shot
      GameState.SHOT_PANEL,  // Go back to guide selection 
      GameState.ROLLING,     // Execute shot
      GameState.PAUSED       // Pause game
    ]);
    
    this.validTransitions.set(GameState.ROLLING, [
      GameState.IDLE,         // Ball stopped
      GameState.BOOST_READY,  // Ball hit bounce point
      GameState.PAUSED        // Pause game
    ]);
    
    this.validTransitions.set(GameState.BOOST_READY, [
      GameState.IDLE,       // Ball stopped or boost missed
      GameState.ROLLING,    // Continue rolling after boost
      GameState.PAUSED      // Pause game
    ]);
    
    this.validTransitions.set(GameState.PAUSED, [
      GameState.IDLE,           // Resume to idle
      GameState.SELECTING_TYPE, // Resume to shot type selection
      GameState.AIMING,         // Resume to aiming
      GameState.SHOT_PANEL,     // Resume to shot panel
      GameState.CHARGING,       // Resume to charging
      GameState.ROLLING,        // Resume to rolling
      GameState.BOOST_READY     // Resume to boost ready
    ]);
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
   * Check if a transition from current state to new state is valid
   */
  private isValidTransition(currentState: GameState, newState: GameState): boolean {
    // Get valid transitions for current state
    const validNextStates = this.validTransitions.get(currentState);
    
    // If no valid transitions defined, allow any transition
    if (!validNextStates) {
      console.warn(`No valid transitions defined for state: ${currentState}`);
      return true;
    }
    
    // Check if new state is in the list of valid transitions
    const isValid = validNextStates.includes(newState);
    
    // Log warning for invalid transitions
    if (!isValid) {
      console.warn(`Invalid state transition: ${currentState} -> ${newState}`);
      console.warn(`Valid transitions are: ${validNextStates.join(', ')}`);
    }
    
    return isValid;
  }
  
  /**
   * Set the current game state
   */
  public setState(newState: GameState): boolean {
    // Skip if same state
    if (this.currentState === newState) {
      console.log(`Already in state ${newState}, skipping state change`);
      return true;
    }
    
    // Validate transition
    if (!this.isValidTransition(this.currentState, newState)) {
      console.error(`Invalid state transition: ${this.currentState} -> ${newState}`);
      
      // List valid transitions for debugging
      const validStates = this.validTransitions.get(this.currentState);
      if (validStates) {
        console.error(`Valid transitions from ${this.currentState} are: ${validStates.join(', ')}`);
      } else {
        console.error(`No valid transitions defined for ${this.currentState}`);
      }
      
      // Provide more context for common invalid transitions
      if (newState === GameState.SELECTING_TYPE && this.currentState !== GameState.IDLE) {
        console.error('Shot sequence can only be started from IDLE state. Cancel current shot first.');
      }
      
      return false; // Failed transition
    }
    
    // Store previous state
    this.previousState = this.currentState;
    
    // Update current state
    this.currentState = newState;
    
    // Call exit listeners for previous state
    this.callExitListeners(this.previousState);
    
    // Call enter listeners for new state
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
    
    console.log(`Game state changed: ${this.previousState} -> ${this.currentState}`);
    
    return true; // Successful transition
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