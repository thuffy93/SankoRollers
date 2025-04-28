// src/GameEngine/ECS/World.js
import * as THREE from 'three';

/**
 * World class for the ECS architecture
 * Manages entities, systems, and game state
 */
class World {
  /**
   * Create a new world
   */
  constructor() {
    this.entities = [];
    this.systems = [];
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = null;
    this.state = {
      currentHole: 1,
      totalHoles: 9,
      holeStrokes: 0,
      totalStrokes: 0,
      courseSeed: Date.now(),
      dailyModifier: null,
      holeCompleted: false,
      gameCompleted: false
    };
    this.eventListeners = {};
  }

  /**
   * Initialize the world
   * @param {Object} options - Initialization options
   */
  async init(options = {}) {
    // Create Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(options.backgroundColor || 0x87CEEB);
    
    // Create renderer
    if (options.canvas) {
      this.renderer = new THREE.WebGLRenderer({ 
        canvas: options.canvas,
        antialias: true
      });
      this.renderer.setSize(
        options.width || window.innerWidth, 
        options.height || window.innerHeight
      );
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      options.fov || 75,
      options.aspect || window.innerWidth / window.innerHeight,
      options.near || 0.1,
      options.far || 1000
    );
    this.camera.position.set(
      options.cameraX || 0, 
      options.cameraY || 10, 
      options.cameraZ || 15
    );
    this.camera.lookAt(0, 0, 0);
    
    // Create clock for delta time
    this.clock = new THREE.Clock();
    
    // Initialize state
    if (options.totalHoles) {
      this.state.totalHoles = options.totalHoles;
    }
    
    // Initialize systems
    for (const system of this.systems) {
      if (system.init) {
        await system.init();
      }
    }
    
    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  /**
   * Add an entity to the world
   * @param {Entity} entity - Entity to add
   * @returns {Entity} The added entity
   */
  addEntity(entity) {
    this.entities.push(entity);
    this.triggerEvent('entityAdded', { entity });
    return entity;
  }

  /**
   * Remove an entity from the world
   * @param {Entity} entity - Entity to remove
   * @returns {boolean} True if the entity was removed
   */
  removeEntity(entity) {
    const index = this.entities.indexOf(entity);
    if (index !== -1) {
      this.entities.splice(index, 1);
      this.triggerEvent('entityRemoved', { entity });
      return true;
    }
    return false;
  }

  /**
   * Get an entity by ID
   * @param {string} id - Entity ID
   * @returns {Entity|null} The entity or null if not found
   */
  getEntity(id) {
    return this.entities.find(entity => entity.id === id) || null;
  }

  /**
   * Get entities by tag
   * @param {string} tag - Tag to filter by
   * @returns {Entity[]} Array of entities with the tag
   */
  getEntitiesByTag(tag) {
    return this.entities.filter(entity => entity.hasTag(tag));
  }

  /**
   * Get entities with a component
   * @param {string} componentType - Component type to filter by
   * @returns {Entity[]} Array of entities with the component
   */
  getEntitiesWithComponent(componentType) {
    return this.entities.filter(entity => entity.hasComponent(componentType));
  }

  /**
   * Add a system to the world
   * @param {System} system - System to add
   * @returns {System} The added system
   */
  addSystem(system) {
    this.systems.push(system);
    
    // Sort systems by priority (higher values run earlier)
    this.systems.sort((a, b) => b.priority - a.priority);
    
    // Initialize the system if the world is already initialized
    if (this.scene) {
      system.init();
    }
    
    return system;
  }

  /**
   * Remove a system from the world
   * @param {System} system - System to remove
   * @returns {boolean} True if the system was removed
   */
  removeSystem(system) {
    const index = this.systems.indexOf(system);
    if (index !== -1) {
      const removedSystem = this.systems.splice(index, 1)[0];
      if (removedSystem.dispose) {
        removedSystem.dispose();
      }
      return true;
    }
    return false;
  }

  /**
   * Update all systems
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    // Update enabled systems
    for (const system of this.systems) {
      if (system.enabled && system.update) {
        system.update(deltaTime);
      }
    }
  }

  /**
   * Start the game loop
   */
  start() {
    if (!this.animationFrameId) {
      this.clock.start();
      this.animate();
    }
  }

  /**
   * Stop the game loop
   */
  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Animation loop
   */
  animate() {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    
    // Get delta time
    const deltaTime = this.clock.getDelta();
    
    // Update all systems
    this.update(deltaTime);
    
    // Render the scene
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    if (this.camera && this.renderer) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  /**
   * Register an event listener
   * @param {string} event - Event name
   * @param {function} callback - Event callback
   */
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {function} callback - Event callback
   */
  off(event, callback) {
    if (!this.eventListeners[event]) return;
    
    this.eventListeners[event] = this.eventListeners[event].filter(
      listener => listener !== callback
    );
  }

  /**
   * Trigger an event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  triggerEvent(event, data = {}) {
    if (!this.eventListeners[event]) return;
    
    for (const callback of this.eventListeners[event]) {
      callback(data);
    }
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    // Stop animation loop
    this.stop();
    
    // Dispose systems
    for (const system of this.systems) {
      if (system.dispose) {
        system.dispose();
      }
    }
    
    // Clear arrays
    this.systems = [];
    this.entities = [];
    
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
    
    // Clear event listeners
    this.eventListeners = {};
    
    // Dispose Three.js resources
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}

export default World;