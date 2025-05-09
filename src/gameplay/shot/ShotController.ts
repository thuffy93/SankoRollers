import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GameStateManager, GameState } from '../../utils/GameStateManager';
import { EventSystem, GameEvents } from '../../utils/EventSystem';
import { TrajectorySystem } from '../../rendering/trajectory/TrajectorySystem';

import { ShotParameterManager, ShotOptions } from './ShotParameterManager';
import { ShotType, SpinType, GuideLength } from './ShotTypes';
import { ShotTypeController } from './ShotTypeController';
import { AimingController } from './AimingController';
import { ShotPanelController } from './ShotPanelController';
import { PowerController } from './PowerController';
import { SpinController } from './SpinController';
import { BoostController } from './BoostController';
import { ShotPhysics } from './ShotPhysics';

/**
 * ShotController - Orchestrates the four-phase shot system
 * 
 * This controller acts as a facade for the entire shot system, delegating to
 * specialized controllers for each phase:
 * 0. Shot Type Selection (ShotTypeController)
 * 1. Direction Selection (AimingController)
 * 2. Shot Panel / Guide Selection (ShotPanelController)
 * 3. Power and Spin (PowerController, SpinController)
 * 4. Shot Execution and Boost (BoostController)
 * 
 * It also manages the shared parameter store and coordinates the overall shot flow.
 */
export class ShotController {
  private scene: THREE.Scene;
  private ballBody: RAPIER.RigidBody;
  private world: RAPIER.World;
  
  // Core dependencies
  private gameStateManager: GameStateManager;
  private eventSystem: EventSystem;
  private trajectorySystem: TrajectorySystem;
  
  // Parameter manager - central store for shot parameters
  private parameterManager: ShotParameterManager;
  
  // Phase-specific controllers
  private shotTypeController: ShotTypeController;
  private aimingController: AimingController;
  private shotPanelController: ShotPanelController;
  private powerController: PowerController;
  private spinController: SpinController;
  private boostController: BoostController;
  
  // Physics handler
  private shotPhysics: ShotPhysics;
  
  /**
   * Constructor
   */
  constructor(
    scene: THREE.Scene, 
    ballBody: RAPIER.RigidBody, 
    world: RAPIER.World
  ) {
    this.scene = scene;
    this.ballBody = ballBody;
    this.world = world;
    this.gameStateManager = GameStateManager.getInstance();
    this.eventSystem = EventSystem.getInstance();
    
    // Initialize trajectory system
    this.trajectorySystem = new TrajectorySystem(scene, world, false);
    
    // Initialize parameter manager
    this.parameterManager = new ShotParameterManager();
    
    // Initialize phase controllers
    this.shotTypeController = new ShotTypeController(this.parameterManager);
    this.aimingController = new AimingController(scene, this.parameterManager);
    this.shotPanelController = new ShotPanelController(this.parameterManager, this.trajectorySystem);
    this.powerController = new PowerController(this.parameterManager);
    this.spinController = new SpinController(this.parameterManager);
    this.boostController = new BoostController(ballBody);
    
    // Initialize physics handler
    this.shotPhysics = new ShotPhysics(ballBody, this.parameterManager);
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for universal shot events
    this.eventSystem.on(GameEvents.SHOT_CANCEL, this.handleShotCancel.bind(this));
    
    // Direction confirmation (Phase 1 -> 2)
    this.eventSystem.on(GameEvents.SHOT_DIRECTION_CONFIRM, this.handleDirectionConfirm.bind(this));
    
    // Guide confirmation (Phase 2 -> 3)
    this.eventSystem.on(GameEvents.SHOT_GUIDE_CONFIRM, this.handleGuideConfirm.bind(this));
    
    // Shot execution (Phase 3 -> 4)
    this.eventSystem.on(GameEvents.SHOT_EXECUTE, this.handleShotExecute.bind(this));
    
    // Listen for parameter changes to update trajectory
    this.eventSystem.on(GameEvents.SHOT_PARAMS_CHANGED, this.updateTrajectoryVisualization.bind(this));
    
    // Listen for ball stopped event from physics
    this.eventSystem.on(GameEvents.BALL_STOPPED, this.handleBallStopped.bind(this));
  }
  
  /**
   * Handle ball stopped event (after rolling)
   */
  private handleBallStopped(): void {
    // Only handle if we're in a rolling state (either regular rolling or boost-ready)
    if (this.gameStateManager.isState(GameState.ROLLING) ||
        this.gameStateManager.isState(GameState.BOOST_READY)) {
      // Ball has stopped, return to IDLE
      this.gameStateManager.setState(GameState.IDLE);
      console.log('Ball stopped, returning to IDLE state');
    }
  }
  
  /**
   * Handle shot cancellation
   */
  private handleShotCancel(): void {
    // Can cancel from any active shot state
    const isInShotPhase = this.gameStateManager.isState(GameState.AIMING) || 
                          this.gameStateManager.isState(GameState.SHOT_PANEL) || 
                          this.gameStateManager.isState(GameState.CHARGING);
    
    if (!isInShotPhase) {
      return;
    }
    
    // Reset shot parameters
    this.parameterManager.resetParameters();
    
    // Hide trajectory
    this.trajectorySystem.hideTrajectory();
    
    // Change state to IDLE
    this.gameStateManager.setState(GameState.IDLE);
    
    console.log('Shot canceled');
  }
  
  /**
   * Handle direction confirmation (Phase 1 -> 2)
   */
  private handleDirectionConfirm(): void {
    // Only handle in AIMING state (Phase 1)
    if (!this.gameStateManager.isState(GameState.AIMING)) {
      console.log("Direction confirm ignored - not in AIMING state");
      return;
    }
    
    console.log("Direction confirmed, moving to guide selection");
    
    // Transition to SHOT_PANEL state (Phase 2)
    this.gameStateManager.setState(GameState.SHOT_PANEL);
  }
  
  /**
   * Handle guide length confirmation (Phase 2 -> 3)
   */
  private handleGuideConfirm(): void {
    // Only handle in SHOT_PANEL state (Phase 2)
    if (!this.gameStateManager.isState(GameState.SHOT_PANEL)) {
      console.log("Guide confirm ignored - not in SHOT_PANEL state");
      return;
    }
    
    console.log("Guide length confirmed, moving to power selection");
    
    // Transition to CHARGING state (Phase 3)
    this.gameStateManager.setState(GameState.CHARGING);
  }
  
  /**
   * Handle shot execution
   */
  private handleShotExecute(): void {
    // Only execute shot in charging state (Phase 3)
    if (!this.gameStateManager.isState(GameState.CHARGING)) {
      console.log("Shot execute ignored - not in CHARGING state");
      return;
    }
    
    console.log("Executing shot with power:", this.parameterManager.power);
    
    // Hide trajectory
    this.trajectorySystem.hideTrajectory();
    
    // Execute the shot physics with error handling
    const success = this.shotPhysics.executeShot();
    
    if (!success) {
      console.error("Failed to execute shot! Not changing game state.");
      return;
    }
    
    // Show super shot effect if applicable
    if (this.parameterManager.isSuperShot) {
      this.showSuperShotEffect();
    }
    
    // IMPORTANT: Apply a small delay before changing game state
    // This ensures physics forces are fully applied before state change
    setTimeout(() => {
      // Change to ROLLING state
      if (this.gameStateManager.isState(GameState.CHARGING)) {
        console.log("Shot physics applied, changing to ROLLING state");
        this.gameStateManager.setState(GameState.ROLLING);
      }
    }, 100); // 100ms delay should be enough for physics to start
  }
  
  /**
   * Update trajectory visualization based on current parameters
   */
  private updateTrajectoryVisualization(): void {
    // Only show trajectory in AIMING, SHOT_PANEL, or CHARGING states
    if (!(this.gameStateManager.isState(GameState.AIMING) || 
          this.gameStateManager.isState(GameState.SHOT_PANEL) ||
          this.gameStateManager.isState(GameState.CHARGING))) {
      this.trajectorySystem.hideTrajectory();
      return;
    }
    
    // Get ball position
    const ballPosition = new THREE.Vector3(
      this.ballBody.translation().x,
      this.ballBody.translation().y,
      this.ballBody.translation().z
    );
    
    // Update aiming arrow position
    this.aimingController.updatePosition(ballPosition);
    
    // Update trajectory visualization
    this.trajectorySystem.predictTrajectory(
      ballPosition,
      this.parameterManager.getShotDirection(),
      this.parameterManager.power,
      this.parameterManager.shotType,
      this.parameterManager.spinType,
      this.parameterManager.spinIntensity
    );
    
    // If in SHOT_PANEL or CHARGING state, limit the trajectory length
    if (this.gameStateManager.isState(GameState.SHOT_PANEL) || 
        this.gameStateManager.isState(GameState.CHARGING)) {
      this.trajectorySystem.limitTrajectoryLength(
        this.parameterManager.currentGuideDistance
      );
    }
  }
  
  /**
   * Show visual effects for super shot
   */
  private showSuperShotEffect(): void {
    console.log('Showing enhanced super shot visual effect');
    
    // Create screen flash effect
    const flashElement = document.createElement('div');
    flashElement.style.position = 'fixed';
    flashElement.style.top = '0';
    flashElement.style.left = '0';
    flashElement.style.width = '100%';
    flashElement.style.height = '100%';
    flashElement.style.backgroundColor = 'rgba(255, 105, 180, 0.3)'; // Hot pink
    flashElement.style.zIndex = '999';
    flashElement.style.pointerEvents = 'none';
    flashElement.style.transition = 'opacity 0.2s ease-out';
    
    document.body.appendChild(flashElement);
    
    // Create star burst effect container
    const burstContainer = document.createElement('div');
    burstContainer.style.position = 'fixed';
    burstContainer.style.top = '50%';
    burstContainer.style.left = '50%';
    burstContainer.style.transform = 'translate(-50%, -50%)';
    burstContainer.style.width = '100%';
    burstContainer.style.height = '100%';
    burstContainer.style.zIndex = '998';
    burstContainer.style.pointerEvents = 'none';
    
    document.body.appendChild(burstContainer);
    
    // Create multiple star elements
    const starCount = 8;
    const stars: HTMLElement[] = [];
    
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      star.style.position = 'absolute';
      star.style.width = '20px';
      star.style.height = '20px';
      star.style.backgroundColor = '#ff69b4';
      star.style.borderRadius = '50%';
      star.style.boxShadow = '0 0 10px #ff69b4, 0 0 20px #ff69b4';
      star.style.top = '50%';
      star.style.left = '50%';
      star.style.transform = 'translate(-50%, -50%)';
      star.style.opacity = '1';
      star.style.transition = 'all 0.5s ease-out';
      
      burstContainer.appendChild(star);
      stars.push(star);
    }
    
    // Apply camera shake effect
    const scene = this.scene;
    const originalPosition = scene.position.clone();
    let shakeTime = 0;
    const shakeDuration = 0.3; // seconds
    const shakeIntensity = 0.1;
    
    // Animation function for camera shake
    const shakeCamera = (time: number) => {
      shakeTime += 1/60; // Assuming 60fps
      
      if (shakeTime < shakeDuration) {
        // Apply random offset to camera
        scene.position.x = originalPosition.x + (Math.random() * 2 - 1) * shakeIntensity;
        scene.position.y = originalPosition.y + (Math.random() * 2 - 1) * shakeIntensity;
        
        // Continue shaking
        requestAnimationFrame(shakeCamera);
      } else {
        // Reset camera position
        scene.position.copy(originalPosition);
      }
    };
    
    // Start camera shake
    requestAnimationFrame(shakeCamera);
    
    // Animate stars outward
    setTimeout(() => {
      stars.forEach((star, index) => {
        const angle = (index / starCount) * Math.PI * 2;
        const distance = 100;
        
        star.style.transform = `translate(
          calc(-50% + ${Math.cos(angle) * distance}px), 
          calc(-50% + ${Math.sin(angle) * distance}px)
        )`;
        star.style.opacity = '0';
      });
    }, 10);
    
    // Remove the flash after a short delay
    setTimeout(() => {
      flashElement.style.opacity = '0';
      setTimeout(() => {
        if (flashElement.parentNode) {
          flashElement.parentNode.removeChild(flashElement);
        }
        if (burstContainer.parentNode) {
          burstContainer.parentNode.removeChild(burstContainer);
        }
      }, 500);
    }, 300);
    
    // Emit the Super Shot event for other systems to respond to
    this.eventSystem.emit(GameEvents.SUPER_SHOT_READY, { executed: true });
  }
  
  /**
   * Update method called once per frame
   */
  public update(deltaTime: number): void {
    // Delegate to appropriate phase controller
    if (this.gameStateManager.isState(GameState.CHARGING)) {
      this.powerController.update(deltaTime);
    } else if (this.gameStateManager.isState(GameState.BOOST_READY)) {
      this.boostController.update(deltaTime);
    }
    
    // Update trajectory if visible
    if (this.trajectorySystem) {
      this.trajectorySystem.update();
    }
    
    // Update ball position for aim arrow if visible
    if (this.aimingController.isArrowVisible) {
      const ballPosition = new THREE.Vector3(
        this.ballBody.translation().x,
        this.ballBody.translation().y,
        this.ballBody.translation().z
      );
      
      this.aimingController.updatePosition(ballPosition);
    }
  }
  
  /**
   * Start a new shot sequence
   */
  public startShot(): boolean {
    // Only allow starting a shot from IDLE state
    // This prevents trying to start a shot from an invalid state
    const currentState = this.gameStateManager.getState();
    if (currentState !== GameState.IDLE) {
      console.log(`Cannot start shot from state ${currentState}, must be in IDLE state`);
      return false;
    }
    
    // Initialize ball position and shot parameters
    const ballPosition = new THREE.Vector3(
      this.ballBody.translation().x,
      this.ballBody.translation().y,
      this.ballBody.translation().z
    );
    
    // Pre-generate an initial trajectory to ensure it's ready for later phases
    this.trajectorySystem.predictTrajectory(
      ballPosition,
      this.parameterManager.getShotDirection(),
      this.parameterManager.power,
      this.parameterManager.shotType,
      this.parameterManager.spinType,
      this.parameterManager.spinIntensity
    );
    
    // Begin the shot sequence at the shot type selection phase
    const success = this.gameStateManager.setState(GameState.SELECTING_TYPE);
    if (success) {
      console.log('Starting new shot sequence with shot type selection');
    }
    return success;
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    // Dispose of all controllers
    this.shotTypeController.dispose();
    this.aimingController.dispose();
    this.shotPanelController.dispose();
    this.powerController.dispose();
    this.spinController.dispose();
    this.boostController.dispose();
    
    // Dispose of trajectory system
    this.trajectorySystem.dispose();
    
    // Remove event listeners
    this.eventSystem.off(GameEvents.SHOT_CANCEL, this.handleShotCancel.bind(this));
    this.eventSystem.off(GameEvents.SHOT_DIRECTION_CONFIRM, this.handleDirectionConfirm.bind(this));
    this.eventSystem.off(GameEvents.SHOT_GUIDE_CONFIRM, this.handleGuideConfirm.bind(this));
    this.eventSystem.off(GameEvents.SHOT_EXECUTE, this.handleShotExecute.bind(this));
    this.eventSystem.off(GameEvents.SHOT_PARAMS_CHANGED, this.updateTrajectoryVisualization.bind(this));
    this.eventSystem.off(GameEvents.BALL_STOPPED, this.handleBallStopped.bind(this));
  }
} 