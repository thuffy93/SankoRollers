import * as THREE from 'three';
import { ShotState } from './ShotSystem';
import { GameState } from './GameSystem';
import { InputDeviceType } from './InputManager';
import { DeviceDetection } from '../utils/DeviceDetection';

/**
 * Enum for different UI states
 */
export enum UIState {
  MAIN_MENU = 'mainMenu',
  IN_GAME = 'inGame',
  PAUSED = 'paused',
  LEVEL_SELECT = 'levelSelect',
  GAME_OVER = 'gameOver',
  SETTINGS = 'settings'
}

/**
 * Orientation update event detail type
 */
interface OrientationUpdateDetail {
  isPortrait: boolean;
  isLandscape: boolean;
}

// Declare the custom event type for TypeScript
declare global {
  interface WindowEventMap {
    'orientationupdate': CustomEvent<OrientationUpdateDetail>;
  }
}

/**
 * Type for a UI component that can be managed by the UIManager
 */
export interface UIComponent {
  // Core lifecycle methods
  show(): void;
  hide(): void;
  update(deltaTime: number): void;
  
  // Optional methods
  onStateChanged?(prevState: UIState, newState: UIState): void;
  onShotStateChanged?(shotState: ShotState): void;
  onGameStateChanged?(gameState: GameState): void;
  onInputDeviceChanged?(device: InputDeviceType): void;
  onOrientationChanged?(isPortrait: boolean): void;
  
  // Resource management
  dispose(): void;
}

/**
 * UIManager serves as the central controller for all UI elements
 * It manages the state transitions and bridges HTML/CSS elements with Three.js elements
 */
export class UIManager {
  // Current UI state
  private currentState: UIState = UIState.MAIN_MENU;
  
  // References to game states
  private gameState: GameState = GameState.IDLE;
  private shotState: ShotState = ShotState.IDLE;
  private inputDevice: InputDeviceType = InputDeviceType.KEYBOARD;
  
  // Store UI components by state
  private components: Map<UIState, UIComponent[]> = new Map();
  
  // Global UI components that are always active
  private globalComponents: UIComponent[] = [];
  
  // State change listeners
  private stateChangeListeners: Array<(prevState: UIState, newState: UIState) => void> = [];
  
  // Scene reference for Three.js UI elements
  private scene: THREE.Scene;
  
  // HTML container for DOM-based UI elements
  private htmlContainer: HTMLElement;
  
  // Current device type based on device detection
  private deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  
  // Current orientation
  private isPortrait: boolean = false;
  
  // Shot state change listeners
  private shotStateChangeListeners: Array<(prevState: ShotState, newState: ShotState) => void> = [];
  
  /**
   * Create a new UI Manager
   * @param scene Three.js scene for rendering 3D UI elements
   * @param htmlContainer DOM element to contain HTML UI elements
   */
  constructor(scene: THREE.Scene, htmlContainer: HTMLElement) {
    this.scene = scene;
    this.htmlContainer = htmlContainer;
    
    // Initialize DeviceDetection
    DeviceDetection.initialize();
    
    // Initialize responsive design
    this.setupResponsiveDesign();
    
    // Create initial UI structure in DOM
    this.createDOMStructure();
    
    // Set initial state
    this.transitionToState(UIState.MAIN_MENU);
  }
  
  /**
   * Set up responsive design and screen size observers
   */
  private setupResponsiveDesign(): void {
    // Initial detection
    this.updateDeviceType();
    this.updateOrientation();
    
    // Listen for window resize events
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Listen for orientation change events
    window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
    
    // Listen for custom orientation update events from DeviceDetection
    window.addEventListener('orientationupdate', this.handleOrientationUpdate.bind(this));
  }
  
  /**
   * Handle window resize events
   */
  private handleResize(): void {
    this.updateDeviceType();
  }
  
  /**
   * Handle orientation change events
   */
  private handleOrientationChange(): void {
    this.updateOrientation();
  }
  
  /**
   * Handle orientation update events from DeviceDetection
   */
  private handleOrientationUpdate(event: CustomEvent<OrientationUpdateDetail>): void {
    if (event.detail) {
      const wasPortrait = this.isPortrait;
      this.isPortrait = event.detail.isPortrait;
      
      // Only apply changes if orientation actually changed
      if (wasPortrait !== this.isPortrait) {
        this.applyOrientationStyles();
        this.notifyComponentsOfOrientationChange();
      }
    }
  }
  
  /**
   * Update the device type based on DeviceDetection
   */
  private updateDeviceType(): void {
    const newDeviceType = DeviceDetection.isMobile() 
      ? 'mobile' 
      : DeviceDetection.isTablet() 
        ? 'tablet' 
        : 'desktop';
    
    if (this.deviceType !== newDeviceType) {
      this.deviceType = newDeviceType;
      this.applyResponsiveStyles();
    }
  }
  
  /**
   * Update the current orientation state
   */
  private updateOrientation(): void {
    const wasPortrait = this.isPortrait;
    this.isPortrait = DeviceDetection.isPortrait();
    
    // Only apply changes if orientation actually changed
    if (wasPortrait !== this.isPortrait) {
      this.applyOrientationStyles();
      this.notifyComponentsOfOrientationChange();
    }
  }
  
  /**
   * Apply responsive styles based on current device type
   */
  private applyResponsiveStyles(): void {
    // Remove any previous device classes
    this.htmlContainer.classList.remove('ui-mobile', 'ui-tablet', 'ui-desktop');
    
    // Add the current device class
    this.htmlContainer.classList.add(`ui-${this.deviceType}`);
    
    // Apply UI scaling based on device detection
    const scaleFactor = DeviceDetection.getUIScalingFactor();
    document.documentElement.style.setProperty('--ui-scale', scaleFactor.toString());
    
    // Inform UI components about the device change
    this.globalComponents.forEach(component => {
      if (component.onInputDeviceChanged) {
        component.onInputDeviceChanged(this.inputDevice);
      }
    });
    
    const stateComponents = this.components.get(this.currentState) || [];
    stateComponents.forEach(component => {
      if (component.onInputDeviceChanged) {
        component.onInputDeviceChanged(this.inputDevice);
      }
    });
  }
  
  /**
   * Apply orientation-specific styles
   */
  private applyOrientationStyles(): void {
    // Remove any previous orientation classes
    this.htmlContainer.classList.remove('ui-portrait', 'ui-landscape');
    
    // Add the current orientation class
    this.htmlContainer.classList.add(this.isPortrait ? 'ui-portrait' : 'ui-landscape');
  }
  
  /**
   * Notify UI components of orientation changes
   */
  private notifyComponentsOfOrientationChange(): void {
    // Notify global components
    this.globalComponents.forEach(component => {
      if (component.onOrientationChanged) {
        component.onOrientationChanged(this.isPortrait);
      }
    });
    
    // Notify current state components
    const stateComponents = this.components.get(this.currentState) || [];
    stateComponents.forEach(component => {
      if (component.onOrientationChanged) {
        component.onOrientationChanged(this.isPortrait);
      }
    });
  }
  
  /**
   * Create the initial DOM structure for UI elements
   */
  private createDOMStructure(): void {
    // Create UI container if it doesn't exist
    if (!document.getElementById('game-ui-container')) {
      const uiContainer = document.createElement('div');
      uiContainer.id = 'game-ui-container';
      this.htmlContainer.appendChild(uiContainer);
      
      // Create containers for each UI state
      Object.values(UIState).forEach(state => {
        const stateContainer = document.createElement('div');
        stateContainer.id = `ui-${state}-container`;
        stateContainer.className = 'ui-state-container';
        stateContainer.style.display = 'none';
        uiContainer.appendChild(stateContainer);
      });
      
      // Create container for global UI elements
      const globalContainer = document.createElement('div');
      globalContainer.id = 'ui-global-container';
      globalContainer.className = 'ui-global-container';
      uiContainer.appendChild(globalContainer);
    }
  }
  
  /**
   * Register a UI component for a specific state
   * @param state The UI state this component belongs to
   * @param component The UI component to register
   */
  public registerComponent(state: UIState, component: UIComponent): void {
    if (!this.components.has(state)) {
      this.components.set(state, []);
    }
    
    this.components.get(state)?.push(component);
    
    // If this is the current state, show the component
    if (this.currentState === state) {
      component.show();
    } else {
      component.hide();
    }
  }
  
  /**
   * Register a global UI component that is active in all states
   * @param component The UI component to register globally
   */
  public registerGlobalComponent(component: UIComponent): void {
    this.globalComponents.push(component);
    component.show();
  }
  
  /**
   * Transition to a new UI state
   * @param newState The new UI state to transition to
   */
  public transitionToState(newState: UIState): void {
    // Store previous state
    const prevState = this.currentState;
    
    // Skip if state hasn't changed
    if (prevState === newState) return;
    
    console.log(`UI transitioning from ${prevState} to ${newState}`);
    
    // Hide components from previous state
    const prevComponents = this.components.get(prevState) || [];
    prevComponents.forEach(component => {
      component.hide();
      if (component.onStateChanged) {
        component.onStateChanged(prevState, newState);
      }
    });
    
    // Show components for new state
    const newComponents = this.components.get(newState) || [];
    newComponents.forEach(component => {
      component.show();
      if (component.onStateChanged) {
        component.onStateChanged(prevState, newState);
      }
    });
    
    // Update DOM containers visibility
    const prevContainer = document.getElementById(`ui-${prevState}-container`);
    if (prevContainer) {
      prevContainer.style.display = 'none';
    }
    
    const newContainer = document.getElementById(`ui-${newState}-container`);
    if (newContainer) {
      newContainer.style.display = 'block';
    }
    
    // Update current state
    this.currentState = newState;
    
    // Notify listeners
    this.stateChangeListeners.forEach(listener => {
      listener(prevState, newState);
    });
  }
  
  /**
   * Update UI state based on game state changes
   * @param gameState The new game state
   */
  public updateGameState(gameState: GameState): void {
    const prevGameState = this.gameState;
    this.gameState = gameState;
    
    // Skip if state hasn't changed
    if (prevGameState === gameState) return;
    
    // Automatic UI state transitions based on game state
    switch (gameState) {
      case GameState.IDLE:
        // No automatic transition
        break;
      case GameState.AIMING:
      case GameState.SHOT_IN_PROGRESS:
      case GameState.BALL_AT_REST:
        // Ensure we're in the in-game UI
        if (this.currentState !== UIState.IN_GAME && 
            this.currentState !== UIState.PAUSED) {
          this.transitionToState(UIState.IN_GAME);
        }
        break;
      case GameState.COURSE_COMPLETE:
        // Show game over screen
        this.transitionToState(UIState.GAME_OVER);
        break;
    }
    
    // Notify components about game state change
    this.globalComponents.forEach(component => {
      if (component.onGameStateChanged) {
        component.onGameStateChanged(gameState);
      }
    });
    
    const stateComponents = this.components.get(this.currentState) || [];
    stateComponents.forEach(component => {
      if (component.onGameStateChanged) {
        component.onGameStateChanged(gameState);
      }
    });
  }
  
  /**
   * Update UI based on shot state changes
   * @param shotState The new shot state
   */
  public updateShotState(shotState: ShotState): void {
    const prevShotState = this.shotState;
    this.shotState = shotState;
    
    // Skip if state hasn't changed
    if (prevShotState === shotState) return;
    
    // Notify shot state change listeners
    this.shotStateChangeListeners.forEach(listener => {
      listener(prevShotState, shotState);
    });
    
    // Notify components about shot state change
    this.globalComponents.forEach(component => {
      if (component.onShotStateChanged) {
        component.onShotStateChanged(shotState);
      }
    });
    
    const stateComponents = this.components.get(this.currentState) || [];
    stateComponents.forEach(component => {
      if (component.onShotStateChanged) {
        component.onShotStateChanged(shotState);
      }
    });
  }
  
  /**
   * Update UI based on input device changes
   * @param device The new input device
   */
  public updateInputDevice(device: InputDeviceType): void {
    const prevDevice = this.inputDevice;
    this.inputDevice = device;
    
    // Skip if device hasn't changed
    if (prevDevice === device) return;
    
    // Notify components about input device change
    this.globalComponents.forEach(component => {
      if (component.onInputDeviceChanged) {
        component.onInputDeviceChanged(device);
      }
    });
    
    const stateComponents = this.components.get(this.currentState) || [];
    stateComponents.forEach(component => {
      if (component.onInputDeviceChanged) {
        component.onInputDeviceChanged(device);
      }
    });
  }
  
  /**
   * Add a state change listener
   * @param listener Function to call when UI state changes
   */
  public addStateChangeListener(listener: (prevState: UIState, newState: UIState) => void): void {
    this.stateChangeListeners.push(listener);
  }
  
  /**
   * Remove a state change listener
   * @param listener The listener to remove
   */
  public removeStateChangeListener(listener: (prevState: UIState, newState: UIState) => void): void {
    const index = this.stateChangeListeners.indexOf(listener);
    if (index !== -1) {
      this.stateChangeListeners.splice(index, 1);
    }
  }
  
  /**
   * Add a shot state change listener
   * @param listener Function to call when shot state changes
   */
  public addShotStateChangeListener(listener: (prevState: ShotState, newState: ShotState) => void): void {
    this.shotStateChangeListeners.push(listener);
  }
  
  /**
   * Remove a shot state change listener
   * @param listener The listener to remove
   */
  public removeShotStateChangeListener(listener: (prevState: ShotState, newState: ShotState) => void): void {
    const index = this.shotStateChangeListeners.indexOf(listener);
    if (index !== -1) {
      this.shotStateChangeListeners.splice(index, 1);
    }
  }
  
  /**
   * Get the current UI state
   * @returns The current UI state
   */
  public getCurrentState(): UIState {
    return this.currentState;
  }
  
  /**
   * Get the current game state
   * @returns The current game state
   */
  public getGameState(): GameState {
    return this.gameState;
  }
  
  /**
   * Get the current shot state
   * @returns The current shot state
   */
  public getShotState(): ShotState {
    return this.shotState;
  }
  
  /**
   * Get the current input device
   * @returns The current input device
   */
  public getInputDevice(): InputDeviceType {
    return this.inputDevice;
  }
  
  /**
   * Get the HTML element for a specific UI state container
   * @param state The UI state
   * @returns The HTML element for the state container
   */
  public getStateContainer(state: UIState): HTMLElement | null {
    return document.getElementById(`ui-${state}-container`);
  }
  
  /**
   * Get the global UI container
   * @returns The HTML element for the global UI container
   */
  public getGlobalContainer(): HTMLElement | null {
    return document.getElementById('ui-global-container');
  }
  
  /**
   * Get the current device type
   * @returns The current device type (mobile, tablet, desktop)
   */
  public getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    return this.deviceType;
  }
  
  /**
   * Get the current orientation
   * @returns True if portrait, false if landscape
   */
  public isPortraitOrientation(): boolean {
    return this.isPortrait;
  }
  
  /**
   * Get the UI scaling factor for the current device
   * @returns The UI scaling factor
   */
  public getUIScalingFactor(): number {
    return DeviceDetection.getUIScalingFactor();
  }
  
  /**
   * Update method to be called every frame
   * @param deltaTime Time since last frame in seconds
   */
  public update(deltaTime: number): void {
    // Update global components
    this.globalComponents.forEach(component => {
      component.update(deltaTime);
    });
    
    // Update components for current state
    const stateComponents = this.components.get(this.currentState) || [];
    stateComponents.forEach(component => {
      component.update(deltaTime);
    });
  }
  
  /**
   * Clean up resources when no longer needed
   */
  public dispose(): void {
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize.bind(this));
    window.removeEventListener('orientationchange', this.handleOrientationChange.bind(this));
    window.removeEventListener('orientationupdate', this.handleOrientationUpdate.bind(this));
    
    // Dispose all components
    this.globalComponents.forEach(component => {
      component.dispose();
    });
    
    // Dispose state-specific components
    this.components.forEach(components => {
      components.forEach(component => {
        component.dispose();
      });
    });
    
    // Clear collections
    this.globalComponents = [];
    this.components.clear();
    this.stateChangeListeners = [];
    this.shotStateChangeListeners = [];
  }
} 