import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GameStateManager, GameState } from '../../utils/GameStateManager';
import { EventSystem, GameEvents } from '../../utils/EventSystem';
import { BoostIndicator } from '../../ui/BoostIndicator';

/**
 * BoostController - Handles Phase 4 (Shot Execution and Boost) of the shot system
 * 
 * Responsible for:
 * - Detecting bounce events for boost opportunities
 * - Showing boost indicator UI
 * - Applying boost forces when activated
 * - Managing boost timing window
 */
export class BoostController {
  // Core dependencies
  private gameStateManager: GameStateManager;
  private eventSystem: EventSystem;
  private ballBody: RAPIER.RigidBody;
  
  // Boost parameters
  private boostAvailable: boolean = false;
  private boostWindowDuration: number = 300; // ms
  private boostTimer: number | null = null;
  private boostStrength: number = 2.0;
  
  // UI component
  private boostIndicatorUI: BoostIndicator;
  
  /**
   * Constructor
   */
  constructor(ballBody: RAPIER.RigidBody) {
    this.ballBody = ballBody;
    this.gameStateManager = GameStateManager.getInstance();
    this.eventSystem = EventSystem.getInstance();
    
    // Initialize boost indicator UI
    this.boostIndicatorUI = new BoostIndicator();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for boost activation
    this.eventSystem.on(GameEvents.SHOT_BOOST, this.handleBoost.bind(this));
    
    // Listen for ball bounce events
    this.eventSystem.on(GameEvents.BALL_BOUNCE, this.onBallBounce.bind(this));
    
    // Game state transitions
    this.gameStateManager.onEnterState(GameState.ROLLING, () => {
      // Reset boost state when entering rolling state
      this.clearBoostWindow();
      this.boostAvailable = false;
    });
    
    this.gameStateManager.onExitState(GameState.BOOST_READY, () => {
      // Hide boost indicator when leaving boost-ready state
      this.hideBoostIndicator();
    });
  }
  
  /**
   * Handle ball bounce event
   * Called when the ball collides with a surface
   */
  private onBallBounce(collisionData: any): void {
    // Only allow boost in ROLLING state
    if (!this.gameStateManager.isState(GameState.ROLLING)) return;
    
    // Make sure the ball has some velocity (not just sitting on a surface)
    const velocity = this.ballBody.linvel();
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z);
    
    if (speed < 0.5) return; // Too slow for a meaningful boost
    
    // Change to boost-ready state
    this.gameStateManager.setState(GameState.BOOST_READY);
    
    // Show boost indicator
    this.showBoostIndicator();
    
    // Set a timer for the boost window
    this.startBoostWindow();
    
    console.log('Boost opportunity detected!');
  }
  
  /**
   * Handle boost activation
   */
  private handleBoost(): void {
    // Only in boost-ready state
    if (!this.gameStateManager.isState(GameState.BOOST_READY)) return;
    
    // Apply boost to the ball
    this.applyBoost();
  }
  
  /**
   * Start the boost opportunity window
   * Player must activate boost within this window
   */
  private startBoostWindow(): void {
    // Clear any existing timer
    this.clearBoostWindow();
    
    // Set the ball state to allow boosting
    this.boostAvailable = true;
    
    // Start a timer for the boost window
    this.boostTimer = window.setTimeout(() => {
      // If boost window expires, return to regular rolling state
      this.boostAvailable = false;
      this.gameStateManager.setState(GameState.ROLLING);
      this.hideBoostIndicator();
      console.log('Boost window expired');
    }, this.boostWindowDuration);
  }
  
  /**
   * Clear the boost window timer
   */
  private clearBoostWindow(): void {
    if (this.boostTimer !== null) {
      clearTimeout(this.boostTimer);
      this.boostTimer = null;
    }
  }
  
  /**
   * Apply boost to the ball
   */
  private applyBoost(): void {
    // Only boost if in boost-ready state and boost is available
    if (!this.gameStateManager.isState(GameState.BOOST_READY) || !this.boostAvailable) {
      return;
    }
    
    // Get current velocity
    const velocity = this.ballBody.linvel();
    
    // Calculate boost direction (same as velocity direction)
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z);
    
    if (speed > 0) {
      // Normalize and scale by boost strength
      const boostForce = {
        x: (velocity.x / speed) * this.boostStrength,
        y: (velocity.y / speed) * this.boostStrength,
        z: (velocity.z / speed) * this.boostStrength
      };
      
      // Apply the boost impulse
      this.ballBody.applyImpulse(boostForce, true);
      
      // Show boost effect
      this.showBoostEffect();
      
      console.log('Boost applied!');
    }
    
    // Clear boost state
    this.boostAvailable = false;
    this.clearBoostWindow();
    
    // Return to rolling state
    this.gameStateManager.setState(GameState.ROLLING);
  }
  
  /**
   * Show boost indicator UI
   */
  private showBoostIndicator(): void {
    // Use the BoostIndicator component
    this.boostIndicatorUI.show(null, this.boostWindowDuration / 1000);
  }
  
  /**
   * Hide boost indicator
   */
  private hideBoostIndicator(): void {
    this.boostIndicatorUI.hide();
  }
  
  /**
   * Show visual effect when boost is activated
   */
  private showBoostEffect(): void {
    // In a full implementation, this would create particle effects or other visual feedback
    console.log('Showing boost visual effect');
    
    // Example: Flash the screen briefly
    const flashElement = document.createElement('div');
    flashElement.style.position = 'fixed';
    flashElement.style.top = '0';
    flashElement.style.left = '0';
    flashElement.style.width = '100%';
    flashElement.style.height = '100%';
    flashElement.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
    flashElement.style.zIndex = '999';
    flashElement.style.pointerEvents = 'none';
    
    document.body.appendChild(flashElement);
    
    // Remove the flash after a short delay
    setTimeout(() => {
      if (flashElement.parentNode) {
        flashElement.parentNode.removeChild(flashElement);
      }
    }, 100);
  }
  
  /**
   * Update method called once per frame
   * @param deltaTime Time since last frame in seconds
   */
  public update(deltaTime: number): void {
    // Update boost indicator if active
    if (this.gameStateManager.isState(GameState.BOOST_READY)) {
      this.boostIndicatorUI.update(deltaTime);
    }
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    // Dispose UI component
    this.boostIndicatorUI.dispose();
    
    // Clear any active timer
    this.clearBoostWindow();
    
    // Remove event listeners
    this.eventSystem.off(GameEvents.SHOT_BOOST, this.handleBoost.bind(this));
    this.eventSystem.off(GameEvents.BALL_BOUNCE, this.onBallBounce.bind(this));
  }
} 