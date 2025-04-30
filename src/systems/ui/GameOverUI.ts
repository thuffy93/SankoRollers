import { HTMLUIComponent } from './HTMLUIComponent';
import { UIState } from '../UIManager';

/**
 * Game result data for game over screen
 */
export interface GameResultData {
  levelName: string;
  strokes: number;
  par: number;
  timeElapsed: number; // in seconds
  isNewRecord: boolean;
  stars: number; // 1-3 stars rating
}

/**
 * Represents the game over UI component
 */
export class GameOverUI extends HTMLUIComponent {
  // HTML elements
  private menuContainer!: HTMLElement;
  private title!: HTMLElement;
  private resultsContainer!: HTMLElement;
  private starsContainer!: HTMLElement;
  private messageElement!: HTMLElement;
  private buttonContainer!: HTMLElement;
  private retryButton!: HTMLElement;
  private nextLevelButton!: HTMLElement;
  private levelSelectButton!: HTMLElement;
  private mainMenuButton!: HTMLElement;
  
  // Event handler references
  private boundRetryHandler: () => void;
  private boundNextLevelHandler: () => void;
  private boundLevelSelectHandler: () => void;
  private boundMainMenuHandler: () => void;
  
  // Callback for state transitions and game actions
  private onStateChangeRequest: (state: UIState) => void;
  private onGameAction: (action: 'retry' | 'next-level') => void;
  
  // Game result data
  private resultData: GameResultData | null = null;
  
  /**
   * Create a new GameOverUI component
   * @param container Parent container element
   * @param onStateChangeRequest Callback for when a menu button requests a state change
   * @param onGameAction Callback for game-specific actions
   */
  constructor(
    container: HTMLElement, 
    onStateChangeRequest: (state: UIState) => void,
    onGameAction: (action: 'retry' | 'next-level') => void
  ) {
    super(container, 'game-over-ui');
    this.onStateChangeRequest = onStateChangeRequest;
    this.onGameAction = onGameAction;
    
    // Pre-bind event handlers to maintain references for cleanup
    this.boundRetryHandler = this.handleRetry.bind(this);
    this.boundNextLevelHandler = this.handleNextLevel.bind(this);
    this.boundLevelSelectHandler = this.handleLevelSelect.bind(this);
    this.boundMainMenuHandler = this.handleMainMenu.bind(this);
    
    this.initialize();
  }
  
  /**
   * Initialize the component
   */
  protected initialize(): void {
    // Create menu container
    this.menuContainer = this.createElement('div', 'game-over ui-panel');
    
    // Create title
    this.title = this.createElement('h2', 'game-over-title', 'Level Complete!');
    this.menuContainer.appendChild(this.title);
    
    // Create stars container
    this.starsContainer = this.createElement('div', 'stars-container');
    this.menuContainer.appendChild(this.starsContainer);
    
    // Create results container
    this.resultsContainer = this.createElement('div', 'results-container');
    this.menuContainer.appendChild(this.resultsContainer);
    
    // Create message element
    this.messageElement = this.createElement('p', 'result-message', '');
    this.menuContainer.appendChild(this.messageElement);
    
    // Create button container
    this.buttonContainer = this.createElement('div', 'button-container');
    this.menuContainer.appendChild(this.buttonContainer);
    
    // Create buttons
    this.retryButton = this.createButton('Try Again', 'retry-btn');
    this.buttonContainer.appendChild(this.retryButton);
    
    this.nextLevelButton = this.createButton('Next Level', 'next-level-btn');
    this.buttonContainer.appendChild(this.nextLevelButton);
    
    this.levelSelectButton = this.createButton('Level Select', 'level-select-btn');
    this.buttonContainer.appendChild(this.levelSelectButton);
    
    this.mainMenuButton = this.createButton('Main Menu', 'main-menu-btn');
    this.buttonContainer.appendChild(this.mainMenuButton);
    
    // Add event listeners
    this.addEventListeners();
    
    // Apply styles
    this.applyMenuStyles();
  }
  
  /**
   * Create a button
   * @param text Button text
   * @param id Button ID
   * @returns The created button element
   */
  private createButton(text: string, id: string): HTMLElement {
    const button = this.createElement('button', 'ui-button game-over-button', text);
    button.id = id;
    return button;
  }
  
  /**
   * Add event listeners to buttons
   */
  private addEventListeners(): void {
    this.retryButton.addEventListener('click', this.boundRetryHandler);
    this.nextLevelButton.addEventListener('click', this.boundNextLevelHandler);
    this.levelSelectButton.addEventListener('click', this.boundLevelSelectHandler);
    this.mainMenuButton.addEventListener('click', this.boundMainMenuHandler);
  }
  
  /**
   * Remove event listeners from buttons
   */
  private removeEventListeners(): void {
    this.retryButton.removeEventListener('click', this.boundRetryHandler);
    this.nextLevelButton.removeEventListener('click', this.boundNextLevelHandler);
    this.levelSelectButton.removeEventListener('click', this.boundLevelSelectHandler);
    this.mainMenuButton.removeEventListener('click', this.boundMainMenuHandler);
  }
  
  /**
   * Set the game results data
   * @param data Game result data
   */
  public setGameResults(data: GameResultData): void {
    this.resultData = data;
    this.updateResultsDisplay();
  }
  
  /**
   * Update the results display with current data
   */
  private updateResultsDisplay(): void {
    if (!this.resultData) return;
    
    // Update title
    this.title.textContent = 'Course Complete!';
    
    // Clear previous results
    this.resultsContainer.innerHTML = '';
    this.starsContainer.innerHTML = '';
    
    // Create star rating
    for (let i = 0; i < 3; i++) {
      const star = this.createElement('span', 
        i < this.resultData.stars ? 'star filled' : 'star empty', 
        i < this.resultData.stars ? '★' : '☆');
      this.starsContainer.appendChild(star);
    }
    
    // Create level name
    const levelElement = this.createElement('div', 'result-item level-name', 
      `Level: ${this.resultData.levelName}`);
    this.resultsContainer.appendChild(levelElement);
    
    // Create strokes vs par
    const strokesElement = this.createElement('div', 'result-item strokes');
    const parDiff = this.resultData.strokes - this.resultData.par;
    let strokesText = `Strokes: ${this.resultData.strokes}`;
    let scoreClass = '';
    
    if (parDiff < 0) {
      strokesText += ` (${parDiff} under par)`;
      scoreClass = 'under-par';
    } else if (parDiff === 0) {
      strokesText += ' (par)';
      scoreClass = 'at-par';
    } else {
      strokesText += ` (${parDiff} over par)`;
      scoreClass = 'over-par';
    }
    
    strokesElement.textContent = strokesText;
    strokesElement.classList.add(scoreClass);
    this.resultsContainer.appendChild(strokesElement);
    
    // Create time elapsed
    const minutes = Math.floor(this.resultData.timeElapsed / 60);
    const seconds = Math.floor(this.resultData.timeElapsed % 60);
    const timeElement = this.createElement('div', 'result-item time-elapsed', 
      `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`);
    this.resultsContainer.appendChild(timeElement);
    
    // Update message
    if (this.resultData.isNewRecord) {
      this.messageElement.textContent = 'New Record!';
      this.messageElement.classList.add('new-record');
    } else {
      this.messageElement.textContent = this.getResultMessage(this.resultData.stars);
      this.messageElement.classList.remove('new-record');
    }
    
    // Show/hide next level button based on stars (require at least 1 star to progress)
    this.nextLevelButton.style.display = this.resultData.stars > 0 ? 'block' : 'none';
  }
  
  /**
   * Get a message based on star rating
   * @param stars Number of stars (1-3)
   * @returns Appropriate message
   */
  private getResultMessage(stars: number): string {
    switch (stars) {
      case 3:
        return 'Perfect! Outstanding performance!';
      case 2:
        return 'Well done! Great job!';
      case 1:
        return 'Good effort! You completed the course!';
      default:
        return 'Try again to earn stars!';
    }
  }
  
  /**
   * Handle retry button click
   */
  private handleRetry(): void {
    this.onGameAction('retry');
  }
  
  /**
   * Handle next level button click
   */
  private handleNextLevel(): void {
    this.onGameAction('next-level');
  }
  
  /**
   * Handle level select button click
   */
  private handleLevelSelect(): void {
    this.onStateChangeRequest(UIState.LEVEL_SELECT);
  }
  
  /**
   * Handle main menu button click
   */
  private handleMainMenu(): void {
    this.onStateChangeRequest(UIState.MAIN_MENU);
  }
  
  /**
   * Apply styles to the menu components
   */
  private applyMenuStyles(): void {
    // Container styles
    this.menuContainer.style.display = 'flex';
    this.menuContainer.style.flexDirection = 'column';
    this.menuContainer.style.alignItems = 'center';
    this.menuContainer.style.padding = '30px';
    this.menuContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    this.menuContainer.style.borderRadius = '10px';
    this.menuContainer.style.color = 'white';
    this.menuContainer.style.gap = '20px';
    this.menuContainer.style.position = 'absolute';
    this.menuContainer.style.top = '50%';
    this.menuContainer.style.left = '50%';
    this.menuContainer.style.transform = 'translate(-50%, -50%)';
    this.menuContainer.style.minWidth = '300px';
    
    // Title styles
    this.title.style.fontSize = '32px';
    this.title.style.marginBottom = '10px';
    this.title.style.color = '#ffd700'; // Gold
    this.title.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.5)';
    
    // Stars container styles
    this.starsContainer.style.display = 'flex';
    this.starsContainer.style.justifyContent = 'center';
    this.starsContainer.style.marginBottom = '15px';
    this.starsContainer.style.fontSize = '40px';
    this.starsContainer.style.gap = '10px';
    
    // Results container styles
    this.resultsContainer.style.width = '100%';
    this.resultsContainer.style.display = 'flex';
    this.resultsContainer.style.flexDirection = 'column';
    this.resultsContainer.style.gap = '10px';
    this.resultsContainer.style.backgroundColor = 'rgba(50, 50, 50, 0.5)';
    this.resultsContainer.style.padding = '15px';
    this.resultsContainer.style.borderRadius = '8px';
    
    // Message styles
    this.messageElement.style.fontSize = '18px';
    this.messageElement.style.textAlign = 'center';
    this.messageElement.style.fontWeight = 'bold';
    this.messageElement.style.margin = '10px 0';
    
    // Button container styles
    this.buttonContainer.style.display = 'grid';
    this.buttonContainer.style.gridTemplateColumns = '1fr 1fr';
    this.buttonContainer.style.gap = '10px';
    this.buttonContainer.style.width = '100%';
    this.buttonContainer.style.marginTop = '10px';
    
    // Apply CSS styles
    const style = document.createElement('style');
    style.textContent = `
      .star {
        display: inline-block;
        transition: transform 0.3s ease;
      }
      
      .star.filled {
        color: #ffd700;
        text-shadow: 0 0 10px rgba(255, 215, 0, 0.7);
      }
      
      .star.empty {
        color: #555;
      }
      
      .star:hover {
        transform: scale(1.2);
      }
      
      .result-item {
        font-size: 16px;
        padding: 5px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .result-item:last-child {
        border-bottom: none;
      }
      
      .result-item.under-par {
        color: #4caf50;
      }
      
      .result-item.at-par {
        color: #ffffff;
      }
      
      .result-item.over-par {
        color: #ff9800;
      }
      
      .new-record {
        color: #ff5722;
        animation: pulse 1.5s infinite;
      }
      
      @keyframes pulse {
        0% { opacity: 0.7; }
        50% { opacity: 1; }
        100% { opacity: 0.7; }
      }
    `;
    
    this.element.appendChild(style);
  }
  
  /**
   * Show animation when displayed
   */
  public show(): void {
    super.show();
    
    // Add entrance animation
    this.menuContainer.style.animation = 'scaleIn 0.5s ease forwards';
  }
  
  /**
   * Hide animation when hidden
   */
  public hide(): void {
    // Add exit animation
    this.menuContainer.style.animation = 'fadeOut 0.3s ease forwards';
    
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
    super.dispose();
  }
} 