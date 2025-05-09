import { GameStateManager, GameState } from '../../utils/GameStateManager';
import { EventSystem, GameEvents } from '../../utils/EventSystem';
import { ShotParameterManager } from './ShotParameterManager';
import { ShotType, SpinType } from './ShotTypes';

/**
 * SpinController - Handles spin selection during Phase 3 (Power and Spin Selection) of the shot system
 * 
 * Responsible for:
 * - Managing spin type selection (LEFT, RIGHT, TOP, BACK, NONE)
 * - Handling spin intensity
 * - Providing spin selection UI and feedback
 * - Coordinating with shot type (different spin options for grounder vs fly shots)
 */
export class SpinController {
  // Core dependencies
  private gameStateManager: GameStateManager;
  private eventSystem: EventSystem;
  private parameterManager: ShotParameterManager;
  
  // UI elements
  private spinPanelElement: HTMLElement | null = null;
  private spinIndicatorElement: HTMLElement | null = null;
  
  // Spin selection properties
  private selectedSpinType: SpinType = SpinType.NONE;
  private spinIntensity: number = 0.5; // Default mid intensity

  /**
   * Constructor
   */
  constructor(parameterManager: ShotParameterManager) {
    this.parameterManager = parameterManager;
    this.gameStateManager = GameStateManager.getInstance();
    this.eventSystem = EventSystem.getInstance();
    
    // Initialize UI elements
    this.createSpinUI();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for spin change events
    this.eventSystem.on(GameEvents.SHOT_SPIN_CHANGE, this.handleSpinChange.bind(this));
    
    // Listen for shot parameter changes
    this.eventSystem.on(GameEvents.SHOT_PARAMS_CHANGED, this.updateSpinUI.bind(this));
    
    // Game state transitions
    this.gameStateManager.onEnterState(GameState.CHARGING, () => {
      this.showSpinUI();
    });
    
    this.gameStateManager.onExitState(GameState.CHARGING, () => {
      this.hideSpinUI();
    });
  }
  
  /**
   * Create spin UI elements
   */
  private createSpinUI(): void {
    // Create the spin panel container if it doesn't exist
    if (!document.getElementById('spin-panel')) {
      this.spinPanelElement = document.createElement('div');
      this.spinPanelElement.id = 'spin-panel';
      this.spinPanelElement.style.position = 'absolute';
      this.spinPanelElement.style.bottom = '60px';
      this.spinPanelElement.style.left = '50%';
      this.spinPanelElement.style.transform = 'translateX(-50%)';
      this.spinPanelElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      this.spinPanelElement.style.borderRadius = '5px';
      this.spinPanelElement.style.padding = '10px';
      this.spinPanelElement.style.display = 'none'; // Hidden by default
      
      // Create spin indicator
      this.spinIndicatorElement = document.createElement('div');
      this.spinIndicatorElement.id = 'spin-indicator';
      this.spinIndicatorElement.style.width = '150px';
      this.spinIndicatorElement.style.height = '40px';
      this.spinIndicatorElement.style.textAlign = 'center';
      this.spinIndicatorElement.style.color = 'white';
      this.spinIndicatorElement.style.display = 'flex';
      this.spinIndicatorElement.style.justifyContent = 'center';
      this.spinIndicatorElement.style.alignItems = 'center';
      this.spinIndicatorElement.style.fontWeight = 'bold';
      this.spinIndicatorElement.style.fontSize = '16px';
      this.spinIndicatorElement.innerText = 'NO SPIN';
      
      this.spinPanelElement.appendChild(this.spinIndicatorElement);
      document.body.appendChild(this.spinPanelElement);
    } else {
      this.spinPanelElement = document.getElementById('spin-panel');
      this.spinIndicatorElement = document.getElementById('spin-indicator');
    }
    
    // Initialize with current values
    this.updateSpinUI();
  }
  
  /**
   * Show the spin UI
   */
  private showSpinUI(): void {
    if (this.spinPanelElement) {
      this.spinPanelElement.style.display = 'block';
    }
    
    // Reset to NO SPIN at the start of the charging phase
    this.setSpinType(SpinType.NONE);
  }
  
  /**
   * Hide the spin UI
   */
  private hideSpinUI(): void {
    if (this.spinPanelElement) {
      this.spinPanelElement.style.display = 'none';
    }
  }
  
  /**
   * Handle spin change event
   */
  private handleSpinChange(data: { type?: SpinType | 'TOGGLE'; intensity?: number }): void {
    // Only process in charging state
    if (!this.gameStateManager.isState(GameState.CHARGING)) return;
    
    if (data.type === 'TOGGLE') {
      // Toggle through spin types
      this.toggleSpinType();
    } else if (data.type) {
      // Check for directional cancellation (opposite directions)
      if (this.isOppositeDirection(data.type)) {
        // If opposite direction is pressed, cancel to neutral
        this.setSpinType(SpinType.NONE);
      } else {
        // Otherwise set the requested spin type
        this.setSpinType(data.type, this.spinIntensity);
      }
    } else if (data.intensity !== undefined) {
      // Adjust spin intensity (positive or negative delta)
      this.adjustSpinIntensity(data.intensity);
    }
  }
  
  /**
   * Check if the new spin type is opposite to the current one
   * Used for directional cancellation
   */
  private isOppositeDirection(newType: SpinType): boolean {
    // Check horizontal opposites: LEFT vs RIGHT
    if (
      (this.selectedSpinType === SpinType.LEFT && newType === SpinType.RIGHT) ||
      (this.selectedSpinType === SpinType.RIGHT && newType === SpinType.LEFT)
    ) {
      return true;
    }
    
    // Check vertical opposites: TOP vs BACK
    if (
      (this.selectedSpinType === SpinType.TOP && newType === SpinType.BACK) ||
      (this.selectedSpinType === SpinType.BACK && newType === SpinType.TOP)
    ) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Set the spin type and intensity
   */
  public setSpinType(type: SpinType, intensity: number = 0.5): void {
    // Validate spin type based on current shot type
    const validatedType = this.validateSpinType(type);
    
    this.selectedSpinType = validatedType;
    this.spinIntensity = Math.max(0, Math.min(1, intensity)); // Clamp between 0-1
    
    // Update parameter manager
    this.parameterManager.setSpinType(this.selectedSpinType, this.spinIntensity);
    
    // Update UI
    this.updateSpinUI();
  }
  
  /**
   * Validate spin type based on current shot type
   * Only certain spin types are valid for each shot type
   */
  private validateSpinType(type: SpinType): SpinType {
    const currentShotType = this.parameterManager.shotType;
    
    // For GROUNDER shots, only LEFT/RIGHT/NONE spins are valid
    if (currentShotType === ShotType.GROUNDER) {
      if (type === SpinType.TOP || type === SpinType.BACK) {
        return SpinType.NONE; // Invalid spin type for grounders
      }
    }
    
    return type;
  }
  
  /**
   * Toggle through available spin types based on current shot type
   */
  public toggleSpinType(): SpinType {
    const currentShotType = this.parameterManager.shotType;
    
    // For GROUNDER shots: NONE -> LEFT -> RIGHT -> NONE
    if (currentShotType === ShotType.GROUNDER) {
      switch (this.selectedSpinType) {
        case SpinType.NONE:
          this.setSpinType(SpinType.LEFT);
          break;
        case SpinType.LEFT:
          this.setSpinType(SpinType.RIGHT);
          break;
        case SpinType.RIGHT:
        default:
          this.setSpinType(SpinType.NONE);
          break;
      }
    }
    // For FLY shots: NONE -> LEFT -> RIGHT -> TOP -> BACK -> NONE
    else if (currentShotType === ShotType.FLY) {
      switch (this.selectedSpinType) {
        case SpinType.NONE:
          this.setSpinType(SpinType.LEFT);
          break;
        case SpinType.LEFT:
          this.setSpinType(SpinType.RIGHT);
          break;
        case SpinType.RIGHT:
          this.setSpinType(SpinType.TOP);
          break;
        case SpinType.TOP:
          this.setSpinType(SpinType.BACK);
          break;
        case SpinType.BACK:
        default:
          this.setSpinType(SpinType.NONE);
          break;
      }
    }
    
    return this.selectedSpinType;
  }
  
  /**
   * Update the spin UI to reflect current settings
   */
  private updateSpinUI(): void {
    if (!this.spinIndicatorElement) return;
    
    // Update text based on spin type
    switch (this.selectedSpinType) {
      case SpinType.LEFT:
        this.spinIndicatorElement.innerText = 'LEFT SPIN';
        this.spinIndicatorElement.style.color = '#3498db'; // Blue
        break;
      case SpinType.RIGHT:
        this.spinIndicatorElement.innerText = 'RIGHT SPIN';
        this.spinIndicatorElement.style.color = '#e74c3c'; // Red
        break;
      case SpinType.TOP:
        this.spinIndicatorElement.innerText = 'TOP SPIN';
        this.spinIndicatorElement.style.color = '#2ecc71'; // Green
        break;
      case SpinType.BACK:
        this.spinIndicatorElement.innerText = 'BACK SPIN';
        this.spinIndicatorElement.style.color = '#f39c12'; // Orange
        break;
      case SpinType.NONE:
      default:
        this.spinIndicatorElement.innerText = 'NO SPIN';
        this.spinIndicatorElement.style.color = 'white';
        break;
    }
    
    // Add intensity indicator for non-NONE spin types
    if (this.selectedSpinType !== SpinType.NONE) {
      const intensityPercent = Math.round(this.spinIntensity * 100);
      this.spinIndicatorElement.innerText += ` (${intensityPercent}%)`;
    }
  }
  
  /**
   * Adjust spin intensity
   */
  public adjustSpinIntensity(delta: number): void {
    // Only adjust if we have an active spin
    if (this.selectedSpinType === SpinType.NONE) return;
    
    // Adjust and clamp intensity
    this.spinIntensity = Math.max(0, Math.min(1, this.spinIntensity + delta));
    
    // Update parameter manager
    this.parameterManager.setSpinType(this.selectedSpinType, this.spinIntensity);
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    // Remove event listeners
    this.eventSystem.off(GameEvents.SHOT_SPIN_CHANGE, this.handleSpinChange.bind(this));
    this.eventSystem.off(GameEvents.SHOT_PARAMS_CHANGED, this.updateSpinUI.bind(this));
    
    // Remove UI elements
    if (this.spinPanelElement && this.spinPanelElement.parentElement) {
      this.spinPanelElement.parentElement.removeChild(this.spinPanelElement);
    }
  }
} 