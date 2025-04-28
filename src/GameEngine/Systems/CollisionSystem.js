// src/GameEngine/Systems/CollisionSystem.js
import * as THREE from 'three';
import System from '../ECS/System';

/**
 * CollisionSystem - Handles collision detection and response
 * Note: This system is used for simplified collision detection 
 * when not using the Rapier physics engine
 */
class CollisionSystem extends System {
  /**
   * Create a new collision system
   * @param {World} world - Reference to the world
   */
  constructor(world) {
    super(world);
    this.requiredComponents = ['Transform', 'Collider'];
    this.priority = 15; // Run after physics but before rendering
    
    // Spatial partitioning grid for optimization
    this.grid = {
      cellSize: 5,
      cells: new Map()
    };
    
    // Collision pairs for continuous detection
    this.collisionPairs = new Map();
  }
  
  /**
   * Initialize the collision system
   */
  init() {
    // Check if physics system exists
    this.hasPhysicsSystem = this.world.systems.some(
      system => system.constructor.name === 'PhysicsSystem'
    );
    
    // If we have a physics system with Rapier, this system is supplementary
    if (this.hasPhysicsSystem) {
      console.log('Physics system detected, CollisionSystem will handle non-physics collisions only');
    }
  }
  
  /**
   * Update the collision system
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    // Skip detailed collision detection if we have a physics system
    // The physics system will handle most collisions more accurately
    if (this.hasPhysicsSystem) {
      this.updateTriggers();
      return;
    }
    
    // Update spatial partitioning grid
    this.updateGrid();
    
    // Detect collisions
    this.detectCollisions();
    
    // Resolve collisions
    this.resolveCollisions();
  }
  
  /**
   * Update the spatial partitioning grid
   */
  updateGrid() {
    // Clear the grid
    this.grid.cells.clear();
    
    // Get all entities with colliders
    const entities = this.getCompatibleEntities();
    
    // Add entities to the grid
    for (const entity of entities) {
      // Skip inactive entities
      if (!entity.isActive()) continue;
      
      const transform = entity.getComponent('Transform');
      const collider = entity.getComponent('Collider');
      
      if (!transform || !collider) continue;
      
      // Calculate entity boundaries
      const bounds = this.calculateBounds(transform, collider);
      
      // Calculate grid cells the entity occupies
      const minCellX = Math.floor(bounds.min.x / this.grid.cellSize);
      const minCellY = Math.floor(bounds.min.y / this.grid.cellSize);
      const minCellZ = Math.floor(bounds.min.z / this.grid.cellSize);
      const maxCellX = Math.floor(bounds.max.x / this.grid.cellSize);
      const maxCellY = Math.floor(bounds.max.y / this.grid.cellSize);
      const maxCellZ = Math.floor(bounds.max.z / this.grid.cellSize);
      
      // Add entity to all occupied cells
      for (let x = minCellX; x <= maxCellX; x++) {
        for (let y = minCellY; y <= maxCellY; y++) {
          for (let z = minCellZ; z <= maxCellZ; z++) {
            const cellKey = `${x},${y},${z}`;
            
            if (!this.grid.cells.has(cellKey)) {
              this.grid.cells.set(cellKey, []);
            }
            
            this.grid.cells.get(cellKey).push(entity);
          }
        }
      }
    }
  }
  
  /**
   * Calculate bounds for an entity based on its transform and collider
   * @param {Transform} transform - Transform component
   * @param {Collider} collider - Collider component
   * @returns {Object} Bounds with min and max vectors
   */
  calculateBounds(transform, collider) {
    const position = transform.position;
    const offset = collider.offset || { x: 0, y: 0, z: 0 };
    
    // Calculate center with offset
    const center = {
      x: position.x + offset.x,
      y: position.y + offset.y,
      z: position.z + offset.z
    };
    
    // Calculate extent based on collider type
    let extentX = 0.5;
    let extentY = 0.5;
    let extentZ = 0.5;
    
    switch (collider.type) {
      case 'box':
        extentX = collider.size.x;
        extentY = collider.size.y;
        extentZ = collider.size.z;
        break;
        
      case 'sphere':
        extentX = collider.size.radius;
        extentY = collider.size.radius;
        extentZ = collider.size.radius;
        break;
        
      case 'capsule':
        extentX = collider.size.radius;
        extentY = collider.size.halfHeight + collider.size.radius;
        extentZ = collider.size.radius;
        break;
        
      case 'cylinder':
        extentX = collider.size.radius;
        extentY = collider.size.halfHeight;
        extentZ = collider.size.radius;
        break;
    }
    
    // Apply scale
    const scale = transform.scale;
    extentX *= scale.x;
    extentY *= scale.y;
    extentZ *= scale.z;
    
    // Calculate min and max
    const min = {
      x: center.x - extentX,
      y: center.y - extentY,
      z: center.z - extentZ
    };
    
    const max = {
      x: center.x + extentX,
      y: center.y + extentY,
      z: center.z + extentZ
    };
    
    return {
      min: new THREE.Vector3(min.x, min.y, min.z),
      max: new THREE.Vector3(max.x, max.y, max.z)
    };
  }
  
  /**
   * Detect collisions between entities
   */
  detectCollisions() {
    // Clear previous collision pairs
    this.collisionPairs.clear();
    
    // Process each grid cell
    for (const [_, entities] of this.grid.cells) {
      // Skip cells with 0 or 1 entities
      if (entities.length <= 1) continue;
      
      // Check collisions between all entities in the cell
      for (let i = 0; i < entities.length; i++) {
        const entityA = entities[i];
        
        for (let j = i + 1; j < entities.length; j++) {
          const entityB = entities[j];
          
          // Skip if both entities are static
          const physicsA = entityA.getComponent('Physics');
          const physicsB = entityB.getComponent('Physics');
          
          if (physicsA && physicsB && physicsA.isStatic && physicsB.isStatic) {
            continue;
          }
          
          // Skip if either entity is not active
          if (!entityA.isActive() || !entityB.isActive()) {
            continue;
          }
          
          // Get transform and collider components
          const transformA = entityA.getComponent('Transform');
          const colliderA = entityA.getComponent('Collider');
          const transformB = entityB.getComponent('Transform');
          const colliderB = entityB.getComponent('Collider');
          
          if (!transformA || !colliderA || !transformB || !colliderB) {
            continue;
          }
          
          // Check for collision
          const collision = this.checkCollision(
            entityA,
            transformA,
            colliderA,
            entityB,
            transformB,
            colliderB
          );
          
          // If collision detected, add to collision pairs
          if (collision) {
            const pairKey = entityA.id < entityB.id ? 
              `${entityA.id}:${entityB.id}` : 
              `${entityB.id}:${entityA.id}`;
            
            this.collisionPairs.set(pairKey, {
              entityA,
              entityB,
              collision
            });
          }
        }
      }
    }
  }
  
  /**
   * Check collision between two entities
   * @param {Entity} entityA - First entity
   * @param {Transform} transformA - First entity's transform
   * @param {Collider} colliderA - First entity's collider
   * @param {Entity} entityB - Second entity
   * @param {Transform} transformB - Second entity's transform
   * @param {Collider} colliderB - Second entity's collider
   * @returns {Object|null} Collision data or null if no collision
   */
  checkCollision(entityA, transformA, colliderA, entityB, transformB, colliderB) {
    // Use collider's built-in collision detection
    return colliderA.checkCollision(
      colliderB,
      transformA.position,
      transformB.position
    );
  }
  
  /**
   * Resolve collisions
   */
  resolveCollisions() {
    // Process each collision pair
    for (const [_, data] of this.collisionPairs) {
      const { entityA, entityB, collision } = data;
      
      // Handle triggers
      const isTrigger = this.handleTriggers(entityA, entityB, collision);
      
      // Skip physical resolution for triggers
      if (isTrigger) continue;
      
      // Physical resolution
      this.resolveCollision(entityA, entityB, collision);
    }
    
    // Process end of collisions
    this.processEndCollisions();
  }
  
  /**
   * Handle triggers
   * @param {Entity} entityA - First entity
   * @param {Entity} entityB - Second entity
   * @param {Object} collision - Collision data
   * @returns {boolean} Whether this is a trigger
   */
  handleTriggers(entityA, entityB, collision) {
    const colliderA = entityA.getComponent('Collider');
    const colliderB = entityB.getComponent('Collider');
    
    // Check if either collider is a trigger
    const isTrigger = colliderA.isTrigger || colliderB.isTrigger;
    
    if (isTrigger) {
      // Process trigger event for both entities
      if (colliderA.isTrigger) {
        colliderA.processCollision(entityA, entityB, collision);
      }
      
      if (colliderB.isTrigger) {
        colliderB.processCollision(entityB, entityA, collision);
      }
      
      // Store current trigger state
      const pairKey = entityA.id < entityB.id ? 
        `${entityA.id}:${entityB.id}` : 
        `${entityB.id}:${entityA.id}`;
      
      // Store in collider's triggers list
      if (colliderA.isTrigger && !colliderA.currentTriggers.has(entityB.id)) {
        colliderA.currentTriggers.set(entityB.id, {
          entity: entityB,
          time: Date.now()
        });
      }
      
      if (colliderB.isTrigger && !colliderB.currentTriggers.has(entityA.id)) {
        colliderB.currentTriggers.set(entityA.id, {
          entity: entityA,
          time: Date.now()
        });
      }
    }
    
    return isTrigger;
  }
  
  /**
   * Resolve a collision physically
   * @param {Entity} entityA - First entity
   * @param {Entity} entityB - Second entity
   * @param {Object} collision - Collision data
   */
  resolveCollision(entityA, entityB, collision) {
    // Get necessary components
    const physicsA = entityA.getComponent('Physics');
    const physicsB = entityB.getComponent('Physics');
    const transformA = entityA.getComponent('Transform');
    const transformB = entityB.getComponent('Transform');
    const colliderA = entityA.getComponent('Collider');
    const colliderB = entityB.getComponent('Collider');
    
    if (!physicsA || !physicsB || !transformA || !transformB) {
      return;
    }
    
    // Skip if either is static and the other is static or kinematic
    if ((physicsA.isStatic && (physicsB.isStatic || physicsB.isKinematic)) ||
        (physicsB.isStatic && (physicsA.isStatic || physicsA.isKinematic))) {
      return;
    }
    
    // Position correction
    this.correctPositions(entityA, entityB, collision, physicsA, physicsB, transformA, transformB);
    
    // Velocity resolution
    this.resolveVelocities(entityA, entityB, collision, physicsA, physicsB, colliderA, colliderB);
    
    // Process collision callbacks
    colliderA.processCollision(entityA, entityB, collision);
    colliderB.processCollision(entityB, entityA, collision);
  }
  
  /**
   * Correct positions to resolve penetration
   * @param {Entity} entityA - First entity
   * @param {Entity} entityB - Second entity
   * @param {Object} collision - Collision data
   * @param {Physics} physicsA - First entity's physics
   * @param {Physics} physicsB - Second entity's physics
   * @param {Transform} transformA - First entity's transform
   * @param {Transform} transformB - Second entity's transform
   */
  correctPositions(entityA, entityB, collision, physicsA, physicsB, transformA, transformB) {
    // Skip position correction for kinematic bodies
    if (physicsA.isKinematic && physicsB.isKinematic) {
      return;
    }
    
    // Calculate mass factors
    const totalMass = physicsA.mass + physicsB.mass;
    const ratioA = physicsA.isStatic || physicsA.isKinematic ? 0 : physicsB.mass / totalMass;
    const ratioB = physicsB.isStatic || physicsB.isKinematic ? 0 : physicsA.mass / totalMass;
    
    // Correction direction
    const normal = new THREE.Vector3(
      collision.direction.x,
      collision.direction.y,
      collision.direction.z
    );
    
    // Apply correction
    if (!physicsA.isStatic && !physicsA.isKinematic) {
      transformA.position.x -= normal.x * collision.penetration * ratioA;
      transformA.position.y -= normal.y * collision.penetration * ratioA;
      transformA.position.z -= normal.z * collision.penetration * ratioA;
    }
    
    if (!physicsB.isStatic && !physicsB.isKinematic) {
      transformB.position.x += normal.x * collision.penetration * ratioB;
      transformB.position.y += normal.y * collision.penetration * ratioB;
      transformB.position.z += normal.z * collision.penetration * ratioB;
    }
  }
  
  /**
   * Resolve velocities for collision response
   * @param {Entity} entityA - First entity
   * @param {Entity} entityB - Second entity
   * @param {Object} collision - Collision data
   * @param {Physics} physicsA - First entity's physics
   * @param {Physics} physicsB - Second entity's physics
   * @param {Collider} colliderA - First entity's collider
   * @param {Collider} colliderB - Second entity's collider
   */
  resolveVelocities(entityA, entityB, collision, physicsA, physicsB, colliderA, colliderB) {
    // Skip velocity resolution for static or kinematic bodies
    if ((physicsA.isStatic || physicsA.isKinematic) && 
        (physicsB.isStatic || physicsB.isKinematic)) {
      return;
    }
    
    // Collision normal
    const normal = new THREE.Vector3(
      collision.direction.x,
      collision.direction.y,
      collision.direction.z
    );
    
    // Relative velocity
    const relativeVelocity = new THREE.Vector3();
    relativeVelocity.subVectors(physicsB.velocity, physicsA.velocity);
    
    // Calculate impulse
    const normalVelocity = relativeVelocity.dot(normal);
    
    // Exit if objects are separating
    if (normalVelocity > 0) {
      return;
    }
    
    // Calculate restitution (bounciness)
    const restitution = Math.min(colliderA.restitution, colliderB.restitution);
    
    // Calculate impulse scalar
    let j = -(1 + restitution) * normalVelocity;
    j /= physicsA.inverseMass + physicsB.inverseMass;
    
    // Apply impulse
    const impulse = normal.clone().multiplyScalar(j);
    
    if (!physicsA.isStatic && !physicsA.isKinematic) {
      physicsA.velocity.x -= impulse.x * physicsA.inverseMass;
      physicsA.velocity.y -= impulse.y * physicsA.inverseMass;
      physicsA.velocity.z -= impulse.z * physicsA.inverseMass;
    }
    
    if (!physicsB.isStatic && !physicsB.isKinematic) {
      physicsB.velocity.x += impulse.x * physicsB.inverseMass;
      physicsB.velocity.y += impulse.y * physicsB.inverseMass;
      physicsB.velocity.z += impulse.z * physicsB.inverseMass;
    }
    
    // Apply friction
    this.applyFriction(physicsA, physicsB, normal, j, colliderA, colliderB);
  }
  
  /**
   * Apply friction between colliding objects
   * @param {Physics} physicsA - First entity's physics
   * @param {Physics} physicsB - Second entity's physics
   * @param {THREE.Vector3} normal - Collision normal
   * @param {number} impulse - Collision impulse
   * @param {Collider} colliderA - First entity's collider
   * @param {Collider} colliderB - Second entity's collider
   */
  applyFriction(physicsA, physicsB, normal, impulse, colliderA, colliderB) {
    // Calculate relative velocity
    const relativeVelocity = new THREE.Vector3();
    relativeVelocity.subVectors(physicsB.velocity, physicsA.velocity);
    
    // Calculate tangent vector (perpendicular to normal)
    const tangent = new THREE.Vector3();
    tangent.copy(relativeVelocity);
    tangent.addScaledVector(normal, -relativeVelocity.dot(normal));
    
    // Skip if tangent is very small
    const tangentLength = tangent.length();
    if (tangentLength < 0.0001) {
      return;
    }
    
    // Normalize tangent
    tangent.divideScalar(tangentLength);
    
    // Calculate friction coefficient (average of both objects)
    const friction = (colliderA.friction + colliderB.friction) * 0.5;
    
    // Calculate friction impulse
    let jt = -relativeVelocity.dot(tangent) * friction;
    jt /= physicsA.inverseMass + physicsB.inverseMass;
    
    // Apply friction impulse
    const frictionImpulse = tangent.clone().multiplyScalar(jt);
    
    if (!physicsA.isStatic && !physicsA.isKinematic) {
      physicsA.velocity.x -= frictionImpulse.x * physicsA.inverseMass;
      physicsA.velocity.y -= frictionImpulse.y * physicsA.inverseMass;
      physicsA.velocity.z -= frictionImpulse.z * physicsA.inverseMass;
    }
    
    if (!physicsB.isStatic && !physicsB.isKinematic) {
      physicsB.velocity.x += frictionImpulse.x * physicsB.inverseMass;
      physicsB.velocity.y += frictionImpulse.y * physicsB.inverseMass;
      physicsB.velocity.z += frictionImpulse.z * physicsB.inverseMass;
    }
  }
  
  /**
   * Update triggers 
   * Handles trigger events when using the physics system
   */
  updateTriggers() {
    const entities = this.getCompatibleEntities();
    
    // Go through all entities with colliders
    for (const entity of entities) {
      // Skip inactive entities
      if (!entity.isActive()) continue;
      
      const collider = entity.getComponent('Collider');
      if (!collider || !collider.isTrigger) continue;
      
      // Process active triggers
      this.processActiveTriggers(entity, collider);
    }
  }
  
  /**
   * Process active triggers for an entity
   * @param {Entity} entity - Entity to process
   * @param {Collider} collider - Collider component
   */
  processActiveTriggers(entity, collider) {
    // Get list of entities to check if they're still in the trigger
    const triggerEntities = [];
    collider.currentTriggers.forEach((data, entityId) => {
      const otherEntity = this.world.getEntity(entityId);
      if (otherEntity && otherEntity.isActive()) {
        triggerEntities.push(otherEntity);
      } else {
        // Remove from triggers if entity no longer exists or is inactive
        collider.currentTriggers.delete(entityId);
      }
    });
    
    // Process end of collisions
    collider.processEndCollisions(entity, triggerEntities);
  }
  
  /**
   * Process end of collisions
   * Updates collision state for continuous detection
   */
  processEndCollisions() {
    const entities = this.getCompatibleEntities();
    
    // Go through all entities with colliders
    for (const entity of entities) {
      // Skip inactive entities
      if (!entity.isActive()) continue;
      
      const collider = entity.getComponent('Collider');
      if (!collider) continue;
      
      // Get list of entities we're currently colliding with
      const collidingEntities = [];
      
      // Check all collision pairs
      for (const [pairKey, data] of this.collisionPairs) {
        if (data.entityA.id === entity.id) {
          collidingEntities.push(data.entityB);
        } else if (data.entityB.id === entity.id) {
          collidingEntities.push(data.entityA);
        }
      }
      
      // Process end of collisions
      collider.processEndCollisions(entity, collidingEntities);
    }
  }
  
  /**
   * Dispose resources
   */
  dispose() {
    // Clear maps
    this.grid.cells.clear();
    this.collisionPairs.clear();
  }
}

export default CollisionSystem;