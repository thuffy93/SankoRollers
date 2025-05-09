import { GameStateManager, GameState } from '../../utils/GameStateManager';
import { EventSystem, GameEvents } from '../../utils/EventSystem';
import { ShotParameterManager } from './ShotParameterManager';
import { ShotType } from './ShotTypes';
import { ShotTypeUI } from '../../ui/ShotTypeUI';

/**
 * ShotTypeController - Handles Phase 0 (Shot Type Selection) of the shot system
 * 
 * Responsible for:
 * - Showing and managing the shot type selection UI
 * - Handling shot type toggling
 * - Transitioning to the Aiming phase (Phase 1)
 */
export class ShotTypeController {
  // Core dependencies
  private gameStateManager: GameStateManager;
  private eventSystem: EventSystem;
  private parameterManager: ShotParameterManager;
  
  // UI component
  private shotTypeUI: ShotTypeUI;
  
  /**
   * Constructor
   */
  constructor(parameterManager: ShotParameterManager) {
    this.parameterManager = parameterManager;
    this.gameStateManager = GameStateManager.getInstance();
    this.eventSystem = EventSystem.getInstance();
    
    // Initialize UI component
    this.shotTypeUI = new ShotTypeUI();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Handle shot type toggle
    this.eventSystem.on(GameEvents.SHOT_TYPE_TOGGLE, this.handleShotTypeToggle.bind(this));
    
    // Listen for shot type confirmation (transition to Phase 1)
    // This is a new event we need to add to GameEvents
    this.eventSystem.on('shot:type_confirm', this.handleShotTypeConfirm.bind(this));
    
    // Game state transitions
    this.gameStateManager.onEnterState(GameState.SELECTING_TYPE, () => {
      this.startShotTypeSelection();
    });
    
    this.gameStateManager.onExitState(GameState.SELECTING_TYPE, () => {
      this.hideShotTypeUI();
    });
  }
  
  /**
   * Start the shot type selection phase
   */
  private startShotTypeSelection(): void {
    console.log('Starting shot type selection');
    
    // Show the shot type UI
    this.showShotTypeUI();
    
    // Set default shot type (or use the previously selected type)
    // We're retrieving from parameter manager to maintain state between shots
    this.shotTypeUI.setType(this.parameterManager.shotType);
  }
  
  /**
   * Handle shot type toggle input
   */
  private handleShotTypeToggle(): void {
    // Only toggle if in the shot type selection state
    if (!this.gameStateManager.isState(GameState.SELECTING_TYPE)) return;
    
    // Toggle shot type in UI
    const newType = this.shotTypeUI.toggleType();
    
    // Update parameter manager
    this.parameterManager.setShotType(newType);
    
    console.log(`Shot type toggled to: ${newType}`);
  }
  
  /**
   * Handle shot type confirmation to move to Phase 1
   */
  private handleShotTypeConfirm(): void {
    // Only proceed if in the selecting type state
    if (!this.gameStateManager.isState(GameState.SELECTING_TYPE)) {
      console.log(`Shot type confirm ignored - not in SELECTING_TYPE state (current: ${this.gameStateManager.getState()})`);
      return;
    }
    
    // Get the final shot type from the UI
    const selectedType = this.shotTypeUI.getType();
    
    // Make sure the parameter manager has the correct type
    this.parameterManager.setShotType(selectedType);
    
    // Log confirmation
    console.log(`Shot type confirmed: ${selectedType}, moving to aiming phase`);
    
    // Transition to aiming state (Phase 1)
    this.gameStateManager.setState(GameState.AIMING);
  }
  
  /**
   * Show shot type UI
   */
  private showShotTypeUI(): void {
    this.shotTypeUI.show();
  }
  
  /**
   * Hide shot type UI
   */
  private hideShotTypeUI(): void {
    this.shotTypeUI.hide();
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    // Clean up UI
    this.shotTypeUI.dispose();
    
    // Remove event listeners
    this.eventSystem.off(GameEvents.SHOT_TYPE_TOGGLE, this.handleShotTypeToggle.bind(this));
    this.eventSystem.off(GameEvents.SHOT_TYPE_CONFIRM, this.handleShotTypeConfirm.bind(this));
    
    // We cannot directly remove state listeners in the current implementation
    // For a production app, we would need to enhance GameStateManager to support this
    // For now, the GameStateManager will handle these properly during instance cleanup
  }
} 