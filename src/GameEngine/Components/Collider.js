// src/GameEngine/Components/Collider.js
import * as THREE from 'three';

/**
 * Collider component for collision detection
 */
class Collider {
  /**
   * Create a new collider component
   * @param {Object} options - Component options
   * @param {string} options.type - Collider type (box, sphere, etc.)
   * @param {Object} options.size - Collider size
   * @param {boolean} options.isTrigger - Whether this is a trigger (no physics response)
   * @param {Object} options.offset - Offset from entity position
   * @param {string} options.material - Physics material name
   * @param {Array} options.layers - Collision layers
   */
  constructor(options = {}) {
    this.type = options.type || 'box';
    this.size = options.size || { x: 1, y: 1, z: 1 };
    this.isTrigger = options.isTrigger || false;
    this.offset = options.offset || { x: 0, y: 0, z: 0 };
    this.material = options.material || 'default';
    this.layers = options.layers || [0];  // Default layer
    
    // Collision handling
    this.onCollisionEnter = null;
    this.onCollisionStay = null;
    this.onCollisionExit = null;
    this.onTriggerEnter = null;
    this.onTriggerStay = null;
    this.onTriggerExit = null;
    
    // Current collisions for continuous detection
    this.currentCollisions = new Map();
    this.currentTriggers = new Map();
    
    // Rapier collider handle (if using Rapier physics)
    this.rapierCollider = null;
    
    // Helper mesh for debugging (optional)
    this.debugMesh = null;
    this.showDebugMesh = options.showDebugMesh || false;
    
    // Create helper for visualization if needed
    if (this.showDebugMesh) {
      this.createDebugMesh();
    }
  }
  
  /**
   * Create a helper mesh for debugging
   */
  createDebugMesh() {
    let geometry;
    const material = new THREE.MeshBasicMaterial({
      color: this.isTrigger ? 0x00ff00 : 0xff0000,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    
    switch (this.type) {
      case 'box':
        geometry = new THREE.BoxGeometry(
          this.size.x * 2, // * 2 because box collider size is half-extents
          this.size.y * 2,
          this.size.z * 2
        );
        break;
        
      case 'sphere':
        geometry = new THREE.SphereGeometry(this.size.radius, 16, 16);
        break;
        
      case 'capsule':
        // Create capsule geometry by combining a cylinder and two hemispheres
        const radiusTop = this.size.radius;
        const radiusBottom = this.size.radius;
        const height = this.size.height;
        const radialSegments = 16;
        
        // Create cylinder
        const cylinderGeometry = new THREE.CylinderGeometry(
          radiusTop,
          radiusBottom,
          height,
          radialSegments
        );
        
        // Create top hemisphere
        const topSphereGeometry = new THREE.SphereGeometry(
          radiusTop,
          radialSegments,
          radialSegments / 2,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2
        );
        topSphereGeometry.translate(0, height / 2, 0);
        
        // Create bottom hemisphere
        const bottomSphereGeometry = new THREE.SphereGeometry(
          radiusBottom,
          radialSegments,
          radialSegments / 2,
          0,
          Math.PI * 2,
          Math.PI / 2,
          Math.PI / 2
        );
        bottomSphereGeometry.translate(0, -height / 2, 0);
        
        // Combine geometries
        const geometries = [cylinderGeometry, topSphereGeometry, bottomSphereGeometry];
        geometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
        break;
        
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(
          this.size.radius,
          this.size.radius,
          this.size.height,
          16
        );
        break;
        
      case 'cone':
        geometry = new THREE.ConeGeometry(
          this.size.radius,
          this.size.height,
          16
        );
        break;
        
      case 'convex':
        // Convex hull would require points to be provided
        // This is a placeholder for a more sophisticated implementation
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
        
      default:
        console.warn(`Unknown collider type: ${this.type}, using box`);
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
    }
    
    this.debugMesh = new THREE.Mesh(geometry, material);
    this.debugMesh.position.set(this.offset.x, this.offset.y, this.offset.z);
    
    return this.debugMesh;
  }
  
  /**
   * Update the debug mesh position and visibility
   * @param {THREE.Vector3} position - Entity position
   */
  updateDebugMesh(position) {
    if (!this.debugMesh) return;
    
    this.debugMesh.position.copy(position);
    this.debugMesh.position.x += this.offset.x;
    this.debugMesh.position.y += this.offset.y;
    this.debugMesh.position.z += this.offset.z;
    
    this.debugMesh.visible = this.showDebugMesh;
  }
  
  /**
   * Toggle debug mesh visibility
   * @param {boolean} visible - Whether the debug mesh should be visible
   */
  setDebugMeshVisible(visible) {
    this.showDebugMesh = visible;
    if (this.debugMesh) {
      this.debugMesh.visible = visible;
    } else if (visible) {
      this.createDebugMesh();
    }
  }
  
  /**
   * Set collision callback
   * @param {string} type - Callback type (onCollisionEnter, onCollisionStay, onCollisionExit, onTriggerEnter, onTriggerStay, onTriggerExit)
   * @param {Function} callback - Callback function
   */
  setCallback(type, callback) {
    if (typeof callback === 'function') {
      this[type] = callback;
    }
  }
  
  /**
   * Check collision with another collider using basic AABB or sphere collision
   * Note: This is a simple implementation for demonstration. Real games would use a physics engine like Rapier.
   * @param {Collider} other - Other collider
   * @param {THREE.Vector3} position - This entity's position
   * @param {THREE.Vector3} otherPosition - Other entity's position
   * @returns {Object|null} Collision data or null if no collision
   */
  checkCollision(other, position, otherPosition) {
    // Skip if either is not enabled
    if (!this.enabled || !other.enabled) return null;
    
    // Calculate actual positions including offsets
    const thisPos = new THREE.Vector3(
      position.x + this.offset.x,
      position.y + this.offset.y,
      position.z + this.offset.z
    );
    
    const otherPos = new THREE.Vector3(
      otherPosition.x + other.offset.x,
      otherPosition.y + other.offset.y,
      otherPosition.z + other.offset.z
    );
    
    // Check collision based on collider types
    if (this.type === 'sphere' && other.type === 'sphere') {
      // Sphere-Sphere collision
      const distance = thisPos.distanceTo(otherPos);
      const minDistance = this.size.radius + other.size.radius;
      
      if (distance < minDistance) {
        // Calculate penetration direction and depth
        const direction = new THREE.Vector3().subVectors(thisPos, otherPos).normalize();
        const penetration = minDistance - distance;
        
        return {
          colliding: true,
          penetration,
          direction,
          point: new THREE.Vector3().addVectors(
            otherPos,
            direction.clone().multiplyScalar(other.size.radius)
          )
        };
      }
    } else if (this.type === 'box' && other.type === 'box') {
      // AABB collision
      const thisMin = new THREE.Vector3(
        thisPos.x - this.size.x,
        thisPos.y - this.size.y,
        thisPos.z - this.size.z
      );
      
      const thisMax = new THREE.Vector3(
        thisPos.x + this.size.x,
        thisPos.y + this.size.y,
        thisPos.z + this.size.z
      );
      
      const otherMin = new THREE.Vector3(
        otherPos.x - other.size.x,
        otherPos.y - other.size.y,
        otherPos.z - other.size.z
      );
      
      const otherMax = new THREE.Vector3(
        otherPos.x + other.size.x,
        otherPos.y + other.size.y,
        otherPos.z + other.size.z
      );
      
      // Check AABB overlap
      if (thisMin.x <= otherMax.x && thisMax.x >= otherMin.x &&
          thisMin.y <= otherMax.y && thisMax.y >= otherMin.y &&
          thisMin.z <= otherMax.z && thisMax.z >= otherMin.z) {
        
        // Calculate penetration in each axis
        const overlapX = Math.min(thisMax.x - otherMin.x, otherMax.x - thisMin.x);
        const overlapY = Math.min(thisMax.y - otherMin.y, otherMax.y - thisMin.y);
        const overlapZ = Math.min(thisMax.z - otherMin.z, otherMax.z - thisMin.z);
        
        // Find minimum penetration axis
        let penetration, direction;
        
        if (overlapX < overlapY && overlapX < overlapZ) {
          // X axis has minimum penetration
          penetration = overlapX;
          direction = new THREE.Vector3(thisPos.x < otherPos.x ? -1 : 1, 0, 0);
        } else if (overlapY < overlapZ) {
          // Y axis has minimum penetration
          penetration = overlapY;
          direction = new THREE.Vector3(0, thisPos.y < otherPos.y ? -1 : 1, 0);
        } else {
          // Z axis has minimum penetration
          penetration = overlapZ;
          direction = new THREE.Vector3(0, 0, thisPos.z < otherPos.z ? -1 : 1);
        }
        
        return {
          colliding: true,
          penetration,
          direction,
          point: new THREE.Vector3().addVectors(
            thisPos,
            direction.clone().multiplyScalar(penetration / 2)
          )
        };
      }
    } else if (this.type === 'sphere' && other.type === 'box') {
      // Sphere-AABB collision
      // Find closest point on AABB to sphere center
      const closestPoint = new THREE.Vector3(
        Math.max(otherPos.x - other.size.x, Math.min(thisPos.x, otherPos.x + other.size.x)),
        Math.max(otherPos.y - other.size.y, Math.min(thisPos.y, otherPos.y + other.size.y)),
        Math.max(otherPos.z - other.size.z, Math.min(thisPos.z, otherPos.z + other.size.z))
      );
      
      // Check if closest point is within sphere radius
      const distance = thisPos.distanceTo(closestPoint);
      
      if (distance < this.size.radius) {
        // Calculate penetration
        const penetration = this.size.radius - distance;
        
        // Calculate direction (from closest point to sphere center)
        const direction = distance > 0 
          ? new THREE.Vector3().subVectors(thisPos, closestPoint).normalize()
          : new THREE.Vector3(1, 0, 0); // Default direction if sphere center is inside AABB
        
        return {
          colliding: true,
          penetration,
          direction,
          point: closestPoint.clone()
        };
      }
    } else if (this.type === 'box' && other.type === 'sphere') {
      // Box-Sphere collision (reuse sphere-box code)
      const result = other.checkCollision(this, otherPosition, position);
      
      if (result) {
        // Reverse the direction
        result.direction.negate();
        return result;
      }
    }
    
    // No collision
    return null;
  }
  
  /**
   * Process collision events
   * @param {Entity} thisEntity - This entity
   * @param {Entity} otherEntity - Other entity
   * @param {Object} collisionData - Collision data
   */
  processCollision(thisEntity, otherEntity, collisionData) {
    const otherEntityId = otherEntity.id;
    const isTrigger = this.isTrigger || otherEntity.getComponent('Collider').isTrigger;
    
    if (isTrigger) {
      // Handle trigger
      if (!this.currentTriggers.has(otherEntityId)) {
        // Trigger enter
        this.currentTriggers.set(otherEntityId, {
          entity: otherEntity,
          time: Date.now()
        });
        
        if (this.onTriggerEnter) {
          this.onTriggerEnter(thisEntity, otherEntity, collisionData);
        }
      } else {
        // Trigger stay
        if (this.onTriggerStay) {
          this.onTriggerStay(thisEntity, otherEntity, collisionData);
        }
      }
    } else {
      // Handle collision
      if (!this.currentCollisions.has(otherEntityId)) {
        // Collision enter
        this.currentCollisions.set(otherEntityId, {
          entity: otherEntity,
          time: Date.now()
        });
        
        if (this.onCollisionEnter) {
          this.onCollisionEnter(thisEntity, otherEntity, collisionData);
        }
      } else {
        // Collision stay
        if (this.onCollisionStay) {
          this.onCollisionStay(thisEntity, otherEntity, collisionData);
        }
      }
    }
  }
  
  /**
   * Process end of collisions
   * @param {Entity} thisEntity - This entity
   * @param {Array} collisionEntities - Entities currently colliding
   */
  processEndCollisions(thisEntity, collisionEntities) {
    // Get set of current collision entity IDs
    const currentIds = new Set(collisionEntities.map(entity => entity.id));
    
    // Check for ended collisions
    this.currentCollisions.forEach((data, entityId) => {
      if (!currentIds.has(entityId)) {
        // Collision ended
        if (this.onCollisionExit) {
          this.onCollisionExit(thisEntity, data.entity);
        }
        
        this.currentCollisions.delete(entityId);
      }
    });
    
    // Check for ended triggers
    this.currentTriggers.forEach((data, entityId) => {
      if (!currentIds.has(entityId)) {
        // Trigger ended
        if (this.onTriggerExit) {
          this.onTriggerExit(thisEntity, data.entity);
        }
        
        this.currentTriggers.delete(entityId);
      }
    });
  }
  
  /**
   * Dispose of resources
   */
  dispose() {
    if (this.debugMesh) {
      if (this.debugMesh.geometry) {
        this.debugMesh.geometry.dispose();
      }
      
      if (this.debugMesh.material) {
        this.debugMesh.material.dispose();
      }
    }
    
    this.currentCollisions.clear();
    this.currentTriggers.clear();
  }
}

export default Collider;