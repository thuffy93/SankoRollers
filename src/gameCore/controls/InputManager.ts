import { EventType, eventsManager } from '../../utils/events';
import { GameState, gameStateManager } from '../../utils/gameState';
import { InputDevice, InputState } from './types';

/**
 * Handles all user input across different input devices
 * Enhanced to better match Kirby's Dream Course control scheme
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
  
  // Kirby's Dream Course style input parameters
  private angleChangeSpeed: number = 0.03; // Speed of angle change
  private powerIncreasing: boolean = true; // Power direction
  private powerChangeSpeed: number = 2; // Speed of power oscillation
  private hitPosition: { x: number, y: number } = { x: 0, y: 0 }; // Hit position offset
  private spinStrength: number = 0; // Spin strength (0-1)

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
   * Handle keydown events with Kirby's Dream Course controls
   */
  private handleKeyDown(event: KeyboardEvent): void {
    this.keyState[event.code] = true;
    
    // Only handle input if in appropriate game states
    const currentState = gameStateManager.getState();
    
    if (currentState === GameState.IDLE) {
      // Start aiming with space (A button in Dream Course)
      if (event.code === 'Space') {
        gameStateManager.setState(GameState.AIMING);
      }
    }
    else if (currentState === GameState.AIMING) {
      // Start charging with space (A button in Dream Course)
      if (event.code === 'Space') {
        this.powerIncreasing = true; // Start with increasing power
        this.inputState.power = 0; // Reset power when starting charge
        gameStateManager.setState(GameState.CHARGING);
      }
    }
    // Handle mid-shot bounce during ROLLING state (B button in Dream Course)
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
        spin: this.inputState.spinning ? this.inputState.spinDirection : null,
        hitPosition: this.hitPosition
      });
    }
  }

  /**
   * Update input state based on current inputs
   * Enhanced with Kirby's Dream Course style controls
   */
  public update(): void {
    const currentState = gameStateManager.getState();
    
    // Update angle in AIMING or CHARGING states (can adjust in both like in Dream Course)
    if (currentState === GameState.AIMING || currentState === GameState.CHARGING) {
      let angleChanged = false;
      
      // Angle adjustment (D-pad left/right in Dream Course)
      if (this.keyState['ArrowLeft']) {
        this.inputState.angle -= this.angleChangeSpeed;
        angleChanged = true;
      }
      if (this.keyState['ArrowRight']) {
        this.inputState.angle += this.angleChangeSpeed;
        angleChanged = true;
      }
      
      // If angle changed, notify
      if (angleChanged) {
        eventsManager.publish(EventType.ANGLE_CHANGED, { angle: this.inputState.angle });
      }
      
      // Handle spin and hit position (B + D-pad in Dream Course)
      this.inputState.spinning = this.keyState['KeyB'] || false;
      if (this.inputState.spinning) {
        // Set spin direction and hit position together
        this.inputState.spinDirection.x = this.keyState['ArrowLeft'] ? -1 : this.keyState['ArrowRight'] ? 1 : 0;
        this.inputState.spinDirection.y = this.keyState['ArrowUp'] ? 1 : this.keyState['ArrowDown'] ? -1 : 0;
        
        // Update hit position based on the same directional input (Kirby-style)
        this.hitPosition = {
          x: this.inputState.spinDirection.x * 0.3, // Scale factor
          y: this.inputState.spinDirection.y * 0.3
        };
        
        // Set spin strength based on how long B has been held
        this.spinStrength = Math.min(1.0, this.spinStrength + 0.05);
        
        eventsManager.publish(EventType.SPIN_UPDATED, { 
          spinning: true,
          direction: this.inputState.spinDirection,
          strength: this.spinStrength,
          hitPosition: this.hitPosition
        });
      } else {
        // Reset spin strength when not holding B
        this.spinStrength = 0;
      }
    }
  }
}