import * as THREE from 'three';
import { GameStateManager, GameState } from '../../utils/GameStateManager';
import { EventSystem, GameEvents } from '../../utils/EventSystem';
import { ShotParameterManager } from './ShotParameterManager';

/**
 * AimingController - Handles Phase 1 (Direction Selection) of the shot system
 * 
 * Responsible for:
 * - Visualizing the aiming direction with an arrow
 * - Handling aiming input
 * - Transitioning to the Shot Panel phase (Phase 2)
 */
export class AimingController {
  private scene: THREE.Scene;
  
  // Core dependencies
  private gameStateManager: GameStateManager;
  private eventSystem: EventSystem;
  private parameterManager: ShotParameterManager;
  
  // Aim arrow visual
  private aimArrow: THREE.ArrowHelper;
  private aimArrowLength: number = 3;
  private aimArrowColor: number = 0xff0000;
  
  // Aiming sensitivity
  private aimSensitivity: number = 0.02;
  
  /**
   * Constructor
   */
  constructor(
    scene: THREE.Scene,
    parameterManager: ShotParameterManager
  ) {
    this.scene = scene;
    this.parameterManager = parameterManager;
    this.gameStateManager = GameStateManager.getInstance();
    this.eventSystem = EventSystem.getInstance();
    
    // Create the aim arrow
    this.aimArrow = this.createAimArrow();
    this.scene.add(this.aimArrow);
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Handle aiming input
    this.eventSystem.on(GameEvents.SHOT_AIM, this.handleAim.bind(this));
    
    // Handle direction confirmation (transition to Phase 2)
    this.eventSystem.on(GameEvents.SHOT_DIRECTION_CONFIRM, this.handleDirectionConfirm.bind(this));
    
    // Listen for shot parameter changes
    this.eventSystem.on(GameEvents.SHOT_PARAMS_CHANGED, this.updateAimArrow.bind(this));
    
    // Game state transitions
    this.gameStateManager.onEnterState(GameState.AIMING, () => {
      this.startAiming();
    });
    
    this.gameStateManager.onExitState(GameState.AIMING, () => {
      // Only hide arrow when not going to next phases
      if (!this.gameStateManager.isState(GameState.SHOT_PANEL) && 
          !this.gameStateManager.isState(GameState.CHARGING)) {
        this.hideAimArrow();
      }
    });
  }
  
  /**
   * Create arrow helper for aiming visualization
   */
  private createAimArrow(): THREE.ArrowHelper {
    const origin = new THREE.Vector3(0, 0.1, 0);
    const direction = new THREE.Vector3(1, 0, 0);
    const arrow = new THREE.ArrowHelper(
      direction.normalize(),
      origin,
      this.aimArrowLength,
      this.aimArrowColor,
      0.5, // Head length
      0.3  // Head width
    );
    
    arrow.visible = false;
    return arrow;
  }
  
  /**
   * Handle aiming input
   */
  private handleAim(direction: number): void {
    // Only process aim inputs in valid states
    // Allow aiming in both AIMING and CHARGING states
    if (!(this.gameStateManager.isState(GameState.AIMING) || 
          this.gameStateManager.isState(GameState.CHARGING))) {
      // We should never try to transition directly from IDLE to AIMING
      // The proper flow is IDLE -> SELECTING_TYPE -> AIMING
      return;
    }
    
    // Update angle in parameter manager
    this.parameterManager.incrementAngle(direction * this.aimSensitivity);
  }
  
  /**
   * Handle direction confirmation to move to Phase 2
   */
  private handleDirectionConfirm(): void {
    // Only proceed if we're in the aiming state
    if (!this.gameStateManager.isState(GameState.AIMING)) return;
    
    // Transition to shot panel phase (Phase 2)
    this.gameStateManager.setState(GameState.SHOT_PANEL);
  }
  
  /**
   * Start aiming mode - show arrow and set up visual elements
   */
  public startAiming(): void {
    // Update arrow appearance
    this.updateAimArrow();
    
    // Make arrow visible
    this.aimArrow.visible = true;
    
    // Emit event to ensure trajectory is updated
    this.eventSystem.emit(GameEvents.SHOT_PARAMS_CHANGED);
    
    console.log('Started aiming mode');
  }
  
  /**
   * Hide the aiming arrow
   */
  public hideAimArrow(): void {
    this.aimArrow.visible = false;
  }
  
  /**
   * Update aim arrow position and rotation based on current parameters
   */
  public updateAimArrow(ballPosition?: THREE.Vector3): void {
    // Update position if provided
    if (ballPosition) {
      const arrowPosition = new THREE.Vector3(
        ballPosition.x, 
        ballPosition.y + 0.1, // Slightly above ball
        ballPosition.z
      );
      
      this.aimArrow.position.copy(arrowPosition);
    }
    
    // Get direction from parameter manager
    const direction = this.parameterManager.getShotDirection();
    
    // Set arrow direction
    this.aimArrow.setDirection(direction);
    
    // Set arrow length based on power
    const length = Math.max(0.5, this.parameterManager.power * this.aimArrowLength);
    this.aimArrow.setLength(length, 0.5, 0.3);
  }
  
  /**
   * Update the arrow position to match ball position
   */
  public updatePosition(ballPosition: THREE.Vector3): void {
    const arrowPosition = new THREE.Vector3(
      ballPosition.x, 
      ballPosition.y + 0.1, // Slightly above ball
      ballPosition.z
    );
    
    this.aimArrow.position.copy(arrowPosition);
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    // Remove aim arrow from scene
    if (this.aimArrow && this.aimArrow.parent) {
      this.aimArrow.parent.remove(this.aimArrow);
    }
    
    // Remove event listeners
    this.eventSystem.off(GameEvents.SHOT_AIM, this.handleAim.bind(this));
    this.eventSystem.off(GameEvents.SHOT_DIRECTION_CONFIRM, this.handleDirectionConfirm.bind(this));
    this.eventSystem.off(GameEvents.SHOT_PARAMS_CHANGED, this.updateAimArrow.bind(this));
  }
  
  /**
   * Public access to arrow visibility
   */
  get isArrowVisible(): boolean {
    return this.aimArrow.visible;
  }
  
  /**
   * Show the aim arrow regardless of state
   */
  public showAimArrow(): void {
    this.aimArrow.visible = true;
  }
} 