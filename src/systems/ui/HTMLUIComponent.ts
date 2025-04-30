import { UIComponent, UIState } from '../UIManager';
import { ShotState } from '../ShotSystem';
import { GameState } from '../GameSystem';
import { InputDeviceType } from '../InputManager';

/**
 * Abstract base class for HTML/CSS based UI components
 */
export abstract class HTMLUIComponent implements UIComponent {
  // Root element for the component
  protected element: HTMLElement;
  
  // Parent container reference
  protected container: HTMLElement;
  
  // Visibility state
  protected isVisible: boolean = false;
  
  // Animation properties
  protected animationDuration: number = 300; // milliseconds
  protected animationTimingFunction: string = 'ease-in-out';
  
  // Orientation state
  protected isPortrait: boolean = false;
  
  // Device type
  protected deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  
  /**
   * Create a new HTML UI component
   * @param container Parent container element
   * @param className Optional CSS class name for the component
   */
  constructor(container: HTMLElement, className?: string) {
    this.container = container;
    
    // Create root element
    this.element = document.createElement('div');
    
    // Add class if provided
    if (className) {
      this.element.className = className;
    }
    
    // Set default styles
    this.element.style.opacity = '0';
    this.element.style.display = 'none';
    this.element.style.transition = `opacity ${this.animationDuration}ms ${this.animationTimingFunction}`;
    
    // Check initial orientation
    this.isPortrait = window.matchMedia('(orientation: portrait)').matches;
    
    // Add to container
    this.container.appendChild(this.element);
    
    // Initialize component
    this.initialize();
  }
  
  /**
   * Initialize the component (to be implemented by subclasses)
   */
  protected abstract initialize(): void;
  
  /**
   * Show the component with animation
   */
  public show(): void {
    if (this.isVisible) return;
    
    this.element.style.display = 'block';
    
    // Force a reflow to ensure the transition works
    void this.element.offsetWidth;
    
    this.element.style.opacity = '1';
    this.isVisible = true;
  }
  
  /**
   * Hide the component with animation
   */
  public hide(): void {
    if (!this.isVisible) return;
    
    this.element.style.opacity = '0';
    
    // Wait for animation to complete before hiding
    setTimeout(() => {
      if (this.element) {
        this.element.style.display = 'none';
      }
    }, this.animationDuration);
    
    this.isVisible = false;
  }
  
  /**
   * Set component's position
   * @param position Position object with top, left, right, bottom properties
   */
  public setPosition(position: {
    top?: string,
    left?: string,
    right?: string,
    bottom?: string,
    transform?: string
  }): void {
    if (position.top !== undefined) this.element.style.top = position.top;
    if (position.left !== undefined) this.element.style.left = position.left;
    if (position.right !== undefined) this.element.style.right = position.right;
    if (position.bottom !== undefined) this.element.style.bottom = position.bottom;
    if (position.transform !== undefined) this.element.style.transform = position.transform;
  }
  
  /**
   * Set component's dimensions
   * @param dimensions Dimensions object with width and height properties
   */
  public setDimensions(dimensions: {
    width?: string,
    height?: string,
    maxWidth?: string,
    maxHeight?: string,
    minWidth?: string,
    minHeight?: string
  }): void {
    if (dimensions.width !== undefined) this.element.style.width = dimensions.width;
    if (dimensions.height !== undefined) this.element.style.height = dimensions.height;
    if (dimensions.maxWidth !== undefined) this.element.style.maxWidth = dimensions.maxWidth;
    if (dimensions.maxHeight !== undefined) this.element.style.maxHeight = dimensions.maxHeight;
    if (dimensions.minWidth !== undefined) this.element.style.minWidth = dimensions.minWidth;
    if (dimensions.minHeight !== undefined) this.element.style.minHeight = dimensions.minHeight;
  }
  
  /**
   * Add a CSS class to the component
   * @param className CSS class name to add
   */
  public addClass(className: string): void {
    this.element.classList.add(className);
  }
  
  /**
   * Remove a CSS class from the component
   * @param className CSS class name to remove
   */
  public removeClass(className: string): void {
    this.element.classList.remove(className);
  }
  
  /**
   * Apply CSS styles to the component
   * @param styles Object with style properties
   */
  public applyStyles(styles: Partial<CSSStyleDeclaration>): void {
    Object.assign(this.element.style, styles);
  }
  
  /**
   * Set animation duration
   * @param duration Duration in milliseconds
   */
  public setAnimationDuration(duration: number): void {
    this.animationDuration = duration;
    this.updateTransitionStyle();
  }
  
  /**
   * Set animation timing function
   * @param timingFunction CSS timing function (e.g., 'ease', 'linear')
   */
  public setAnimationTimingFunction(timingFunction: string): void {
    this.animationTimingFunction = timingFunction;
    this.updateTransitionStyle();
  }
  
  /**
   * Update transition style based on current animation settings
   */
  private updateTransitionStyle(): void {
    this.element.style.transition = `opacity ${this.animationDuration}ms ${this.animationTimingFunction}`;
  }
  
  /**
   * Set the component's HTML content
   * @param content HTML content
   */
  public setContent(content: string): void {
    this.element.innerHTML = content;
  }
  
  /**
   * Append HTML content to the component
   * @param content HTML content to append
   */
  public appendContent(content: string): void {
    this.element.insertAdjacentHTML('beforeend', content);
  }
  
  /**
   * Empty the component's content
   */
  public empty(): void {
    this.element.innerHTML = '';
  }
  
  /**
   * Update method (called every frame)
   * @param deltaTime Time since last frame in seconds
   */
  public update(deltaTime: number): void {
    // Optional override in subclasses
  }
  
  /**
   * Called when UI state changes (optional implementation)
   */
  public onStateChanged?(prevState: UIState, newState: UIState): void {
    // Default implementation does nothing
  }
  
  /**
   * Called when shot state changes (optional implementation)
   */
  public onShotStateChanged?(shotState: ShotState): void {
    // Default implementation does nothing
  }
  
  /**
   * Called when game state changes (optional implementation)
   */
  public onGameStateChanged?(gameState: GameState): void {
    // Default implementation does nothing
  }
  
  /**
   * Handle input device changes
   * @param device The new input device
   */
  public onInputDeviceChanged?(device: InputDeviceType): void {
    // Default implementation does nothing
  }
  
  /**
   * Handle orientation changes
   * @param isPortrait Whether the device is in portrait orientation
   */
  public onOrientationChanged?(isPortrait: boolean): void {
    this.isPortrait = isPortrait;
    this.applyOrientationSpecificStyles();
  }
  
  /**
   * Apply orientation-specific styles
   * Override in subclasses that need orientation-specific styling
   */
  protected applyOrientationSpecificStyles(): void {
    // Optional override in subclasses
  }
  
  /**
   * Create a new HTML element with specified attributes
   * @param tag HTML tag name
   * @param className Optional CSS class name
   * @param content Optional text content
   * @returns The created HTML element
   */
  protected createNewElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    content?: string
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    
    if (className) {
      element.className = className;
    }
    
    if (content) {
      element.textContent = content;
    }
    
    return element;
  }
  
  /**
   * Create and append a child element to this component
   * @param tagName Element tag name
   * @param className Optional CSS class name
   * @param content Optional innerHTML content
   * @returns The created HTML element
   */
  protected createElement(tagName: string, className?: string, content?: string): HTMLElement {
    const element = document.createElement(tagName);
    
    if (className) {
      element.className = className;
    }
    
    if (content) {
      element.innerHTML = content;
    }
    
    this.element.appendChild(element);
    return element;
  }
  
  /**
   * Set touch-friendly styles for buttons and interactive elements
   * @param element The element to apply touch-friendly styles to
   */
  protected makeTouchFriendly(element: HTMLElement): void {
    // Increase touch target size
    element.style.minHeight = '44px';
    element.style.minWidth = '44px';
    
    // Ensure proper tap handling
    element.style.touchAction = 'manipulation';
    
    // Add active state styling for feedback
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
  }
  
  /**
   * Set the device type and apply device-specific styles
   * @param deviceType The device type (mobile, tablet, desktop)
   */
  public setDeviceType(deviceType: 'mobile' | 'tablet' | 'desktop'): void {
    this.deviceType = deviceType;
    this.applyDeviceSpecificStyles();
  }
  
  /**
   * Apply device-specific styles
   * Override in subclasses that need device-specific styling
   */
  protected applyDeviceSpecificStyles(): void {
    // Optional override in subclasses
  }
  
  /**
   * Apply high contrast mode styles for accessibility
   * @param enabled Whether high contrast mode is enabled
   */
  public setHighContrastMode(enabled: boolean): void {
    if (enabled) {
      this.element.classList.add('high-contrast');
    } else {
      this.element.classList.remove('high-contrast');
    }
  }
  
  /**
   * Clean up resources when no longer needed
   */
  public dispose(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
} 