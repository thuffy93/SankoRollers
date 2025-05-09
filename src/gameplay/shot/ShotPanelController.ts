import { GameStateManager, GameState } from '../../utils/GameStateManager';
import { EventSystem, GameEvents } from '../../utils/EventSystem';
import { ShotParameterManager } from './ShotParameterManager';
import { GuideLength } from './ShotTypes';
import { ShotPanelUI } from '../../ui/ShotPanelUI';
import { TrajectorySystem } from '../../rendering/trajectory/TrajectorySystem';

/**
 * ShotPanelController - Handles Phase 2 (Guide Length Selection) of the shot system
 * 
 * Responsible for:
 * - Showing and managing the guide length selection UI
 * - Handling guide length toggling
 * - Coordinating trajectory visualization with the selected guide length
 * - Transitioning to the Power phase (Phase 3)
 */
export class ShotPanelController {
  // Core dependencies
  private gameStateManager: GameStateManager;
  private eventSystem: EventSystem;
  private parameterManager: ShotParameterManager;
  private trajectorySystem: TrajectorySystem;
  
  // UI component
  private shotPanelUI: ShotPanelUI;
  
  /**
   * Constructor
   */
  constructor(
    parameterManager: ShotParameterManager,
    trajectorySystem: TrajectorySystem
  ) {
    this.parameterManager = parameterManager;
    this.trajectorySystem = trajectorySystem;
    this.gameStateManager = GameStateManager.getInstance();
    this.eventSystem = EventSystem.getInstance();
    
    // Initialize UI component
    this.shotPanelUI = new ShotPanelUI();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Handle guide toggle
    this.eventSystem.on(GameEvents.SHOT_GUIDE_TOGGLE, this.handleGuideToggle.bind(this));
    
    // Handle guide confirmation (transition to Phase 3)
    this.eventSystem.on(GameEvents.SHOT_GUIDE_CONFIRM, this.handleGuideConfirm.bind(this));
    
    // Listen for shot parameter changes
    this.eventSystem.on(GameEvents.SHOT_PARAMS_CHANGED, this.updateTrajectoryVisualization.bind(this));
    
    // Game state transitions
    this.gameStateManager.onEnterState(GameState.SHOT_PANEL, () => {
      this.startShotPanel();
    });
    
    this.gameStateManager.onExitState(GameState.SHOT_PANEL, () => {
      this.hideShotPanelUI();
    });
  }
  
  /**
   * Start Shot Panel phase
   */
  private startShotPanel(): void {
    // Show UI
    this.showShotPanelUI();
    
    // Update trajectory visualization
    this.updateTrajectoryVisualization();
    
    console.log(`Started Shot Panel phase with ${this.parameterManager.guideLength} guide`);
  }
  
  /**
   * Handle guide toggle input
   */
  private handleGuideToggle(): void {
    // Only toggle if in the shot panel state
    if (!this.gameStateManager.isState(GameState.SHOT_PANEL)) return;
    
    // Toggle guide length in parameter manager
    this.parameterManager.toggleGuideLength();
    
    // Update UI
    this.shotPanelUI.setGuide(this.parameterManager.guideLength === GuideLength.SHORT ? 'SHORT' : 'LONG');
    
    console.log(`Guide length toggled to: ${this.parameterManager.guideLength}`);
  }
  
  /**
   * Handle guide confirmation to move to Phase 3
   */
  private handleGuideConfirm(): void {
    // Only proceed if in the shot panel state
    if (!this.gameStateManager.isState(GameState.SHOT_PANEL)) return;
    
    // Transition to charging state (Phase 3)
    this.gameStateManager.setState(GameState.CHARGING);
  }
  
  /**
   * Update trajectory visualization based on current guide length
   */
  private updateTrajectoryVisualization(): void {
    // Only update trajectory if we're in the right states
    const currentState = this.gameStateManager.getState();
    if (currentState !== GameState.SHOT_PANEL && 
        currentState !== GameState.CHARGING) {
      return;
    }
    
    // Get guide distance based on current guide length
    const guideDistance = this.parameterManager.currentGuideDistance;
    
    // Apply guide length limits to the trajectory visualization
    // This is now safer with the improved error handling in TrajectorySystem
    this.trajectorySystem.limitTrajectoryLength(guideDistance);
  }
  
  /**
   * Show shot panel UI
   */
  private showShotPanelUI(): void {
    this.shotPanelUI.show();
    
    // Set the current guide length
    this.shotPanelUI.setGuide(this.parameterManager.guideLength === GuideLength.SHORT ? 'SHORT' : 'LONG');
  }
  
  /**
   * Hide shot panel UI
   */
  private hideShotPanelUI(): void {
    this.shotPanelUI.hide();
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    // Dispose UI component
    this.shotPanelUI.dispose();
    
    // Remove event listeners
    this.eventSystem.off(GameEvents.SHOT_GUIDE_TOGGLE, this.handleGuideToggle.bind(this));
    this.eventSystem.off(GameEvents.SHOT_GUIDE_CONFIRM, this.handleGuideConfirm.bind(this));
    this.eventSystem.off(GameEvents.SHOT_PARAMS_CHANGED, this.updateTrajectoryVisualization.bind(this));
  }
} 