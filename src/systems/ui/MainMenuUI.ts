import { HTMLUIComponent } from './HTMLUIComponent';
import { UIState } from '../UIManager';
import { InputDeviceType } from '../InputManager';

/**
 * Represents the main menu UI component
 */
export class MainMenuUI extends HTMLUIComponent {
  // HTML elements for main menu
  private menuContainer!: HTMLElement;
  private title!: HTMLElement;
  private startButton!: HTMLElement;
  private levelsButton!: HTMLElement;
  private settingsButton!: HTMLElement;
  
  // Event handler references
  private boundStartHandler: () => void;
  private boundLevelsHandler: () => void;
  private boundSettingsHandler: () => void;
  
  // Callback for state transitions
  private onStateChangeRequest: (state: UIState) => void;
  
  /**
   * Create a new MainMenuUI component
   * @param container Parent container element
   * @param onStateChangeRequest Callback for when a menu button requests a state change
   */
  constructor(container: HTMLElement, onStateChangeRequest: (state: UIState) => void) {
    super(container, 'main-menu-ui');
    this.onStateChangeRequest = onStateChangeRequest;
    
    // Pre-bind event handlers to maintain references for cleanup
    this.boundStartHandler = this.handleStartGame.bind(this);
    this.boundLevelsHandler = this.handleLevelSelect.bind(this);
    this.boundSettingsHandler = this.handleSettings.bind(this);
    
    this.initialize();
  }
  
  /**
   * Initialize the component
   */
  protected initialize(): void {
    // Create menu container
    this.menuContainer = this.createElement('div', 'main-menu ui-panel');
    
    // Create title
    this.title = this.createElement('h1', 'main-menu-title', 'Cosmic Rollers');
    this.menuContainer.appendChild(this.title);
    
    // Create menu buttons
    this.startButton = this.createButton('Start Game', 'start-game-btn');
    this.menuContainer.appendChild(this.startButton);
    
    this.levelsButton = this.createButton('Level Select', 'level-select-btn');
    this.menuContainer.appendChild(this.levelsButton);
    
    this.settingsButton = this.createButton('Settings', 'settings-btn');
    this.menuContainer.appendChild(this.settingsButton);
    
    // Add event listeners
    this.addEventListeners();
    
    // Style the menu container
    this.applyMenuStyles();
  }
  
  /**
   * Create a menu button
   * @param text Button text
   * @param id Button ID
   * @returns The created button element
   */
  private createButton(text: string, id: string): HTMLElement {
    const button = this.createElement('button', 'ui-button main-menu-button', text);
    button.id = id;
    return button;
  }
  
  /**
   * Add event listeners to menu buttons
   */
  private addEventListeners(): void {
    this.startButton.addEventListener('click', this.boundStartHandler);
    this.levelsButton.addEventListener('click', this.boundLevelsHandler);
    this.settingsButton.addEventListener('click', this.boundSettingsHandler);
  }
  
  /**
   * Remove event listeners from menu buttons
   */
  private removeEventListeners(): void {
    this.startButton.removeEventListener('click', this.boundStartHandler);
    this.levelsButton.removeEventListener('click', this.boundLevelsHandler);
    this.settingsButton.removeEventListener('click', this.boundSettingsHandler);
  }
  
  /**
   * Handle start game button click
   */
  private handleStartGame(): void {
    this.onStateChangeRequest(UIState.IN_GAME);
  }
  
  /**
   * Handle level select button click
   */
  private handleLevelSelect(): void {
    this.onStateChangeRequest(UIState.LEVEL_SELECT);
  }
  
  /**
   * Handle settings button click
   */
  private handleSettings(): void {
    this.onStateChangeRequest(UIState.SETTINGS);
  }
  
  /**
   * Apply styles to the menu components
   */
  private applyMenuStyles(): void {
    // Container styles
    this.menuContainer.style.display = 'flex';
    this.menuContainer.style.flexDirection = 'column';
    this.menuContainer.style.alignItems = 'center';
    this.menuContainer.style.justifyContent = 'center';
    this.menuContainer.style.padding = '20px';
    this.menuContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.menuContainer.style.borderRadius = '10px';
    this.menuContainer.style.color = 'white';
    this.menuContainer.style.gap = '20px';
    this.menuContainer.style.position = 'absolute';
    this.menuContainer.style.top = '50%';
    this.menuContainer.style.left = '50%';
    this.menuContainer.style.transform = 'translate(-50%, -50%)';
    this.menuContainer.style.minWidth = '300px';
    
    // Title styles
    this.title.style.fontSize = '36px';
    this.title.style.marginBottom = '20px';
    this.title.style.color = '#4fc3f7';
    this.title.style.textShadow = '0 0 10px rgba(79, 195, 247, 0.5)';
    
    // Button styles are handled by global UI CSS
    
    // Apply device and orientation specific styles
    this.applyDeviceSpecificStyles();
    this.applyOrientationSpecificStyles();
  }
  
  /**
   * Make an element touch-friendly with larger touch targets and feedback
   * @param element Element to make touch-friendly
   */
  private addTouchFriendlyAttributes(element: HTMLElement): void {
    // Increase touch target size
    element.style.minHeight = '44px';
    element.style.minWidth = '44px';
    
    // Ensure proper tap handling
    element.style.touchAction = 'manipulation';
    
    // Add active state styling for feedback
    element.classList.add('touch-friendly');
    
    // Add touch feedback classes
    if (!element.hasAttribute('data-touch-handler-added')) {
      element.addEventListener('touchstart', () => {
        element.classList.add('touch-active');
      });
      
      element.addEventListener('touchend', () => {
        element.classList.remove('touch-active');
        
        // Add a small delay to show the active state
        setTimeout(() => {
          element.classList.remove('touch-active');
        }, 100);
      });
      
      element.setAttribute('data-touch-handler-added', 'true');
    }
  }
  
  /**
   * Handle orientation changes
   * @param isPortrait Whether the device is in portrait orientation
   */
  public onOrientationChanged(isPortrait: boolean): void {
    // Since the parent method is optional, we need to manually set the property
    this.isPortrait = isPortrait;
    
    // Additional custom handling if needed
    console.log(`MainMenuUI: Orientation changed to ${isPortrait ? 'portrait' : 'landscape'}`);
    
    // Apply orientation-specific styles
    this.applyOrientationSpecificStyles();
  }
  
  /**
   * Apply orientation-specific styles for the main menu
   */
  protected applyOrientationSpecificStyles(): void {
    if (this.isPortrait) {
      // Portrait layout
      this.menuContainer.style.width = '80%';
      this.menuContainer.style.maxWidth = '400px';
      
      if (this.deviceType === 'mobile') {
        // Mobile portrait adjustments
        this.title.style.fontSize = '28px';
        this.title.style.marginBottom = '15px';
        this.menuContainer.style.padding = '15px';
        this.menuContainer.style.gap = '12px';
      }
    } else {
      // Landscape layout
      this.menuContainer.style.width = '60%';
      this.menuContainer.style.maxWidth = '500px';
      
      if (this.deviceType === 'mobile') {
        // Mobile landscape adjustments - optimize for shorter height
        this.menuContainer.style.padding = '10px 20px';
        this.menuContainer.style.gap = '10px';
        this.title.style.fontSize = '24px';
        this.title.style.marginBottom = '10px';
        
        // Make buttons display in a more space-efficient layout if on mobile landscape
        this.menuContainer.style.flexDirection = 'row';
        this.menuContainer.style.flexWrap = 'wrap';
        this.menuContainer.style.justifyContent = 'center';
        
        // Style title to span full width
        this.title.style.width = '100%';
        this.title.style.textAlign = 'center';
        
        // Adjust button sizes
        const buttons = [this.startButton, this.levelsButton, this.settingsButton];
        buttons.forEach(button => {
          button.style.width = 'calc(33% - 10px)';
          button.style.margin = '5px';
        });
      }
    }
  }
  
  /**
   * Handle input device changes
   * @param device The new input device
   */
  public onInputDeviceChanged(device: InputDeviceType): void {
    // Customize UI based on input device
    console.log(`MainMenuUI: Input device changed to ${device}`);
    
    // Add touch-friendly attributes for touch devices
    if (device === InputDeviceType.TOUCH) {
      const buttons = [this.startButton, this.levelsButton, this.settingsButton];
      buttons.forEach(button => {
        this.addTouchFriendlyAttributes(button);
      });
    }
  }
  
  /**
   * Apply device-specific styles
   */
  protected applyDeviceSpecificStyles(): void {
    // Base styles based on device type
    if (this.deviceType === 'mobile') {
      // Mobile-specific styles
      this.menuContainer.style.minWidth = '250px';
      
      // Adjust button sizes
      const buttons = [this.startButton, this.levelsButton, this.settingsButton];
      buttons.forEach(button => {
        button.style.padding = '12px';
        this.addTouchFriendlyAttributes(button);
      });
    } else if (this.deviceType === 'tablet') {
      // Tablet-specific styles
      this.menuContainer.style.minWidth = '350px';
      this.title.style.fontSize = '32px';
      
      // Make buttons larger for tablet
      const buttons = [this.startButton, this.levelsButton, this.settingsButton];
      buttons.forEach(button => {
        button.style.padding = '15px';
        this.addTouchFriendlyAttributes(button);
      });
    }
    
    // Now apply orientation-specific styles based on the current device type
    this.applyOrientationSpecificStyles();
  }
  
  /**
   * Show animation when displayed
   */
  public show(): void {
    super.show();
    
    // Add entrance animation
    this.menuContainer.style.animation = 'fadeIn 0.5s ease forwards';
  }
  
  /**
   * Hide animation when hidden
   */
  public hide(): void {
    // Add exit animation (handled in CSS)
    this.menuContainer.style.animation = 'fadeOut 0.5s ease forwards';
    
    // Delay actual hiding until animation completes
    setTimeout(() => {
      super.hide();
    }, 500);
  }
  
  /**
   * Update method - called every frame
   * @param deltaTime Time since last frame
   */
  public update(deltaTime: number): void {
    // No continual updates needed for this component
  }
  
  /**
   * Clean up resources when no longer needed
   */
  public dispose(): void {
    this.removeEventListeners();
    super.dispose();
  }
} 