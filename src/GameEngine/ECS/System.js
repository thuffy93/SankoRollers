// src/GameEngine/ECS/System.js

/**
 * Base System class for the ECS architecture
 * Systems operate on entities with specific components
 */
class System {
    /**
     * Create a new system
     * @param {World} world - Reference to the world
     */
    constructor(world) {
      this.world = world;
      this.requiredComponents = [];
      this.priority = 0; // Higher values run earlier
      this.enabled = true;
    }
  
    /**
     * Check if an entity is compatible with this system
     * @param {Entity} entity - Entity to check
     * @returns {boolean} True if the entity has all required components
     */
    isCompatibleEntity(entity) {
      return this.requiredComponents.every(componentType => 
        entity.hasComponent(componentType)
      );
    }
  
    /**
     * Get all entities compatible with this system
     * @returns {Entity[]} Array of compatible entities
     */
    getCompatibleEntities() {
      return this.world.entities.filter(entity => this.isCompatibleEntity(entity));
    }
  
    /**
     * Initialize the system
     * Called when the system is added to the world
     */
    init() {
      // Override in derived classes
    }
  
    /**
     * Update the system
     * Called once per frame
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
      // Override in derived classes
    }
  
    /**
     * Clean up the system
     * Called when the system is removed from the world
     */
    dispose() {
      // Override in derived classes
    }
  }
  
  export default System;