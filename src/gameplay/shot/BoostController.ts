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
 * - Managing precise boost timing window (0.033-second Kirby timing)
 */
export class BoostController {
  // Core dependencies
  private gameStateManager: GameStateManager;
  private eventSystem: EventSystem;
  private ballBody: RAPIER.RigidBody;
  
  // Boost parameters
  private boostAvailable: boolean = false;
  
  // Kirby-style precise timing window - 2 frames at 60 FPS (0.033 seconds)
  private readonly KIRBY_BOOST_WINDOW: number = 0.033; // seconds
  private readonly DISPLAY_WINDOW_DURATION: number = 0.300; // How long to show the indicator (300ms)
  
  private boostWindowStartTime: number = 0; // High-precision timestamp
  private boostTimer: number | null = null;
  private boostStrength: number = 2.0;
  
  // UI component
  private boostIndicatorUI: BoostIndicator;
  
  // Debug stats
  private totalBoostOpportunities: number = 0;
  private successfulBoosts: number = 0;
  
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
    
    // Increment tracking counter
    this.totalBoostOpportunities++;
    
    // Store precise timestamp for boost window start
    this.boostWindowStartTime = performance.now();
    
    // Change to boost-ready state
    this.gameStateManager.setState(GameState.BOOST_READY);
    
    // Show boost indicator
    this.showBoostIndicator();
    
    // Set a timer for the boost window UI display
    // NOTE: This is for UI display only, actual boost window is much shorter
    this.startBoostWindow();
    
    console.log(`Boost opportunity detected! Window: ${this.KIRBY_BOOST_WINDOW.toFixed(3)}s`);
  }
  
  /**
   * Handle boost activation
   * Implements Kirby's Dream Course precise timing (0.033-second window)
   */
  private handleBoost(): void {
    // Only in boost-ready state
    if (!this.gameStateManager.isState(GameState.BOOST_READY)) return;
    
    // Calculate time since bounce using high-precision timer
    const currentTime = performance.now();
    const timeSinceBounce = (currentTime - this.boostWindowStartTime) / 1000; // Convert to seconds
    
    console.log(`Boost attempt: ${timeSinceBounce.toFixed(3)}s after bounce`);
    
    // Check if within the Kirby timing window (0.033 seconds)
    if (timeSinceBounce <= this.KIRBY_BOOST_WINDOW) {
      // Apply boost to the ball
      this.applyBoost();
      
      // Track successful boost (within timing window)
      this.successfulBoosts++;
      
      // Display timing feedback
      this.showTimingFeedback(true, timeSinceBounce);
      console.log(`SUCCESS! Perfect boost timing: ${timeSinceBounce.toFixed(3)}s`);
    } else {
      // Failed timing, but still apply a reduced boost
      const latenessFactor = Math.max(0, 1 - (timeSinceBounce / (this.KIRBY_BOOST_WINDOW * 3)));
      
      if (latenessFactor > 0) {
        // Apply reduced boost
        this.applyBoost(latenessFactor);
        console.log(`PARTIAL BOOST: ${(latenessFactor * 100).toFixed(1)}% efficiency (${timeSinceBounce.toFixed(3)}s)`);
      } else {
        console.log(`TOO LATE: No boost applied (${timeSinceBounce.toFixed(3)}s)`);
      }
      
      // Show feedback about timing
      this.showTimingFeedback(false, timeSinceBounce);
    }
  }
  
  /**
   * Show visual feedback about boost timing
   */
  private showTimingFeedback(success: boolean, timeSinceBounce: number): void {
    // Create timing feedback element
    const feedbackElement = document.createElement('div');
    feedbackElement.style.position = 'absolute';
    feedbackElement.style.top = '40%';
    feedbackElement.style.left = '50%';
    feedbackElement.style.transform = 'translate(-50%, -50%)';
    feedbackElement.style.padding = '10px 15px';
    feedbackElement.style.borderRadius = '5px';
    feedbackElement.style.fontWeight = 'bold';
    feedbackElement.style.zIndex = '1001';
    feedbackElement.style.transition = 'opacity 0.5s ease-out';
    
    if (success) {
      feedbackElement.textContent = 'PERFECT TIMING!';
      feedbackElement.style.backgroundColor = 'rgba(0, 255, 0, 0.8)';
      feedbackElement.style.color = 'black';
    } else {
      // Calculate how late the timing was
      const latenessFactor = timeSinceBounce / this.KIRBY_BOOST_WINDOW;
      
      if (latenessFactor < 3) {
        feedbackElement.textContent = 'LATE!';
        feedbackElement.style.backgroundColor = 'rgba(255, 165, 0, 0.8)';
        feedbackElement.style.color = 'black';
      } else {
        feedbackElement.textContent = 'TOO LATE!';
        feedbackElement.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        feedbackElement.style.color = 'white';
      }
    }
    
    document.body.appendChild(feedbackElement);
    
    // Fade out and remove after delay
    setTimeout(() => {
      feedbackElement.style.opacity = '0';
      setTimeout(() => {
        if (feedbackElement.parentNode) {
          feedbackElement.parentNode.removeChild(feedbackElement);
        }
      }, 500);
    }, 1000);
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
    
    // Start a timer for the boost window UI display
    // This is longer than the actual boost window to give players time to see the indicator
    this.boostTimer = window.setTimeout(() => {
      // If boost window expires, return to regular rolling state
      this.boostAvailable = false;
      this.gameStateManager.setState(GameState.ROLLING);
      this.hideBoostIndicator();
      console.log('Boost window UI expired');
    }, this.DISPLAY_WINDOW_DURATION * 1000); // Convert to milliseconds
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
   * @param strengthMultiplier Optional multiplier for boost strength (0-1)
   */
  private applyBoost(strengthMultiplier: number = 1.0): void {
    // Only boost if in boost-ready state and boost is available
    if (!this.gameStateManager.isState(GameState.BOOST_READY) || !this.boostAvailable) {
      return;
    }
    
    // Get current velocity
    const velocity = this.ballBody.linvel();
    
    // Calculate boost direction (same as velocity direction)
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z);
    
    if (speed > 0) {
      // Calculate adjusted boost strength
      const adjustedStrength = this.boostStrength * strengthMultiplier;
      
      // Normalize and scale by boost strength
      const boostForce = {
        x: (velocity.x / speed) * adjustedStrength,
        y: (velocity.y / speed) * adjustedStrength,
        z: (velocity.z / speed) * adjustedStrength
      };
      
      // Apply the boost impulse
      this.ballBody.applyImpulse(boostForce, true);
      
      // Show boost effect with intensity based on strength
      this.showBoostEffect(strengthMultiplier);
      
      console.log(`Boost applied! Strength: ${adjustedStrength.toFixed(2)}`);
      console.log(`Boost stats: ${this.successfulBoosts}/${this.totalBoostOpportunities} perfect boosts`);
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
    // Note: For UI purposes we show a longer window than the actual boost window
    this.boostIndicatorUI.show(null, this.DISPLAY_WINDOW_DURATION);
    
    // Pulse the indicator to draw attention
    this.boostIndicatorUI.pulse();
  }
  
  /**
   * Hide boost indicator
   */
  private hideBoostIndicator(): void {
    this.boostIndicatorUI.hide();
  }
  
  /**
   * Show visual effect when boost is activated
   * @param intensity Intensity of the boost effect (0-1)
   */
  private showBoostEffect(intensity: number = 1.0): void {
    // Create flash element
    const flashElement = document.createElement('div');
    flashElement.style.position = 'fixed';
    flashElement.style.top = '0';
    flashElement.style.left = '0';
    flashElement.style.width = '100%';
    flashElement.style.height = '100%';
    flashElement.style.backgroundColor = `rgba(255, 255, 0, ${0.2 * intensity})`;
    flashElement.style.zIndex = '999';
    flashElement.style.pointerEvents = 'none';
    flashElement.style.transition = 'opacity 0.2s ease-out';
    
    document.body.appendChild(flashElement);
    
    // Calculate flash duration based on boost intensity
    const flashDuration = 50 + (intensity * 150); // 50-200ms
    
    // Remove the flash after a short delay
    setTimeout(() => {
      flashElement.style.opacity = '0';
      setTimeout(() => {
        if (flashElement.parentNode) {
          flashElement.parentNode.removeChild(flashElement);
        }
      }, 200);
    }, flashDuration);
    
    // Play sound (would be implemented in a full version)
    // const volume = 0.5 + (intensity * 0.5); // 0.5-1.0 volume based on intensity
    console.log(`Boost sound effect would play at ${(0.5 + (intensity * 0.5)).toFixed(2)} volume`);
  }
  
  /**
   * Update method called once per frame
   * @param deltaTime Time since last frame in seconds
   */
  public update(deltaTime: number): void {
    // Update boost indicator if active
    if (this.gameStateManager.isState(GameState.BOOST_READY)) {
      this.boostIndicatorUI.update(deltaTime);
      
      // Also check if we're beyond the actual Kirby timing window but still in the UI display window
      const currentTime = performance.now();
      const timeSinceBounce = (currentTime - this.boostWindowStartTime) / 1000;
      
      // If we're beyond the precise timing window but UI is still showing,
      // add visual cue that perfect timing has passed
      if (timeSinceBounce > this.KIRBY_BOOST_WINDOW && this.boostAvailable) {
        this.boostIndicatorUI.setLateStatus();
      }
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