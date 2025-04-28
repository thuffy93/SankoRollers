// src/GameEngine/PhysicsSystem.js - Enhanced for Kirby's Dream Course-like physics
import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

/**
 * Enhanced PhysicsSystem - Improved Rapier physics for Kirby-style courses
 */
class PhysicsSystem {
  constructor() {
    this.world = null;
    this.gravity = { x: 0, y: -9.81, z: 0 };
    this.initialized = false;
    
    // Maps for tracking physics objects
    this.rigidBodies = new Map(); // Map of THREE.Object3D to Rapier RigidBody
    this.colliders = new Map();   // Map of THREE.Object3D to Rapier Collider
    this.colliderUserData = new Map(); // Map of Collider to userData object
    
    // Debug visualization
    this.debugMeshes = new Map(); // Map of Collider to debug mesh
    this.debugEnabled = false;
    
    // Physics materials with Kirby's Dream Course properties
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
        friction: 0.8, // Higher friction for wall climbing
        restitution: 0.2
      },
      ice: {
        friction: 0.02, // Very slippery
        restitution: 0.8
      },
      sand: {
        friction: 0.9, // Very high friction
        restitution: 0.1
      },
      bouncy: {
        friction: 0.4,
        restitution: 1.0 // Maximum bounce
      },
      sticky: {
        friction: 1.0, // Maximum friction for wall sticking
        restitution: 0.0
      },
      hole: {
        friction: 0.9,
        restitution: 0.1
      }
    };
    
    // Contact pairs to process
    this.contactPairs = [];
    
    // Event handlers
    this.eventHandlers = {
      collision: null,
      sensorEnter: null,
      sensorExit: null,
      contactStart: null,
      contactEnd: null
    };
    
    // Initialize Rapier
    this.init();
  }

  /**
   * Initialize Rapier physics with better error handling
   */
  async init() {
    try {
      console.log("Starting Rapier physics initialization...");
      
      // Load and initialize Rapier
      await RAPIER.init();
      console.log("Rapier WASM loaded successfully");
      
      // Create physics world with more stable parameters
      this.world = new RAPIER.World(this.gravity);
      
      // Configure solver for more stable simulation
      this.world.maxVelocityIterations = 8;  // Default is 4, increase for stability
      this.world.maxPositionIterations = 4;  // Default is 1, increase for stability
      this.world.minIslandSize = 1;         // Smaller islands for better parallelism
      
      // Set up event queue for collision detection
      this.eventQueue = new RAPIER.EventQueue(true);
      
      console.log('Rapier physics initialized successfully');
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Rapier physics:', error);
      // Try to provide more helpful error information
      if (error.message.includes('WebAssembly')) {
        console.error('WebAssembly support might be missing in your browser');
      }
    }
  }
  
  /**
   * Wait for physics to initialize with timeout
   */
  async waitForInit(timeout = 5000) {
    if (this.initialized) return true;
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkInit = () => {
        if (this.initialized) {
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          console.error('Physics initialization timeout');
          resolve(false);
        } else {
          setTimeout(checkInit, 100);
        }
      };
      
      checkInit();
    });
  }
  
  /**
   * Set gravity with easing for smooth transitions
   * @param {Object} gravity - Gravity vector {x, y, z}
   * @param {number} multiplier - Optional multiplier for gravity strength
   * @param {number} transitionTime - Time to transition to new gravity (0 for instant)
   */
  setGravity(gravity, multiplier = 1, transitionTime = 0) {
    if (!this.initialized) return;
    
    const targetGravity = {
      x: gravity.x * multiplier,
      y: gravity.y * multiplier,
      z: gravity.z * multiplier
    };
    
    if (transitionTime <= 0) {
      // Instant gravity change
      this.gravity = targetGravity;
      this.world.gravity = { x: this.gravity.x, y: this.gravity.y, z: this.gravity.z };
      return;
    }
    
    // Store initial gravity for interpolation
    const initialGravity = { ...this.gravity };
    const startTime = Date.now();
    
    // Set up gravity transition
    const updateGravity = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const t = Math.min(elapsed / transitionTime, 1);
      
      // Smoothstep interpolation (more natural transition)
      const smoothT = t * t * (3 - 2 * t);
      
      this.gravity = {
        x: initialGravity.x + smoothT * (targetGravity.x - initialGravity.x),
        y: initialGravity.y + smoothT * (targetGravity.y - initialGravity.y),
        z: initialGravity.z + smoothT * (targetGravity.z - initialGravity.z)
      };
      
      this.world.gravity = { x: this.gravity.x, y: this.gravity.y, z: this.gravity.z };
      
      if (t < 1) {
        requestAnimationFrame(updateGravity);
      }
    };
    
    updateGravity();
  }
  
  /**
   * Flip gravity (for power-up effect) with smooth transition
   * @param {number} transitionTime - Time to transition gravity (seconds)
   */
  flipGravity(transitionTime = 0.5) {
    if (!this.initialized) return;
    
    this.setGravity({ x: 0, y: -this.gravity.y, z: 0 }, 1, transitionTime);
  }
  
  /**
   * Create a dynamic rigid body with better collision handling
   * @param {THREE.Object3D} object - Three.js object
   * @param {Object} options - Physics options
   * @returns {RAPIER.RigidBody} Rapier rigid body
   */
  createDynamicBody(object, options = {}) {
    if (!this.initialized || !object) return null;
    
    try {
      console.log(`Creating dynamic body for object: ${object.name || 'unnamed'}`);
      
      // Get object position and rotation
      const position = options.position || object.position;
      const rotation = options.rotation || object.quaternion;
      
      // Create rigid body description with better defaults
      const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y, position.z);
      
      // Set explicit mass if provided (important for consistent physics)
      if (options.mass) {
        rigidBodyDesc.setMass(options.mass);
      }
      
      // Set angular damping for more stable rotation (important for ball physics)
      rigidBodyDesc.setAngularDamping(options.angularDamping || 0.1);
      
      // Set linear damping (optional slow-down effect)
      rigidBodyDesc.setLinearDamping(options.linearDamping || 0.01);
      
      // Set rotation
      if (rotation) {
        rigidBodyDesc.setRotation({
          x: rotation.x,
          y: rotation.y,
          z: rotation.z,
          w: rotation.w
        });
      }
      
      // Set can sleep property (for performance)
      if (options.canSleep !== undefined) {
        rigidBodyDesc.setCanSleep(options.canSleep);
      } else {
        rigidBodyDesc.setCanSleep(true);
      }
      
      // Set continuous collision detection for small/fast objects
      if (options.ccd || object.geometry?.parameters?.radius < 1.0) {
        rigidBodyDesc.setCcdEnabled(true);
      }
      
      // Add rigid body to world
      const rigidBody = this.world.createRigidBody(rigidBodyDesc);
      
      // Store reference to rigid body and object
      this.rigidBodies.set(object, rigidBody);
      
      // Create collider based on object geometry
      const collider = this.createCollider(object, rigidBody, options);
      
      if (collider) {
        console.log(`Created collider for ${object.name || 'unnamed'}`);
      } else {
        console.warn(`Failed to create collider for ${object.name || 'unnamed'}`);
      }
      
      return rigidBody;
    } catch (error) {
      console.error('Error creating dynamic body:', error);
      return null;
    }
  }
  
  /**
   * Create a static rigid body (for terrain, walls, etc.)
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
   * Create a kinematic rigid body (for moving platforms)
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
      // Kinematic position-based is better for moving platforms
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
   * Create a collider with improved shape detection
   */
  createCollider(object, rigidBody, options = {}) {
    if (!this.initialized || !object || !rigidBody) return null;
    
    try {
      // Get material properties
      const materialName = options.material || 'default';
      const material = this.materials[materialName] || this.materials.default;
      
      // Create collider description based on object geometry or provided shape
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
            
          case 'heightfield':
            // For terrain heightmaps
            const numRows = options.numRows || 10;
            const numCols = options.numCols || 10;
            const heights = options.heights || Array(numRows * numCols).fill(0);
            const scale = options.scale || { x: 1, y: 1, z: 1 };
            
            colliderDesc = RAPIER.ColliderDesc.heightfield(
              numRows - 1, numCols - 1, new Float32Array(heights), scale
            );
            break;
            
          case 'convexHull':
            // For complex shapes (if vertices provided)
            if (options.vertices && options.vertices.length >= 4) {
              colliderDesc = RAPIER.ColliderDesc.convexHull(new Float32Array(options.vertices));
            } else {
              console.warn('Convex hull requires at least 4 vertices');
              colliderDesc = RAPIER.ColliderDesc.ball(1.0);
            }
            break;
            
          case 'trimesh':
            // For arbitrary meshes (better for static objects)
            if (options.vertices && options.indices) {
              colliderDesc = RAPIER.ColliderDesc.trimesh(
                new Float32Array(options.vertices),
                new Uint32Array(options.indices)
              );
            } else if (object.geometry) {
              // Extract mesh data from THREE.js geometry
              const geo = object.geometry;
              const posAttr = geo.getAttribute('position');
              const vertices = new Float32Array(posAttr.count * 3);
              
              for (let i = 0; i < posAttr.count; i++) {
                vertices[i * 3] = posAttr.getX(i);
                vertices[i * 3 + 1] = posAttr.getY(i);
                vertices[i * 3 + 2] = posAttr.getZ(i);
              }
              
              // Create indices if needed
              let indices;
              if (geo.index) {
                indices = new Uint32Array(geo.index.array);
              } else {
                // Create indexed array if not provided
                indices = new Uint32Array(posAttr.count);
                for (let i = 0; i < posAttr.count; i++) {
                  indices[i] = i;
                }
              }
              
              colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices);
            } else {
              console.warn('Trimesh requires vertices and indices');
              colliderDesc = RAPIER.ColliderDesc.ball(1.0);
            }
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
        } else if (object.geometry.type === 'CylinderGeometry') {
          // Get cylinder parameters
          const parameters = object.geometry.parameters;
          const radius = Math.max(parameters.radiusTop, parameters.radiusBottom) *
                        Math.max(object.scale.x, object.scale.z);
          const halfHeight = parameters.height / 2 * object.scale.y;
          
          colliderDesc = RAPIER.ColliderDesc.cylinder(halfHeight, radius);
        } else if (object.geometry.type === 'PlaneGeometry' || 
                  object.geometry.type === 'CircleGeometry') {
          // For ground planes, create a thin cuboid
          const width = object.geometry.parameters.width || object.geometry.parameters.radius * 2;
          const height = object.geometry.parameters.height || object.geometry.parameters.radius * 2;
          
          colliderDesc = RAPIER.ColliderDesc.cuboid(
            width / 2 * object.scale.x,
            0.1,  // Very thin
            height / 2 * object.scale.z
          );
        } else {
          // For complex geometries, use a trimesh
          console.log(`Creating trimesh for complex geometry type: ${object.geometry.type}`);
          
          try {
            // Extract vertices and create a trimesh
            const vertices = [];
            const indices = [];
            const positions = object.geometry.attributes.position.array;
            
            // Copy positions into a new array
            for (let i = 0; i < positions.length; i += 3) {
              vertices.push(
                positions[i] * object.scale.x,
                positions[i + 1] * object.scale.y,
                positions[i + 2] * object.scale.z
              );
            }
            
            // Create indices
            if (object.geometry.index) {
              for (let i = 0; i < object.geometry.index.count; i++) {
                indices.push(object.geometry.index.array[i]);
              }
            } else {
              for (let i = 0; i < positions.length / 3; i++) {
                indices.push(i);
              }
            }
            
            colliderDesc = RAPIER.ColliderDesc.trimesh(
              new Float32Array(vertices),
              new Uint32Array(indices)
            );
          } catch (error) {
            console.error('Error creating trimesh, falling back to ball:', error);
            colliderDesc = RAPIER.ColliderDesc.ball(
              Math.max(object.scale.x, object.scale.y, object.scale.z)
            );
          }
        }
      } else {
        // Default to ball collider if no geometry
        console.warn('No geometry found, using default ball collider');
        colliderDesc = RAPIER.ColliderDesc.ball(0.5);
      }
      
      // Set material properties
      colliderDesc.setFriction(material.friction);
      colliderDesc.setRestitution(material.restitution);
      
      // Set collision groups if provided (for filtering collisions)
      if (options.collisionGroups) {
        colliderDesc.setCollisionGroups(options.collisionGroups);
      }
      
      // Set density if provided (for more realistic mass)
      if (options.density) {
        colliderDesc.setDensity(options.density);
      }
      
      // Set if this is a sensor (trigger)
      if (options.isSensor) {
        colliderDesc.setSensor(true);
      }
      
      // Create collider
      const collider = this.world.createCollider(colliderDesc, rigidBody);
      
      // Store reference to collider
      this.colliders.set(object, collider);
      
      // Store object reference in our userdata map
      this.colliderUserData.set(collider, { 
        object,
        material: materialName,
        ...options.userData
      });
      
      // Create debug visualization if enabled
      if (this.debugEnabled) {
        this.createDebugMesh(collider, object, options);
      }
      
      return collider;
    } catch (error) {
      console.error('Error creating collider:', error);
      return null;
    }
  }
  
  /**
   * Create debug visualization mesh for a collider
   */
  createDebugMesh(collider, object, options) {
    if (!collider || !object) return;
    
    // Create wireframe material
    const material = new THREE.MeshBasicMaterial({
      color: options.isSensor ? 0xff0000 : 0x00ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    
    let debugMesh;
    
    // Create appropriate geometry based on collider shape
    if (options.shape === 'ball' || object.geometry?.type === 'SphereGeometry') {
      const radius = options.radius || object.geometry?.parameters?.radius || 1;
      const geometry = new THREE.SphereGeometry(radius, 16, 16);
      debugMesh = new THREE.Mesh(geometry, material);
    } else if (options.shape === 'cuboid' || object.geometry?.type === 'BoxGeometry') {
      const halfExtents = options.halfExtents || {
        x: object.geometry?.parameters?.width / 2 || 1,
        y: object.geometry?.parameters?.height / 2 || 1,
        z: object.geometry?.parameters?.depth / 2 || 1
      };
      const geometry = new THREE.BoxGeometry(
        halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2
      );
      debugMesh = new THREE.Mesh(geometry, material);
    } else if (options.shape === 'cylinder' || object.geometry?.type === 'CylinderGeometry') {
      const radius = options.radius || Math.max(
        object.geometry?.parameters?.radiusTop || 1,
        object.geometry?.parameters?.radiusBottom || 1
      );
      const height = options.halfHeight * 2 || object.geometry?.parameters?.height || 2;
      const geometry = new THREE.CylinderGeometry(radius, radius, height, 16);
      debugMesh = new THREE.Mesh(geometry, material);
    } else {
      // For complex shapes, just use a bounding box
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      debugMesh = new THREE.Mesh(geometry, material);
    }
    
    // Position the debug mesh
    debugMesh.position.copy(object.position);
    debugMesh.quaternion.copy(object.quaternion);
    debugMesh.scale.copy(object.scale);
    
    // Add to the scene
    if (object.parent) {
      object.parent.add(debugMesh);
    }
    
    // Store reference
    this.debugMeshes.set(collider, debugMesh);
  }
  
  /**
   * Remove a body and its colliders from the physics world
   */
  removeBody(object) {
    if (!this.initialized || !object) return;
    
    // Get rigid body
    const rigidBody = this.rigidBodies.get(object);
    
    if (rigidBody) {
      // Remove colliders associated with this body
      const collider = this.colliders.get(object);
      if (collider) {
        // Remove debug mesh if exists
        const debugMesh = this.debugMeshes.get(collider);
        if (debugMesh) {
          if (debugMesh.parent) {
            debugMesh.parent.remove(debugMesh);
          }
          debugMesh.geometry.dispose();
          debugMesh.material.dispose();
          this.debugMeshes.delete(collider);
        }
        
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
   * Apply force to a rigid body at its center of mass
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
   * Apply impulse to a rigid body at its center of mass
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
   * Apply force at a specific point on the rigid body
   */
  applyForceAtPoint(object, force, point, wake = true) {
    if (!this.initialized || !object) return;
    
    // Get rigid body
    const rigidBody = this.rigidBodies.get(object);
    
    if (rigidBody) {
      rigidBody.applyForceAtPoint(
        { x: force.x, y: force.y, z: force.z },
        { x: point.x, y: point.y, z: point.z },
        wake
      );
    }
  }
  
  /**
   * Apply impulse at a specific point on the rigid body
   */
  applyImpulseAtPoint(object, impulse, point, wake = true) {
    if (!this.initialized || !object) return;
    
    // Get rigid body
    const rigidBody = this.rigidBodies.get(object);
    
    if (rigidBody) {
      rigidBody.applyImpulseAtPoint(
        { x: impulse.x, y: impulse.y, z: impulse.z },
        { x: point.x, y: point.y, z: point.z },
        wake
      );
    }
  }
  
  /**
   * Apply torque to a rigid body
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
    
    // Update all colliders using this material
    this.colliderUserData.forEach((userData, collider) => {
      if (userData.material === name) {
        collider.setFriction(this.materials[name].friction);
        collider.setRestitution(this.materials[name].restitution);
      }
    });
  }
  
  /**
   * Check if an object is in contact with another object
   * @param {THREE.Object3D} object1 - First object
   * @param {THREE.Object3D} object2 - Second object (optional)
   * @returns {boolean} Whether objects are in contact
   */
  isInContact(object1, object2 = null) {
    if (!this.initialized || !object1) return false;
    
    const collider1 = this.colliders.get(object1);
    if (!collider1) return false;
    
    if (object2) {
      // Check contact with specific object
      const collider2 = this.colliders.get(object2);
      if (!collider2) return false;
      
      for (const pair of this.contactPairs) {
        if ((pair[0] === collider1 && pair[1] === collider2) ||
            (pair[0] === collider2 && pair[1] === collider1)) {
          return true;
        }
      }
      
      return false;
    } else {
      // Check contact with any object
      for (const pair of this.contactPairs) {
        if (pair[0] === collider1 || pair[1] === collider1) {
          return true;
        }
      }
      
      return false;
    }
  }
  
  /**
   * Get all objects in contact with this object
   * @param {THREE.Object3D} object - Object to check
   * @returns {Array} Array of objects in contact
   */
  getContactObjects(object) {
    if (!this.initialized || !object) return [];
    
    const collider = this.colliders.get(object);
    if (!collider) return [];
    
    const contactObjects = [];
    
    for (const pair of this.contactPairs) {
      if (pair[0] === collider) {
        const userData = this.colliderUserData.get(pair[1]);
        if (userData && userData.object) {
          contactObjects.push(userData.object);
        }
      } else if (pair[1] === collider) {
        const userData = this.colliderUserData.get(pair[0]);
        if (userData && userData.object) {
          contactObjects.push(userData.object);
        }
      }
    }
    
    return contactObjects;
  }
  
  /**
   * Set event handler
   * @param {string} event - Event name ('collision', 'sensorEnter', 'sensorExit', 'contactStart', 'contactEnd')
   * @param {function} handler - Event handler
   */
  on(event, handler) {
    if (!event || !handler) return;
    
    this.eventHandlers[event] = handler;
  }
  
  /**
   * Check if object is on a surface (ground detection for walking)
   * @param {THREE.Object3D} object - Object to check
   * @param {number} maxDistance - Maximum distance to check (default: object radius or 0.1)
   * @returns {boolean} Whether object is on ground
   */
  isOnGround(object, maxDistance = null) {
    if (!this.initialized || !object) return false;
    
    // Get rigid body and position
    const rigidBody = this.rigidBodies.get(object);
    if (!rigidBody) return false;
    
    // Get object's collider
    const collider = this.colliders.get(object);
    if (!collider) return false;
    
    // Get object radius or use default
    let radius = 0.1;
    if (maxDistance !== null) {
      radius = maxDistance;
    } else if (object.geometry && object.geometry.type === 'SphereGeometry') {
      radius = object.geometry.parameters.radius * Math.max(
        object.scale.x, object.scale.y, object.scale.z
      );
    }
    
    // Cast a ray downwards
    const position = rigidBody.translation();
    const ray = new RAPIER.Ray(
      { x: position.x, y: position.y, z: position.z },
      { x: 0, y: -1, z: 0 }
    );
    
    // Check for intersection, excluding the object's own collider
    const hit = this.world.castRayAndGetNormal(
      ray,
      radius + 0.1, // Use radius plus a small margin
      true, // Solid objects only
      undefined, // Don't exclude any collider groups
      undefined, // Use default filter
      collider // Exclude object's own collider
    );
    
    return hit !== null;
  }
  
  /**
   * Get the surface normal where an object is standing
   * @param {THREE.Object3D} object - Object to check
   * @returns {Object|null} Surface normal vector or null
   */
  getSurfaceNormal(object) {
    if (!this.initialized || !object) return null;
    
    // Get rigid body and position
    const rigidBody = this.rigidBodies.get(object);
    if (!rigidBody) return null;
    
    // Get object's collider
    const collider = this.colliders.get(object);
    if (!collider) return null;
    
    // Get object radius or use default
    let radius = 0.1;
    if (object.geometry && object.geometry.type === 'SphereGeometry') {
      radius = object.geometry.parameters.radius * Math.max(
        object.scale.x, object.scale.y, object.scale.z
      );
    }
    
    // Cast a ray downwards
    const position = rigidBody.translation();
    const ray = new RAPIER.Ray(
      { x: position.x, y: position.y, z: position.z },
      { x: 0, y: -1, z: 0 }
    );
    
    // Check for intersection, excluding the object's own collider
    const hit = this.world.castRayAndGetNormal(
      ray,
      radius + 0.1, // Use radius plus a small margin
      true, // Solid objects only
      undefined, // Don't exclude any collider groups
      undefined, // Use default filter
      collider // Exclude object's own collider
    );
    
    if (hit) {
      const normal = hit.normal;
      return { x: normal.x, y: normal.y, z: normal.z };
    }
    
    return null;
  }
  
  /**
   * Get surface material where object is standing
   * @param {THREE.Object3D} object - Object to check
   * @returns {string|null} Material name or null
   */
  getSurfaceMaterial(object) {
    if (!this.initialized || !object) return null;
    
    // Get the contact objects
    const contactObjects = this.getContactObjects(object);
    
    // Get velocity to determine if we're standing on the object
    const velocity = this.getLinearVelocity(object);
    
    // We're considered standing if our y velocity is very low
    const isStanding = Math.abs(velocity.y) < 0.1;
    
    if (contactObjects.length > 0 && isStanding) {
      // Find the contact object that is below us
      for (const contactObject of contactObjects) {
        // Simple check: is object's y position lower than ours?
        if (contactObject.position.y < object.position.y) {
          // Get the collider for this object
          const collider = this.colliders.get(contactObject);
          
          // Get user data to find material
          if (collider) {
            const userData = this.colliderUserData.get(collider);
            if (userData && userData.material) {
              return userData.material;
            }
          }
          
          // Default to 'default' if no material is found
          return 'default';
        }
      }
    }
    
    return null;
  }
  
  /**
   * Create a heightfield terrain from a height map
   * @param {Array|Float32Array} heights - Height values
   * @param {number} numRows - Number of rows in height map
   * @param {number} numCols - Number of columns in height map
   * @param {Object} scale - Scale of terrain { x, y, z }
   * @param {THREE.Object3D} object - Three.js object (usually the terrain mesh)
   * @param {Object} options - Additional options
   * @returns {RAPIER.Collider} Terrain collider
   */
  createTerrain(heights, numRows, numCols, scale, object, options = {}) {
    if (!this.initialized) return null;
    
    try {
      // Create a static rigid body
      const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
      
      // Apply position if provided
      if (object && object.position) {
        rigidBodyDesc.setTranslation(object.position.x, object.position.y, object.position.z);
      }
      
      // Create the rigid body
      const rigidBody = this.world.createRigidBody(rigidBodyDesc);
      
      // Create heightfield collider description
      const colliderDesc = RAPIER.ColliderDesc.heightfield(
        numRows - 1, 
        numCols - 1, 
        new Float32Array(heights), 
        scale
      );
      
      // Get material properties
      const materialName = options.material || 'default';
      const material = this.materials[materialName] || this.materials.default;
      
      // Set material properties
      colliderDesc.setFriction(material.friction);
      colliderDesc.setRestitution(material.restitution);
      
      // Create collider
      const collider = this.world.createCollider(colliderDesc, rigidBody);
      
      // Store references if object provided
      if (object) {
        this.rigidBodies.set(object, rigidBody);
        this.colliders.set(object, collider);
        
        // Store object reference in userdata
        this.colliderUserData.set(collider, { 
          object,
          material: materialName,
          isHeightfield: true,
          ...options.userData
        });
      }
      
      return collider;
    } catch (error) {
      console.error('Error creating terrain:', error);
      return null;
    }
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
    const hit = this.world.castRayAndGetNormal(ray, maxToi, true);
    
    if (hit) {
      const collider = hit.collider;
      const userData = this.colliderUserData.get(collider);
      const object = userData ? userData.object : null;
      
      return {
        object,
        collider,
        distance: hit.toi,
        normal: hit.normal,
        point: {
          x: origin.x + dir.x * hit.toi,
          y: origin.y + dir.y * hit.toi,
          z: origin.z + dir.z * hit.toi
        }
      };
    }
    
    return null;
  }
  
  /**
   * Process physics events
   */
  processEvents() {
    // Clear contact pairs
    this.contactPairs = [];
    
    // Process collision events
    this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      const collider1 = this.world.getCollider(handle1);
      const collider2 = this.world.getCollider(handle2);
      
      // Get userData from our map
      const userData1 = this.colliderUserData.get(collider1);
      const userData2 = this.colliderUserData.get(collider2);
      
      const object1 = userData1 ? userData1.object : null;
      const object2 = userData2 ? userData2.object : null;
      
      // Store contact pair for isInContact checks
      if (started) {
        this.contactPairs.push([collider1, collider2]);
      } else {
        // Remove from contact pairs
        this.contactPairs = this.contactPairs.filter(pair => 
          !(pair[0] === collider1 && pair[1] === collider2) && 
          !(pair[0] === collider2 && pair[1] === collider1)
        );
      }
      
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
          
          // Contact start event
          if (this.eventHandlers.contactStart) {
            this.eventHandlers.contactStart(object1, object2);
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
        
        // Contact end event
        if (this.eventHandlers.contactEnd) {
          this.eventHandlers.contactEnd(object1, object2);
        }
      }
    });
  }
  
  /**
   * Update physics simulation with improved stability
   * @param {number} deltaTime - Time step in seconds
   * @param {number} maxSubsteps - Maximum number of substeps (default: 5)
   */
  update(deltaTime, maxSubsteps = 5) {
    if (!this.initialized) return;
    
    // Clamp deltaTime to prevent instability
    const clampedDelta = Math.min(deltaTime, 1/30);
    
    // Step physics world with substeps for better stability
    this.world.step(this.eventQueue, clampedDelta, maxSubsteps);
    
    // Process collision events
    this.processEvents();
    
    // Update Three.js objects from physics bodies
    this.rigidBodies.forEach((rigidBody, object) => {
      if (object.userData.skipPhysicsUpdate) return;
      
      // Skip updating Three.js objects that are controlled by scripts
      if (object.userData.manualPositionControl) return;
      
      // Get position
      const position = rigidBody.translation();
      object.position.set(position.x, position.y, position.z);
      
      // Get rotation
      const rotation = rigidBody.rotation();
      object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      
      // Update debug meshes if enabled
      if (this.debugEnabled) {
        const collider = this.colliders.get(object);
        if (collider) {
          const debugMesh = this.debugMeshes.get(collider);
          if (debugMesh) {
            debugMesh.position.copy(object.position);
            debugMesh.quaternion.copy(object.quaternion);
          }
        }
      }
    });
  }
  
  /**
   * Set debug visualization mode
   * @param {boolean} enabled - Whether to show debug visualization
   */
  setDebugMode(enabled) {
    this.debugEnabled = enabled;
    
    if (enabled) {
      // Create debug meshes for all existing colliders
      this.colliders.forEach((collider, object) => {
        if (!this.debugMeshes.has(collider)) {
          // Get user data to determine shape
          const userData = this.colliderUserData.get(collider);
          
          // Create debug mesh
          this.createDebugMesh(collider, object, userData || {});
        }
      });
    } else {
      // Remove all debug meshes
      this.debugMeshes.forEach((mesh) => {
        if (mesh.parent) {
          mesh.parent.remove(mesh);
        }
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      this.debugMeshes.clear();
    }
  }
  
  /**
   * Dispose physics world and resources
   */
  dispose() {
    if (!this.initialized) return;
    
    // Clear all maps
    this.rigidBodies.clear();
    this.colliders.clear();
    this.colliderUserData.clear();
    this.contactPairs = [];
    
    // Remove all debug meshes
    if (this.debugEnabled) {
      this.setDebugMode(false);
    }
    
    // Free world
    this.world.free();
    this.world = null;
    this.initialized = false;
    
    console.log('Physics system disposed');
  }
}

export default PhysicsSystem;