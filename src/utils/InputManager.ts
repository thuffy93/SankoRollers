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
      case 'ArrowLeft':
        if (isDown) {
          this.eventSystem.emit(GameEvents.SHOT_AIM, -1); // Left direction
        }
        break;
        
      case 'ArrowRight':
        if (isDown) {
          this.eventSystem.emit(GameEvents.SHOT_AIM, 1); // Right direction
        }
        break;
        
      case 'Space':
        if (isDown) {
          // Start charging shot
          this.eventSystem.emit(GameEvents.SHOT_POWER_CHANGE, 0);
        } else {
          // Execute shot
          this.eventSystem.emit(GameEvents.SHOT_EXECUTE);
        }
        break;
        
      case 'Escape':
        if (isDown) {
          // Cancel shot
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
    // Handle continuous press for arrow keys
    if (this.isKeyDown('ArrowLeft')) {
      this.eventSystem.emit(GameEvents.SHOT_AIM, -1);
    }
    
    if (this.isKeyDown('ArrowRight')) {
      this.eventSystem.emit(GameEvents.SHOT_AIM, 1);
    }
    
    // Handle continuous space bar hold to increase power
    if (this.isKeyDown('Space')) {
      this.eventSystem.emit(GameEvents.SHOT_POWER_CHANGE, 0.05); // Increment power
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