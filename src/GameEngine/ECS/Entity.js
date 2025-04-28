// src/GameEngine/ECS/Entity.js

/**
 * Entity class for the ECS architecture
 * Entities are containers for components
 */
class Entity {
    /**
     * Create a new entity
     * @param {string} id - Optional entity ID (auto-generated if not provided)
     */
    constructor(id) {
      this.id = id || Entity.generateId();
      this.components = new Map();
      this.tags = new Set();
      this.parent = null;
      this.children = new Set();
      this.active = true;
    }
  
    /**
     * Generate a unique entity ID
     * @returns {string} Unique ID
     */
    static generateId() {
      return 'entity_' + Math.random().toString(36).substr(2, 9);
    }
  
    /**
     * Add a component to the entity
     * @param {string} type - Component type
     * @param {Object} component - Component instance
     * @returns {Entity} This entity for chaining
     */
    addComponent(type, component) {
      this.components.set(type, component);
      return this;
    }
  
    /**
     * Get a component by type
     * @param {string} type - Component type
     * @returns {Object|null} Component instance or null if not found
     */
    getComponent(type) {
      return this.components.get(type) || null;
    }
  
    /**
     * Check if the entity has a component
     * @param {string} type - Component type
     * @returns {boolean} True if the entity has the component
     */
    hasComponent(type) {
      return this.components.has(type);
    }
  
    /**
     * Remove a component from the entity
     * @param {string} type - Component type
     * @returns {boolean} True if the component was removed
     */
    removeComponent(type) {
      return this.components.delete(type);
    }
  
    /**
     * Add a tag to the entity
     * @param {string} tag - Tag to add
     * @returns {Entity} This entity for chaining
     */
    addTag(tag) {
      this.tags.add(tag);
      return this;
    }
  
    /**
     * Check if the entity has a tag
     * @param {string} tag - Tag to check
     * @returns {boolean} True if the entity has the tag
     */
    hasTag(tag) {
      return this.tags.has(tag);
    }
  
    /**
     * Remove a tag from the entity
     * @param {string} tag - Tag to remove
     * @returns {boolean} True if the tag was removed
     */
    removeTag(tag) {
      return this.tags.delete(tag);
    }
  
    /**
     * Set the entity's parent
     * @param {Entity|string} parent - Parent entity or entity ID
     * @returns {Entity} This entity for chaining
     */
    setParent(parent) {
      this.parent = parent instanceof Entity ? parent.id : parent;
      return this;
    }
  
    /**
     * Add a child entity
     * @param {Entity} child - Child entity
     * @returns {Entity} This entity for chaining
     */
    addChild(child) {
      if (child instanceof Entity) {
        this.children.add(child.id);
        child.parent = this.id;
      } else {
        this.children.add(child);
      }
      return this;
    }
  
    /**
     * Remove a child entity
     * @param {Entity} child - Child entity
     * @returns {boolean} True if the child was removed
     */
    removeChild(child) {
      const childId = child instanceof Entity ? child.id : child;
      return this.children.delete(childId);
    }
  
    /**
     * Activate or deactivate the entity
     * @param {boolean} active - Whether the entity is active
     * @returns {Entity} This entity for chaining
     */
    setActive(active) {
      this.active = active;
      return this;
    }
  
    /**
     * Check if the entity is active
     * @returns {boolean} True if the entity is active
     */
    isActive() {
      return this.active;
    }
  
    /**
     * Clone the entity
     * @returns {Entity} Cloned entity
     */
    clone() {
      const cloned = new Entity();
      
      // Clone components (shallow copy)
      this.components.forEach((component, type) => {
        if (component.clone) {
          cloned.addComponent(type, component.clone());
        } else {
          // If no clone method, try to copy the object
          cloned.addComponent(type, { ...component });
        }
      });
      
      // Clone tags
      this.tags.forEach(tag => cloned.addTag(tag));
      
      // Clone active state
      cloned.active = this.active;
      
      return cloned;
    }
  }
  
  export default Entity;