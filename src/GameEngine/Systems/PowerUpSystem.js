// src/GameEngine/Systems/PowerUpSystem.js
import * as THREE from 'three';
import System from '../ECS/System';

/**
 * PowerUpSystem - Handles power-up collection and activation
 */
class PowerUpSystem extends System {
  /**
   * Create a new power-up system
   * @param {World} world - Reference to the world
   */
  constructor(world) {
    super(world);
    this.requiredComponents = ['PowerUp'];
    this.priority = 12; // Run after physics but before input/rendering
    
    // Store active power-ups with timers
    this.activePowerUps = new Map();
  }
  
  /**
   * Initialize the power-up system
   */
  init() {
    // Listen for power-up collection event
    this.world.on('powerUpCollected', this.handlePowerUpCollected.bind(this));
    
    // Listen for power-up activation event
    this.world.on('powerUpActivated', this.handlePowerUpActivated.bind(this));
  }
  
  /**
   * Update the power-up system
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    // Update active power-ups
    this.updateActivePowerUps(deltaTime);
    
    // Update floating power-ups
    this.updateFloatingPowerUps(deltaTime);
  }
  
  /**
   * Update active power-ups
   * @param {number} deltaTime - Time since last update in seconds
   */
  updateActivePowerUps(deltaTime) {
    // Track power-ups to remove
    const toRemove = [];
    
    // Update each active power-up
    this.activePowerUps.forEach((data, entityId) => {
      const { powerUp, targetEntity } = data;
      
      // Update power-up
      powerUp.update(targetEntity, deltaTime);
      
      // Check if power-up has expired
      if (!powerUp.active) {
        toRemove.push(entityId);
      }
    });
    
    // Remove expired power-ups
    for (const entityId of toRemove) {
      this.activePowerUps.delete(entityId);
    }
  }
  
  /**
   * Update floating power-up entities
   * @param {number} deltaTime - Time since last update in seconds
   */
  updateFloatingPowerUps(deltaTime) {
    // Get all power-up entities
    const entities = this.getCompatibleEntities();
    
    for (const entity of entities) {
      const powerUp = entity.getComponent('PowerUp');
      const transform = entity.getComponent('Transform');
      const renderer = entity.getComponent('Renderer');
      
      if (!powerUp || !transform || !renderer || powerUp.collected) continue;
      
      // Update floating animation
      const floatingObject = entity.getComponent('FloatingObject');
      if (floatingObject) {
        // Update time
        floatingObject.time = (floatingObject.time || 0) + deltaTime * floatingObject.floatSpeed;
        
        // Set Y position based on sine wave
        transform.position.y = floatingObject.initialY + 
          Math.sin(floatingObject.time) * floatingObject.floatHeight;
        
        // Rotate if enabled
        if (floatingObject.rotationSpeed) {
          const rotationEuler = new THREE.Euler(0, floatingObject.rotationSpeed * deltaTime, 0);
          const rotationQuaternion = new THREE.Quaternion().setFromEuler(rotationEuler);
          
          transform.rotation.premultiply(rotationQuaternion);
          transform.updateMatrix();
        }
      }
    }
  }
  
  /**
   * Handle power-up collected event
   * @param {Object} data - Event data
   */
  handlePowerUpCollected(data) {
    const { entity, powerUp, powerUpEntity } = data;
    
    if (!entity || !powerUp || !powerUpEntity) return;
    
    // Mark power-up as collected
    powerUp.collected = true;
    
    // Update visibility
    const renderer = powerUpEntity.getComponent('Renderer');
    if (renderer && renderer.mesh) {
      renderer.mesh.visible = false;
    }
    
    // Add power-up to player's inventory
    this.addPowerUpToPlayer(entity, powerUp);
    
    // Trigger collected sound effect
    this.playCollectedSound(powerUp.type);
  }
  
  /**
   * Add a power-up to a player's inventory
   * @param {Entity} playerEntity - Player entity
   * @param {PowerUp} powerUp - Power-up component
   */
  addPowerUpToPlayer(playerEntity, powerUp) {
    // Check if player already has a PowerUpManager component
    let powerUpManager = playerEntity.getComponent('PowerUpManager');
    
    // If not, create one
    if (!powerUpManager) {
      powerUpManager = {
        activePowerUp: null,
        inventory: []
      };
      playerEntity.addComponent('PowerUpManager', powerUpManager);
    }
    
    // Clone the power-up to add to inventory
    const powerUpClone = powerUp.clone();
    
    // Add to inventory
    powerUpManager.inventory.push(powerUpClone);
    
    // If no active power-up, set this as active
    if (!powerUpManager.activePowerUp) {
      powerUpManager.activePowerUp = powerUpClone;
    }
    
    // Trigger event
    this.world.triggerEvent('powerUpAddedToInventory', {
      entity: playerEntity,
      powerUp: powerUpClone
    });
  }
  
  /**
   * Handle power-up activated event
   * @param {Object} data - Event data
   */
  handlePowerUpActivated(data) {
    const { entity, powerUp } = data;
    
    if (!entity || !powerUp) return;
    
    // Activate the power-up
    if (powerUp.activate(entity)) {
      // Store in active power-ups if successful
      this.activePowerUps.set(entity.id, {
        powerUp,
        targetEntity: entity
      });
      
      // Remove from player's inventory
      this.removePowerUpFromInventory(entity, powerUp);
      
      // Trigger activation sound effect
      this.playActivationSound(powerUp.type);
      
      // Trigger particle effect
      this.createActivationEffect(entity, powerUp);
    }
  }
  
  /**
   * Remove a power-up from a player's inventory
   * @param {Entity} playerEntity - Player entity
   * @param {PowerUp} powerUp - Power-up component to remove
   */
  removePowerUpFromInventory(playerEntity, powerUp) {
    // Get power-up manager
    const powerUpManager = playerEntity.getComponent('PowerUpManager');
    if (!powerUpManager) return;
    
    // Remove from inventory
    powerUpManager.inventory = powerUpManager.inventory.filter(p => p !== powerUp);
    
    // If this was the active power-up, set the next one as active
    if (powerUpManager.activePowerUp === powerUp) {
      powerUpManager.activePowerUp = powerUpManager.inventory.length > 0 ?
        powerUpManager.inventory[0] : null;
    }
  }
  
  /**
   * Play power-up collected sound effect
   * @param {string} powerUpType - Type of power-up
   */
  playCollectedSound(powerUpType) {
    // In a real implementation, this would play an appropriate sound effect
    console.log(`Power-up collected sound: ${powerUpType}`);
  }
  
  /**
   * Play power-up activation sound effect
   * @param {string} powerUpType - Type of power-up
   */
  playActivationSound(powerUpType) {
    // In a real implementation, this would play an appropriate sound effect
    console.log(`Power-up activation sound: ${powerUpType}`);
  }
  
  /**
   * Create activation particle effect
   * @param {Entity} entity - Entity that activated the power-up
   * @param {PowerUp} powerUp - Activated power-up
   */
  createActivationEffect(entity, powerUp) {
    // Get entity position
    const transform = entity.getComponent('Transform');
    if (!transform) return;
    
    // Get power-up color
    const color = powerUp.effectColor;
    
    // In a real implementation, this would create a particle effect
    // at the entity's position with the power-up's color
    console.log(`Power-up activation effect: ${powerUp.type} at ${transform.position.x}, ${transform.position.y}, ${transform.position.z}`);
  }
  
  /**
   * Apply power-up effects directly
   * @param {string} powerUpType - Type of power-up to apply
   * @param {Entity} entity - Entity to apply effects to
   * @param {number} duration - Duration in seconds
   */
  applyPowerUpEffects(powerUpType, entity, duration) {
    // Create a temporary power-up
    const powerUp = {
      type: powerUpType,
      duration: duration || 5,
      effectColor: this.getPowerUpColor(powerUpType),
      active: false,
      
      activate: (targetEntity) => {
        // Apply effects based on power-up type
        const physics = targetEntity.getComponent('Physics');
        const renderer = targetEntity.getComponent('Renderer');
        
        if (!physics || !renderer) return false;
        
        switch (powerUpType) {
          case 'rocketDash':
            // Apply forward impulse
            const impulse = new THREE.Vector3(0, 0, -15); // Forward direction
            physics.applyImpulse(impulse);
            
            // Set trail effect
            if (renderer.trail) {
              renderer.trailMaterial.color.setHex(this.getPowerUpColor(powerUpType));
              renderer.trailMaterial.opacity = 0.9;
            }
            break;
            
          case 'stickyMode':
            // Increase friction
            physics.friction = 0.8;
            
            // Set trail effect
            if (renderer.trail) {
              renderer.trailMaterial.color.setHex(this.getPowerUpColor(powerUpType));
            }
            break;
            
          case 'bouncy':
            // Set bouncy flag
            physics.restitution = 1.5;
            targetEntity.addTag('bouncy');
            
            // Set trail effect
            if (renderer.trail) {
              renderer.trailMaterial.color.setHex(this.getPowerUpColor(powerUpType));
            }
            break;
            
          case 'gravityFlip':
            // Store current gravity for restoration later
            this.originalGravity = this.world.getSystem('PhysicsSystem').gravity.y;
            
            // Flip gravity
            this.world.getSystem('PhysicsSystem').setGravity({ 
              x: 0, 
              y: -this.originalGravity, 
              z: 0 
            });
            
            // Apply initial upward impulse
            physics.applyImpulse(new THREE.Vector3(0, 10, 0));
            
            // Set trail effect
            if (renderer.trail) {
              renderer.trailMaterial.color.setHex(this.getPowerUpColor(powerUpType));
            }
            break;
        }
        
        this.active = true;
        this.timeRemaining = this.duration;
        
        // Create activation effect
        this.createActivationEffect(targetEntity, this);
        
        return true;
      },
      
      deactivate: (targetEntity) => {
        // Remove effects based on power-up type
        const physics = targetEntity.getComponent('Physics');
        const renderer = targetEntity.getComponent('Renderer');
        
        if (!physics || !renderer) return;
        
        switch (powerUpType) {
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
            targetEntity.removeTag('bouncy');
            
            // Reset trail effect
            if (renderer.trail) {
              renderer.trailMaterial.color.setHex(0x00ff9f); // Default color
            }
            break;
            
          case 'gravityFlip':
            // Restore original gravity
            if (this.originalGravity !== undefined) {
              this.world.getSystem('PhysicsSystem').setGravity({ 
                x: 0, 
                y: this.originalGravity, 
                z: 0 
              });
            }
            
            // Reset trail effect
            if (renderer.trail) {
              renderer.trailMaterial.color.setHex(0x00ff9f); // Default color
            }
            break;
        }
        
        this.active = false;
      },
      
      update: (targetEntity, deltaTime) => {
        // Update time remaining
        this.timeRemaining -= deltaTime;
        
        // Check if power-up should be deactivated
        if (this.timeRemaining <= 0) {
          this.deactivate(targetEntity);
          return;
        }
        
        // Apply continuous effects
        switch (powerUpType) {
          case 'rocketDash':
            // Add particle trail effect
            if (renderer.trail) {
              // Increase trail intensity based on remaining time
              const intensityFactor = Math.min(1.0, this.timeRemaining / this.duration + 0.5);
              renderer.trailMaterial.opacity = 0.9 * intensityFactor;
            }
            break;
            
          case 'gravityFlip':
            // Decrease gravity effect as time runs out
            if (this.timeRemaining < 1.0) {
              // Gradually restore normal gravity in the last second
              const lerpFactor = this.timeRemaining;
              const targetGravity = this.originalGravity;
              const currentGravity = this.world.getSystem('PhysicsSystem').gravity.y;
              
              this.world.getSystem('PhysicsSystem').setGravity({ 
                x: 0, 
                y: currentGravity * lerpFactor + targetGravity * (1 - lerpFactor), 
                z: 0 
              });
            }
            break;
        }
      }
    };
    
    // Activate the power-up
    if (powerUp.activate(entity)) {
      // Store in active power-ups
      this.activePowerUps.set(entity.id + '_temp_' + Date.now(), {
        powerUp,
        targetEntity: entity
      });
      
      // Trigger activation sound effect
      this.playActivationSound(powerUpType);
    }
  }
  
  /**
   * Get color for a power-up type
   * @param {string} powerUpType - Type of power-up
   * @returns {number} Color as hex
   */
  getPowerUpColor(powerUpType) {
    switch (powerUpType) {
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
   * Dispose resources
   */
  dispose() {
    // Deactivate all active power-ups
    this.activePowerUps.forEach((data, entityId) => {
      const { powerUp, targetEntity } = data;
      
      if (powerUp.active) {
        powerUp.deactivate(targetEntity);
      }
    });
    
    // Clear active power-ups
    this.activePowerUps.clear();
    
    // Remove event listeners
    this.world.off('powerUpCollected', this.handlePowerUpCollected);
    this.world.off('powerUpActivated', this.handlePowerUpActivated);
  }
}

export default PowerUpSystem;