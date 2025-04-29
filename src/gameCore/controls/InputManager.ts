import { EventType, eventsManager } from '../../utils/events';
import { GameState, gameStateManager } from '../../utils/gameState';
import { InputDevice, InputState } from './types';

/**
 * Handles all user input across different input devices
 */
export class InputManager {
  private keyState: { [key: string]: boolean } = {};
  private inputState: InputState = {
    power: 0,
    angle: 0,
    spinning: false,
    spinDirection: { x: 0, y: 0 }
  };
  private activeDevice: InputDevice = InputDevice.KEYBOARD;
  private debugMode: boolean = false;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for keyboard, gamepad, etc.
   */
  private setupEventListeners(): void {
    // Keyboard events
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Toggle debug mode with 'd' key
    window.addEventListener('keydown', (event) => {
      if (event.code === 'KeyD') {
        this.debugMode = !this.debugMode;
        console.log(`Debug mode: ${this.debugMode ? 'enabled' : 'disabled'}`);
        eventsManager.publish(EventType.DEBUG_INFO_UPDATE, { debugMode: this.debugMode });
      }
    });

    // Could add gamepad detection here in the future
    window.addEventListener("gamepadconnected", (e) => {
      console.log("Gamepad connected:", e.gamepad);
      this.activeDevice = InputDevice.GAMEPAD;
    });
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    this.keyState[event.code] = true;
    
    // Only handle input if in appropriate game states
    const currentState = gameStateManager.getState();
    
    if (currentState === GameState.IDLE) {
      // Start aiming with space
      if (event.code === 'Space') {
        gameStateManager.setState(GameState.AIMING);
      }
    }
    else if (currentState === GameState.AIMING) {
      // Start charging with space
      if (event.code === 'Space') {
        gameStateManager.setState(GameState.CHARGING);
      }
    }
    // Handle mid-shot bounce during ROLLING state
    else if (currentState === GameState.ROLLING && event.code === 'KeyZ') {
      eventsManager.publish(EventType.SHOT_BOUNCE_REQUESTED, {});
    }
  }

  /**
   * Handle keyup events
   */
  private handleKeyUp(event: KeyboardEvent): void {
    this.keyState[event.code] = false;
    
    // Execute shot when space is released and we're in CHARGING state
    if (event.code === 'Space' && gameStateManager.isState(GameState.CHARGING)) {
      eventsManager.publish(EventType.SHOT_EXECUTE, { 
        power: this.inputState.power,
        angle: this.inputState.angle,
        spin: this.inputState.spinning ? this.inputState.spinDirection : null
      });
    }
  }

  /**
   * Update input state based on current inputs
   */
  public update(): void {
    const currentState = gameStateManager.getState();
    
    // Update angle in AIMING state
    if (currentState === GameState.AIMING) {
      let angleChanged = false;
      
      if (this.keyState['ArrowLeft']) {
        this.inputState.angle -= 0.02;
        angleChanged = true;
      }
      if (this.keyState['ArrowRight']) {
        this.inputState.angle += 0.02;
        angleChanged = true;
      }
      
      // If angle changed, notify
      if (angleChanged) {
        eventsManager.publish(EventType.ANGLE_CHANGED, { angle: this.inputState.angle });
      }
      
      // Handle spin input
      this.inputState.spinning = this.keyState['KeyB'] || false;
      if (this.inputState.spinning) {
        this.inputState.spinDirection.x = this.keyState['ArrowLeft'] ? -1 : this.keyState['ArrowRight'] ? 1 : 0;
        this.inputState.spinDirection.y = this.keyState['ArrowUp'] ? 1 : this.keyState['ArrowDown'] ? -1 : 0;
        
        eventsManager.publish(EventType.SPIN_UPDATED, { 
          spinning: true,
          direction: this.inputState.spinDirection 
        });
      }
    }
    
    // Update power meter in CHARGING state
    if (currentState === GameState.CHARGING) {
      // Oscillate power between 0-100
      const time = Date.now() / 10;
      const oscillationSpeed = 0.05;
      this.inputState.power = 50 + 50 * Math.sin(time * oscillationSpeed);
      
      eventsManager.publish(EventType.POWER_CHANGED, { power: this.inputState.power });
    }
  }

  /**
   * Get current input state
   */
  public getInputState(): InputState {
    return { ...this.inputState };
  }

  /**
   * Get debug mode state
   */
  public isDebugMode(): boolean {
    return this.debugMode;
  }
  
  /**
   * Check if a specific key is pressed
   */
  public isKeyPressed(keyCode: string): boolean {
    return !!this.keyState[keyCode];
  }
} 