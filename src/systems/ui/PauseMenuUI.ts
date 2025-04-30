import { HTMLUIComponent } from './HTMLUIComponent';
import { UIState } from '../UIManager';

/**
 * Represents the pause menu UI component
 */
export class PauseMenuUI extends HTMLUIComponent {
  // HTML elements for pause menu
  private menuContainer!: HTMLElement;
  private title!: HTMLElement;
  private resumeButton!: HTMLElement;
  private restartButton!: HTMLElement;
  private settingsButton!: HTMLElement;
  private mainMenuButton!: HTMLElement;
  
  // Event handler references
  private boundResumeHandler: () => void;
  private boundRestartHandler: () => void;
  private boundSettingsHandler: () => void;
  private boundMainMenuHandler: () => void;
  
  // Callback for state transitions
  private onStateChangeRequest: (state: UIState) => void;
  private onGameActionRequest: (action: 'resume' | 'restart') => void;
  
  /**
   * Create a new PauseMenuUI component
   * @param container Parent container element
   * @param onStateChangeRequest Callback for when a menu button requests a state change
   * @param onGameActionRequest Callback for game-specific actions
   */
  constructor(
    container: HTMLElement, 
    onStateChangeRequest: (state: UIState) => void,
    onGameActionRequest: (action: 'resume' | 'restart') => void
  ) {
    super(container, 'pause-menu-ui');
    this.onStateChangeRequest = onStateChangeRequest;
    this.onGameActionRequest = onGameActionRequest;
    
    // Pre-bind event handlers to maintain references for cleanup
    this.boundResumeHandler = this.handleResume.bind(this);
    this.boundRestartHandler = this.handleRestart.bind(this);
    this.boundSettingsHandler = this.handleSettings.bind(this);
    this.boundMainMenuHandler = this.handleMainMenu.bind(this);
    
    this.initialize();
  }
  
  /**
   * Initialize the component
   */
  protected initialize(): void {
    // Create menu container
    this.menuContainer = this.createElement('div', 'pause-menu ui-panel');
    
    // Create title
    this.title = this.createElement('h2', 'pause-menu-title', 'Game Paused');
    this.menuContainer.appendChild(this.title);
    
    // Create menu buttons
    this.resumeButton = this.createButton('Resume', 'resume-btn');
    this.menuContainer.appendChild(this.resumeButton);
    
    this.restartButton = this.createButton('Restart', 'restart-btn');
    this.menuContainer.appendChild(this.restartButton);
    
    this.settingsButton = this.createButton('Settings', 'settings-btn');
    this.menuContainer.appendChild(this.settingsButton);
    
    this.mainMenuButton = this.createButton('Main Menu', 'main-menu-btn');
    this.menuContainer.appendChild(this.mainMenuButton);
    
    // Add event listeners
    this.addEventListeners();
    
    // Style the menu container
    this.applyMenuStyles();
    
    // Set up keyboard listener for Escape key
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  /**
   * Create a menu button
   * @param text Button text
   * @param id Button ID
   * @returns The created button element
   */
  private createButton(text: string, id: string): HTMLElement {
    const button = this.createElement('button', 'ui-button pause-menu-button', text);
    button.id = id;
    return button;
  }
  
  /**
   * Add event listeners to menu buttons
   */
  private addEventListeners(): void {
    this.resumeButton.addEventListener('click', this.boundResumeHandler);
    this.restartButton.addEventListener('click', this.boundRestartHandler);
    this.settingsButton.addEventListener('click', this.boundSettingsHandler);
    this.mainMenuButton.addEventListener('click', this.boundMainMenuHandler);
  }
  
  /**
   * Remove event listeners from menu buttons
   */
  private removeEventListeners(): void {
    this.resumeButton.removeEventListener('click', this.boundResumeHandler);
    this.restartButton.removeEventListener('click', this.boundRestartHandler);
    this.settingsButton.removeEventListener('click', this.boundSettingsHandler);
    this.mainMenuButton.removeEventListener('click', this.boundMainMenuHandler);
  }
  
  /**
   * Handle resume button click
   */
  private handleResume(): void {
    this.onGameActionRequest('resume');
  }
  
  /**
   * Handle restart button click
   */
  private handleRestart(): void {
    this.onGameActionRequest('restart');
  }
  
  /**
   * Handle settings button click
   */
  private handleSettings(): void {
    this.onStateChangeRequest(UIState.SETTINGS);
  }
  
  /**
   * Handle main menu button click
   */
  private handleMainMenu(): void {
    this.onStateChangeRequest(UIState.MAIN_MENU);
  }
  
  /**
   * Handle keyboard input
   * @param event Keyboard event
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // If Escape key is pressed while visible, resume game
    if (event.key === 'Escape' && this.isVisible) {
      this.handleResume();
    }
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
    this.menuContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    this.menuContainer.style.borderRadius = '10px';
    this.menuContainer.style.color = 'white';
    this.menuContainer.style.gap = '15px';
    this.menuContainer.style.position = 'absolute';
    this.menuContainer.style.top = '50%';
    this.menuContainer.style.left = '50%';
    this.menuContainer.style.transform = 'translate(-50%, -50%)';
    this.menuContainer.style.minWidth = '250px';
    
    // Add backdrop blur effect
    this.element.style.backdropFilter = 'blur(5px)';
    (this.element.style as any)['WebkitBackdropFilter'] = 'blur(5px)';
    
    // Title styles
    this.title.style.fontSize = '28px';
    this.title.style.marginBottom = '15px';
    this.title.style.color = '#ff9800';
    this.title.style.textShadow = '0 0 5px rgba(255, 152, 0, 0.5)';
    
    // Button styles are handled by global UI CSS, but customize some for the pause menu
    const buttons = [this.resumeButton, this.restartButton, this.settingsButton, this.mainMenuButton];
    buttons.forEach(button => {
      button.style.width = '100%';
      button.style.margin = '5px 0';
    });
    
    // Special styling for resume button (make it stand out)
    this.resumeButton.style.backgroundColor = 'rgba(76, 175, 80, 0.8)';
  }
  
  /**
   * Show animation when displayed
   */
  public show(): void {
    super.show();
    
    // Add entrance animation
    this.menuContainer.style.animation = 'fadeIn 0.3s ease forwards';
    
    // Add blur transition to the backdrop
    this.element.style.animation = 'backdropBlurIn 0.3s ease forwards';
  }
  
  /**
   * Hide animation when hidden
   */
  public hide(): void {
    // Add exit animation
    this.menuContainer.style.animation = 'fadeOut 0.3s ease forwards';
    
    // Remove blur effect
    this.element.style.animation = 'backdropBlurOut 0.3s ease forwards';
    
    // Delay actual hiding until animation completes
    setTimeout(() => {
      super.hide();
    }, 300);
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
    
    // Remove keyboard listener
    document.removeEventListener('keydown', this.handleKeyDown);
    
    super.dispose();
  }
} 