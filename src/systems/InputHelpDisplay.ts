import * as THREE from 'three';
import { InputDeviceType, InputActionType } from './InputManager';
import { ShotState } from './ShotSystem';

/**
 * System to display input help based on the current input device and game state
 */
export class InputHelpDisplay {
  // Scene reference
  private scene: THREE.Scene;
  
  // Container for all UI elements
  private container: THREE.Group;
  
  // Text sprite for displaying controls
  private textSprite: THREE.Sprite | null = null;
  
  // Input control icons for different devices
  private keyboardIcon: THREE.Sprite | null = null;
  private mouseIcon: THREE.Sprite | null = null;
  private touchIcon: THREE.Sprite | null = null;
  private gamepadIcon: THREE.Sprite | null = null;
  
  // Current device and state
  private currentDevice: InputDeviceType = InputDeviceType.KEYBOARD;
  private currentState: ShotState = ShotState.IDLE;
  
  // Position and sizing
  private readonly DISPLAY_WIDTH: number = 4;
  private readonly DISPLAY_HEIGHT: number = 1.6;
  private readonly DISPLAY_POSITION: THREE.Vector3 = new THREE.Vector3(0, 0.2, 0);
  
  // Animation and appearance
  private readonly FADE_DURATION: number = 0.5;  // Seconds
  private readonly DISPLAY_DURATION: number = 3; // Seconds
  private opacity: number = 0;
  private displayTimer: number = 0;
  private isFading: boolean = false;
  
  /**
   * Create a new InputHelpDisplay
   * @param scene The THREE.js scene
   */
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    // Create container to hold all UI elements
    this.container = new THREE.Group();
    this.container.position.copy(this.DISPLAY_POSITION);
    this.container.visible = false;
    this.scene.add(this.container);
    
    // Create UI elements
    this.createTextSprite();
    this.createDeviceIcons();
  }
  
  /**
   * Create text sprite for displaying instructions
   */
  private createTextSprite(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('Could not get canvas context');
      return;
    }
    
    // Create a sprite using the canvas as a texture
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0
    });
    
    this.textSprite = new THREE.Sprite(material);
    this.textSprite.scale.set(this.DISPLAY_WIDTH, this.DISPLAY_HEIGHT, 1);
    this.container.add(this.textSprite);
    
    // Initial text update
    this.updateTextSprite();
  }
  
  /**
   * Create device icons
   */
  private createDeviceIcons(): void {
    // Function to create an icon sprite
    const createIcon = (iconPath: string, position: THREE.Vector3): THREE.Sprite => {
      const loader = new THREE.TextureLoader();
      const texture = loader.load(iconPath);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0
      });
      
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(0.5, 0.5, 1);
      sprite.position.copy(position);
      this.container.add(sprite);
      
      return sprite;
    };
    
    // Create icons for each device type
    // In a real implementation, you would use actual icon paths
    this.keyboardIcon = createIcon('assets/icons/keyboard.png', new THREE.Vector3(-1.5, -1, 0));
    this.mouseIcon = createIcon('assets/icons/mouse.png', new THREE.Vector3(-0.5, -1, 0));
    this.touchIcon = createIcon('assets/icons/touch.png', new THREE.Vector3(0.5, -1, 0));
    this.gamepadIcon = createIcon('assets/icons/gamepad.png', new THREE.Vector3(1.5, -1, 0));
    
    // Initialize with default icons
    this.updateDeviceIcon();
  }
  
  /**
   * Update the text sprite with control instructions based on device and state
   */
  private updateTextSprite(): void {
    if (!this.textSprite || !(this.textSprite.material instanceof THREE.SpriteMaterial) || !this.textSprite.material.map) {
      return;
    }
    
    const texture = this.textSprite.material.map;
    
    // Get canvas from texture
    const canvas = texture.image as HTMLCanvasElement;
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('Could not get canvas context');
      return;
    }
    
    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background with rounded corners
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.roundRect(context, 10, 10, canvas.width - 20, canvas.height - 20, 20);
    context.fill();
    
    // Set up text style
    context.fillStyle = 'white';
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Header with device and state
    context.fillText(
      `${this.getDeviceName(this.currentDevice)} Controls - ${this.getStateName(this.currentState)}`, 
      canvas.width / 2, 
      40
    );
    
    // Device-specific controls based on state
    context.font = '20px Arial';
    
    const controls = this.getControlsForState(this.currentState, this.currentDevice);
    
    // Draw each control instruction
    let y = 80;
    for (const control of controls) {
      context.fillText(control, canvas.width / 2, y);
      y += 30;
    }
    
    // Update texture
    texture.needsUpdate = true;
  }
  
  /**
   * Helper to draw rounded rectangles
   */
  private roundRect(
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  
  /**
   * Update device icon highlight based on current device
   */
  private updateDeviceIcon(): void {
    // Reset opacity for all icons
    const setOpacity = (sprite: THREE.Sprite | null, opacity: number) => {
      if (sprite && sprite.material instanceof THREE.SpriteMaterial) {
        sprite.material.opacity = opacity;
      }
    };
    
    // Set low opacity for all icons
    setOpacity(this.keyboardIcon, 0.3);
    setOpacity(this.mouseIcon, 0.3);
    setOpacity(this.touchIcon, 0.3);
    setOpacity(this.gamepadIcon, 0.3);
    
    // Highlight the active device icon
    switch (this.currentDevice) {
      case InputDeviceType.KEYBOARD:
        setOpacity(this.keyboardIcon, 1.0);
        break;
      case InputDeviceType.MOUSE:
        setOpacity(this.mouseIcon, 1.0);
        break;
      case InputDeviceType.TOUCH:
        setOpacity(this.touchIcon, 1.0);
        break;
      case InputDeviceType.GAMEPAD:
        setOpacity(this.gamepadIcon, 1.0);
        break;
    }
  }
  
  /**
   * Get a human-readable name for the device type
   * @param device The input device type
   * @returns A human-readable name
   */
  private getDeviceName(device: InputDeviceType): string {
    switch (device) {
      case InputDeviceType.KEYBOARD:
        return 'Keyboard';
      case InputDeviceType.MOUSE:
        return 'Mouse';
      case InputDeviceType.TOUCH:
        return 'Touch';
      case InputDeviceType.GAMEPAD:
        return 'Gamepad';
      default:
        return 'Unknown Device';
    }
  }
  
  /**
   * Get a human-readable name for the shot state
   * @param state The shot state
   * @returns A human-readable name
   */
  private getStateName(state: ShotState): string {
    switch (state) {
      case ShotState.IDLE:
        return 'Ready';
      case ShotState.AIMING:
        return 'Aim Mode';
      case ShotState.POWER:
        return 'Power Selection';
      case ShotState.SPIN:
        return 'Spin Control';
      case ShotState.EXECUTING:
        return 'Shot in Progress';
      default:
        return 'Unknown State';
    }
  }
  
  /**
   * Get control instructions based on state and device
   * @param state The current shot state
   * @param device The input device type
   * @returns Array of control instruction strings
   */
  private getControlsForState(state: ShotState, device: InputDeviceType): string[] {
    // Initialize with general controls for all states
    let controls: string[] = [];
    
    // Add device and state specific controls
    switch (state) {
      case ShotState.IDLE:
        if (device === InputDeviceType.KEYBOARD) {
          controls.push('Press SPACE to start a new shot');
        } else if (device === InputDeviceType.MOUSE) {
          controls.push('Click to start a new shot');
        } else if (device === InputDeviceType.TOUCH) {
          controls.push('Tap screen to start a new shot');
        } else if (device === InputDeviceType.GAMEPAD) {
          controls.push('Press A to start a new shot');
        }
        break;
        
      case ShotState.AIMING:
        if (device === InputDeviceType.KEYBOARD) {
          controls.push('A/D or LEFT/RIGHT to adjust aim');
          controls.push('ENTER to confirm aim');
          controls.push('ESC to cancel shot');
        } else if (device === InputDeviceType.MOUSE) {
          controls.push('Move mouse to adjust aim');
          controls.push('Click to confirm aim');
          controls.push('Right-click to cancel shot');
        } else if (device === InputDeviceType.TOUCH) {
          controls.push('Drag left/right to adjust aim');
          controls.push('Tap to confirm aim');
        } else if (device === InputDeviceType.GAMEPAD) {
          controls.push('Left stick to adjust aim');
          controls.push('A to confirm aim');
          controls.push('B to cancel shot');
        }
        break;
        
      case ShotState.POWER:
        if (device === InputDeviceType.KEYBOARD) {
          controls.push('SPACE to stop the power meter');
          controls.push('ESC to cancel shot');
        } else if (device === InputDeviceType.MOUSE) {
          controls.push('Click to stop the power meter');
          controls.push('Right-click to cancel shot');
        } else if (device === InputDeviceType.TOUCH) {
          controls.push('Tap to stop the power meter');
        } else if (device === InputDeviceType.GAMEPAD) {
          controls.push('A to stop the power meter');
          controls.push('B to cancel shot');
        }
        break;
        
      case ShotState.SPIN:
        if (device === InputDeviceType.KEYBOARD) {
          controls.push('ARROWS for horizontal/vertical spin');
          controls.push('Q/E for side spin');
          controls.push('SPACE to reset spin');
          controls.push('ENTER to confirm spin');
          controls.push('ESC to cancel shot');
        } else if (device === InputDeviceType.MOUSE) {
          controls.push('Drag to adjust spin direction');
          controls.push('Click to confirm spin');
          controls.push('Right-click to cancel shot');
        } else if (device === InputDeviceType.TOUCH) {
          controls.push('Drag to adjust spin direction');
          controls.push('Tap to confirm spin');
        } else if (device === InputDeviceType.GAMEPAD) {
          controls.push('Left stick for top/back & left/right spin');
          controls.push('Right stick for side spin');
          controls.push('Y to reset spin');
          controls.push('A to confirm spin');
          controls.push('B to cancel shot');
        }
        break;
        
      case ShotState.EXECUTING:
        controls.push('Wait for the ball to come to rest');
        break;
    }
    
    return controls;
  }
  
  /**
   * Show the help display
   */
  public show(): void {
    this.container.visible = true;
    this.displayTimer = this.DISPLAY_DURATION;
    this.isFading = false;
    this.fadeIn();
  }
  
  /**
   * Hide the help display
   */
  public hide(): void {
    this.fadeOut();
  }
  
  /**
   * Fade in the display
   */
  private fadeIn(): void {
    // Reset opacity
    this.opacity = 0;
    
    // Set material opacity
    if (this.textSprite && this.textSprite.material instanceof THREE.SpriteMaterial) {
      this.textSprite.material.opacity = this.opacity;
    }
  }
  
  /**
   * Fade out the display
   */
  private fadeOut(): void {
    this.isFading = true;
  }
  
  /**
   * Set the current device type
   * @param device The input device type
   */
  public setDevice(device: InputDeviceType): void {
    if (this.currentDevice !== device) {
      this.currentDevice = device;
      this.updateTextSprite();
      this.updateDeviceIcon();
      this.show(); // Show help when device changes
    }
  }
  
  /**
   * Set the current shot state
   * @param state The shot state
   */
  public setState(state: ShotState): void {
    if (this.currentState !== state) {
      this.currentState = state;
      this.updateTextSprite();
      this.show(); // Show help when state changes
    }
  }
  
  /**
   * Position the help display
   * @param position The position
   * @param lookAt Optional camera or position to face
   */
  public positionDisplay(position: THREE.Vector3, lookAt?: THREE.Vector3 | THREE.Object3D): void {
    this.container.position.copy(position);
    
    if (lookAt) {
      if (lookAt instanceof THREE.Vector3) {
        this.container.lookAt(lookAt);
      } else {
        this.container.lookAt(lookAt.position);
      }
    }
  }
  
  /**
   * Update method to be called every frame
   * @param deltaTime Time since last update in seconds
   */
  public update(deltaTime: number): void {
    if (!this.container.visible) return;
    
    if (this.isFading) {
      // Fade out
      this.opacity -= deltaTime / this.FADE_DURATION;
      if (this.opacity <= 0) {
        this.opacity = 0;
        this.container.visible = false;
        this.isFading = false;
      }
    } else {
      // Fade in
      if (this.opacity < 1) {
        this.opacity += deltaTime / this.FADE_DURATION;
        if (this.opacity > 1) {
          this.opacity = 1;
        }
      }
      
      // Update display timer
      this.displayTimer -= deltaTime;
      if (this.displayTimer <= 0) {
        this.fadeOut();
      }
    }
    
    // Update material opacity
    if (this.textSprite && this.textSprite.material instanceof THREE.SpriteMaterial) {
      this.textSprite.material.opacity = this.opacity;
    }
    
    // Update icon opacities
    const updateIconOpacity = (sprite: THREE.Sprite | null, baseOpacity: number) => {
      if (sprite && sprite.material instanceof THREE.SpriteMaterial) {
        sprite.material.opacity = baseOpacity * this.opacity;
      }
    };
    
    // Apply fade to all icons
    switch (this.currentDevice) {
      case InputDeviceType.KEYBOARD:
        updateIconOpacity(this.keyboardIcon, 1.0);
        updateIconOpacity(this.mouseIcon, 0.3);
        updateIconOpacity(this.touchIcon, 0.3);
        updateIconOpacity(this.gamepadIcon, 0.3);
        break;
      case InputDeviceType.MOUSE:
        updateIconOpacity(this.keyboardIcon, 0.3);
        updateIconOpacity(this.mouseIcon, 1.0);
        updateIconOpacity(this.touchIcon, 0.3);
        updateIconOpacity(this.gamepadIcon, 0.3);
        break;
      case InputDeviceType.TOUCH:
        updateIconOpacity(this.keyboardIcon, 0.3);
        updateIconOpacity(this.mouseIcon, 0.3);
        updateIconOpacity(this.touchIcon, 1.0);
        updateIconOpacity(this.gamepadIcon, 0.3);
        break;
      case InputDeviceType.GAMEPAD:
        updateIconOpacity(this.keyboardIcon, 0.3);
        updateIconOpacity(this.mouseIcon, 0.3);
        updateIconOpacity(this.touchIcon, 0.3);
        updateIconOpacity(this.gamepadIcon, 1.0);
        break;
    }
  }
  
  /**
   * Clean up resources when no longer needed
   */
  public dispose(): void {
    // Remove from scene
    this.scene.remove(this.container);
    
    // Dispose of text sprite
    if (this.textSprite) {
      if (this.textSprite.material instanceof THREE.SpriteMaterial && this.textSprite.material.map) {
        this.textSprite.material.map.dispose();
      }
      if (this.textSprite.material instanceof THREE.Material) {
        this.textSprite.material.dispose();
      }
    }
    
    // Dispose of icon sprites
    const disposeSprite = (sprite: THREE.Sprite | null) => {
      if (sprite) {
        if (sprite.material instanceof THREE.SpriteMaterial && sprite.material.map) {
          sprite.material.map.dispose();
        }
        if (sprite.material instanceof THREE.Material) {
          sprite.material.dispose();
        }
      }
    };
    
    disposeSprite(this.keyboardIcon);
    disposeSprite(this.mouseIcon);
    disposeSprite(this.touchIcon);
    disposeSprite(this.gamepadIcon);
  }
} 