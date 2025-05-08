import { EventSystem, GameEvents } from './EventSystem';

/**
 * InputManager - Handles keyboard input for the game
 * 
 * This class follows the Singleton pattern and centralizes
 * all keyboard input handling, converting raw DOM events into
 * game-specific events published through the EventSystem.
 */
export class InputManager {
  private static instance: InputManager | null = null;
  private eventSystem: EventSystem;
  private keysDown: Set<string> = new Set();
  private isInitialized: boolean = false;
  
  // Key states for continuous key press
  private keyStates: Map<string, boolean> = new Map();
  
  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    this.eventSystem = EventSystem.getInstance();
    console.log('InputManager initialized');
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
    // Handle specific key presses for game actions
    switch (keyCode) {
      // Phase 1: Direction Selection
      case 'ArrowLeft':
        if (isDown) {
          this.eventSystem.emit(GameEvents.SHOT_AIM, -0.8); // Left direction with reduced sensitivity
        }
        break;
        
      case 'ArrowRight':
        if (isDown) {
          this.eventSystem.emit(GameEvents.SHOT_AIM, 0.8); // Right direction with reduced sensitivity
        }
        break;
      
      // Direction confirmation to move to Phase 2
      case 'Enter':
      case 'KeyA': // A button on gamepad equivalent
        if (isDown) {
          this.eventSystem.emit(GameEvents.SHOT_DIRECTION_CONFIRM);
        }
        break;
        
      // Phase 2: Guide Length Selection
      case 'ArrowUp':
      case 'ArrowDown':
        if (isDown) {
          this.eventSystem.emit(GameEvents.SHOT_GUIDE_TOGGLE);
        }
        break;
        
      // Guide confirmation to move to Phase 3
      case 'KeyS': // B button on gamepad equivalent
        if (isDown) {
          this.eventSystem.emit(GameEvents.SHOT_GUIDE_CONFIRM);
        }
        break;
      
      // Phase 3: Power/Spin Selection (Space starts oscillation)
      case 'Space':
        if (isDown) {
          // Start power oscillation
          this.eventSystem.emit(GameEvents.SHOT_POWER_CHANGE, 0);
        } else {
          // Lock in power and execute shot
          this.eventSystem.emit(GameEvents.SHOT_EXECUTE);
        }
        break;
        
      // Phase 4: Boost at bounce points
      case 'KeyB': // For boost at the right moment
        if (isDown) {
          this.eventSystem.emit(GameEvents.SHOT_BOOST);
        }
        break;
        
      case 'Escape':
        if (isDown) {
          // Cancel shot from any phase
          this.eventSystem.emit(GameEvents.SHOT_CANCEL);
        }
        break;
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
    // Handle continuous press for arrow keys - for more precise aiming
    if (this.isKeyDown('ArrowLeft')) {
      this.eventSystem.emit(GameEvents.SHOT_AIM, -1.0);
    }
    
    if (this.isKeyDown('ArrowRight')) {
      this.eventSystem.emit(GameEvents.SHOT_AIM, 1.0);
    }
    
    // Handle Space key for power changes in Phase 3
    if (this.isKeyDown('Space')) {
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
}