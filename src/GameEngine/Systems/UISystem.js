import * as THREE from 'three';
import System from '../ECS/System';

/**
 * UISystem - Handles in-game UI elements
 */
class UISystem extends System {
  /**
   * Create a new UI system
   * @param {World} world - Reference to the world
   */
  constructor(world) {
    super(world);
    this.requiredComponents = [];
    this.priority = 1; // Run last, after all other systems
    
    // UI state
    this.uiState = {
      shotPanel: {
        visible: false,
        guideType: 'short'
      },
      powerMeter: {
        visible: false,
        value: 0
      },
      energyTomatoes: {
        count: 4,
        maxCount: 4
      },
      powerUpIndicator: {
        visible: false,
        type: null,
        timeRemaining: 0,
        showTime: 0
      },
      holeCompleted: {
        visible: false,
        strokes: 0,
        par: 3
      },
      gameCompleted: {
        visible: false,
        totalStrokes: 0,
        totalHoles: 9
      },
      courseInfo: {
        currentHole: 1,
        totalHoles: 9,
        totalStrokes: 0,
        holeStrokes: 0,
        dailyModifier: null
      },
      shotState: 'idle',
      instructions: ''
    };
    
    // UI event listeners
    this.uiEventListeners = new Map();
    
    // DOM elements for UI
    this.uiElements = {
      container: null,
      shotPanel: null,
      powerMeter: null,
      energyTomatoes: null,
      powerUpIndicator: null,
      holeCompletedOverlay: null,
      gameCompletedModal: null,
      courseInfoHeader: null,
      shotStateIndicator: null
    };
    
    // Update flags for UI elements
    this.needsUpdate = {
      shotPanel: true,
      powerMeter: true,
      energyTomatoes: true,
      powerUpIndicator: true,
      holeCompletedOverlay: true,
      gameCompletedModal: true,
      courseInfoHeader: true,
      shotStateIndicator: true
    };
  }
  
  /**
   * Initialize the UI system
   */
  init() {
    // Create UI container
    this.createUIContainer();
    
    // Create UI elements
    this.createUIElements();
    
    // Listen for game events
    this.setupEventListeners();
  }
  
  /**
   * Create UI container element
   */
  createUIContainer() {
    // Check if container already exists
    if (this.uiElements.container) return;
    
    // Create container
    const container = document.createElement('div');
    container.className = 'game-ui';
    document.body.appendChild(container);
    
    this.uiElements.container = container;
  }
  
  /**
   * Create UI elements
   */
  createUIElements() {
    if (!this.uiElements.container) return;
    
    // Course info header
    this.uiElements.courseInfoHeader = this.createCourseInfoHeader();
    this.uiElements.container.appendChild(this.uiElements.courseInfoHeader);
    
    // Energy tomatoes
    this.uiElements.energyTomatoes = this.createEnergyTomatoes();
    this.uiElements.container.appendChild(this.uiElements.energyTomatoes);
    
    // Power-up indicator
    this.uiElements.powerUpIndicator = this.createPowerUpIndicator();
    this.uiElements.container.appendChild(this.uiElements.powerUpIndicator);
    
    // Shot panel
    this.uiElements.shotPanel = this.createShotPanel();
    this.uiElements.container.appendChild(this.uiElements.shotPanel);
    
    // Power meter
    this.uiElements.powerMeter = this.createPowerMeter();
    this.uiElements.container.appendChild(this.uiElements.powerMeter);
    
    // Shot state indicator
    this.uiElements.shotStateIndicator = this.createShotStateIndicator();
    this.uiElements.container.appendChild(this.uiElements.shotStateIndicator);
    
    // Hole completed overlay
    this.uiElements.holeCompletedOverlay = this.createHoleCompletedOverlay();
    this.uiElements.container.appendChild(this.uiElements.holeCompletedOverlay);
    
    // Game completed modal
    this.uiElements.gameCompletedModal = this.createGameCompletedModal();
    this.uiElements.container.appendChild(this.uiElements.gameCompletedModal);
    
    // Visual style toggle
    this.uiElements.visualStyleToggle = this.createVisualStyleToggle();
    this.uiElements.container.appendChild(this.uiElements.visualStyleToggle);
    
    // Update all UI elements
    this.updateAllUI();
  }
  
  /**
   * Create course info header
   * @returns {HTMLElement} Course info header element
   */
  createCourseInfoHeader() {
    const header = document.createElement('div');
    header.className = 'game-header';
    
    const holeInfo = document.createElement('div');
    holeInfo.className = 'hole-info';
    holeInfo.innerHTML = `<span>Hole ${this.uiState.courseInfo.currentHole} / ${this.uiState.courseInfo.totalHoles}</span>`;
    
    const strokeCounter = document.createElement('div');
    strokeCounter.className = 'stroke-counter';
    strokeCounter.innerHTML = `<span>Strokes: ${this.uiState.courseInfo.holeStrokes}</span>
                              <span>Total: ${this.uiState.courseInfo.totalStrokes}</span>`;
    
    const dailyModifier = document.createElement('div');
    dailyModifier.className = 'daily-modifier';
    dailyModifier.innerHTML = `<span>Daily Modifier: ${this.formatDailyModifier(this.uiState.courseInfo.dailyModifier)}</span>`;
    
    header.appendChild(holeInfo);
    header.appendChild(strokeCounter);
    header.appendChild(dailyModifier);
    
    return header;
  }
  
  /**
   * Create energy tomatoes
   * @returns {HTMLElement} Energy tomatoes element
   */
  createEnergyTomatoes() {
    const container = document.createElement('div');
    container.className = 'energy-tomatoes';
    
    for (let i = 0; i < this.uiState.energyTomatoes.maxCount; i++) {
      const tomato = document.createElement('div');
      tomato.className = `energy-tomato ${i < this.uiState.energyTomatoes.count ? 'active' : 'inactive'}`;
      container.appendChild(tomato);
    }
    
    return container;
  }
  
  /**
   * Create power-up indicator
   * @returns {HTMLElement} Power-up indicator element
   */
  createPowerUpIndicator() {
    const container = document.createElement('div');
    container.className = 'power-up-indicator';
    container.style.display = this.uiState.powerUpIndicator.visible ? 'flex' : 'none';
    
    const icon = document.createElement('div');
    icon.className = 'power-up-icon';
    if (this.uiState.powerUpIndicator.type) {
      icon.style.backgroundColor = this.getPowerUpColor(this.uiState.powerUpIndicator.type);
    }
    
    const text = document.createElement('span');
    text.textContent = this.uiState.powerUpIndicator.type ? 
      `Power-Up: ${this.formatPowerUpName(this.uiState.powerUpIndicator.type)}` : '';
    
    container.appendChild(icon);
    container.appendChild(text);
    
    return container;
  }
  
  /**
   * Create shot panel
   * @returns {HTMLElement} Shot panel element
   */
  createShotPanel() {
    const panel = document.createElement('div');
    panel.className = 'shot-panel';
    panel.style.display = this.uiState.shotPanel.visible ? 'block' : 'none';
    
    const guideOptions = document.createElement('div');
    guideOptions.className = 'guide-options';
    
    const shortGuide = document.createElement('div');
    shortGuide.className = `guide-option ${this.uiState.shotPanel.guideType === 'short' ? 'selected' : ''}`;
    shortGuide.textContent = 'Short Guide';
    shortGuide.addEventListener('click', () => this.handleGuideTypeChange('short'));
    
    const longGuide = document.createElement('div');
    longGuide.className = `guide-option ${this.uiState.shotPanel.guideType === 'long' ? 'selected' : ''}`;
    longGuide.textContent = 'Long Guide';
    longGuide.addEventListener('click', () => this.handleGuideTypeChange('long'));
    
    guideOptions.appendChild(shortGuide);
    guideOptions.appendChild(longGuide);
    
    const hint = document.createElement('div');
    hint.className = 'shot-panel-hint';
    hint.textContent = 'Press SPACE to continue, UP/DOWN to change guide';
    
    panel.appendChild(guideOptions);
    panel.appendChild(hint);
    
    return panel;
  }
  
  /**
   * Create power meter
   * @returns {HTMLElement} Power meter element
   */
  createPowerMeter() {
    const container = document.createElement('div');
    container.className = 'power-meter-container';
    container.classList.toggle('active', this.uiState.powerMeter.visible);
    
    const meter = document.createElement('div');
    meter.className = 'power-meter';
    meter.style.width = `${this.uiState.powerMeter.value * 100}%`;
    
    const hint = document.createElement('div');
    hint.className = 'power-meter-hint';
    hint.textContent = 'Press SPACE to set power';
    
    container.appendChild(meter);
    container.appendChild(hint);
    
    return container;
  }
  
  /**
   * Create shot state indicator
   * @returns {HTMLElement} Shot state indicator element
   */
  createShotStateIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'shot-state-indicator';
    indicator.textContent = this.getShotStateInstructions();
    
    return indicator;
  }
  
  /**
   * Create hole completed overlay
   * @returns {HTMLElement} Hole completed overlay element
   */
  createHoleCompletedOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'hole-completed-overlay';
    overlay.style.display = this.uiState.holeCompleted.visible ? 'flex' : 'none';
    
    const title = document.createElement('h3');
    title.textContent = `Hole ${this.uiState.courseInfo.currentHole} Completed!`;
    
    const strokes = document.createElement('p');
    strokes.textContent = `Strokes: ${this.uiState.holeCompleted.strokes}`;
    
    const par = document.createElement('p');
    par.textContent = `Par: ${this.uiState.holeCompleted.par}`;
    
    const scoreText = this.getScoreText(this.uiState.holeCompleted.strokes, this.uiState.holeCompleted.par);
    const score = document.createElement('p');
    score.textContent = scoreText;
    
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next Hole';
    nextButton.addEventListener('click', () => this.handleNextHole());
    
    overlay.appendChild(title);
    overlay.appendChild(strokes);
    overlay.appendChild(par);
    overlay.appendChild(score);
    overlay.appendChild(nextButton);
    
    return overlay;
  }
  
  /**
   * Create game completed modal
   * @returns {HTMLElement} Game completed modal element
   */
  createGameCompletedModal() {
    const modal = document.createElement('div');
    modal.className = 'game-completed-modal';
    modal.style.display = this.uiState.gameCompleted.visible ? 'flex' : 'none';
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    
    const title = document.createElement('h2');
    title.textContent = 'Course Completed!';
    
    const summary = document.createElement('p');
    summary.textContent = `You completed all ${this.uiState.gameCompleted.totalHoles} holes with ${this.uiState.gameCompleted.totalStrokes} total strokes.`;
    
    const restartButton = document.createElement('button');
    restartButton.textContent = 'Play Again';
    restartButton.addEventListener('click', () => this.handleRestartGame());
    
    content.appendChild(title);
    content.appendChild(summary);
    content.appendChild(restartButton);
    
    modal.appendChild(content);
    
    return modal;
  }
  
  /**
   * Create visual style toggle button
   * @returns {HTMLElement} Visual style toggle button
   */
  createVisualStyleToggle() {
    const button = document.createElement('button');
    button.className = 'visual-style-toggle';
    button.textContent = 'Toggle Moebius Style';
    button.addEventListener('click', () => this.handleVisualStyleToggle());
    
    return button;
  }
  
  /**
   * Setup event listeners for game events
   */
  setupEventListeners() {
    // Listen for shot state changes
    this.world.on('shotStateChanged', this.handleShotStateChanged.bind(this));
    
    // Listen for power meter updates
    this.world.on('powerMeterUpdated', this.handlePowerMeterUpdated.bind(this));
    
    // Listen for guide type changes
    this.world.on('guideTypeChanged', this.handleGuideTypeChange.bind(this));
    
    // Listen for stroke added
    this.world.on('strokeAdded', this.handleStrokeAdded.bind(this));
    
    // Listen for energy changed
    this.world.on('energyChanged', this.handleEnergyChanged.bind(this));
    
    // Listen for power-up collected
    this.world.on('powerUpCollected', this.handlePowerUpCollected.bind(this));
    
    // Listen for power-up activated
    this.world.on('powerUpActivated', this.handlePowerUpActivated.bind(this));
    
    // Listen for hole completed
    this.world.on('holeCompleted', this.handleHoleCompleted.bind(this));
    
    // Listen for game completed
    this.world.on('gameCompleted', this.handleGameCompleted.bind(this));
    
    // Listen for course generated
    this.world.on('courseGenerated', this.handleCourseGenerated.bind(this));
  }
  
  /**
   * Update the UI system
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    // Update power-up indicator time
    if (this.uiState.powerUpIndicator.visible) {
      this.uiState.powerUpIndicator.showTime -= deltaTime;
      
      if (this.uiState.powerUpIndicator.showTime <= 0) {
        this.uiState.powerUpIndicator.visible = false;
        this.needsUpdate.powerUpIndicator = true;
      }
    }
    
    // Update any UI elements that need updating
    this.updateUI();
  }
  
  /**
   * Update UI elements that need updating
   */
  updateUI() {
    if (this.needsUpdate.shotPanel) {
      this.updateShotPanel();
    }
    
    if (this.needsUpdate.powerMeter) {
      this.updatePowerMeter();
    }
    
    if (this.needsUpdate.energyTomatoes) {
      this.updateEnergyTomatoes();
    }
    
    if (this.needsUpdate.powerUpIndicator) {
      this.updatePowerUpIndicator();
    }
    
    if (this.needsUpdate.holeCompletedOverlay) {
      this.updateHoleCompletedOverlay();
    }
    
    if (this.needsUpdate.gameCompletedModal) {
      this.updateGameCompletedModal();
    }
    
    if (this.needsUpdate.courseInfoHeader) {
      this.updateCourseInfoHeader();
    }
    
    if (this.needsUpdate.shotStateIndicator) {
      this.updateShotStateIndicator();
    }
  }
  
  /**
   * Update all UI elements
   */
  updateAllUI() {
    this.updateShotPanel();
    this.updatePowerMeter();
    this.updateEnergyTomatoes();
    this.updatePowerUpIndicator();
    this.updateHoleCompletedOverlay();
    this.updateGameCompletedModal();
    this.updateCourseInfoHeader();
    this.updateShotStateIndicator();
  }
  
  /**
   * Update shot panel
   */
  updateShotPanel() {
    if (!this.uiElements.shotPanel) return;
    
    this.uiElements.shotPanel.style.display = this.uiState.shotPanel.visible ? 'block' : 'none';
    
    // Update guide options
    const guideOptions = this.uiElements.shotPanel.querySelectorAll('.guide-option');
    guideOptions.forEach(option => {
      if (option.textContent.toLowerCase().includes('short')) {
        option.classList.toggle('selected', this.uiState.shotPanel.guideType === 'short');
      } else if (option.textContent.toLowerCase().includes('long')) {
        option.classList.toggle('selected', this.uiState.shotPanel.guideType === 'long');
      }
    });
    
    this.needsUpdate.shotPanel = false;
  }
  
  /**
   * Update power meter
   */
  updatePowerMeter() {
    if (!this.uiElements.powerMeter) return;
    
    this.uiElements.powerMeter.classList.toggle('active', this.uiState.powerMeter.visible);
    
    const meter = this.uiElements.powerMeter.querySelector('.power-meter');
    if (meter) {
      meter.style.width = `${this.uiState.powerMeter.value * 100}%`;
    }
    
    this.needsUpdate.powerMeter = false;
  }
  
  /**
   * Update energy tomatoes
   */
  updateEnergyTomatoes() {
    if (!this.uiElements.energyTomatoes) return;
    
    const tomatoes = this.uiElements.energyTomatoes.querySelectorAll('.energy-tomato');
    tomatoes.forEach((tomato, index) => {
      tomato.classList.toggle('active', index < this.uiState.energyTomatoes.count);
      tomato.classList.toggle('inactive', index >= this.uiState.energyTomatoes.count);
    });
    
    this.needsUpdate.energyTomatoes = false;
  }
  
  /**
   * Update power-up indicator
   */
  updatePowerUpIndicator() {
    if (!this.uiElements.powerUpIndicator) return;
    
    this.uiElements.powerUpIndicator.style.display = this.uiState.powerUpIndicator.visible ? 'flex' : 'none';
    
    const icon = this.uiElements.powerUpIndicator.querySelector('.power-up-icon');
    if (icon && this.uiState.powerUpIndicator.type) {
      icon.style.backgroundColor = this.getPowerUpColor(this.uiState.powerUpIndicator.type);
    }
    
    const text = this.uiElements.powerUpIndicator.querySelector('span');
    if (text) {
      text.textContent = this.uiState.powerUpIndicator.type ? 
        `Power-Up: ${this.formatPowerUpName(this.uiState.powerUpIndicator.type)}` : '';
    }
    
    this.needsUpdate.powerUpIndicator = false;
  }
  
  /**
   * Update hole completed overlay
   */
  updateHoleCompletedOverlay() {
    if (!this.uiElements.holeCompletedOverlay) return;
    
    this.uiElements.holeCompletedOverlay.style.display = this.uiState.holeCompleted.visible ? 'flex' : 'none';
    
    const title = this.uiElements.holeCompletedOverlay.querySelector('h3');
    if (title) {
      title.textContent = `Hole ${this.uiState.courseInfo.currentHole} Completed!`;
    }
    
    const strokes = this.uiElements.holeCompletedOverlay.querySelectorAll('p')[0];
    if (strokes) {
      strokes.textContent = `Strokes: ${this.uiState.holeCompleted.strokes}`;
    }
    
    const par = this.uiElements.holeCompletedOverlay.querySelectorAll('p')[1];
    if (par) {
      par.textContent = `Par: ${this.uiState.holeCompleted.par}`;
    }
    
    const score = this.uiElements.holeCompletedOverlay.querySelectorAll('p')[2];
    if (score) {
      score.textContent = this.getScoreText(this.uiState.holeCompleted.strokes, this.uiState.holeCompleted.par);
    }
    
    this.needsUpdate.holeCompletedOverlay = false;
  }
  
  /**
   * Update game completed modal
   */
  updateGameCompletedModal() {
    if (!this.uiElements.gameCompletedModal) return;
    
    this.uiElements.gameCompletedModal.style.display = this.uiState.gameCompleted.visible ? 'flex' : 'none';
    
    const summary = this.uiElements.gameCompletedModal.querySelector('p');
    if (summary) {
      summary.textContent = `You completed all ${this.uiState.gameCompleted.totalHoles} holes with ${this.uiState.gameCompleted.totalStrokes} total strokes.`;
    }
    
    this.needsUpdate.gameCompletedModal = false;
  }
  
  /**
   * Update course info header
   */
  updateCourseInfoHeader() {
    if (!this.uiElements.courseInfoHeader) return;
    
    const holeInfo = this.uiElements.courseInfoHeader.querySelector('.hole-info');
    if (holeInfo) {
      holeInfo.innerHTML = `<span>Hole ${this.uiState.courseInfo.currentHole} / ${this.uiState.courseInfo.totalHoles}</span>`;
    }
    
    const strokeCounter = this.uiElements.courseInfoHeader.querySelector('.stroke-counter');
    if (strokeCounter) {
      strokeCounter.innerHTML = `<span>Strokes: ${this.uiState.courseInfo.holeStrokes}</span>
                                <span>Total: ${this.uiState.courseInfo.totalStrokes}</span>`;
    }
    
    const dailyModifier = this.uiElements.courseInfoHeader.querySelector('.daily-modifier');
    if (dailyModifier) {
      dailyModifier.innerHTML = `<span>Daily Modifier: ${this.formatDailyModifier(this.uiState.courseInfo.dailyModifier)}</span>`;
    }
    
    this.needsUpdate.courseInfoHeader = false;
  }
  
  /**
   * Update shot state indicator
   */
  updateShotStateIndicator() {
    if (!this.uiElements.shotStateIndicator) return;
    
    this.uiElements.shotStateIndicator.textContent = this.getShotStateInstructions();
    
    this.needsUpdate.shotStateIndicator = false;
  }
  
  /**
   * Handle shot state changed event
   * @param {Object} data - Event data
   */
  handleShotStateChanged(data) {
    const previousState = this.uiState.shotState;
    this.uiState.shotState = data.state;
    
    // Update UI elements based on shot state
    switch (data.state) {
      case 'idle':
        this.uiState.shotPanel.visible = false;
        this.uiState.powerMeter.visible = false;
        break;
        
      case 'aiming':
        this.uiState.shotPanel.visible = false;
        this.uiState.powerMeter.visible = false;
        break;
        
      case 'shot_panel':
        this.uiState.shotPanel.visible = true;
        this.uiState.powerMeter.visible = false;
        break;
        
      case 'power':
        this.uiState.shotPanel.visible = false;
        this.uiState.powerMeter.visible = true;
        break;
        
      case 'moving':
        this.uiState.shotPanel.visible = false;
        this.uiState.powerMeter.visible = false;
        break;
    }
    
    // Mark UI elements for update
    this.needsUpdate.shotPanel = true;
    this.needsUpdate.powerMeter = true;
    this.needsUpdate.shotStateIndicator = true;
  }
  
  /**
   * Handle power meter updated event
   * @param {Object} data - Event data
   */
  handlePowerMeterUpdated(data) {
    this.uiState.powerMeter.value = data.value;
    this.needsUpdate.powerMeter = true;
  }
  
  /**
   * Handle guide type change
   * @param {string} guideType - New guide type
   */
  handleGuideTypeChange(guideType) {
    this.uiState.shotPanel.guideType = guideType;
    this.needsUpdate.shotPanel = true;
    
    // Dispatch event to update the game
    this.world.triggerEvent('guideTypeChanged', {
      guideType
    });
  }
  
  /**
   * Handle stroke added event
   * @param {Object} data - Event data
   */
  handleStrokeAdded(data) {
    this.uiState.courseInfo.holeStrokes = data.holeStrokes;
    this.uiState.courseInfo.totalStrokes = data.totalStrokes;
    this.needsUpdate.courseInfoHeader = true;
  }
  
  /**
   * Handle energy changed event
   * @param {Object} data - Event data
   */
  handleEnergyChanged(data) {
    this.uiState.energyTomatoes.count = data.energy;
    this.needsUpdate.energyTomatoes = true;
  }
  
  /**
   * Handle power-up collected event
   * @param {Object} data - Event data
   */
  handlePowerUpCollected(data) {
    // Show power-up indicator
    this.uiState.powerUpIndicator.visible = true;
    this.uiState.powerUpIndicator.type = data.powerUp.type;
    this.uiState.powerUpIndicator.showTime = 3; // Show for 3 seconds
    
    this.needsUpdate.powerUpIndicator = true;
  }
  
  /**
   * Handle power-up activated event
   * @param {Object} data - Event data
   */
  handlePowerUpActivated(data) {
    // Show power-up activation indicator
    this.uiState.powerUpIndicator.visible = true;
    this.uiState.powerUpIndicator.type = data.powerUp.type;
    this.uiState.powerUpIndicator.showTime = 3; // Show for 3 seconds
    
    this.needsUpdate.powerUpIndicator = true;
  }
  
  /**
   * Handle hole completed event
   * @param {Object} data - Event data
   */
  handleHoleCompleted(data) {
    // Update hole completed overlay
    this.uiState.holeCompleted.visible = true;
    this.uiState.holeCompleted.strokes = data.course.strokes;
    this.uiState.holeCompleted.par = data.course.par;
    
    this.needsUpdate.holeCompletedOverlay = true;
  }
  
  /**
   * Handle game completed event
   * @param {Object} data - Event data
   */
  handleGameCompleted(data) {
    // Update game completed modal
    this.uiState.gameCompleted.visible = true;
    this.uiState.gameCompleted.totalStrokes = data.totalStrokes;
    this.uiState.gameCompleted.totalHoles = data.totalHoles;
    
    this.needsUpdate.gameCompletedModal = true;
  }
  
  /**
   * Handle course generated event
   * @param {Object} data - Event data
   */
  handleCourseGenerated(data) {
    // Update course info
    this.uiState.courseInfo.currentHole = data.course.currentHole;
    this.uiState.courseInfo.totalHoles = data.course.totalHoles;
    this.uiState.courseInfo.holeStrokes = data.course.strokes;
    this.uiState.courseInfo.totalStrokes = data.course.totalStrokes;
    this.uiState.courseInfo.dailyModifier = data.course.dailyModifier;
    
    // Reset hole completed overlay
    this.uiState.holeCompleted.visible = false;
    
    // Mark UI elements for update
    this.needsUpdate.courseInfoHeader = true;
    this.needsUpdate.holeCompletedOverlay = true;
  }
  
  /**
   * Handle next hole button click
   */
  handleNextHole() {
    // Hide hole completed overlay
    this.uiState.holeCompleted.visible = false;
    this.needsUpdate.holeCompletedOverlay = true;
    
    // Trigger next hole event
    this.world.triggerEvent('nextHole');
  }
  
  /**
   * Handle restart game button click
   */
  handleRestartGame() {
    // Hide game completed modal
    this.uiState.gameCompleted.visible = false;
    this.needsUpdate.gameCompletedModal = true;
    
    // Trigger restart game event
    this.world.triggerEvent('restartGame');
  }
  
  /**
   * Handle visual style toggle button click
   */
  handleVisualStyleToggle() {
    // Trigger visual style toggle event
    this.world.triggerEvent('visualStyleToggle');
  }
  
  /**
   * Get shot state instructions
   * @returns {string} Instructions for current shot state
   */
  getShotStateInstructions() {
    switch (this.uiState.shotState) {
      case 'idle':
        return 'Press SPACE to start aiming';
        
      case 'aiming':
        return 'Use LEFT/RIGHT to aim, SPACE to confirm';
        
      case 'shot_panel':
        return 'Use UP/DOWN to change guide, SPACE to confirm';
        
      case 'power':
        return 'Press SPACE to set power, ←→↑↓ for spin';
        
      case 'moving':
        return 'Press SPACE to bounce, E to use power-up';
        
      default:
        return '';
    }
  }
  
  /**
   * Format daily modifier name
   * @param {string} modifier - Modifier name
   * @returns {string} Formatted modifier name
   */
  formatDailyModifier(modifier) {
    if (!modifier) return 'None';
    
    switch (modifier) {
      case 'zeroG':
        return 'Zero Gravity';
      case 'bouncy':
        return 'Extra Bouncy';
      case 'foggy':
        return 'Foggy Course';
      case 'nightMode':
        return 'Night Mode';
      case 'windyCourse':
        return 'Windy Course';
      case 'mirrorMode':
        return 'Mirror Mode';
      default:
        return modifier;
    }
  }
  
  /**
   * Format power-up name
   * @param {string} powerUpType - Power-up type
   * @returns {string} Formatted power-up name
   */
  formatPowerUpName(powerUpType) {
    switch (powerUpType) {
      case 'rocketDash':
        return 'Rocket Dash';
      case 'stickyMode':
        return 'Sticky Mode';
      case 'bouncy':
        return 'Bouncy Shield';
      case 'gravityFlip':
        return 'Gravity Flip';
      default:
        return powerUpType;
    }
  }
  
  /**
   * Get color for a power-up type
   * @param {string} powerUpType - Type of power-up
   * @returns {string} Color as hex string
   */
  getPowerUpColor(powerUpType) {
    switch (powerUpType) {
      case 'rocketDash':
        return '#ff3300'; // Red-orange
        
      case 'stickyMode':
        return '#00ff00'; // Green
        
      case 'bouncy':
        return '#0066ff'; // Blue
        
      case 'gravityFlip':
        return '#ffff00'; // Yellow
        
      default:
        return '#ff00ff'; // Magenta (unknown)
    }
  }
  
  /**
   * Get score text based on strokes and par
   * @param {number} strokes - Number of strokes
   * @param {number} par - Par for the hole
   * @returns {string} Score text
   */
  getScoreText(strokes, par) {
    const diff = strokes - par;
    
    if (diff < -2) return 'Amazing!';
    if (diff === -2) return 'Eagle!';
    if (diff === -1) return 'Birdie!';
    if (diff === 0) return 'Par';
    if (diff === 1) return 'Bogey';
    if (diff === 2) return 'Double Bogey';
    if (diff > 2) return 'Keep practicing...';
    
    return '';
  }
  
  /**
   * Add a UI event listener
   * @param {string} elementId - ID of UI element
   * @param {string} eventType - Type of event
   * @param {Function} callback - Callback function
   */
  addUIEventListener(elementId, eventType, callback) {
    if (!this.uiElements[elementId]) return;
    
    const element = this.uiElements[elementId];
    element.addEventListener(eventType, callback);
    
    // Store for cleanup
    if (!this.uiEventListeners.has(elementId)) {
      this.uiEventListeners.set(elementId, []);
    }
    
    this.uiEventListeners.get(elementId).push({
      eventType,
      callback
    });
  }
  
  /**
   * Remove a UI event listener
   * @param {string} elementId - ID of UI element
   * @param {string} eventType - Type of event
   * @param {Function} callback - Callback function
   */
  removeUIEventListener(elementId, eventType, callback) {
    if (!this.uiElements[elementId]) return;
    
    const element = this.uiElements[elementId];
    element.removeEventListener(eventType, callback);
    
    // Remove from stored listeners
    if (this.uiEventListeners.has(elementId)) {
      const listeners = this.uiEventListeners.get(elementId);
      const index = listeners.findIndex(listener => 
        listener.eventType === eventType && listener.callback === callback);
      
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  /**
   * Dispose resources
   */
  dispose() {
    // Remove all UI event listeners
    this.uiEventListeners.forEach((listeners, elementId) => {
      const element = this.uiElements[elementId];
      if (!element) return;
      
      listeners.forEach(listener => {
        element.removeEventListener(listener.eventType, listener.callback);
      });
    });
    
    // Clear UI event listeners
    this.uiEventListeners.clear();
    
    // Remove UI elements from DOM
    if (this.uiElements.container && this.uiElements.container.parentNode) {
      this.uiElements.container.parentNode.removeChild(this.uiElements.container);
    }
    
    // Clear UI elements
    this.uiElements = {
      container: null,
      shotPanel: null,
      powerMeter: null,
      energyTomatoes: null,
      powerUpIndicator: null,
      holeCompletedOverlay: null,
      gameCompletedModal: null,
      courseInfoHeader: null,
      shotStateIndicator: null,
      visualStyleToggle: null
    };
    
    // Remove world event listeners
    this.world.off('shotStateChanged', this.handleShotStateChanged);
    this.world.off('powerMeterUpdated', this.handlePowerMeterUpdated);
    this.world.off('guideTypeChanged', this.handleGuideTypeChange);
    this.world.off('strokeAdded', this.handleStrokeAdded);
    this.world.off('energyChanged', this.handleEnergyChanged);
    this.world.off('powerUpCollected', this.handlePowerUpCollected);
    this.world.off('powerUpActivated', this.handlePowerUpActivated);
    this.world.off('holeCompleted', this.handleHoleCompleted);
    this.world.off('gameCompleted', this.handleGameCompleted);
    this.world.off('courseGenerated', this.handleCourseGenerated);
  }
}

export default UISystem;// src/GameEngine/Systems/UISystem.js