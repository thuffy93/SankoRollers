// src/GameEngine/PhysicsSystem.js
import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

/**
 * PhysicsSystem - Manages Rapier physics for the game
 */
class PhysicsSystem {
  constructor() {
    this.world = null;
    this.gravity = { x: 0, y: -9.81, z: 0 };
    this.initialized = false;
    this.rigidBodies = new Map(); // Map of THREE.Object3D to Rapier RigidBody
    this.colliders = new Map();   // Map of THREE.Object3D to Rapier Collider
    
    // Store our own user data since Rapier doesn't provide setUserData
    this.colliderUserData = new Map(); // Map of Collider to userData object
    
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
    
    // Event handlers
    this.eventHandlers = {
      // Called when a collision occurs
      collision: null,
      // Called when a sensor is triggered
      sensorEnter: null,
      sensorExit: null
    };
    
    // Initialize Rapier
    this.init();
  }
  
  /**
   * Initialize Rapier physics
   */
  async init() {
    try {
      // Load and initialize Rapier
      await RAPIER.init();
      
      // Create physics world
      this.world = new RAPIER.World(this.gravity);
      
      // Set up event queue for collision detection
      this.eventQueue = new RAPIER.EventQueue(true);
      
      console.log('Rapier physics initialized');
      this.initialized = true;
      
    } catch (error) {
      console.error('Failed to initialize Rapier physics:', error);
    }
  }
  
  /**
   * Wait for physics to initialize
   */
  async waitForInit() {
    if (this.initialized) return;
    
    return new Promise(resolve => {
      const checkInit = () => {
        if (this.initialized) {
          resolve();
        } else {
          setTimeout(checkInit, 100);
        }
      };
      
      checkInit();
    });
  }
  
  /**
   * Set gravity
   * @param {Object} gravity - Gravity vector {x, y, z}
   * @param {number} multiplier - Optional multiplier for gravity strength
   */
  setGravity(gravity, multiplier = 1) {
    if (!this.initialized) return;
    
    this.gravity = {
      x: gravity.x * multiplier,
      y: gravity.y * multiplier,
      z: gravity.z * multiplier
    };
    
    this.world.setGravity({ x: this.gravity.x, y: this.gravity.y, z: this.gravity.z });
  }
  
  /**
   * Flip gravity (for power-up effect)
   */
  flipGravity() {
    if (!this.initialized) return;
    
    this.gravity.y = -this.gravity.y;
    this.world.setGravity({ x: this.gravity.x, y: this.gravity.y, z: this.gravity.z });
  }
  
  /**
   * Create a dynamic rigid body for an object
   * @param {THREE.Object3D} object - Three.js object
   * @param {Object} options - Physics options
   * @returns {RAPIER.RigidBody} Rapier rigid body
   */
  createDynamicBody(object, options = {}) {
    if (!this.initialized || !object) return null;
    
    try {
      // Get object position and rotation
      const position = options.position || object.position;
      const rotation = options.rotation || object.quaternion;
      
      // Create rigid body description
      const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y, position.z);
      
      if (rotation) {
        rigidBodyDesc.setRotation({
          x: rotation.x,
          y: rotation.y,
          z: rotation.z,
          w: rotation.w
        });
      }
      
      // Add rigid body to world
      const rigidBody = this.world.createRigidBody(rigidBodyDesc);
      
      // Store reference to rigid body
      this.rigidBodies.set(object, rigidBody);
      
      // Create collider based on object geometry
      this.createCollider(object, rigidBody, options);
      
      return rigidBody;
    } catch (error) {
      console.error('Error creating dynamic body:', error);
      return null;
    }
  }
  
  /**
   * Create a static rigid body for an object
   * @param {THREE.Object3D} object - Three.js object
   * @param {Object} options - Physics options
   * @returns {RAPIER.RigidBody} Rapier rigid body
   */
  createStaticBody(object, options = {}) {
    if (!this.initialized || !object) return null;
    
    try {
      // Get object position and rotation
      const position = options.position || object.position;
      const rotation = options.rotation || object.quaternion;
      
      // Create rigid body description
      const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(position.x, position.y, position.z);
      
      if (rotation) {
        rigidBodyDesc.setRotation({
          x: rotation.x,
          y: rotation.y,
          z: rotation.z,
          w: rotation.w
        });
      }
      
      // Add rigid body to world
      const rigidBody = this.world.createRigidBody(rigidBodyDesc);
      
      // Store reference to rigid body
      this.rigidBodies.set(object, rigidBody);
      
      // Create collider based on object geometry
      this.createCollider(object, rigidBody, options);
      
      return rigidBody;
    } catch (error) {
      console.error('Error creating static body:', error);
      return null;
    }
  }
  
  /**
   * Create a kinematic rigid body for an object
   * @param {THREE.Object3D} object - Three.js object
   * @param {Object} options - Physics options
   * @returns {RAPIER.RigidBody} Rapier rigid body
   */
  createKinematicBody(object, options = {}) {
    if (!this.initialized || !object) return null;
    
    try {
      // Get object position and rotation
      const position = options.position || object.position;
      const rotation = options.rotation || object.quaternion;
      
      // Create rigid body description
      const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(position.x, position.y, position.z);
      
      if (rotation) {
        rigidBodyDesc.setRotation({
          x: rotation.x,
          y: rotation.y,
          z: rotation.z,
          w: rotation.w
        });
      }
      
      // Add rigid body to world
      const rigidBody = this.world.createRigidBody(rigidBodyDesc);
      
      // Store reference to rigid body
      this.rigidBodies.set(object, rigidBody);
      
      // Create collider based on object geometry
      this.createCollider(object, rigidBody, options);
      
      return rigidBody;
    } catch (error) {
      console.error('Error creating kinematic body:', error);
      return null;
    }
  }
  
  /**
   * Create a collider for an object
   * @param {THREE.Object3D} object - Three.js object
   * @param {RAPIER.RigidBody} rigidBody - Rapier rigid body
   * @param {Object} options - Physics options
   * @returns {RAPIER.Collider} Rapier collider
   */
  createCollider(object, rigidBody, options = {}) {
    if (!this.initialized || !object || !rigidBody) return null;
    
    try {
      // Get material properties
      const materialName = options.material || 'default';
      const material = this.materials[materialName] || this.materials.default;
      
      // Create collider description based on object geometry
      let colliderDesc;
      
      if (options.shape) {
        // Use provided shape
        switch (options.shape) {
          case 'ball':
            const radius = options.radius || 1;
            colliderDesc = RAPIER.ColliderDesc.ball(radius);
            break;
            
          case 'cuboid':
            const halfExtents = options.halfExtents || { x: 1, y: 1, z: 1 };
            colliderDesc = RAPIER.ColliderDesc.cuboid(
              halfExtents.x, halfExtents.y, halfExtents.z
            );
            break;
            
          case 'cylinder':
            const cylinderRadius = options.radius || 1;
            const halfHeight = options.halfHeight || 1;
            colliderDesc = RAPIER.ColliderDesc.cylinder(halfHeight, cylinderRadius);
            break;
            
          case 'capsule':
            const capsuleRadius = options.radius || 0.5;
            const capsuleHalfHeight = options.halfHeight || 1;
            colliderDesc = RAPIER.ColliderDesc.capsule(capsuleHalfHeight, capsuleRadius);
            break;
            
          default:
            console.warn(`Unknown shape: ${options.shape}, falling back to ball`);
            colliderDesc = RAPIER.ColliderDesc.ball(1.0);
            break;
        }
      } else if (object.geometry) {
        // Infer shape from geometry
        if (object.geometry.type === 'SphereGeometry') {
          // Get radius from geometry
          const radius = object.geometry.parameters.radius * Math.max(
            object.scale.x, object.scale.y, object.scale.z
          );
          colliderDesc = RAPIER.ColliderDesc.ball(radius);
        } else if (object.geometry.type === 'BoxGeometry') {
          // Get half extents from geometry
          const parameters = object.geometry.parameters;
          const halfExtents = {
            x: parameters.width / 2 * object.scale.x,
            y: parameters.height / 2 * object.scale.y,
            z: parameters.depth / 2 * object.scale.z
          };
          colliderDesc = RAPIER.ColliderDesc.cuboid(
            halfExtents.x, halfExtents.y, halfExtents.z
          );
        } else {
          // Default to ball for other geometry types
          console.warn(`Unsupported geometry type: ${object.geometry.type}, falling back to ball`);
          colliderDesc = RAPIER.ColliderDesc.ball(0.5);
        }
      } else {
        // Default to ball collider if no geometry
        colliderDesc = RAPIER.ColliderDesc.ball(0.5);
      }
      
      // Set material properties
      colliderDesc.setFriction(material.friction);
      colliderDesc.setRestitution(material.restitution);
      
      // Set if this is a sensor (trigger)
      if (options.isSensor) {
        colliderDesc.setSensor(true);
      }
      
      // Create collider
      const collider = this.world.createCollider(colliderDesc, rigidBody);
      
      // Store reference to collider
      this.colliders.set(object, collider);
      
      // Store object reference in our userdata map instead of using setUserData
      this.colliderUserData.set(collider, { object });
      
      return collider;
    } catch (error) {
      console.error('Error creating collider:', error);
      return null;
    }
  }
  
  /**
   * Remove a rigid body from the physics world
   * @param {THREE.Object3D} object - Three.js object
   */
  removeBody(object) {
    if (!this.initialized || !object) return;
    
    // Get rigid body
    const rigidBody = this.rigidBodies.get(object);
    
    if (rigidBody) {
      // Remove colliders associated with this body
      const collider = this.colliders.get(object);
      if (collider) {
        // Clean up our userdata map
        this.colliderUserData.delete(collider);
        
        // Remove collider from world
        this.world.removeCollider(collider, true);
        this.colliders.delete(object);
      }
      
      // Remove rigid body
      this.world.removeRigidBody(rigidBody);
      this.rigidBodies.delete(object);
    }
  }
  
  /**
   * Apply force to a rigid body
   * @param {THREE.Object3D} object - Three.js object
   * @param {Object} force - Force vector {x, y, z}
   * @param {boolean} wake - Whether to wake the body
   */
  applyForce(object, force, wake = true) {
    if (!this.initialized || !object) return;
    
    // Get rigid body
    const rigidBody = this.rigidBodies.get(object);
    
    if (rigidBody) {
      rigidBody.applyForce({ x: force.x, y: force.y, z: force.z }, wake);
    }
  }
  
  /**
   * Apply impulse to a rigid body
   * @param {THREE.Object3D} object - Three.js object
   * @param {Object} impulse - Impulse vector {x, y, z}
   * @param {boolean} wake - Whether to wake the body
   */
  applyImpulse(object, impulse, wake = true) {
    if (!this.initialized || !object) return;
    
    // Get rigid body
    const rigidBody = this.rigidBodies.get(object);
    
    if (rigidBody) {
      rigidBody.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, wake);
    }
  }
  
  /**
   * Apply torque to a rigid body
   * @param {THREE.Object3D} object - Three.js object
   * @param {Object} torque - Torque vector {x, y, z}
   * @param {boolean} wake - Whether to wake the body
   */
  applyTorque(object, torque, wake = true) {
    if (!this.initialized || !object) return;
    
    // Get rigid body
    const rigidBody = this.rigidBodies.get(object);
    
    if (rigidBody) {
      rigidBody.applyTorque({ x: torque.x, y: torque.y, z: torque.z }, wake);
    }
  }
  
  /**
   * Apply torque impulse to a rigid body
   * @param {THREE.Object3D} object - Three.js object
   * @param {Object} torqueImpulse - Torque impulse vector {x, y, z}
   * @param {boolean} wake - Whether to wake the body
   */
  applyTorqueImpulse(object, torqueImpulse, wake = true) {
    if (!this.initialized || !object) return;
    
    // Get rigid body
    const rigidBody = this.rigidBodies.get(object);
    
    if (rigidBody) {
      rigidBody.applyTorqueImpulse({ x: torqueImpulse.x, y: torqueImpulse.y, z: torqueImpulse.z }, wake);
    }
  }
  
  /**
   * Set linear velocity of a rigid body
   * @param {THREE.Object3D} object - Three.js object
   * @param {Object} velocity - Velocity vector {x, y, z}
   */
  setLinearVelocity(object, velocity) {
    if (!this.initialized || !object) return;
    
    // Get rigid body
    const rigidBody = this.rigidBodies.get(object);
    
    if (rigidBody) {
      rigidBody.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
    }
  }
  
  /**
   * Get linear velocity of a rigid body
   * @param {THREE.Object3D} object - Three.js object
   * @returns {Object} Velocity vector {x, y, z}
   */
  getLinearVelocity(object) {
    if (!this.initialized || !object) return { x: 0, y: 0, z: 0 };
    
    // Get rigid body
    const rigidBody = this.rigidBodies.get(object);
    
    if (rigidBody) {
      const velocity = rigidBody.linvel();
      return { x: velocity.x, y: velocity.y, z: velocity.z };
    }
    
    return { x: 0, y: 0, z: 0 };
  }
  
  /**
   * Set angular velocity of a rigid body
   * @param {THREE.Object3D} object - Three.js object
   * @param {Object} velocity - Angular velocity vector {x, y, z}
   */
  setAngularVelocity(object, velocity) {
    if (!this.initialized || !object) return;
    
    // Get rigid body
    const rigidBody = this.rigidBodies.get(object);
    
    if (rigidBody) {
      rigidBody.setAngvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
    }
  }
  
  /**
   * Get angular velocity of a rigid body
   * @param {THREE.Object3D} object - Three.js object
   * @returns {Object} Angular velocity vector {x, y, z}
   */
  getAngularVelocity(object) {
    if (!this.initialized || !object) return { x: 0, y: 0, z: 0 };
    
    // Get rigid body
    const rigidBody = this.rigidBodies.get(object);
    
    if (rigidBody) {
      const velocity = rigidBody.angvel();
      return { x: velocity.x, y: velocity.y, z: velocity.z };
    }
    
    return { x: 0, y: 0, z: 0 };
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
   * Set event handler
   * @param {string} event - Event name ('collision', 'sensorEnter', 'sensorExit')
   * @param {function} handler - Event handler
   */
  on(event, handler) {
    if (!event || !handler) return;
    
    this.eventHandlers[event] = handler;
  }
  
  /**
   * Update physics simulation
   * @param {number} deltaTime - Time step in seconds
   */
  update(deltaTime) {
    if (!this.initialized) return;
    
    // Step physics world
    this.world.step(this.eventQueue);
    
    // Update Three.js objects from physics bodies
    this.rigidBodies.forEach((rigidBody, object) => {
      // Get position
      const position = rigidBody.translation();
      object.position.set(position.x, position.y, position.z);
      
      // Get rotation
      const rotation = rigidBody.rotation();
      object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    });
    
    // Handle collision events
    this.processEvents();
  }
  
  /**
   * Process physics events
   */
  processEvents() {
    // Process collision events
    this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      const collider1 = this.world.getCollider(handle1);
      const collider2 = this.world.getCollider(handle2);
      
      // Get userData from our map instead of directly from collider
      const userData1 = this.colliderUserData.get(collider1);
      const userData2 = this.colliderUserData.get(collider2);
      
      const object1 = userData1 ? userData1.object : null;
      const object2 = userData2 ? userData2.object : null;
      
      // Handle collision events
      if (started) {
        // Check if either collider is a sensor
        const isSensor1 = collider1.isSensor();
        const isSensor2 = collider2.isSensor();
        
        if (isSensor1 || isSensor2) {
          // Sensor entry event
          if (this.eventHandlers.sensorEnter) {
            this.eventHandlers.sensorEnter(
              isSensor1 ? object1 : object2,
              isSensor1 ? object2 : object1
            );
          }
        } else {
          // Regular collision event
          if (this.eventHandlers.collision) {
            this.eventHandlers.collision(object1, object2);
          }
        }
      } else {
        // Sensor exit event
        const isSensor1 = collider1.isSensor();
        const isSensor2 = collider2.isSensor();
        
        if ((isSensor1 || isSensor2) && this.eventHandlers.sensorExit) {
          this.eventHandlers.sensorExit(
            isSensor1 ? object1 : object2,
            isSensor1 ? object2 : object1
          );
        }
      }
    });
  }
  
  /**
   * Perform a ray cast
   * @param {THREE.Vector3} origin - Ray origin
   * @param {THREE.Vector3} direction - Ray direction
   * @param {number} maxToi - Maximum time of impact
   * @returns {Object} Hit result or null
   */
  raycast(origin, direction, maxToi = 100) {
    if (!this.initialized) return null;
    
    // Normalize direction
    const dir = new THREE.Vector3(direction.x, direction.y, direction.z).normalize();
    
    // Create ray
    const ray = new RAPIER.Ray(
      { x: origin.x, y: origin.y, z: origin.z },
      { x: dir.x, y: dir.y, z: dir.z }
    );
    
    // Perform ray cast
    const hit = this.world.castRay(ray, maxToi, true);
    
    if (hit) {
      const collider = this.world.getCollider(hit.collider);
      const userData = this.colliderUserData.get(collider);
      const object = userData ? userData.object : null;
      
      return {
        object,
        collider,
        distance: hit.toi,
        point: {
          x: origin.x + dir.x * hit.toi,
          y: origin.y + dir.y * hit.toi,
          z: origin.z + dir.z * hit.toi
        },
        normal: hit.normal
      };
    }
    
    return null;
  }
  
  /**
   * Dispose physics world and resources
   */
  dispose() {
    if (!this.initialized) return;
    
    // Clear maps
    this.rigidBodies.clear();
    this.colliders.clear();
    this.colliderUserData.clear();
    
    // Free world
    this.world.free();
    this.world = null;
    this.initialized = false;
  }
}

export default PhysicsSystem;