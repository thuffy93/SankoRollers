import { GameStateManager, GameState } from '../../utils/GameStateManager';
import { EventSystem, GameEvents } from '../../utils/EventSystem';
import { ShotParameterManager } from './ShotParameterManager';
import { SpinType, ShotType } from './ShotTypes';

/**
 * PowerController - Handles Phase 3 (Power and Spin Selection) of the shot system
 * 
 * Responsible for:
 * - Managing the non-looping power meter (Kirby style)
 * - Handling power selection
 * - Processing spin type and intensity inputs
 * - Transitioning to the Shot Execution phase (Phase 4)
 */
export class PowerController {
  // Core dependencies
  private gameStateManager: GameStateManager;
  private eventSystem: EventSystem;
  private parameterManager: ShotParameterManager;
  
  // Power meter properties
  private powerOscillating: boolean = false;
  private powerIncreasing: boolean = true; // Direction of power meter (increasing or decreasing)
  
  // Kirby-style timing constants
  private readonly POWER_FILL_DURATION: number = 2.0; // Exactly 2 seconds to fill from 0-100%
  private readonly powerChangeSpeed: number = 0.5; // Base speed (0-1 in 2 seconds)
  private readonly minSpeed: number = 0.45; // Minimum speed
  private readonly maxSpeed: number = 0.55; // Maximum speed
  private initializationTime: number = 0; // Time when power meter started
  
  // Super shot properties
  private superShotPulse: number = 0; // For pulsing effect on super shot
  private superShotReady: boolean = false; // Flag for when power is at 100%
  
  // UI elements
  private powerBarElement: HTMLElement | null = null;
  private superShotIndicatorElement: HTMLElement | null = null;
  
  /**
   * Constructor
   */
  constructor(parameterManager: ShotParameterManager) {
    this.parameterManager = parameterManager;
    this.gameStateManager = GameStateManager.getInstance();
    this.eventSystem = EventSystem.getInstance();
    
    // Get power bar UI element
    this.powerBarElement = document.getElementById('power-bar');
    
    // Create super shot indicator if it doesn't exist
    this.createSuperShotIndicator();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Handle power change
    this.eventSystem.on(GameEvents.SHOT_POWER_CHANGE, this.handlePowerChange.bind(this));
    
    // Handle spin change
    this.eventSystem.on(GameEvents.SHOT_SPIN_CHANGE, this.handleSpinChange.bind(this));
    
    // Handle shot execution
    this.eventSystem.on(GameEvents.SHOT_EXECUTE, this.handleShotExecute.bind(this));
    
    // Listen for shot parameter changes
    this.eventSystem.on(GameEvents.SHOT_PARAMS_CHANGED, this.updatePowerUI.bind(this));
    
    // Game state transitions
    this.gameStateManager.onEnterState(GameState.CHARGING, () => {
      this.startPowerMeter();
    });
    
    this.gameStateManager.onExitState(GameState.CHARGING, () => {
      this.stopPowerMeter();
    });
  }
  
  /**
   * Create super shot indicator UI element
   */
  private createSuperShotIndicator(): void {
    if (!document.getElementById('super-shot-indicator')) {
      this.superShotIndicatorElement = document.createElement('div');
      this.superShotIndicatorElement.id = 'super-shot-indicator';
      this.superShotIndicatorElement.style.position = 'absolute';
      this.superShotIndicatorElement.style.top = '30%';
      this.superShotIndicatorElement.style.left = '50%';
      this.superShotIndicatorElement.style.transform = 'translate(-50%, -50%)';
      this.superShotIndicatorElement.style.color = '#ff69b4';
      this.superShotIndicatorElement.style.fontWeight = 'bold';
      this.superShotIndicatorElement.style.fontSize = '24px';
      this.superShotIndicatorElement.style.textShadow = '0 0 10px #ff69b4, 0 0 20px #ff69b4';
      this.superShotIndicatorElement.style.display = 'none';
      this.superShotIndicatorElement.innerText = 'SUPER SHOT READY!';
      
      document.body.appendChild(this.superShotIndicatorElement);
    } else {
      this.superShotIndicatorElement = document.getElementById('super-shot-indicator');
    }
  }
  
  /**
   * Start power meter (non-looping, Kirby style)
   * Uses precise timing based on Kirby's Dream Course
   */
  private startPowerMeter(): void {
    // Reset power to 0
    this.parameterManager.setPower(0);
    
    // Start at increasing direction
    this.powerIncreasing = true;
    
    // Reset super shot flag
    this.superShotReady = false;
    
    // Start power meter with high-precision timing
    this.powerOscillating = true;
    this.initializationTime = performance.now();
    
    // Hide super shot indicator
    if (this.superShotIndicatorElement) {
      this.superShotIndicatorElement.style.display = 'none';
    }
    
    console.log('Power meter started (non-looping, 2-second Kirby timing)');
  }
  
  /**
   * Stop power meter
   */
  private stopPowerMeter(): void {
    this.powerOscillating = false;
    
    // Hide super shot indicator when power meter stops
    if (this.superShotIndicatorElement) {
      this.superShotIndicatorElement.style.display = 'none';
    }
  }
  
  /**
   * Handle power change input
   */
  private handlePowerChange(value: number): void {
    // Only handle power in aiming state
    if (!this.gameStateManager.isState(GameState.AIMING)) {
      return;
    }
    
    if (value === 0) {
      // Start charging
      this.gameStateManager.setState(GameState.CHARGING);
    } else {
      // Increment power directly
      const newPower = Math.min(1, this.parameterManager.power + value);
      this.parameterManager.setPower(newPower);
    }
  }
  
  /**
   * Handle spin type and intensity change
   */
  private handleSpinChange(data: { type: SpinType; intensity: number }): void {
    // Only in charging state
    if (!this.gameStateManager.isState(GameState.CHARGING)) return;
    
    // Set spin type and intensity
    this.parameterManager.setSpinType(data.type, data.intensity);
  }
  
  /**
   * Handle shot execution to move to Phase 4
   */
  private handleShotExecute(): void {
    // Only execute shot in charging state (Phase 3)
    if (!this.gameStateManager.isState(GameState.CHARGING)) {
      return;
    }
    
    // Stop power meter
    this.powerOscillating = false;
    
    // NOTE: We intentionally do NOT change the game state here.
    // The ShotController will handle the state change after physics are applied
    // to avoid race conditions between the controllers.
  }
  
  /**
   * Update power UI element
   */
  private updatePowerUI(): void {
    if (this.powerBarElement) {
      const powerPercent = this.parameterManager.power * 100;
      this.powerBarElement.style.width = `${powerPercent}%`;
      
      // Change color based on power
      if (powerPercent >= 95) {
        // Nearly full power - turn pink like in Kirby's Dream Course for "super shot"
        this.powerBarElement.style.backgroundColor = '#ff69b4'; // Hot pink
        this.powerBarElement.style.boxShadow = '0 0 8px #ff69b4'; // Add glow effect
        
        // Show super shot indicator
        if (this.superShotIndicatorElement && !this.superShotReady) {
          this.superShotReady = true;
          this.superShotIndicatorElement.style.display = 'block';
          
          // Emit event for super shot indication
          this.eventSystem.emit(GameEvents.SUPER_SHOT_READY);
          
          // Play a sound effect (can be implemented later)
          console.log('SUPER SHOT READY!');
        }
      } else {
        // Hide super shot indicator if power drops below threshold
        if (this.superShotIndicatorElement && this.superShotReady) {
          this.superShotReady = false;
          this.superShotIndicatorElement.style.display = 'none';
        }
        
        if (powerPercent < 33) {
          this.powerBarElement.style.backgroundColor = '#00aa00'; // Green
          this.powerBarElement.style.boxShadow = 'none';
        } else if (powerPercent < 66) {
          this.powerBarElement.style.backgroundColor = '#aaaa00'; // Yellow
          this.powerBarElement.style.boxShadow = 'none';
        } else {
          this.powerBarElement.style.backgroundColor = '#aa0000'; // Red
          this.powerBarElement.style.boxShadow = 'none';
        }
      }
    }
  }
  
  /**
   * Update super shot indicator animation
   */
  private updateSuperShotIndicator(deltaTime: number): void {
    if (this.superShotIndicatorElement && this.superShotReady) {
      // Create pulsing effect
      this.superShotPulse += deltaTime * 5;
      const scale = 1 + 0.1 * Math.sin(this.superShotPulse);
      
      this.superShotIndicatorElement.style.transform = `translate(-50%, -50%) scale(${scale})`;
      
      // Adjust opacity for flashing effect
      const opacity = 0.7 + 0.3 * Math.sin(this.superShotPulse * 2);
      this.superShotIndicatorElement.style.opacity = opacity.toString();
    }
  }
  
  /**
   * Get power speed based on shot type with consistent timing
   * Different shot types have different power increase speeds,
   * but total fill time is always 2 seconds (Kirby timing)
   */
  private getPowerSpeed(): number {
    // Base speed variation based on shot type
    const speedModifier = this.parameterManager.shotType === ShotType.GROUNDER ? 1.0 : 0.85;
    
    // Return adjusted speed, normalized to ensure 2-second fill time
    return this.powerChangeSpeed * speedModifier;
  }
  
  /**
   * Update method called once per frame
   * Uses frame-rate-independent logic based on actual time passed
   * @param deltaTime Time since last frame in seconds
   */
  public update(deltaTime: number): void {
    // Update power meter (non-looping, Kirby style)
    if (this.powerOscillating) {
      // Frame-rate independent power calculation
      const elapsedTime = (performance.now() - this.initializationTime) / 1000; // seconds
      let currentPower = 0;
      
      // Calculate power based on elapsed time, ensuring exactly 2 seconds for 0-100%
      if (elapsedTime <= this.POWER_FILL_DURATION) {
        // Increasing phase (0-2 seconds)
        currentPower = elapsedTime / this.POWER_FILL_DURATION;
        this.powerIncreasing = true;
      } else if (elapsedTime <= this.POWER_FILL_DURATION * 2) {
        // Decreasing phase (2-4 seconds)
        currentPower = 2 - (elapsedTime / this.POWER_FILL_DURATION);
        this.powerIncreasing = false;
      } else {
        // Reset cycle
        this.initializationTime = performance.now();
        currentPower = 0;
        this.powerIncreasing = true;
      }
      
      // Ensure power stays within 0-1 range
      currentPower = Math.max(0, Math.min(1, currentPower));
      
      // Update parameter manager
      this.parameterManager.setPower(currentPower);
      
      // Update super shot indicator animation
      this.updateSuperShotIndicator(deltaTime);
    }
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    // Remove event listeners
    this.eventSystem.off(GameEvents.SHOT_POWER_CHANGE, this.handlePowerChange.bind(this));
    this.eventSystem.off(GameEvents.SHOT_SPIN_CHANGE, this.handleSpinChange.bind(this));
    this.eventSystem.off(GameEvents.SHOT_EXECUTE, this.handleShotExecute.bind(this));
    this.eventSystem.off(GameEvents.SHOT_PARAMS_CHANGED, this.updatePowerUI.bind(this));
    
    // Remove super shot indicator
    if (this.superShotIndicatorElement && this.superShotIndicatorElement.parentNode) {
      this.superShotIndicatorElement.parentNode.removeChild(this.superShotIndicatorElement);
    }
  }
} 