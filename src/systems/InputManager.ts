import * as THREE from 'three';
import { ShotState } from './ShotSystem';

/**
 * Types of input devices
 */
export enum InputDeviceType {
  KEYBOARD = 'keyboard',
  MOUSE = 'mouse',
  TOUCH = 'touch',
  GAMEPAD = 'gamepad'
}

/**
 * Types of input actions for the shot system
 */
export enum InputActionType {
  // General actions
  CONFIRM = 'confirm',
  CANCEL = 'cancel',
  BACK = 'back',
  RESET = 'reset',
  
  // Shot actions
  START_SHOT = 'start_shot',
  
  // Aiming actions
  AIM_LEFT = 'aim_left',
  AIM_RIGHT = 'aim_right',
  AIM_POSITION = 'aim_position', // For direct position input (mouse/touch)
  
  // Power actions
  POWER_SELECT = 'power_select',
  POWER_DECREASE = 'power_decrease',
  POWER_INCREASE = 'power_increase',
  
  // Spin actions
  SPIN_LEFT = 'spin_left',
  SPIN_RIGHT = 'spin_right',
  SPIN_UP = 'spin_up',      // Top spin
  SPIN_DOWN = 'spin_down',  // Back spin
  SPIN_CW = 'spin_cw',      // Clockwise
  SPIN_CCW = 'spin_ccw',    // Counter-clockwise
  SPIN_POSITION = 'spin_position' // For direct position input (mouse/touch)
}

/**
 * Input action handler function type
 */
export type InputActionHandler = (data?: any) => void;

/**
 * Input binding configuration
 */
interface InputBinding {
  deviceType: InputDeviceType;
  action: InputActionType;
  key?: string;
  button?: number;
  modifier?: string;
  shotState?: ShotState; // Optional state filter
  handler: InputActionHandler;
}

/**
 * Unified manager for cross-platform input handling
 */
export class InputManager {
  // Track active device
  private activeDevice: InputDeviceType = InputDeviceType.KEYBOARD;
  
  // Store input bindings
  private bindings: InputBinding[] = [];
  
  // Tracking mouse and touch state
  private mousePosition: THREE.Vector2 = new THREE.Vector2();
  private touchPosition: THREE.Vector2 = new THREE.Vector2();
  private isMouseDown: boolean = false;
  private isTouchActive: boolean = false;
  
  // Tracking gamepad state
  private gamepads: Gamepad[] = [];
  private gamepadConnected: boolean = false;
  private previousGamepadState: Map<number, boolean> = new Map();
  
  // Store the current shot state
  private currentShotState: ShotState = ShotState.IDLE;
  
  // Callback for device change
  private onDeviceChangeCallback: ((device: InputDeviceType) => void) | null = null;
  
  /**
   * Initialize the input manager
   */
  constructor() {
    this.setupEventListeners();
    
    // Initial device detection
    this.detectActiveDevice();
  }
  
  /**
   * Set the current shot state
   * @param state The current shot state
   */
  public setShotState(state: ShotState): void {
    this.currentShotState = state;
    console.log(`InputManager: Shot state set to ${state}`);
  }
  
  /**
   * Set a callback for when the active input device changes
   * @param callback The callback function
   */
  public setOnDeviceChangeCallback(callback: (device: InputDeviceType) => void): void {
    this.onDeviceChangeCallback = callback;
  }
  
  /**
   * Get the currently active input device
   * @returns The active input device type
   */
  public getActiveDevice(): InputDeviceType {
    return this.activeDevice;
  }
  
  /**
   * Set up event listeners for various input types
   */
  private setupEventListeners(): void {
    // Keyboard events
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Mouse events
    window.addEventListener('mousedown', this.handleMouseDown.bind(this));
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    window.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Touch events for mobile devices
    window.addEventListener('touchstart', this.handleTouchStart.bind(this));
    window.addEventListener('touchmove', this.handleTouchMove.bind(this));
    window.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Gamepad events
    window.addEventListener('gamepadconnected', this.handleGamepadConnected.bind(this));
    window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected.bind(this));
  }
  
  /**
   * Register an input binding
   * @param binding The input binding to register
   */
  public registerBinding(binding: InputBinding): void {
    this.bindings.push(binding);
  }
  
  /**
   * Register multiple input bindings at once
   * @param bindings Array of input bindings to register
   */
  public registerBindings(bindings: InputBinding[]): void {
    this.bindings.push(...bindings);
  }
  
  /**
   * Remove all bindings for a specific device type
   * @param deviceType The device type to clear bindings for
   */
  public clearBindingsForDevice(deviceType: InputDeviceType): void {
    this.bindings = this.bindings.filter(binding => binding.deviceType !== deviceType);
  }
  
  /**
   * Remove all bindings for all devices
   */
  public clearAllBindings(): void {
    this.bindings = [];
  }
  
  /**
   * Set up default keybindings for all supported devices
   */
  public setupDefaultBindings(callbacks: {
    onStartShot?: () => void,
    onConfirm?: () => void,
    onCancel?: () => void,
    onBack?: () => void,
    onReset?: () => void,
    onAim?: (direction: THREE.Vector2) => void,
    onAimPosition?: (position: THREE.Vector2) => void,
    onPowerSelect?: () => void,
    onSpin?: (direction: THREE.Vector3) => void,
    onSpinPosition?: (position: THREE.Vector2) => void
  }): void {
    // Clear existing bindings
    this.clearAllBindings();
    
    // Set up keyboard bindings
    const keyboardBindings: InputBinding[] = [
      // General actions
      {
        deviceType: InputDeviceType.KEYBOARD,
        action: InputActionType.START_SHOT,
        key: ' ', // Space
        shotState: ShotState.IDLE,
        handler: () => callbacks.onStartShot?.()
      },
      {
        deviceType: InputDeviceType.KEYBOARD,
        action: InputActionType.CONFIRM,
        key: 'Enter',
        handler: () => callbacks.onConfirm?.()
      },
      {
        deviceType: InputDeviceType.KEYBOARD,
        action: InputActionType.CANCEL,
        key: 'Escape',
        handler: () => callbacks.onCancel?.()
      },
      {
        deviceType: InputDeviceType.KEYBOARD,
        action: InputActionType.BACK,
        key: 'Backspace',
        handler: () => callbacks.onBack?.()
      },
      {
        deviceType: InputDeviceType.KEYBOARD,
        action: InputActionType.RESET,
        key: ' ', // Space
        handler: () => callbacks.onReset?.()
      },
      
      // Aiming actions
      {
        deviceType: InputDeviceType.KEYBOARD,
        action: InputActionType.AIM_LEFT,
        key: 'ArrowLeft',
        shotState: ShotState.AIMING,
        handler: () => callbacks.onAim?.(new THREE.Vector2(-1, 0))
      },
      {
        deviceType: InputDeviceType.KEYBOARD,
        action: InputActionType.AIM_RIGHT,
        key: 'ArrowRight',
        shotState: ShotState.AIMING,
        handler: () => callbacks.onAim?.(new THREE.Vector2(1, 0))
      },
      {
        deviceType: InputDeviceType.KEYBOARD,
        action: InputActionType.AIM_LEFT,
        key: 'a',
        shotState: ShotState.AIMING,
        handler: () => callbacks.onAim?.(new THREE.Vector2(-1, 0))
      },
      {
        deviceType: InputDeviceType.KEYBOARD,
        action: InputActionType.AIM_RIGHT,
        key: 'd',
        shotState: ShotState.AIMING,
        handler: () => callbacks.onAim?.(new THREE.Vector2(1, 0))
      },
      
      // Power actions
      {
        deviceType: InputDeviceType.KEYBOARD,
        action: InputActionType.POWER_SELECT,
        key: ' ', // Space
        shotState: ShotState.POWER,
        handler: () => callbacks.onPowerSelect?.()
      },
      
      // Spin actions
      {
        deviceType: InputDeviceType.KEYBOARD,
        action: InputActionType.SPIN_LEFT,
        key: 'ArrowLeft',
        shotState: ShotState.SPIN,
        handler: () => callbacks.onSpin?.(new THREE.Vector3(-0.1, 0, 0))
      },
      {
        deviceType: InputDeviceType.KEYBOARD,
        action: InputActionType.SPIN_RIGHT,
        key: 'ArrowRight',
        shotState: ShotState.SPIN,
        handler: () => callbacks.onSpin?.(new THREE.Vector3(0.1, 0, 0))
      },
      {
        deviceType: InputDeviceType.KEYBOARD,
        action: InputActionType.SPIN_UP,
        key: 'ArrowUp',
        shotState: ShotState.SPIN,
        handler: () => callbacks.onSpin?.(new THREE.Vector3(0, 0.1, 0))
      },
      {
        deviceType: InputDeviceType.KEYBOARD,
        action: InputActionType.SPIN_DOWN,
        key: 'ArrowDown',
        shotState: ShotState.SPIN,
        handler: () => callbacks.onSpin?.(new THREE.Vector3(0, -0.1, 0))
      },
      {
        deviceType: InputDeviceType.KEYBOARD,
        action: InputActionType.SPIN_CW,
        key: 'e',
        shotState: ShotState.SPIN,
        handler: () => callbacks.onSpin?.(new THREE.Vector3(0, 0, -0.1))
      },
      {
        deviceType: InputDeviceType.KEYBOARD,
        action: InputActionType.SPIN_CCW,
        key: 'q',
        shotState: ShotState.SPIN,
        handler: () => callbacks.onSpin?.(new THREE.Vector3(0, 0, 0.1))
      }
    ];
    
    // Set up mouse bindings
    const mouseBindings: InputBinding[] = [
      // General actions
      {
        deviceType: InputDeviceType.MOUSE,
        action: InputActionType.CONFIRM,
        button: 0, // Left click
        handler: () => callbacks.onConfirm?.()
      },
      
      // Aiming actions - handled in move handler
      
      // Power actions
      {
        deviceType: InputDeviceType.MOUSE,
        action: InputActionType.POWER_SELECT,
        button: 0, // Left click
        shotState: ShotState.POWER,
        handler: () => callbacks.onPowerSelect?.()
      }
      
      // Spin actions - handled in move handler
    ];
    
    // Set up touch bindings
    const touchBindings: InputBinding[] = [
      // Most touch actions are handled in the touch event handlers
      // General actions
      {
        deviceType: InputDeviceType.TOUCH,
        action: InputActionType.CONFIRM,
        handler: () => callbacks.onConfirm?.()
      },
      
      // Power actions
      {
        deviceType: InputDeviceType.TOUCH,
        action: InputActionType.POWER_SELECT,
        shotState: ShotState.POWER,
        handler: () => callbacks.onPowerSelect?.()
      }
    ];
    
    // Set up gamepad bindings
    const gamepadBindings: InputBinding[] = [
      // General actions
      {
        deviceType: InputDeviceType.GAMEPAD,
        action: InputActionType.START_SHOT,
        button: 0, // A button
        shotState: ShotState.IDLE,
        handler: () => callbacks.onStartShot?.()
      },
      {
        deviceType: InputDeviceType.GAMEPAD,
        action: InputActionType.CONFIRM,
        button: 0, // A button
        handler: () => callbacks.onConfirm?.()
      },
      {
        deviceType: InputDeviceType.GAMEPAD,
        action: InputActionType.CANCEL,
        button: 1, // B button
        handler: () => callbacks.onCancel?.()
      },
      {
        deviceType: InputDeviceType.GAMEPAD,
        action: InputActionType.BACK,
        button: 1, // B button
        handler: () => callbacks.onBack?.()
      },
      {
        deviceType: InputDeviceType.GAMEPAD,
        action: InputActionType.RESET,
        button: 3, // Y button
        handler: () => callbacks.onReset?.()
      },
      
      // Power actions
      {
        deviceType: InputDeviceType.GAMEPAD,
        action: InputActionType.POWER_SELECT,
        button: 0, // A button
        shotState: ShotState.POWER,
        handler: () => callbacks.onPowerSelect?.()
      }
      
      // Analog stick actions are handled in the update method
    ];
    
    // Register all bindings
    this.registerBindings([
      ...keyboardBindings,
      ...mouseBindings,
      ...touchBindings,
      ...gamepadBindings
    ]);
  }
  
  /**
   * Update method to be called every frame
   * @param deltaTime Time since last update in seconds
   */
  public update(deltaTime: number): void {
    // Update gamepad state if connected
    if (this.gamepadConnected) {
      this.updateGamepads();
    }
  }
  
  /**
   * Update gamepad inputs
   */
  private updateGamepads(): void {
    // Get connected gamepads
    const gamepads = navigator.getGamepads();
    if (!gamepads) return;
    
    // Check for each gamepad
    for (let i = 0; i < gamepads.length; i++) {
      const gamepad = gamepads[i];
      if (!gamepad) continue;
      
      // Check analog sticks for various actions based on shot state
      if (this.currentShotState === ShotState.AIMING) {
        // Left stick for aiming
        const leftX = gamepad.axes[0]; // X-axis of left stick
        if (Math.abs(leftX) > 0.1) { // Add a deadzone
          // Set active device to gamepad
          this.setActiveDevice(InputDeviceType.GAMEPAD);
          
          // Call aim handler
          const direction = new THREE.Vector2(leftX, 0);
          
          // Find binding for aim and call handler
          const binding = this.bindings.find(b => 
            b.deviceType === InputDeviceType.GAMEPAD && 
            (b.action === InputActionType.AIM_LEFT || b.action === InputActionType.AIM_RIGHT) &&
            (!b.shotState || b.shotState === this.currentShotState)
          );
          
          if (binding) {
            binding.handler(direction);
          }
        }
      } else if (this.currentShotState === ShotState.SPIN) {
        // Left stick for horizontal/vertical spin
        const leftX = gamepad.axes[0]; // X-axis of left stick
        const leftY = gamepad.axes[1]; // Y-axis of left stick
        
        // Right stick for side spin
        const rightX = gamepad.axes[2]; // X-axis of right stick
        
        if (Math.abs(leftX) > 0.1 || Math.abs(leftY) > 0.1 || Math.abs(rightX) > 0.1) {
          // Set active device to gamepad
          this.setActiveDevice(InputDeviceType.GAMEPAD);
          
          // Create spin vector
          const spinVector = new THREE.Vector3(
            leftX * 0.05, // Left stick X for horizontal spin
            -leftY * 0.05, // Left stick Y for vertical spin (inverted)
            rightX * 0.05 // Right stick X for side spin
          );
          
          // Find binding for spin and call handler
          const binding = this.bindings.find(b => 
            b.deviceType === InputDeviceType.GAMEPAD && 
            (b.action === InputActionType.SPIN_LEFT || 
             b.action === InputActionType.SPIN_RIGHT ||
             b.action === InputActionType.SPIN_UP ||
             b.action === InputActionType.SPIN_DOWN) &&
            (!b.shotState || b.shotState === this.currentShotState)
          );
          
          if (binding) {
            binding.handler(spinVector);
          }
        }
      }
      
      // Check buttons
      for (let j = 0; j < gamepad.buttons.length; j++) {
        const button = gamepad.buttons[j];
        const isPressed = button.pressed;
        const wasPressed = this.previousGamepadState.get(j) || false;
        
        // Button state changed to pressed
        if (isPressed && !wasPressed) {
          // Set active device to gamepad
          this.setActiveDevice(InputDeviceType.GAMEPAD);
          
          // Find binding for this button
          const binding = this.bindings.find(b => 
            b.deviceType === InputDeviceType.GAMEPAD && 
            b.button === j &&
            (!b.shotState || b.shotState === this.currentShotState)
          );
          
          if (binding) {
            binding.handler();
          }
        }
        
        // Update previous state
        this.previousGamepadState.set(j, isPressed);
      }
    }
  }
  
  /**
   * Handle key down events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Set active device to keyboard
    this.setActiveDevice(InputDeviceType.KEYBOARD);
    
    // Find matching binding
    const binding = this.bindings.find(b => 
      b.deviceType === InputDeviceType.KEYBOARD && 
      b.key === event.key &&
      (!b.shotState || b.shotState === this.currentShotState)
    );
    
    if (binding) {
      binding.handler();
    }
  }
  
  /**
   * Handle key up events
   */
  private handleKeyUp(event: KeyboardEvent): void {
    // Handle key up events if needed
  }
  
  /**
   * Handle mouse down events
   */
  private handleMouseDown(event: MouseEvent): void {
    // Set active device to mouse
    this.setActiveDevice(InputDeviceType.MOUSE);
    
    // Update mouse state
    this.isMouseDown = true;
    this.updateMousePosition(event);
    
    // Find matching binding
    const binding = this.bindings.find(b => 
      b.deviceType === InputDeviceType.MOUSE && 
      b.button === event.button &&
      (!b.shotState || b.shotState === this.currentShotState)
    );
    
    if (binding) {
      binding.handler();
    }
  }
  
  /**
   * Handle mouse move events
   */
  private handleMouseMove(event: MouseEvent): void {
    // Set active device to mouse
    this.setActiveDevice(InputDeviceType.MOUSE);
    
    // Update mouse position
    this.updateMousePosition(event);
    
    // If mouse is down, handle drag actions
    if (this.isMouseDown) {
      if (this.currentShotState === ShotState.AIMING) {
        // Find aiming position binding
        const binding = this.bindings.find(b => 
          b.deviceType === InputDeviceType.MOUSE && 
          b.action === InputActionType.AIM_POSITION &&
          (!b.shotState || b.shotState === this.currentShotState)
        );
        
        if (binding) {
          binding.handler(this.mousePosition);
        }
      } else if (this.currentShotState === ShotState.SPIN) {
        // Find spin position binding
        const binding = this.bindings.find(b => 
          b.deviceType === InputDeviceType.MOUSE && 
          b.action === InputActionType.SPIN_POSITION &&
          (!b.shotState || b.shotState === this.currentShotState)
        );
        
        if (binding) {
          binding.handler(this.mousePosition);
        }
      }
    }
  }
  
  /**
   * Handle mouse up events
   */
  private handleMouseUp(event: MouseEvent): void {
    // Update mouse state
    this.isMouseDown = false;
  }
  
  /**
   * Update mouse position from event
   */
  private updateMousePosition(event: MouseEvent): void {
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.mousePosition.set(x, y);
  }
  
  /**
   * Handle touch start events
   */
  private handleTouchStart(event: TouchEvent): void {
    // Set active device to touch
    this.setActiveDevice(InputDeviceType.TOUCH);
    
    // Update touch state
    this.isTouchActive = true;
    this.updateTouchPosition(event);
    
    // Find matching binding
    const binding = this.bindings.find(b => 
      b.deviceType === InputDeviceType.TOUCH && 
      b.action === InputActionType.CONFIRM &&
      (!b.shotState || b.shotState === this.currentShotState)
    );
    
    if (binding) {
      binding.handler();
    }
  }
  
  /**
   * Handle touch move events
   */
  private handleTouchMove(event: TouchEvent): void {
    // Prevent scrolling
    event.preventDefault();
    
    // Set active device to touch
    this.setActiveDevice(InputDeviceType.TOUCH);
    
    // Update touch position
    this.updateTouchPosition(event);
    
    // If touch is active, handle drag actions
    if (this.isTouchActive) {
      if (this.currentShotState === ShotState.AIMING) {
        // Find aiming position binding
        const binding = this.bindings.find(b => 
          b.deviceType === InputDeviceType.TOUCH && 
          b.action === InputActionType.AIM_POSITION &&
          (!b.shotState || b.shotState === this.currentShotState)
        );
        
        if (binding) {
          binding.handler(this.touchPosition);
        }
      } else if (this.currentShotState === ShotState.SPIN) {
        // Find spin position binding
        const binding = this.bindings.find(b => 
          b.deviceType === InputDeviceType.TOUCH && 
          b.action === InputActionType.SPIN_POSITION &&
          (!b.shotState || b.shotState === this.currentShotState)
        );
        
        if (binding) {
          binding.handler(this.touchPosition);
        }
      }
    }
  }
  
  /**
   * Handle touch end events
   */
  private handleTouchEnd(event: TouchEvent): void {
    // Update touch state
    this.isTouchActive = false;
  }
  
  /**
   * Update touch position from event
   */
  private updateTouchPosition(event: TouchEvent): void {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      const x = (touch.clientX / window.innerWidth) * 2 - 1;
      const y = -(touch.clientY / window.innerHeight) * 2 + 1;
      this.touchPosition.set(x, y);
    }
  }
  
  /**
   * Handle gamepad connected event
   */
  private handleGamepadConnected(event: GamepadEvent): void {
    console.log('Gamepad connected:', event.gamepad);
    this.gamepadConnected = true;
    
    // Set active device to gamepad
    this.setActiveDevice(InputDeviceType.GAMEPAD);
  }
  
  /**
   * Handle gamepad disconnected event
   */
  private handleGamepadDisconnected(event: GamepadEvent): void {
    console.log('Gamepad disconnected:', event.gamepad);
    this.gamepadConnected = false;
    
    // Reset to default device
    this.detectActiveDevice();
  }
  
  /**
   * Detect the active input device based on system info
   */
  private detectActiveDevice(): void {
    // Check if gamepad is connected
    if (navigator.getGamepads && navigator.getGamepads().some(gp => gp !== null)) {
      this.setActiveDevice(InputDeviceType.GAMEPAD);
      return;
    }
    
    // Check if device is touch-capable
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      this.setActiveDevice(InputDeviceType.TOUCH);
      return;
    }
    
    // Default to keyboard for desktop
    this.setActiveDevice(InputDeviceType.KEYBOARD);
  }
  
  /**
   * Set the active input device
   * @param device The input device type
   */
  private setActiveDevice(device: InputDeviceType): void {
    if (this.activeDevice !== device) {
      this.activeDevice = device;
      console.log(`Input device changed to: ${device}`);
      
      // Call the device change callback if set
      if (this.onDeviceChangeCallback) {
        this.onDeviceChangeCallback(device);
      }
    }
  }
  
  /**
   * Clean up resources when no longer needed
   */
  public dispose(): void {
    // Remove event listeners
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    
    window.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchmove', this.handleTouchMove);
    window.removeEventListener('touchend', this.handleTouchEnd);
    
    window.removeEventListener('gamepadconnected', this.handleGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
    
    // Clear bindings
    this.clearAllBindings();
  }
} 