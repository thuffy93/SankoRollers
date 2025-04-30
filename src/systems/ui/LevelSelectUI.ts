import { HTMLUIComponent } from './HTMLUIComponent';
import { UIState } from '../UIManager';

/**
 * Interface for level data
 */
interface LevelData {
  id: number;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  unlocked: boolean;
  completed: boolean;
  par: number;
  bestScore?: number;
}

/**
 * Represents the level select UI component
 */
export class LevelSelectUI extends HTMLUIComponent {
  // HTML elements for level select
  private menuContainer!: HTMLElement;
  private title!: HTMLElement;
  private levelContainer!: HTMLElement;
  private backButton!: HTMLElement;
  
  // Event handler references
  private boundBackHandler: () => void;
  
  // Callback for state transitions and level selection
  private onStateChangeRequest: (state: UIState) => void;
  private onLevelSelected: (levelId: number) => void;
  
  // Available levels (would normally come from a game state/save)
  private levels: LevelData[] = [
    {
      id: 1,
      name: 'Starter Course',
      description: 'A gentle introduction to cosmic golf',
      difficulty: 'easy',
      unlocked: true,
      completed: false,
      par: 3
    },
    {
      id: 2,
      name: 'Lunar Craters',
      description: 'Navigate the tricky terrain of the moon',
      difficulty: 'medium',
      unlocked: true,
      completed: false,
      par: 4
    },
    {
      id: 3,
      name: 'Mars Madness',
      description: 'Can you handle the red planet?',
      difficulty: 'hard',
      unlocked: false,
      completed: false,
      par: 5
    }
  ];
  
  /**
   * Create a new LevelSelectUI component
   * @param container Parent container element
   * @param onStateChangeRequest Callback for when a menu button requests a state change
   * @param onLevelSelected Callback for when a level is selected
   */
  constructor(
    container: HTMLElement, 
    onStateChangeRequest: (state: UIState) => void,
    onLevelSelected: (levelId: number) => void
  ) {
    super(container, 'level-select-ui');
    this.onStateChangeRequest = onStateChangeRequest;
    this.onLevelSelected = onLevelSelected;
    
    // Pre-bind event handlers to maintain references for cleanup
    this.boundBackHandler = this.handleBack.bind(this);
    
    this.initialize();
  }
  
  /**
   * Initialize the component
   */
  protected initialize(): void {
    // Create menu container
    this.menuContainer = this.createElement('div', 'level-select ui-panel');
    
    // Create title
    this.title = this.createElement('h2', 'level-select-title', 'Select Level');
    this.menuContainer.appendChild(this.title);
    
    // Create level container
    this.levelContainer = this.createElement('div', 'level-container');
    this.menuContainer.appendChild(this.levelContainer);
    
    // Create back button
    this.backButton = this.createButton('Back to Main Menu', 'back-btn');
    this.menuContainer.appendChild(this.backButton);
    
    // Populate levels
    this.populateLevels();
    
    // Add event listeners
    this.addEventListeners();
    
    // Style the menu container
    this.applyMenuStyles();
  }
  
  /**
   * Create a button
   * @param text Button text
   * @param id Button ID
   * @returns The created button element
   */
  private createButton(text: string, id: string): HTMLElement {
    const button = this.createElement('button', 'ui-button level-select-button', text);
    button.id = id;
    return button;
  }
  
  /**
   * Add event listeners to buttons
   */
  private addEventListeners(): void {
    this.backButton.addEventListener('click', this.boundBackHandler);
  }
  
  /**
   * Remove event listeners from buttons
   */
  private removeEventListeners(): void {
    this.backButton.removeEventListener('click', this.boundBackHandler);
  }
  
  /**
   * Populate the level container with level cards
   */
  private populateLevels(): void {
    // Clear existing levels
    this.levelContainer.innerHTML = '';
    
    // Add level cards
    this.levels.forEach(level => {
      const levelCard = this.createLevelCard(level);
      this.levelContainer.appendChild(levelCard);
    });
  }
  
  /**
   * Create a level card element
   * @param level Level data
   * @returns The created level card element
   */
  private createLevelCard(level: LevelData): HTMLElement {
    // Create card container
    const card = this.createElement('div', `level-card ${level.unlocked ? '' : 'locked'}`);
    card.dataset.levelId = level.id.toString();
    
    // Create card content
    const nameEl = this.createElement('h3', 'level-name', level.name);
    card.appendChild(nameEl);
    
    const difficultyEl = this.createElement('div', `level-difficulty ${level.difficulty}`, 
      `Difficulty: ${level.difficulty.charAt(0).toUpperCase() + level.difficulty.slice(1)}`);
    card.appendChild(difficultyEl);
    
    const descEl = this.createElement('p', 'level-description', level.description);
    card.appendChild(descEl);
    
    const parEl = this.createElement('div', 'level-par', `Par: ${level.par}`);
    card.appendChild(parEl);
    
    if (level.bestScore) {
      const scoreEl = this.createElement('div', 'level-best-score', `Best: ${level.bestScore}`);
      card.appendChild(scoreEl);
    }
    
    // Add locked overlay if needed
    if (!level.unlocked) {
      const lockedOverlay = this.createElement('div', 'locked-overlay');
      const lockIcon = this.createElement('span', 'lock-icon', '🔒');
      lockedOverlay.appendChild(lockIcon);
      card.appendChild(lockedOverlay);
    } else {
      // Add click handler for unlocked levels
      card.addEventListener('click', () => this.handleLevelSelect(level.id));
    }
    
    // Add completion star if completed
    if (level.completed) {
      const completedStar = this.createElement('div', 'completed-star', '★');
      card.appendChild(completedStar);
    }
    
    return card;
  }
  
  /**
   * Handle back button click
   */
  private handleBack(): void {
    this.onStateChangeRequest(UIState.MAIN_MENU);
  }
  
  /**
   * Handle level selection
   * @param levelId ID of the selected level
   */
  private handleLevelSelect(levelId: number): void {
    this.onLevelSelected(levelId);
    this.onStateChangeRequest(UIState.IN_GAME);
  }
  
  /**
   * Apply styles to the menu components
   */
  private applyMenuStyles(): void {
    // Container styles
    this.menuContainer.style.display = 'flex';
    this.menuContainer.style.flexDirection = 'column';
    this.menuContainer.style.alignItems = 'center';
    this.menuContainer.style.padding = '20px';
    this.menuContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    this.menuContainer.style.borderRadius = '10px';
    this.menuContainer.style.color = 'white';
    this.menuContainer.style.gap = '20px';
    this.menuContainer.style.position = 'absolute';
    this.menuContainer.style.top = '50%';
    this.menuContainer.style.left = '50%';
    this.menuContainer.style.transform = 'translate(-50%, -50%)';
    this.menuContainer.style.maxWidth = '800px';
    this.menuContainer.style.width = '90%';
    this.menuContainer.style.maxHeight = '80vh';
    this.menuContainer.style.overflowY = 'auto';
    
    // Title styles
    this.title.style.fontSize = '28px';
    this.title.style.marginBottom = '15px';
    this.title.style.color = '#64b5f6';
    this.title.style.textShadow = '0 0 5px rgba(100, 181, 246, 0.5)';
    
    // Level container styles
    this.levelContainer.style.display = 'grid';
    this.levelContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(220px, 1fr))';
    this.levelContainer.style.gap = '15px';
    this.levelContainer.style.width = '100%';
    this.levelContainer.style.padding = '10px';
    
    // Card styles (applied via CSS in this case)
    const style = document.createElement('style');
    style.textContent = `
      .level-card {
        background-color: rgba(60, 60, 60, 0.8);
        border-radius: 8px;
        padding: 15px;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        position: relative;
        overflow: hidden;
      }
      
      .level-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
      }
      
      .level-card.locked {
        filter: grayscale(0.8);
        opacity: 0.7;
        cursor: not-allowed;
      }
      
      .level-name {
        margin-top: 0;
        margin-bottom: 8px;
        color: white;
      }
      
      .level-difficulty {
        font-size: 12px;
        margin-bottom: 8px;
        padding: 3px 6px;
        border-radius: 3px;
        display: inline-block;
      }
      
      .level-difficulty.easy {
        background-color: rgba(76, 175, 80, 0.6);
      }
      
      .level-difficulty.medium {
        background-color: rgba(255, 152, 0, 0.6);
      }
      
      .level-difficulty.hard {
        background-color: rgba(244, 67, 54, 0.6);
      }
      
      .level-description {
        font-size: 14px;
        margin-bottom: 12px;
        color: rgba(255, 255, 255, 0.8);
      }
      
      .level-par {
        font-size: 14px;
        font-weight: bold;
        color: #81c784;
      }
      
      .level-best-score {
        font-size: 14px;
        font-weight: bold;
        color: #4fc3f7;
      }
      
      .locked-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
      }
      
      .lock-icon {
        font-size: 32px;
      }
      
      .completed-star {
        position: absolute;
        top: 10px;
        right: 10px;
        color: gold;
        font-size: 24px;
        text-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
      }
    `;
    
    this.element.appendChild(style);
    
    // Back button styles
    this.backButton.style.marginTop = '20px';
    this.backButton.style.width = '200px';
  }
  
  /**
   * Update level data and redraw level cards
   * @param levels Updated level data
   */
  public updateLevels(levels: LevelData[]): void {
    this.levels = levels;
    this.populateLevels();
  }
  
  /**
   * Show animation when displayed
   */
  public show(): void {
    super.show();
    
    // Add entrance animation
    this.menuContainer.style.animation = 'fadeIn 0.3s ease forwards';
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
    
    // Remove level card click handlers
    const levelCards = this.levelContainer.querySelectorAll('.level-card:not(.locked)');
    levelCards.forEach(card => {
      const levelId = parseInt(card.getAttribute('data-level-id') || '0', 10);
      if (levelId) {
        card.removeEventListener('click', () => this.handleLevelSelect(levelId));
      }
    });
    
    super.dispose();
  }
} 