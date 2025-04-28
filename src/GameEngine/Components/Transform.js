// src/GameEngine/Components/Transform.js
import * as THREE from 'three';

/**
 * Transform component for position, rotation, and scale
 */
class Transform {
  /**
   * Create a new transform component
   * @param {Object} options - Component options
   * @param {THREE.Vector3|Object} options.position - Position vector
   * @param {THREE.Quaternion|Object} options.rotation - Rotation quaternion
   * @param {THREE.Vector3|Object} options.scale - Scale vector
   */
  constructor(options = {}) {
    // Convert position to Vector3 if it's a plain object
    if (options.position instanceof THREE.Vector3) {
      this.position = options.position.clone();
    } else {
      this.position = new THREE.Vector3(
        options.position?.x || 0,
        options.position?.y || 0,
        options.position?.z || 0
      );
    }
    
    // Convert rotation to Quaternion if it's a plain object
    if (options.rotation instanceof THREE.Quaternion) {
      this.rotation = options.rotation.clone();
    } else if (options.rotation instanceof THREE.Euler) {
      this.rotation = new THREE.Quaternion().setFromEuler(options.rotation);
    } else {
      this.rotation = new THREE.Quaternion(
        options.rotation?.x || 0,
        options.rotation?.y || 0,
        options.rotation?.z || 0,
        options.rotation?.w !== undefined ? options.rotation.w : 1
      );
    }
    
    // Convert scale to Vector3 if it's a plain object
    if (options.scale instanceof THREE.Vector3) {
      this.scale = options.scale.clone();
    } else if (typeof options.scale === 'number') {
      this.scale = new THREE.Vector3(options.scale, options.scale, options.scale);
    } else {
      this.scale = new THREE.Vector3(
        options.scale?.x !== undefined ? options.scale.x : 1,
        options.scale?.y !== undefined ? options.scale.y : 1,
        options.scale?.z !== undefined ? options.scale.z : 1
      );
    }

    // Local matrix - updated when position, rotation, or scale change
    this.matrix = new THREE.Matrix4();
    this.updateMatrix();

    // Cache for euler angles (used for editing rotation)
    this._euler = new THREE.Euler();
    
    // Previous state for interpolation
    this.prevPosition = this.position.clone();
    this.prevRotation = this.rotation.clone();
  }

  /**
   * Save the current state for interpolation
   */
  saveState() {
    this.prevPosition.copy(this.position);
    this.prevRotation.copy(this.rotation);
  }

  /**
   * Update the local transformation matrix
   */
  updateMatrix() {
    this.matrix.compose(this.position, this.rotation, this.scale);
  }

  /**
   * Set position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   */
  setPosition(x, y, z) {
    this.position.set(x, y, z);
    this.updateMatrix();
  }

  /**
   * Set rotation from Euler angles
   * @param {number} x - X rotation (radians)
   * @param {number} y - Y rotation (radians)
   * @param {number} z - Z rotation (radians)
   * @param {string} order - Rotation order (default: 'XYZ')
   */
  setRotationFromEuler(x, y, z, order = 'XYZ') {
    this._euler.set(x, y, z, order);
    this.rotation.setFromEuler(this._euler);
    this.updateMatrix();
  }

  /**
   * Set rotation from quaternion
   * @param {number} x - X component
   * @param {number} y - Y component
   * @param {number} z - Z component
   * @param {number} w - W component
   */
  setRotationFromQuaternion(x, y, z, w) {
    this.rotation.set(x, y, z, w);
    this.updateMatrix();
  }

  /**
   * Set scale
   * @param {number} x - X scale
   * @param {number} y - Y scale
   * @param {number} z - Z scale
   */
  setScale(x, y, z) {
    this.scale.set(x, y, z);
    this.updateMatrix();
  }

  /**
   * Get direction vector (forward)
   * @returns {THREE.Vector3} Direction vector
   */
  getDirection() {
    const direction = new THREE.Vector3(0, 0, 1);
    return direction.applyQuaternion(this.rotation);
  }

  /**
   * Look at a target position
   * @param {THREE.Vector3} target - Target position
   * @param {THREE.Vector3} up - Up vector (default: Y up)
   */
  lookAt(target, up = new THREE.Vector3(0, 1, 0)) {
    const lookMatrix = new THREE.Matrix4();
    lookMatrix.lookAt(this.position, target, up);
    this.rotation.setFromRotationMatrix(lookMatrix);
    this.updateMatrix();
  }

  /**
   * Clone this transform
   * @returns {Transform} Cloned transform
   */
  clone() {
    return new Transform({
      position: this.position.clone(),
      rotation: this.rotation.clone(),
      scale: this.scale.clone()
    });
  }
}

export default Transform;