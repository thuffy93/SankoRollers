import { EventSystem, GameEvents } from './EventSystem';
import { GameStateManager, GameState } from './GameStateManager';

/**
 * InputManager - Handles user input and maps it to game events
 * 
 * This class follows the Singleton pattern and captures raw input from
 * keyboard, mouse, and touch, then emits appropriate game events.
 */
export class InputManager {
  private static instance: InputManager | null = null;
  private eventSystem: EventSystem;
  private gameStateManager: GameStateManager;
  private keysDown: Set<string> = new Set();
  private isInitialized: boolean = false;
  
  // Key states for continuous key press
  private keyStates: Map<string, boolean> = new Map();
  
  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    this.eventSystem = EventSystem.getInstance();
    this.gameStateManager = GameStateManager.getInstance();
    
    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): InputManager {
    if (!InputManager.instance) {
      InputManager.instance = new InputManager();
    }
    
    return InputManager.instance;
  }

  /**
   * Initialize event listeners
   * Call this once when the game starts
   */
  public initialize(): void {
    if (this.isInitialized) return;
    
    // Add event listeners to document
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    this.isInitialized = true;
    console.log('InputManager event listeners initialized');
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Prevent default behavior for game control keys
    if (this.shouldPreventDefault(event.code)) {
      event.preventDefault();
    }
    
    // Add key to keysDown set if it's not already there
    if (!this.keysDown.has(event.code)) {
      this.keysDown.add(event.code);
      
      // Set key state to true
      this.keyStates.set(event.code, true);
      
      // Emit event through event system
      this.eventSystem.emit(GameEvents.KEY_DOWN, event.code, event);
      
      // Check for specific game actions
      this.checkGameActions(event.code, true);
    }
  }

  /**
   * Handle keyup events
   */
  private handleKeyUp(event: KeyboardEvent): void {
    // Prevent default behavior for game control keys
    if (this.shouldPreventDefault(event.code)) {
      event.preventDefault();
    }
    
    // Remove key from keysDown set
    this.keysDown.delete(event.code);
    
    // Set key state to false
    this.keyStates.set(event.code, false);
    
    // Emit event through event system
    this.eventSystem.emit(GameEvents.KEY_UP, event.code, event);
    
    // Check for specific game actions
    this.checkGameActions(event.code, false);
  }

  /**
   * Check key states and emit game-specific action events
   */
  private checkGameActions(keyCode: string, isDown: boolean): void {
    // Get current game state for state-specific handling
    const currentState = this.gameStateManager.getState();
    
    // State-specific event handling to avoid unnecessary event emissions
    if (isDown) {
      // Handle key down events
      switch (currentState) {
        case GameState.IDLE:
          // In IDLE state, Space starts a new shot
          if (keyCode === 'Space') {
            // Start shot is handled directly in Game.handleIdleActions
            // No event needed here
          }
          break;
          
        case GameState.SELECTING_TYPE:
          // In SELECTING_TYPE state, Up/Down toggles shot type, Space confirms
          if (keyCode === 'ArrowUp' || keyCode === 'ArrowDown') {
            this.eventSystem.emit(GameEvents.SHOT_TYPE_TOGGLE);
          } else if (keyCode === 'Space') {
            this.eventSystem.emit(GameEvents.SHOT_TYPE_CONFIRM);
          }
          break;
          
        case GameState.AIMING:
          // In AIMING state, Left/Right adjusts aim, Space confirms
          if (keyCode === 'ArrowLeft') {
            this.eventSystem.emit(GameEvents.SHOT_AIM, -0.8);
          } else if (keyCode === 'ArrowRight') {
            this.eventSystem.emit(GameEvents.SHOT_AIM, 0.8);
          } else if (keyCode === 'Space') {
            this.eventSystem.emit(GameEvents.SHOT_DIRECTION_CONFIRM);
          }
          break;
          
        case GameState.SHOT_PANEL:
          // In SHOT_PANEL state, Up/Down toggles guide length, Space confirms
          if (keyCode === 'ArrowUp' || keyCode === 'ArrowDown') {
            this.eventSystem.emit(GameEvents.SHOT_GUIDE_TOGGLE);
          } else if (keyCode === 'Space') {
            this.eventSystem.emit(GameEvents.SHOT_GUIDE_CONFIRM);
          }
          break;
          
        case GameState.CHARGING:
          // In CHARGING state, Space starts power oscillation
          if (keyCode === 'Space') {
            this.eventSystem.emit(GameEvents.SHOT_POWER_CHANGE, 0);
          }
          break;
          
        case GameState.BOOST_READY:
          // In BOOST_READY state, Space activates boost
          if (keyCode === 'Space') {
            this.eventSystem.emit(GameEvents.SHOT_BOOST);
          }
          break;
      }
      
      // Universal event handling for all states
      if (keyCode === 'Escape') {
        // Cancel shot from any active shot state
        if (currentState !== GameState.IDLE && 
            currentState !== GameState.ROLLING && 
            currentState !== GameState.BOOST_READY) {
          this.eventSystem.emit(GameEvents.SHOT_CANCEL);
        }
      }
    } else {
      // Handle key up events
      if (keyCode === 'Space' && currentState === GameState.CHARGING) {
        // In CHARGING state, releasing Space executes the shot
        this.eventSystem.emit(GameEvents.SHOT_EXECUTE);
      }
    }
  }

  /**
   * Check if a key is currently down
   */
  public isKeyDown(keyCode: string): boolean {
    return this.keysDown.has(keyCode);
  }

  /**
   * Get the state of all keys
   */
  public getKeysDown(): Set<string> {
    return new Set(this.keysDown);
  }

  /**
   * Update method called each frame to handle continuous key presses
   */
  public update(): void {
    // Get current state to only emit events in appropriate states
    const currentState = this.gameStateManager.getState();
    
    // Only handle continuous aim inputs in appropriate states
    if (currentState === GameState.AIMING || currentState === GameState.CHARGING) {
      // Handle continuous press for arrow keys - for more precise aiming
      if (this.isKeyDown('ArrowLeft')) {
        this.eventSystem.emit(GameEvents.SHOT_AIM, -1.0);
      }
      
      if (this.isKeyDown('ArrowRight')) {
        this.eventSystem.emit(GameEvents.SHOT_AIM, 1.0);
      }
    }
    
    // Handle Space key for power changes in Phase 3
    if (this.isKeyDown('Space') && currentState === GameState.CHARGING) {
      // The ShotController now handles power oscillation internally
      // We just need to send the initial power change event on key press
    }
  }

  /**
   * Clean up event listeners
   */
  public dispose(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));
    this.isInitialized = false;
    console.log('InputManager disposed');
  }

  /**
   * Determine if default browser behavior should be prevented
   */
  private shouldPreventDefault(keyCode: string): boolean {
    // Prevent default behavior for game control keys
    const gameControlKeys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Space', 'Enter', 'Escape'
    ];
    
    return gameControlKeys.includes(keyCode);
  }

  /**
   * Reset the InputManager (for testing or game reset)
   */
  public static resetInstance(): void {
    if (InputManager.instance) {
      InputManager.instance.dispose();
    }
    InputManager.instance = null;
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Nothing to set up initially - actual event listeners are registered in initialize()
    console.log('InputManager ready for initialization');
  }
}