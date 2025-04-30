import { HTMLUIComponent } from './HTMLUIComponent';
import { ShotState } from '../ShotSystem';
import { GameState } from '../GameSystem';
import { UIState } from '../UIManager';

/**
 * HTML-based stroke counter UI component
 */
export class StrokeCounterUI extends HTMLUIComponent {
  // HTML elements for stroke counter UI
  private counterContainer!: HTMLElement;
  private countValue!: HTMLElement;
  private countLabel!: HTMLElement;
  private parElement!: HTMLElement;
  private relativeScoreElement!: HTMLElement;
  private scoreTermElement!: HTMLElement;
  
  // Stroke count
  private strokeCount: number = 0;
  private par: number = 3; // Default par value
  
  // Score term mapping
  private readonly scoreTermMap: Record<string, string> = {
    '-3': 'Albatross!',
    '-2': 'Eagle!',
    '-1': 'Birdie!',
    '0': 'Par',
    '1': 'Bogey',
    '2': 'Double Bogey',
    '3': 'Triple Bogey'
  };
  
  // Animation state
  private isAnimating: boolean = false;
  private animationTimeout: number | null = null;
  
  /**
   * Create a new StrokeCounterUI component
   * @param container Parent container element
   */
  constructor(container: HTMLElement) {
    super(container, 'stroke-counter-ui');
    this.initialize();
  }
  
  /**
   * Initialize the component
   */
  protected initialize(): void {
    // Create counter container
    this.counterContainer = this.createElement('div', 'stroke-counter');
    
    // Create count label and value row
    const countRow = this.createElement('div', 'stroke-counter-row');
    this.counterContainer.appendChild(countRow);
    
    // Create count label
    this.countLabel = this.createElement('span', 'stroke-label', 'Strokes: ');
    countRow.appendChild(this.countLabel);
    
    // Create count value
    this.countValue = this.createElement('span', 'stroke-value', '0');
    countRow.appendChild(this.countValue);
    
    // Create par value
    this.parElement = this.createElement('span', 'par-value', ` (Par ${this.par})`);
    countRow.appendChild(this.parElement);
    
    // Create relative score row
    const scoreRow = this.createElement('div', 'stroke-counter-row score-row');
    this.counterContainer.appendChild(scoreRow);
    
    // Create relative score display
    this.relativeScoreElement = this.createElement('span', 'relative-score', 'E');
    scoreRow.appendChild(this.relativeScoreElement);
    
    // Create score term display
    this.scoreTermElement = this.createElement('span', 'score-term', 'Par');
    scoreRow.appendChild(this.scoreTermElement);
    
    // Style the counter container
    this.counterContainer.style.display = 'flex';
    this.counterContainer.style.flexDirection = 'column';
    this.counterContainer.style.gap = '5px';
    this.counterContainer.style.padding = '10px';
    this.counterContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.counterContainer.style.borderRadius = '5px';
    this.counterContainer.style.color = 'white';
    
    // Set initial count
    this.setStrokeCount(0);
  }
  
  /**
   * Set the stroke count
   * @param count Number of strokes
   * @param animate Whether to animate the change
   */
  public setStrokeCount(count: number, animate: boolean = false): void {
    const oldCount = this.strokeCount;
    this.strokeCount = Math.max(0, count);
    
    if (animate && oldCount !== this.strokeCount) {
      this.animateCountChange();
    } else {
      this.updateDisplay();
    }
  }
  
  /**
   * Increment the stroke count
   * @param amount Amount to increment by (default: 1)
   * @param animate Whether to animate the change
   */
  public incrementStrokeCount(amount: number = 1, animate: boolean = true): void {
    if (amount === 0) return;
    
    const oldCount = this.strokeCount;
    this.strokeCount += amount;
    
    if (animate && oldCount !== this.strokeCount) {
      this.animateCountChange();
    } else {
      this.updateDisplay();
    }
  }
  
  /**
   * Reset the stroke count to zero
   * @param animate Whether to animate the change
   */
  public resetStrokeCount(animate: boolean = false): void {
    if (this.strokeCount === 0) return;
    
    this.strokeCount = 0;
    
    if (animate) {
      this.animateCountChange();
    } else {
      this.updateDisplay();
    }
  }
  
  /**
   * Animate a change in the stroke count
   */
  private animateCountChange(): void {
    // Cancel any existing animation
    if (this.animationTimeout !== null) {
      window.clearTimeout(this.animationTimeout);
      this.animationTimeout = null;
    }
    
    // Start animation
    this.isAnimating = true;
    
    // Update display immediately
    this.updateDisplay();
    
    // Add highlight class for animation
    this.countValue.classList.add('highlight-change');
    this.relativeScoreElement.classList.add('highlight-change');
    
    // Remove highlight class after animation completes
    this.animationTimeout = window.setTimeout(() => {
      this.countValue.classList.remove('highlight-change');
      this.relativeScoreElement.classList.remove('highlight-change');
      this.isAnimating = false;
      this.animationTimeout = null;
    }, 700); // Match CSS animation duration
  }
  
  /**
   * Set the par value for the current hole
   * @param par Par value
   */
  public setPar(par: number): void {
    this.par = Math.max(1, par);
    this.parElement.textContent = ` (Par ${this.par})`;
    this.updateDisplay();
  }
  
  /**
   * Get the current stroke count
   * @returns Number of strokes
   */
  public getStrokeCount(): number {
    return this.strokeCount;
  }
  
  /**
   * Get the current score relative to par
   * @returns Score relative to par (negative is under par)
   */
  public getScoreRelativeToPar(): number {
    // Ensure we have valid values before calculating
    if (this.strokeCount === undefined || this.par === undefined || 
        isNaN(this.strokeCount) || isNaN(this.par)) {
      return 0;  // Return 0 (even) if we don't have valid values
    }
    return this.strokeCount - this.par;
  }
  
  /**
   * Get term for the current score (Eagle, Birdie, etc.)
   * @returns The term for the current score
   */
  private getScoreTerm(): string {
    // Check if scoreTermMap is undefined
    if (!this.scoreTermMap) {
      return 'Par'; // Default if map is not defined yet
    }
    
    const relScore = this.getScoreRelativeToPar();
    
    // Check for NaN and provide a default value
    if (isNaN(relScore)) {
      return 'Par'; // Default to "Par" if we have invalid values
    }
    
    const scoreKey = Math.min(Math.max(relScore, -3), 3).toString();
    
    // Check if the key exists in the map
    if (this.scoreTermMap[scoreKey] === undefined) {
      return relScore > 0 ? `+${relScore}` : relScore.toString();
    }
    
    return this.scoreTermMap[scoreKey];
  }
  
  /**
   * Update the display with current values
   */
  private updateDisplay(): void {
    // Update the count value
    this.countValue.textContent = this.strokeCount.toString();
    
    // Update relative score display
    const scoreRelativeToPar = this.getScoreRelativeToPar();
    
    if (scoreRelativeToPar === 0) {
      this.relativeScoreElement.textContent = 'E'; // Even
    } else if (scoreRelativeToPar > 0) {
      this.relativeScoreElement.textContent = `+${scoreRelativeToPar}`;
    } else {
      this.relativeScoreElement.textContent = scoreRelativeToPar.toString();
    }
    
    // Update score term
    this.scoreTermElement.textContent = this.getScoreTerm();
    
    // Update colors based on score relative to par
    if (scoreRelativeToPar < 0) {
      // Under par - green
      this.relativeScoreElement.style.color = '#00ff00';
      this.scoreTermElement.style.color = '#00ff00';
    } else if (scoreRelativeToPar === 0) {
      // At par - white
      this.relativeScoreElement.style.color = '#ffffff';
      this.scoreTermElement.style.color = '#ffffff';
    } else if (scoreRelativeToPar === 1) {
      // Bogey - yellow
      this.relativeScoreElement.style.color = '#ffff00';
      this.scoreTermElement.style.color = '#ffff00';
    } else {
      // Double bogey or worse - red
      this.relativeScoreElement.style.color = '#ff0000';
      this.scoreTermElement.style.color = '#ff0000';
    }
  }
  
  /**
   * Handle shot state changes
   * @param shotState New shot state
   */
  public onShotStateChanged(shotState: ShotState): void {
    // Show for all states during active play
    if (shotState === ShotState.EXECUTING) {
      // Increment count when a shot is executed
      this.incrementStrokeCount(1, true);
    }
    
    // Always show during gameplay
    this.show();
  }
  
  /**
   * Handle game state changes
   * @param gameState New game state
   */
  public onGameStateChanged(gameState: GameState): void {
    switch (gameState) {
      case GameState.IDLE:
        // Reset stroke counter at game start/idle
        this.resetStrokeCount(false);
        this.show();
        break;
        
      case GameState.AIMING:
      case GameState.SHOT_IN_PROGRESS:
      case GameState.BALL_AT_REST:
        // Show during active gameplay
        this.show();
        break;
      
      case GameState.COURSE_COMPLETE:
        // Show final score with animation when course is complete
        this.animateCountChange();
        this.show();
        break;
      
      default:
        // Hide for other states
        this.hide();
        break;
    }
  }
  
  /**
   * Handle UI state changes
   * @param prevState Previous UI state
   * @param newState New UI state
   */
  public onStateChanged(prevState: UIState, newState: UIState): void {
    // Only show in game UI
    if (newState === UIState.IN_GAME) {
      this.show();
    } else if (newState === UIState.GAME_OVER) {
      // Keep visible on game over screen to show final score
      this.show();
    } else {
      this.hide();
    }
  }
  
  /**
   * Clean up resources when no longer needed
   */
  public dispose(): void {
    // Clear any pending animations
    if (this.animationTimeout !== null) {
      window.clearTimeout(this.animationTimeout);
      this.animationTimeout = null;
    }
    
    // Call parent dispose
    super.dispose();
  }
} 