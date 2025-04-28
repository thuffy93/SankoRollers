// src/GameEngine/Components/PowerUp.js

/**
 * PowerUp component for power-up functionality
 */
class PowerUp {
    /**
     * Create a new power-up component
     * @param {Object} options - Component options
     * @param {string} options.type - Power-up type
     * @param {number} options.duration - Duration in seconds
     * @param {boolean} options.collected - Whether the power-up has been collected
     * @param {Function} options.onActivate - Function to call when activated
     * @param {Function} options.onDeactivate - Function to call when deactivated
     * @param {Function} options.onUpdate - Function to call every frame when active
     */
    constructor(options = {}) {
      this.type = options.type || 'rocketDash'; // rocketDash, stickyMode, bouncy, gravityFlip
      this.duration = options.duration || 5; // Default 5 seconds
      this.collected = options.collected || false;
      this.active = false;
      this.timeRemaining = 0;
      
      // Callback functions
      this.onActivate = options.onActivate || null;
      this.onDeactivate = options.onDeactivate || null;
      this.onUpdate = options.onUpdate || null;
      
      // Visual effects
      this.effectColor = this.getEffectColor();
      this.effectScale = options.effectScale || 1.0;
      
      // Power-up specific properties
      this.properties = this.getDefaultProperties();
      
      // Override default properties with provided properties
      if (options.properties) {
        Object.assign(this.properties, options.properties);
      }
    }
    
    /**
     * Get default properties based on power-up type
     * @returns {Object} Default properties
     */
    getDefaultProperties() {
      switch (this.type) {
        case 'rocketDash':
          return {
            impulseStrength: 15,
            trailLength: 30,
            trailOpacity: 0.9
          };
          
        case 'stickyMode':
          return {
            friction: 0.8,
            maxSlope: 80 // In degrees
          };
          
        case 'bouncy':
          return {
            bounceMultiplier: 1.5,
            maxBounces: 5
          };
          
        case 'gravityFlip':
          return {
            gravityMultiplier: -1.0,
            initialImpulse: 10
          };
          
        default:
          return {};
      }
    }
    
    /**
     * Get effect color based on power-up type
     * @returns {number} Three.js color
     */
    getEffectColor() {
      switch (this.type) {
        case 'rocketDash':
          return 0xff3300; // Red-orange
          
        case 'stickyMode':
          return 0x00ff00; // Green
          
        case 'bouncy':
          return 0x0066ff; // Blue
          
        case 'gravityFlip':
          return 0xffff00; // Yellow
          
        default:
          return 0xff00ff; // Magenta (unknown)
      }
    }
    
    /**
     * Activate the power-up
     * @param {Entity} entity - Entity activating the power-up
     * @returns {boolean} Whether activation was successful
     */
    activate(entity) {
      if (this.active) {
        // Already active
        return false;
      }
      
      this.active = true;
      this.timeRemaining = this.duration;
      
      // Apply power-up effects
      this.applyEffects(entity);
      
      // Call activation callback
      if (this.onActivate) {
        this.onActivate(entity, this);
      }
      
      return true;
    }
    
    /**
     * Deactivate the power-up
     * @param {Entity} entity - Entity deactivating the power-up
     */
    deactivate(entity) {
      if (!this.active) {
        return;
      }
      
      this.active = false;
      this.timeRemaining = 0;
      
      // Remove power-up effects
      this.removeEffects(entity);
      
      // Call deactivation callback
      if (this.onDeactivate) {
        this.onDeactivate(entity, this);
      }
    }
    
    /**
     * Update the power-up
     * @param {Entity} entity - Entity with the power-up
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(entity, deltaTime) {
      if (!this.active) {
        return;
      }
      
      // Update time remaining
      this.timeRemaining -= deltaTime;
      
      // Check if power-up should be deactivated
      if (this.timeRemaining <= 0) {
        this.deactivate(entity);
        return;
      }
      
      // Apply continuous effects
      this.updateEffects(entity, deltaTime);
      
      // Call update callback
      if (this.onUpdate) {
        this.onUpdate(entity, this, deltaTime);
      }
    }
    
    /**
     * Apply power-up effects
     * @param {Entity} entity - Entity to apply effects to
     */
    applyEffects(entity) {
      // Apply effects based on power-up type
      const physics = entity.getComponent('Physics');
      const renderer = entity.getComponent('Renderer');
      
      if (!physics || !renderer) {
        return;
      }
      
      switch (this.type) {
        case 'rocketDash':
          // Get current velocity direction
          const velocity = physics.velocity;
          const direction = velocity.clone().normalize();
          
          // Apply impulse in current direction
          const impulse = direction.multiplyScalar(this.properties.impulseStrength);
          physics.applyImpulse(impulse);
          
          // Set trail effect
          if (renderer.trail) {
            renderer.trailMaterial.color.setHex(this.effectColor);
            renderer.trailMaterial.opacity = this.properties.trailOpacity;
          }
          break;
          
        case 'stickyMode':
          // Increase friction
          physics.friction = this.properties.friction;
          
          // Set trail effect
          if (renderer.trail) {
            renderer.trailMaterial.color.setHex(this.effectColor);
          }
          break;
          
        case 'bouncy':
          // Set bouncy flag
          physics.restitution = this.properties.bounceMultiplier;
          entity.addTag('bouncy');
          
          // Set trail effect
          if (renderer.trail) {
            renderer.trailMaterial.color.setHex(this.effectColor);
          }
          break;
          
        case 'gravityFlip':
          // Store current gravity for restoration later
          this.originalGravity = physics.world ? physics.world.gravity.y : -9.81;
          
          // Flip gravity if using a physics world
          if (physics.world) {
            physics.world.gravity.y *= this.properties.gravityMultiplier;
          }
          
          // Apply initial upward impulse
          physics.applyImpulse({ x: 0, y: this.properties.initialImpulse, z: 0 });
          
          // Set trail effect
          if (renderer.trail) {
            renderer.trailMaterial.color.setHex(this.effectColor);
          }
          break;
      }
    }
    
    /**
     * Update continuous effects
     * @param {Entity} entity - Entity to update effects for
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateEffects(entity, deltaTime) {
      const physics = entity.getComponent('Physics');
      const renderer = entity.getComponent('Renderer');
      
      if (!physics || !renderer) {
        return;
      }
      
      switch (this.type) {
        case 'rocketDash':
          // Add particle trail effect
          if (renderer.trail) {
            // Increase trail intensity based on remaining time
            const intensityFactor = Math.min(1.0, this.timeRemaining / this.duration + 0.5);
            renderer.trailMaterial.opacity = this.properties.trailOpacity * intensityFactor;
          }
          break;
          
        case 'stickyMode':
          // No continuous effects needed
          break;
          
        case 'bouncy':
          // No continuous effects needed
          break;
          
        case 'gravityFlip':
          // Decrease gravity effect as time runs out
          if (physics.world && this.timeRemaining < 1.0) {
            // Gradually restore normal gravity in the last second
            const lerpFactor = this.timeRemaining;
            const targetGravity = this.originalGravity;
            const currentGravity = physics.world.gravity.y;
            physics.world.gravity.y = currentGravity * lerpFactor + targetGravity * (1 - lerpFactor);
          }
          break;
      }
    }
    
    /**
     * Remove power-up effects
     * @param {Entity} entity - Entity to remove effects from
     */
    removeEffects(entity) {
      const physics = entity.getComponent('Physics');
      const renderer = entity.getComponent('Renderer');
      
      if (!physics || !renderer) {
        return;
      }
      
      switch (this.type) {
        case 'rocketDash':
          // Reset trail effect
          if (renderer.trail) {
            renderer.trailMaterial.color.setHex(0x00ff9f); // Default color
            renderer.trailMaterial.opacity = 0.7; // Default opacity
          }
          break;
          
        case 'stickyMode':
          // Reset friction
          physics.friction = 0.1; // Default friction
          
          // Reset trail effect
          if (renderer.trail) {
            renderer.trailMaterial.color.setHex(0x00ff9f); // Default color
          }
          break;
          
        case 'bouncy':
          // Reset bouncy flag
          physics.restitution = 0.6; // Default restitution
          entity.removeTag('bouncy');
          
          // Reset trail effect
          if (renderer.trail) {
            renderer.trailMaterial.color.setHex(0x00ff9f); // Default color
          }
          break;
          
        case 'gravityFlip':
          // Restore original gravity
          if (physics.world && this.originalGravity !== undefined) {
            physics.world.gravity.y = this.originalGravity;
          }
          
          // Reset trail effect
          if (renderer.trail) {
            renderer.trailMaterial.color.setHex(0x00ff9f); // Default color
          }
          break;
      }
    }
    
    /**
     * Get a friendly name for the power-up type
     * @returns {string} Friendly name
     */
    getFriendlyName() {
      switch (this.type) {
        case 'rocketDash':
          return 'Rocket Dash';
          
        case 'stickyMode':
          return 'Sticky Mode';
          
        case 'bouncy':
          return 'Bouncy Shield';
          
        case 'gravityFlip':
          return 'Gravity Flip';
          
        default:
          return this.type;
      }
    }
    
    /**
     * Get a description of the power-up
     * @returns {string} Description
     */
    getDescription() {
      switch (this.type) {
        case 'rocketDash':
          return 'Burst forward in a straight line.';
          
        case 'stickyMode':
          return 'Adhere to walls and slopes for precise stops.';
          
        case 'bouncy':
          return 'Gain 1.5x rebound force from obstacles.';
          
        case 'gravityFlip':
          return 'Invert gravity for aerial maneuvers.';
          
        default:
          return 'Unknown power-up type.';
      }
    }
    
    /**
     * Clone this power-up
     * @returns {PowerUp} Cloned power-up
     */
    clone() {
      return new PowerUp({
        type: this.type,
        duration: this.duration,
        collected: this.collected,
        onActivate: this.onActivate,
        onDeactivate: this.onDeactivate,
        onUpdate: this.onUpdate,
        effectScale: this.effectScale,
        properties: { ...this.properties }
      });
    }
  }
  
  export default PowerUp;