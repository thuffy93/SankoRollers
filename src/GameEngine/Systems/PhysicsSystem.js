// src/GameEngine/Systems/PhysicsSystem.js
import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import System from '../ECS/System';

/**
 * PhysicsSystem - Handles physics simulation using Rapier
 */
class PhysicsSystem extends System {
  /**
   * Create a new physics system
   * @param {World} world - Reference to the world
   */
  constructor(world) {
    super(world);
    this.requiredComponents = ['Physics', 'Transform'];
    this.priority = 10; // Run before other systems
    
    // Rapier physics world
    this.rapierWorld = null;
    this.gravity = { x: 0, y: -9.81, z: 0 };
    this.initialized = false;
    
    // Maps for tracking Rapier bodies and colliders
    this.rigidBodies = new Map(); // Entity ID to Rapier rigid body
    this.colliders = new Map();   // Entity ID to Rapier collider
    
    // Physics materials
    this.materials = {
      default: {
        friction: 0.5,
        restitution: 0.3
      },
      roller: {
        friction: 0.1,
        restitution: 0.6
      },
      wall: {
        friction: 0.8,
        restitution: 0.2
      },
      obstacle: {
        friction: 0.7,
        restitution: 0.4
      },
      hole: {
        friction: 0.9,
        restitution: 0.1
      }
    };
    
    // Event queue for collision detection
    this.eventQueue = null;
  }
  
  /**
   * Initialize the physics system
   */
  async init() {
    try {
      // Initialize Rapier physics
      await RAPIER.init();
      
      // Create physics world
      this.rapierWorld = new RAPIER.World(this.gravity);
      
      // Create event queue for collision detection
      this.eventQueue = new RAPIER.EventQueue(true);
      
      console.log('Rapier physics initialized');
      this.initialized = true;
      
      // Create physics bodies for existing entities
      const entities = this.getCompatibleEntities();
      for (const entity of entities) {
        this.createPhysicsBody(entity);
      }
    } catch (error) {
      console.error('Failed to initialize Rapier physics:', error);
    }
  }
  
  /**
   * Update the physics system
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    if (!this.initialized) return;
    
    // Step physics world
    this.rapierWorld.step(this.eventQueue);
    
    // Update entity transforms from physics bodies
    const entities = this.getCompatibleEntities();
    for (const entity of entities) {
      this.updateEntityFromPhysics(entity);
    }
    
    // Process collision events
    this.processCollisionEvents();
  }
  
  /**
   * Create a physics body for an entity
   * @param {Entity} entity - Entity to create physics body for
   */
  createPhysicsBody(entity) {
    if (!this.initialized) return;
    
    const physics = entity.getComponent('Physics');
    const transform = entity.getComponent('Transform');
    const colliderComp = entity.getComponent('Collider');
    
    if (!physics || !transform) return;
    
    // Remove existing physics body if any
    this.removePhysicsBody(entity);
    
    // Create rigid body description
    let rigidBodyDesc;
    if (physics.isStatic) {
      rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
    } else if (physics.isKinematic) {
      rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
    } else {
      rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setLinearDamping(physics.linearDamping)
        .setAngularDamping(physics.angularDamping)
        .setCanSleep(true);
    }
    
    // Set position and rotation
    rigidBodyDesc.setTranslation(
      transform.position.x,
      transform.position.y,
      transform.position.z
    );
    
    rigidBodyDesc.setRotation({
      x: transform.rotation.x,
      y: transform.rotation.y,
      z: transform.rotation.z,
      w: transform.rotation.w
    });
    
    // Create rigid body
    const rigidBody = this.rapierWorld.createRigidBody(rigidBodyDesc);
    
    // Create collider if there's a collider component
    if (colliderComp) {
      this.createCollider(entity, rigidBody, colliderComp);
    } else {
      // Create default collider based on physics properties
      this.createDefaultCollider(entity, rigidBody, physics);
    }
    
    // Store reference to rigid body
    this.rigidBodies.set(entity.id, rigidBody);
    
    // Store handle in physics component for direct access
    physics.rapierBody = rigidBody;
  }
  
  /**
   * Create a collider for an entity
   * @param {Entity} entity - Entity to create collider for
   * @param {RAPIER.RigidBody} rigidBody - Rapier rigid body
   * @param {Collider} colliderComp - Collider component
   */
  createCollider(entity, rigidBody, colliderComp) {
    if (!this.initialized) return;
    
    // Get material properties
    const materialName = colliderComp.material || 'default';
    const material = this.materials[materialName] || this.materials.default;
    
    // Create collider description based on collider type
    let colliderDesc;
    
    switch (colliderComp.type) {
      case 'box':
        colliderDesc = RAPIER.ColliderDesc.cuboid(
          colliderComp.size.x,
          colliderComp.size.y,
          colliderComp.size.z
        );
        break;
        
      case 'sphere':
        colliderDesc = RAPIER.ColliderDesc.ball(colliderComp.size.radius);
        break;
        
      case 'capsule':
        colliderDesc = RAPIER.ColliderDesc.capsule(
          colliderComp.size.halfHeight,
          colliderComp.size.radius
        );
        break;
        
      case 'cylinder':
        colliderDesc = RAPIER.ColliderDesc.cylinder(
          colliderComp.size.halfHeight,
          colliderComp.size.radius
        );
        break;
        
      case 'convex':
        // Convex hull requires points, which should be in colliderComp.size.points
        if (colliderComp.size.points) {
          colliderDesc = RAPIER.ColliderDesc.convexHull(colliderComp.size.points);
        } else {
          console.warn(`Convex collider missing points for entity ${entity.id}, using box`);
          colliderDesc = RAPIER.ColliderDesc.cuboid(1, 1, 1);
        }
        break;
        
      default:
        console.warn(`Unknown collider type: ${colliderComp.type}, using box`);
        colliderDesc = RAPIER.ColliderDesc.cuboid(1, 1, 1);
        break;
    }
    
    // Apply offset if needed
    if (colliderComp.offset) {
      colliderDesc.setTranslation(
        colliderComp.offset.x,
        colliderComp.offset.y,
        colliderComp.offset.z
      );
    }
    
    // Set material properties
    colliderDesc.setFriction(material.friction);
    colliderDesc.setRestitution(material.restitution);
    
    // Set if this is a sensor
    if (colliderComp.isTrigger) {
      colliderDesc.setSensor(true);
    }
    
    // Create collider
    const collider = this.rapierWorld.createCollider(colliderDesc, rigidBody);
    
    // Store reference to collider
    this.colliders.set(entity.id, collider);
    
    // Store handle in collider component for direct access
    colliderComp.rapierCollider = collider;
    
    return collider;
  }
  
  /**
   * Create a default collider for an entity based on physics properties
   * @param {Entity} entity - Entity to create collider for
   * @param {RAPIER.RigidBody} rigidBody - Rapier rigid body
   * @param {Physics} physics - Physics component
   */
  createDefaultCollider(entity, rigidBody, physics) {
    if (!this.initialized) return;
    
    // Get material properties
    const materialName = physics.materialType || 'default';
    const material = this.materials[materialName] || this.materials.default;
    
    // Create default collider (sphere)
    const colliderDesc = RAPIER.ColliderDesc.ball(0.5);
    
    // Set material properties
    colliderDesc.setFriction(material.friction);
    colliderDesc.setRestitution(material.restitution);
    
    // Set if this is a sensor
    if (physics.isTrigger) {
      colliderDesc.setSensor(true);
    }
    
    // Create collider
    const collider = this.rapierWorld.createCollider(colliderDesc, rigidBody);
    
    // Store reference to collider
    this.colliders.set(entity.id, collider);
    
    return collider;
  }
  
  /**
   * Remove a physics body from an entity
   * @param {Entity} entity - Entity to remove physics body from
   */
  removePhysicsBody(entity) {
    if (!this.initialized) return;
    
    // Get rigid body and collider
    const rigidBody = this.rigidBodies.get(entity.id);
    const collider = this.colliders.get(entity.id);
    
    // Remove collider if it exists
    if (collider) {
      this.rapierWorld.removeCollider(collider, true);
      this.colliders.delete(entity.id);
      
      // Clear reference in collider component
      const colliderComp = entity.getComponent('Collider');
      if (colliderComp) {
        colliderComp.rapierCollider = null;
      }
    }
    
    // Remove rigid body if it exists
    if (rigidBody) {
      this.rapierWorld.removeRigidBody(rigidBody);
      this.rigidBodies.delete(entity.id);
      
      // Clear reference in physics component
      const physics = entity.getComponent('Physics');
      if (physics) {
        physics.rapierBody = null;
      }
    }
  }
  
  /**
   * Update entity transform from physics body
   * @param {Entity} entity - Entity to update
   */
  updateEntityFromPhysics(entity) {
    if (!this.initialized) return;
    
    const physics = entity.getComponent('Physics');
    const transform = entity.getComponent('Transform');
    
    if (!physics || !transform) return;
    
    // Get rigid body
    const rigidBody = this.rigidBodies.get(entity.id);
    if (!rigidBody) return;
    
    // Get position and rotation from rigid body
    const position = rigidBody.translation();
    const rotation = rigidBody.rotation();
    
    // Update transform
    transform.position.set(position.x, position.y, position.z);
    transform.rotation.set(rotation.x, rotation.y, rotation.z, rotation.w);
    transform.updateMatrix();
    
    // Update physics component with current velocities
    const velocity = rigidBody.linvel();
    physics.velocity.set(velocity.x, velocity.y, velocity.z);
    
    const angularVelocity = rigidBody.angvel();
    physics.angularVelocity.set(angularVelocity.x, angularVelocity.y, angularVelocity.z);
    
    // Check if body should go to sleep
    physics.isSleeping = physics.checkSleepState(0.016); // Assume 60fps
  }
  
  /**
   * Process collision events from the event queue
   */
  processCollisionEvents() {
    if (!this.initialized || !this.eventQueue) return;
    
    // Process events
    this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      // Get colliders
      const collider1 = this.rapierWorld.getCollider(handle1);
      const collider2 = this.rapierWorld.getCollider(handle2);
      
      // Find entities for these colliders
      let entity1 = null;
      let entity2 = null;
      
      // Find entity for collider1
      for (const [entityId, collider] of this.colliders.entries()) {
        if (collider.handle == handle1) {
          entity1 = this.world.getEntity(entityId);
          break;
        }
      }
      
      // Find entity for collider2
      for (const [entityId, collider] of this.colliders.entries()) {
        if (collider.handle == handle2) {
          entity2 = this.world.getEntity(entityId);
          break;
        }
      }
      
      // Process collision if both entities were found
      if (entity1 && entity2) {
        this.processCollision(entity1, entity2, started);
      }
    });
  }
  
  /**
   * Process a collision between two entities
   * @param {Entity} entity1 - First entity
   * @param {Entity} entity2 - Second entity
   * @param {boolean} started - Whether the collision started or ended
   */
  processCollision(entity1, entity2, started) {
    // Get collider components
    const collider1 = entity1.getComponent('Collider');
    const collider2 = entity2.getComponent('Collider');
    
    // Determine if this is a trigger or regular collision
    const isTrigger = (collider1 && collider1.isTrigger) || (collider2 && collider2.isTrigger);
    
    if (isTrigger) {
      // Handle trigger
      if (started) {
        // Trigger enter
        if (collider1 && collider1.onTriggerEnter) {
          collider1.onTriggerEnter(entity1, entity2);
        }
        
        if (collider2 && collider2.onTriggerEnter) {
          collider2.onTriggerEnter(entity2, entity1);
        }
      } else {
        // Trigger exit
        if (collider1 && collider1.onTriggerExit) {
          collider1.onTriggerExit(entity1, entity2);
        }
        
        if (collider2 && collider2.onTriggerExit) {
          collider2.onTriggerExit(entity2, entity1);
        }
      }
    } else {
      // Handle collision
      if (started) {
        // Collision enter
        if (collider1 && collider1.onCollisionEnter) {
          collider1.onCollisionEnter(entity1, entity2);
        }
        
        if (collider2 && collider2.onCollisionEnter) {
          collider2.onCollisionEnter(entity2, entity1);
        }
      } else {
        // Collision exit
        if (collider1 && collider1.onCollisionExit) {
          collider1.onCollisionExit(entity1, entity2);
        }
        
        if (collider2 && collider2.onCollisionExit) {
          collider2.onCollisionExit(entity2, entity1);
        }
      }
    }
    
    // Special handling for powerups
    if (started) {
      const powerUp = entity1.getComponent('PowerUp') || entity2.getComponent('PowerUp');
      const ball = entity1.hasTag('ball') ? entity1 : (entity2.hasTag('ball') ? entity2 : null);
      
      if (powerUp && ball) {
        const powerUpEntity = powerUp === entity1.getComponent('PowerUp') ? entity1 : entity2;
        
        // Check if power-up is not already collected
        if (!powerUp.collected) {
          // Mark as collected
          powerUp.collected = true;
          
          // Trigger world event
          this.world.triggerEvent('powerUpCollected', {
            entity: ball,
            powerUp: powerUp,
            powerUpEntity: powerUpEntity
          });
        }
      }
      
      // Special handling for hole
      const hole = entity1.hasTag('hole') ? entity1 : (entity2.hasTag('hole') ? entity2 : null);
      
      if (hole && ball) {
        const course = ball.getComponent('Course');
        const physics = ball.getComponent('Physics');
        
        if (course && physics) {
          // Check if ball is moving slow enough to complete the hole
          const speed = physics.velocity.length();
          const speedThreshold = 2.0;
          
          if (speed < speedThreshold && !course.holeCompleted) {
            // Complete the hole
            course.completeHole();
            
            // Trigger world event
            this.world.triggerEvent('holeCompleted', {
              entity: ball,
              course: course
            });
          }
        }
      }
    }
  }
  
  /**
   * Apply a force to an entity
   * @param {Entity} entity - Entity to apply force to
   * @param {Object} force - Force vector
   * @param {boolean} wake - Whether to wake the body
   */
  applyForce(entity, force, wake = true) {
    if (!this.initialized) return;
    
    const rigidBody = this.rigidBodies.get(entity.id);
    if (!rigidBody) return;
    
    rigidBody.applyForce({ x: force.x, y: force.y, z: force.z }, wake);
  }
  
  /**
   * Apply an impulse to an entity
   * @param {Entity} entity - Entity to apply impulse to
   * @param {Object} impulse - Impulse vector
   * @param {boolean} wake - Whether to wake the body
   */
  applyImpulse(entity, impulse, wake = true) {
    if (!this.initialized) return;
    
    const rigidBody = this.rigidBodies.get(entity.id);
    if (!rigidBody) return;
    
    rigidBody.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, wake);
  }
  
  /**
   * Apply a torque to an entity
   * @param {Entity} entity - Entity to apply torque to
   * @param {Object} torque - Torque vector
   * @param {boolean} wake - Whether to wake the body
   */
  applyTorque(entity, torque, wake = true) {
    if (!this.initialized) return;
    
    const rigidBody = this.rigidBodies.get(entity.id);
    if (!rigidBody) return;
    
    rigidBody.applyTorque({ x: torque.x, y: torque.y, z: torque.z }, wake);
  }
  
  /**
   * Apply an angular impulse to an entity
   * @param {Entity} entity - Entity to apply angular impulse to
   * @param {Object} angularImpulse - Angular impulse vector
   * @param {boolean} wake - Whether to wake the body
   */
  applyAngularImpulse(entity, angularImpulse, wake = true) {
    if (!this.initialized) return;
    
    const rigidBody = this.rigidBodies.get(entity.id);
    if (!rigidBody) return;
    
    rigidBody.applyTorqueImpulse({ x: angularImpulse.x, y: angularImpulse.y, z: angularImpulse.z }, wake);
  }
  
  /**
   * Set linear velocity of an entity
   * @param {Entity} entity - Entity to set velocity for
   * @param {Object} velocity - Velocity vector
   */
  setLinearVelocity(entity, velocity) {
    if (!this.initialized) return;
    
    const rigidBody = this.rigidBodies.get(entity.id);
    if (!rigidBody) return;
    
    rigidBody.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
  }
  
  /**
   * Get linear velocity of an entity
   * @param {Entity} entity - Entity to get velocity for
   * @returns {THREE.Vector3} Velocity vector
   */
  getLinearVelocity(entity) {
    if (!this.initialized) return new THREE.Vector3();
    
    const rigidBody = this.rigidBodies.get(entity.id);
    if (!rigidBody) return new THREE.Vector3();
    
    const velocity = rigidBody.linvel();
    return new THREE.Vector3(velocity.x, velocity.y, velocity.z);
  }
  
  /**
   * Set angular velocity of an entity
   * @param {Entity} entity - Entity to set angular velocity for
   * @param {Object} velocity - Angular velocity vector
   */
  setAngularVelocity(entity, velocity) {
    if (!this.initialized) return;
    
    const rigidBody = this.rigidBodies.get(entity.id);
    if (!rigidBody) return;
    
    rigidBody.setAngvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
  }
  
  /**
   * Get angular velocity of an entity
   * @param {Entity} entity - Entity to get angular velocity for
   * @returns {THREE.Vector3} Angular velocity vector
   */
  getAngularVelocity(entity) {
    if (!this.initialized) return new THREE.Vector3();
    
    const rigidBody = this.rigidBodies.get(entity.id);
    if (!rigidBody) return new THREE.Vector3();
    
    const velocity = rigidBody.angvel();
    return new THREE.Vector3(velocity.x, velocity.y, velocity.z);
  }
  
  /**
   * Set gravity for the physics world
   * @param {Object} gravity - Gravity vector
   * @param {number} multiplier - Gravity multiplier
   */
  setGravity(gravity, multiplier = 1) {
    if (!this.initialized) return;
    
    this.gravity = {
      x: gravity.x * multiplier,
      y: gravity.y * multiplier,
      z: gravity.z * multiplier
    };
    
    // Set gravity in Rapier world
    this.rapierWorld.gravity = this.gravity;
  }
  
  /**
   * Set physical properties of a material
   * @param {string} name - Material name
   * @param {Object} properties - Material properties
   */
  setMaterial(name, properties) {
    if (!name || !properties) return;
    
    this.materials[name] = {
      friction: properties.friction !== undefined ? properties.friction : 0.5,
      restitution: properties.restitution !== undefined ? properties.restitution : 0.3
    };
  }
  
  /**
   * Perform a ray cast
   * @param {THREE.Vector3} origin - Ray origin
   * @param {THREE.Vector3} direction - Ray direction
   * @param {number} maxDistance - Maximum ray distance
   * @returns {Object|null} Hit information or null if no hit
   */
  raycast(origin, direction, maxDistance = 100) {
    if (!this.initialized) return null;
    
    // Normalize direction
    const dir = new THREE.Vector3(direction.x, direction.y, direction.z).normalize();
    
    // Create Rapier ray
    const ray = new RAPIER.Ray(
      { x: origin.x, y: origin.y, z: origin.z },
      { x: dir.x, y: dir.y, z: dir.z }
    );
    
    // Perform ray cast
    const hit = this.rapierWorld.castRay(ray, maxDistance, true);
    
    if (hit) {
      // Get hit collider
      const collider = this.rapierWorld.getCollider(hit.collider);
      
      // Find entity for this collider
      let hitEntity = null;
      for (const [entityId, entityCollider] of this.colliders.entries()) {
        if (entityCollider.handle == collider.handle) {
          hitEntity = this.world.getEntity(entityId);
          break;
        }
      }
      
      // Calculate hit point
      const hitPoint = new THREE.Vector3(
        origin.x + dir.x * hit.toi,
        origin.y + dir.y * hit.toi,
        origin.z + dir.z * hit.toi
      );
      
      return {
        entity: hitEntity,
        point: hitPoint,
        normal: new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z),
        distance: hit.toi
      };
    }
    
    return null;
  }
  
  /**
   * Dispose resources
   */
  dispose() {
    if (!this.initialized) return;
    
    // Clear maps
    this.rigidBodies.clear();
    this.colliders.clear();
    
    // Free Rapier world
    this.rapierWorld.free();
    this.rapierWorld = null;
    this.initialized = false;
  }
}

export default PhysicsSystem;