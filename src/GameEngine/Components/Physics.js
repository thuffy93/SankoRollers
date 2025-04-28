// src/GameEngine/Components/Physics.js
import * as THREE from 'three';

/**
 * Physics component for physical properties and simulation
 */
class Physics {
  /**
   * Create a new physics component
   * @param {Object} options - Component options
   * @param {number} options.mass - Mass in kg
   * @param {Object|THREE.Vector3} options.velocity - Linear velocity
   * @param {Object|THREE.Vector3} options.angularVelocity - Angular velocity
   * @param {number} options.friction - Friction coefficient
   * @param {number} options.restitution - Restitution (bounciness)
   * @param {boolean} options.isStatic - Whether the body is static
   * @param {boolean} options.isKinematic - Whether the body is kinematic
   * @param {boolean} options.isTrigger - Whether the body is a trigger (no collision response)
   */
  constructor(options = {}) {
    this.mass = options.mass !== undefined ? options.mass : 1;
    this.inverseMass = this.mass > 0 ? 1 / this.mass : 0;
    
    // Convert velocity to Vector3 if it's a plain object
    if (options.velocity instanceof THREE.Vector3) {
      this.velocity = options.velocity.clone();
    } else {
      this.velocity = new THREE.Vector3(
        options.velocity?.x || 0,
        options.velocity?.y || 0,
        options.velocity?.z || 0
      );
    }
    
    // Convert angular velocity to Vector3 if it's a plain object
    if (options.angularVelocity instanceof THREE.Vector3) {
      this.angularVelocity = options.angularVelocity.clone();
    } else {
      this.angularVelocity = new THREE.Vector3(
        options.angularVelocity?.x || 0,
        options.angularVelocity?.y || 0,
        options.angularVelocity?.z || 0
      );
    }
    
    // Physical properties
    this.friction = options.friction !== undefined ? options.friction : 0.5;
    this.restitution = options.restitution !== undefined ? options.restitution : 0.2;
    
    // Body type
    this.isStatic = options.isStatic || false;
    this.isKinematic = options.isKinematic || false;
    this.isTrigger = options.isTrigger || false;
    
    // Additional properties for Rapier integration
    this.rapierBody = null;  // Reference to Rapier rigid body
    this.rapierCollider = null;  // Reference to Rapier collider
    
    // Force accumulator
    this.forces = new THREE.Vector3();
    this.torque = new THREE.Vector3();
    
    // Sleeping state (optimization)
    this.isSleeping = false;
    this.sleepVelocityThreshold = 0.1;
    this.sleepAngularVelocityThreshold = 0.1;
    this.sleepTime = 0;
    this.timeToSleep = 1.0;  // Time in seconds before body goes to sleep
    
    // Additional physical properties
    this.linearDamping = options.linearDamping !== undefined ? options.linearDamping : 0.01;
    this.angularDamping = options.angularDamping !== undefined ? options.angularDamping : 0.01;
    
    // Custom material properties for different surfaces
    this.materialType = options.materialType || 'default';
  }
  
  /**
   * Apply a force to the body
   * @param {THREE.Vector3|Object} force - Force vector
   * @param {THREE.Vector3|Object} worldPoint - Application point in world space (optional)
   */
  applyForce(force, worldPoint = null) {
    if (this.isStatic) return;
    
    // Convert force to Vector3 if it's a plain object
    let forceVec;
    if (force instanceof THREE.Vector3) {
      forceVec = force.clone();
    } else {
      forceVec = new THREE.Vector3(force.x || 0, force.y || 0, force.z || 0);
    }
    
    // Accumulate force
    this.forces.add(forceVec);
    
    // Apply torque if force is not applied at center of mass
    if (worldPoint) {
      let point;
      if (worldPoint instanceof THREE.Vector3) {
        point = worldPoint.clone();
      } else {
        point = new THREE.Vector3(worldPoint.x || 0, worldPoint.y || 0, worldPoint.z || 0);
      }
      
      // TODO: Need to convert world point to local coordinates relative to center of mass
      const torqueVec = new THREE.Vector3().crossVectors(point, forceVec);
      this.torque.add(torqueVec);
    }
    
    // Wake up the body
    this.isSleeping = false;
    this.sleepTime = 0;
  }
  
  /**
   * Apply an impulse to the body
   * @param {THREE.Vector3|Object} impulse - Impulse vector
   * @param {THREE.Vector3|Object} worldPoint - Application point in world space (optional)
   */
  applyImpulse(impulse, worldPoint = null) {
    if (this.isStatic) return;
    
    // Convert impulse to Vector3 if it's a plain object
    let impulseVec;
    if (impulse instanceof THREE.Vector3) {
      impulseVec = impulse.clone();
    } else {
      impulseVec = new THREE.Vector3(impulse.x || 0, impulse.y || 0, impulse.z || 0);
    }
    
    // Apply impulse to velocity
    this.velocity.add(impulseVec.multiplyScalar(this.inverseMass));
    
    // Apply angular impulse if impulse is not applied at center of mass
    if (worldPoint) {
      let point;
      if (worldPoint instanceof THREE.Vector3) {
        point = worldPoint.clone();
      } else {
        point = new THREE.Vector3(worldPoint.x || 0, worldPoint.y || 0, worldPoint.z || 0);
      }
      
      // TODO: Need to convert world point to local coordinates and calculate moment of inertia
      const angularImpulse = new THREE.Vector3().crossVectors(point, impulseVec);
      this.angularVelocity.add(angularImpulse.multiplyScalar(this.inverseMass));  // Simplified
    }
    
    // Wake up the body
    this.isSleeping = false;
    this.sleepTime = 0;
  }
  
  /**
   * Apply torque to the body
   * @param {THREE.Vector3|Object} torque - Torque vector
   */
  applyTorque(torque) {
    if (this.isStatic) return;
    
    // Convert torque to Vector3 if it's a plain object
    let torqueVec;
    if (torque instanceof THREE.Vector3) {
      torqueVec = torque.clone();
    } else {
      torqueVec = new THREE.Vector3(torque.x || 0, torque.y || 0, torque.z || 0);
    }
    
    // Accumulate torque
    this.torque.add(torqueVec);
    
    // Wake up the body
    this.isSleeping = false;
    this.sleepTime = 0;
  }
  
  /**
   * Apply angular impulse to the body
   * @param {THREE.Vector3|Object} angularImpulse - Angular impulse vector
   */
  applyAngularImpulse(angularImpulse) {
    if (this.isStatic) return;
    
    // Convert angular impulse to Vector3 if it's a plain object
    let angularImpulseVec;
    if (angularImpulse instanceof THREE.Vector3) {
      angularImpulseVec = angularImpulse.clone();
    } else {
      angularImpulseVec = new THREE.Vector3(
        angularImpulse.x || 0, 
        angularImpulse.y || 0, 
        angularImpulse.z || 0
      );
    }
    
    // Apply angular impulse to angular velocity
    // TODO: Need to calculate moment of inertia
    this.angularVelocity.add(angularImpulseVec.multiplyScalar(this.inverseMass));  // Simplified
    
    // Wake up the body
    this.isSleeping = false;
    this.sleepTime = 0;
  }
  
  /**
   * Clear accumulated forces and torque
   */
  clearForces() {
    this.forces.set(0, 0, 0);
    this.torque.set(0, 0, 0);
  }
  
  /**
   * Check if the body should be put to sleep
   * @param {number} deltaTime - Time since last update in seconds
   * @returns {boolean} True if the body should be put to sleep
   */
  checkSleepState(deltaTime) {
    if (this.isStatic || this.isKinematic) {
      return true;
    }
    
    const linearSpeed = this.velocity.length();
    const angularSpeed = this.angularVelocity.length();
    
    if (linearSpeed < this.sleepVelocityThreshold && 
        angularSpeed < this.sleepAngularVelocityThreshold) {
      this.sleepTime += deltaTime;
      if (this.sleepTime > this.timeToSleep) {
        return true;
      }
    } else {
      this.sleepTime = 0;
    }
    
    return false;
  }
}