// src/GameEngine/Game.js
import World from './ECS/World';
import PhysicsSystem from './Systems/PhysicsSystem';
import InputSystem from './Systems/InputSystem';
import RenderingSystem from './Systems/RenderingSystem';
import CourseGenerationSystem from './Systems/CourseGenerationSystem';
import PowerUpSystem from './Systems/PowerUpSystem';
import UISystem from './Systems/UISystem';
import { createBallEntity } from './Entities/BallEntity';

/**
 * Main game class that initializes the world and systems
 */
class Game {
  /**
   * Create a new game
   * @param {Object} options - Game options
   */
  constructor(options = {}) {
    // Game options
    this.options = {
      canvas: options.canvas || null,
      debug: options.debug !== undefined ? options.debug : false,
      totalHoles: options.totalHoles || 9,
      difficulty: options.difficulty || 1,
      seed: options.seed || Date.now(),
      visualStyle: options.visualStyle || 'standard',
      ...options
    };
    
    // Create world
    this.world = new World();
    
    // Track initialization state
    this.initialized = false;
    
    // Main player entity
    this.playerEntity = null;
  }
  
  /**
   * Initialize the game
   * @returns {Promise} Promise that resolves when initialization is complete
   */
  async init() {
    if (this.initialized) return;
    
    // Initialize world
    await this.world.init({
      canvas: this.options.canvas,
      backgroundColor: 0x87CEEB, // Sky blue
      debug: this.options.debug
    });
    
    // Add physics system
    this.physicsSystem = new PhysicsSystem(this.world);
    this.world.addSystem(this.physicsSystem);
    
    // Wait for physics to initialize
    await this.physicsSystem.init();
    
    // Add course generation system
    this.courseGenerationSystem = new CourseGenerationSystem(this.world);
    this.world.addSystem(this.courseGenerationSystem);
    
    // Add power-up system
    this.powerUpSystem = new PowerUpSystem(this.world);
    this.world.addSystem(this.powerUpSystem);
    
    // Add input system
    this.inputSystem = new InputSystem(this.world);
    this.world.addSystem(this.inputSystem);
    
    // Add rendering system
    this.renderingSystem = new RenderingSystem(this.world);
    this.world.addSystem(this.renderingSystem);
    
    // Add UI system
    this.uiSystem = new UISystem(this.world);
    this.world.addSystem(this.uiSystem);
    
    // Create player entity
    this.playerEntity = this.createPlayer();
    
    // Initialize all systems
    for (const system of this.world.systems) {
      if (system.init && system !== this.physicsSystem) {
        await system.init();
      }
    }
    
    // Set visual style if specified
    if (this.options.visualStyle === 'moebius') {
      this.world.triggerEvent('visualStyleToggle');
    }
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Mark as initialized
    this.initialized = true;
    
    // Start game loop
    this.world.start();
    
    return this;
  }
  
  /**
   * Create player entity
   * @returns {Entity} Player entity
   */
  createPlayer() {
    // Create ball entity
    const player = createBallEntity({
      position: { x: 0, y: 1, z: 0 },
      color: 0x00ff9f,
      addInput: true,
      addCourse: true,
      totalHoles: this.options.totalHoles,
      difficulty: this.options.difficulty,
      seed: this.options.seed
    });
    
    // Add to world
    this.world.addEntity(player);
    
    return player;
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for hole completed event
    this.world.on('holeCompleted', data => {
      console.log('Hole completed:', data);
    });
    
    // Listen for game completed event
    this.world.on('gameCompleted', data => {
      console.log('Game completed:', data);
    });
    
    // Listen for power-up collected event
    this.world.on('powerUpCollected', data => {
      console.log('Power-up collected:', data);
    });
    
    // Listen for power-up activated event
    this.world.on('powerUpActivated', data => {
      console.log('Power-up activated:', data);
    });
    
    // Listen for shot fired event
    this.world.on('shotFired', data => {
      console.log('Shot fired:', data);
    });
    
    // Listen for next hole event
    this.world.on('nextHole', () => {
      const course = this.playerEntity.getComponent('Course');
      if (course) {
        course.nextHole();
      }
    });
    
    // Listen for restart game event
    this.world.on('restartGame', () => {
      this.restartGame();
    });
    
    // Listen for window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }
  
  /**
   * Handle window resize
   */
  handleResize() {
    // Let rendering system handle resize
    if (this.renderingSystem) {
      this.renderingSystem.handleResize();
    }
  }
  
  /**
   * Restart the game
   */
  restartGame() {
    // Reset course
    const course = this.playerEntity.getComponent('Course');
    if (course) {
      course.reset();
    }
    
    // Reset player position
    const transform = this.playerEntity.getComponent('Transform');
    const physics = this.playerEntity.getComponent('Physics');
    
    if (transform) {
      transform.position.set(0, 1, 0);
      transform.rotation.set(0, 0, 0, 1);
      transform.updateMatrix();
    }
    
    if (physics) {
      physics.velocity.set(0, 0, 0);
      physics.angularVelocity.set(0, 0, 0);
    }
    
    // Reset shot state
    const playerInput = this.playerEntity.getComponent('PlayerInput');
    if (playerInput) {
      playerInput.setShotState('idle');
    }
    
    // Generate new course
    this.courseGenerationSystem.generateCourse(this.playerEntity);
  }
  
  /**
   * Update the game
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    if (!this.initialized) return;
    
    // Update world
    this.world.update(deltaTime);
  }
  
  /**
   * Start the game loop
   */
  start() {
    if (!this.initialized) {
      console.warn('Game not initialized, call init() first');
      return;
    }
    
    this.world.start();
  }
  
  /**
   * Stop the game loop
   */
  stop() {
    this.world.stop();
  }
  
  /**
   * Get game state
   * @returns {Object} Current game state
   */
  getState() {
    if (!this.playerEntity) return {};
    
    const course = this.playerEntity.getComponent('Course');
    const playerInput = this.playerEntity.getComponent('PlayerInput');
    
    return {
      currentHole: course ? course.currentHole : 1,
      totalHoles: course ? course.totalHoles : this.options.totalHoles,
      holeStrokes: course ? course.strokes : 0,
      totalStrokes: course ? course.totalStrokes : 0,
      shotState: playerInput ? playerInput.getShotState() : 'idle',
      holeCompleted: course ? course.holeCompleted : false,
      gameCompleted: course ? course.gameCompleted : false,
      dailyModifier: course ? course.dailyModifier : null
    };
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    // Stop game loop
    this.stop();
    
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
    
    // Dispose world
    if (this.world) {
      this.world.dispose();
    }
    
    // Reset properties
    this.world = null;
    this.playerEntity = null;
    this.initialized = false;
  }
}

export default Game;