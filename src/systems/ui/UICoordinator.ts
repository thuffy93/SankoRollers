import { UIManager, UIState } from '../UIManager';
import { PowerMeterUI } from './PowerMeterUI';
import { AngleIndicatorUI } from './AngleIndicatorUI';
import { StrokeCounterUI } from './StrokeCounterUI';
import { PowerMeterSystem } from '../PowerMeterSystem';
import { ShotState } from '../ShotSystem';

/**
 * Coordinates the setup and registration of all UI components
 */
export class UICoordinator {
  // UI Manager reference
  private uiManager: UIManager;
  
  // UI Components
  private powerMeter!: PowerMeterUI;
  private angleIndicator!: AngleIndicatorUI;
  private strokeCounter!: StrokeCounterUI;
  
  // Game system references
  private powerMeterSystem: PowerMeterSystem | null = null;
  
  /**
   * Create a new UI Coordinator
   * @param uiManager The UI Manager instance
   */
  constructor(uiManager: UIManager) {
    this.uiManager = uiManager;
    
    // Initialize UI components
    this.setupUIComponents();
    
    // Register for shot state changes
    this.uiManager.addShotStateChangeListener(this.handleShotStateChange.bind(this));
  }
  
  /**
   * Handle shot state changes to coordinate UI components
   * @param prevState Previous shot state 
   * @param newState New shot state
   */
  private handleShotStateChange(prevState: ShotState, newState: ShotState): void {
    // During power selection, update trajectory with power
    if (newState === ShotState.POWER) {
      // Start a periodic update to sync power meter with angle indicator
      this.startPowerTrajectorySync();
    } else if (prevState === ShotState.POWER) {
      // Stop periodic update when leaving power state
      this.stopPowerTrajectorySync();
    }
  }
  
  // Handle for the interval timer
  private powerSyncInterval: number | null = null;
  
  /**
   * Start periodic updates from power meter to angle indicator
   */
  private startPowerTrajectorySync(): void {
    // Clear any existing interval
    this.stopPowerTrajectorySync();
    
    // Update trajectory immediately
    this.syncPowerToTrajectory();
    
    // Set up periodic updates
    this.powerSyncInterval = window.setInterval(() => {
      this.syncPowerToTrajectory();
    }, 50); // Update every 50ms
  }
  
  /**
   * Stop periodic updates
   */
  private stopPowerTrajectorySync(): void {
    if (this.powerSyncInterval !== null) {
      window.clearInterval(this.powerSyncInterval);
      this.powerSyncInterval = null;
    }
  }
  
  /**
   * Sync power value from power meter to angle indicator
   */
  private syncPowerToTrajectory(): void {
    if (this.powerMeter && this.angleIndicator) {
      // Get normalized power (0-1)
      const power = this.powerMeter.getNormalizedPower();
      
      // Update trajectory prediction
      this.angleIndicator.setPower(power);
    }
  }
  
  /**
   * Set up all UI components and register them with the UI Manager
   */
  private setupUIComponents(): void {
    // Get container elements from the UI Manager
    const inGameContainer = this.uiManager.getStateContainer(UIState.IN_GAME);
    const globalContainer = this.uiManager.getGlobalContainer();
    
    if (!inGameContainer || !globalContainer) {
      console.error('Could not get UI containers');
      return;
    }
    
    // Create and register in-game UI components
    this.powerMeter = new PowerMeterUI(inGameContainer, this.powerMeterSystem || undefined);
    this.angleIndicator = new AngleIndicatorUI(inGameContainer);
    this.strokeCounter = new StrokeCounterUI(inGameContainer);
    
    // Register components with the UI Manager
    this.uiManager.registerComponent(UIState.IN_GAME, this.powerMeter);
    this.uiManager.registerComponent(UIState.IN_GAME, this.angleIndicator);
    this.uiManager.registerComponent(UIState.IN_GAME, this.strokeCounter);
    
    // Also register stroke counter for the game over screen
    this.uiManager.registerComponent(UIState.GAME_OVER, this.strokeCounter);
    
    console.log('UI components initialized and registered');
  }
  
  /**
   * Set the PowerMeterSystem for integration with the UI
   * @param powerMeterSystem The PowerMeterSystem instance
   */
  public setPowerMeterSystem(powerMeterSystem: PowerMeterSystem): void {
    this.powerMeterSystem = powerMeterSystem;
    
    // Update the PowerMeterUI component if it exists
    if (this.powerMeter) {
      this.powerMeter.setPowerMeterSystem(powerMeterSystem);
    }
  }
  
  /**
   * Get the power meter component
   * @returns The power meter UI component
   */
  public getPowerMeter(): PowerMeterUI {
    return this.powerMeter;
  }
  
  /**
   * Get the angle indicator component
   * @returns The angle indicator UI component
   */
  public getAngleIndicator(): AngleIndicatorUI {
    return this.angleIndicator;
  }
  
  /**
   * Get the stroke counter component
   * @returns The stroke counter UI component
   */
  public getStrokeCounter(): StrokeCounterUI {
    return this.strokeCounter;
  }
  
  /**
   * Set up MainMenu UI (placeholder for future implementation)
   */
  public setupMainMenu(): void {
    const mainMenuContainer = this.uiManager.getStateContainer(UIState.MAIN_MENU);
    
    if (!mainMenuContainer) {
      console.error('Could not get main menu container');
      return;
    }
    
    // Create main menu HTML structure
    mainMenuContainer.innerHTML = `
      <div class="main-menu ui-panel">
        <h1 class="main-menu-title">Cosmic Rollers</h1>
        <button class="ui-button main-menu-button" id="start-game-btn">Start Game</button>
        <button class="ui-button main-menu-button" id="level-select-btn">Level Select</button>
        <button class="ui-button main-menu-button" id="settings-btn">Settings</button>
      </div>
    `;
    
    // Add event listeners for menu buttons
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
      startGameBtn.addEventListener('click', () => {
        this.uiManager.transitionToState(UIState.IN_GAME);
      });
    }
    
    const levelSelectBtn = document.getElementById('level-select-btn');
    if (levelSelectBtn) {
      levelSelectBtn.addEventListener('click', () => {
        this.uiManager.transitionToState(UIState.LEVEL_SELECT);
      });
    }
    
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.uiManager.transitionToState(UIState.SETTINGS);
      });
    }
  }
  
  /**
   * Set up PauseMenu UI (placeholder for future implementation)
   */
  public setupPauseMenu(): void {
    const pausedContainer = this.uiManager.getStateContainer(UIState.PAUSED);
    
    if (!pausedContainer) {
      console.error('Could not get paused menu container');
      return;
    }
    
    // Create paused menu HTML structure
    pausedContainer.innerHTML = `
      <div class="paused-menu ui-panel">
        <h2 class="paused-title">Game Paused</h2>
        <button class="ui-button" id="resume-btn">Resume</button>
        <button class="ui-button" id="restart-btn">Restart</button>
        <button class="ui-button" id="exit-btn">Exit to Menu</button>
      </div>
    `;
    
    // Add event listeners for menu buttons
    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        this.uiManager.transitionToState(UIState.IN_GAME);
      });
    }
    
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        // Add restart logic here
        this.uiManager.transitionToState(UIState.IN_GAME);
      });
    }
    
    const exitBtn = document.getElementById('exit-btn');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => {
        this.uiManager.transitionToState(UIState.MAIN_MENU);
      });
    }
  }
  
  /**
   * Set up all menu UIs
   */
  public setupAllMenus(): void {
    this.setupMainMenu();
    this.setupPauseMenu();
    // Additional menus can be added here
  }
  
  /**
   * Update angle indicator based on input from AimingSystem
   * @param angleRadians The aiming angle in radians
   */
  public updateAimAngle(angleRadians: number): void {
    this.angleIndicator.setAngleFromRadians(angleRadians);
  }
  
  /**
   * Clean up all UI components
   */
  public dispose(): void {
    // Stop any running intervals
    this.stopPowerTrajectorySync();
    
    // Remove shot state change listener
    this.uiManager.removeShotStateChangeListener(this.handleShotStateChange.bind(this));
    
    // Note: UI components cleanup will be handled by the UIManager
    console.log('UI coordinator disposing');
  }
} 