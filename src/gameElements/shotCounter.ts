import { EventType, eventsManager } from '../utils/events';
import { GameState, gameStateManager } from '../utils/gameState';

/**
 * Shot counter to track number of shots taken
 */
export class ShotCounter {
  private shotCount: number = 0;
  private par: number = 4; // Default par value
  private unsubscribeFunctions: (() => void)[] = [];
  
  constructor(initialPar: number = 4) {
    this.par = initialPar;
    this.setupEventListeners();
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for shot execution
    const unsubShotExecute = eventsManager.subscribe(
      EventType.SHOT_EXECUTE, 
      () => this.incrementShotCount()
    );
    
    // Listen for level completion
    const unsubHoleComplete = eventsManager.subscribe(
      EventType.GOAL_REACHED,
      () => this.handleLevelComplete()
    );
    
    // Add unsubscribe functions for cleanup
    this.unsubscribeFunctions.push(unsubShotExecute, unsubHoleComplete);
  }
  
  /**
   * Increment the shot count
   */
  private incrementShotCount(): void {
    this.shotCount++;
    
    // Publish event with updated count
    eventsManager.publish(EventType.SHOT_COMPLETED, {
      shotCount: this.shotCount,
      par: this.par
    });
    
    console.log(`Shot count: ${this.shotCount}`);
  }
  
  /**
   * Handle level completion
   */
  private handleLevelComplete(): void {
    // Calculate score relative to par
    const relativeToPar = this.shotCount - this.par;
    let scoreText = '';
    
    if (relativeToPar < 0) {
      scoreText = `${Math.abs(relativeToPar)} under par`;
    } else if (relativeToPar === 0) {
      scoreText = 'par';
    } else {
      scoreText = `${relativeToPar} over par`;
    }
    
    // Publish event with final score
    eventsManager.publish(EventType.HOLE_COMPLETE, {
      shotCount: this.shotCount,
      par: this.par,
      relativeToPar,
      scoreText
    });
    
    console.log(`Level complete! Score: ${scoreText} (${this.shotCount} shots)`);
  }
  
  /**
   * Reset the shot counter
   */
  public reset(): void {
    this.shotCount = 0;
    
    // Publish event with reset count
    eventsManager.publish(EventType.SHOT_COMPLETED, {
      shotCount: this.shotCount,
      par: this.par
    });
  }
  
  /**
   * Set par for the current level
   */
  public setPar(par: number): void {
    this.par = par;
  }
  
  /**
   * Get current shot count
   */
  public getShotCount(): number {
    return this.shotCount;
  }
  
  /**
   * Get current par
   */
  public getPar(): number {
    return this.par;
  }
  
  /**
   * Clean up event listeners
   */
  public cleanup(): void {
    this.unsubscribeFunctions.forEach(unsub => unsub());
  }
} 