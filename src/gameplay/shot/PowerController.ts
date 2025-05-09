import { GameStateManager, GameState } from '../../utils/GameStateManager';
import { EventSystem, GameEvents } from '../../utils/EventSystem';
import { ShotParameterManager } from './ShotParameterManager';
import { SpinType } from './ShotTypes';

/**
 * PowerController - Handles Phase 3 (Power and Spin Selection) of the shot system
 * 
 * Responsible for:
 * - Managing the oscillating power meter
 * - Handling power selection
 * - Processing spin type and intensity inputs
 * - Transitioning to the Shot Execution phase (Phase 4)
 */
export class PowerController {
  // Core dependencies
  private gameStateManager: GameStateManager;
  private eventSystem: EventSystem;
  private parameterManager: ShotParameterManager;
  
  // Power oscillation properties
  private powerOscillating: boolean = false;
  private oscillationSpeed: number = 1.2;
  
  // UI elements
  private powerBarElement: HTMLElement | null = null;
  
  /**
   * Constructor
   */
  constructor(parameterManager: ShotParameterManager) {
    this.parameterManager = parameterManager;
    this.gameStateManager = GameStateManager.getInstance();
    this.eventSystem = EventSystem.getInstance();
    
    // Get power bar UI element
    this.powerBarElement = document.getElementById('power-bar');
    
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
      this.startPowerOscillation();
    });
    
    this.gameStateManager.onExitState(GameState.CHARGING, () => {
      this.stopPowerOscillation();
    });
  }
  
  /**
   * Start power oscillation
   */
  private startPowerOscillation(): void {
    // Reset power to start oscillation from 0
    this.parameterManager.setPower(0);
    
    // Start oscillation
    this.powerOscillating = true;
    
    console.log('Power oscillation started');
  }
  
  /**
   * Stop power oscillation
   */
  private stopPowerOscillation(): void {
    this.powerOscillating = false;
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
    
    // Stop power oscillation
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
        
        // Emit event for super shot indication
        this.eventSystem.emit(GameEvents.SUPER_SHOT_READY);
      } else if (powerPercent < 33) {
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
  
  /**
   * Update method called once per frame
   * @param deltaTime Time since last frame in seconds
   */
  public update(deltaTime: number): void {
    // Update power while charging - full oscillation from 0-100%
    if (this.powerOscillating) {
      // Full oscillation between 0-100% using a sine wave
      // Sine wave goes from -1 to 1, so we transform to 0-1 range
      const newPower = (Math.sin(performance.now() / 1000 * this.oscillationSpeed) + 1) / 2;
      this.parameterManager.setPower(newPower);
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
  }
} 