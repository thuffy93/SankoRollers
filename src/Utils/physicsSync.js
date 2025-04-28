// src/Utils/physicsSync.js
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';

/**
 * Utilities for synchronizing Three.js with Rapier physics
 */
const physicsSync = {
  /**
   * Convert a THREE.Vector3 to a Rapier vector
   * @param {THREE.Vector3} threeVector - Three.js vector
   * @returns {Object} Rapier vector
   */
  threeToRapierVec(threeVector) {
    return {
      x: threeVector.x,
      y: threeVector.y, 
      z: threeVector.z
    };
  },

  /**
   * Convert a Rapier vector to a THREE.Vector3
   * @param {Object} rapierVector - Rapier vector
   * @returns {THREE.Vector3} Three.js vector
   */
  rapierToThreeVec(rapierVector) {
    return new THREE.Vector3(
      rapierVector.x,
      rapierVector.y,
      rapierVector.z
    );
  },

  /**
   * Convert a THREE.Quaternion to a Rapier quaternion
   * @param {THREE.Quaternion} threeQuat - Three.js quaternion
   * @returns {Object} Rapier quaternion
   */
  threeToRapierQuat(threeQuat) {
    return {
      x: threeQuat.x,
      y: threeQuat.y,
      z: threeQuat.z,
      w: threeQuat.w
    };
  },

  /**
   * Convert a Rapier quaternion to a THREE.Quaternion
   * @param {Object} rapierQuat - Rapier quaternion
   * @returns {THREE.Quaternion} Three.js quaternion
   */
  rapierToThreeQuat(rapierQuat) {
    return new THREE.Quaternion(
      rapierQuat.x,
      rapierQuat.y,
      rapierQuat.z,
      rapierQuat.w
    );
  },

  /**
   * Update a Three.js mesh from a Rapier rigid body
   * @param {THREE.Object3D} mesh - Three.js mesh
   * @param {RAPIER.RigidBody} body - Rapier rigid body
   */
  updateMeshFromBody(mesh, body) {
    if (!mesh || !body) return;

    // Get position and rotation from rigid body
    const position = body.translation();
    const rotation = body.rotation();

    // Update mesh
    mesh.position.set(position.x, position.y, position.z);
    mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  },

  /**
   * Update a Rapier rigid body from a Three.js mesh
   * @param {RAPIER.RigidBody} body - Rapier rigid body
   * @param {THREE.Object3D} mesh - Three.js mesh
   */
  updateBodyFromMesh(body, mesh) {
    if (!body || !mesh) return;

    // Set rigid body position and rotation
    body.setTranslation(
      { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
      true
    );

    body.setRotation(
      { x: mesh.quaternion.x, y: mesh.quaternion.y, z: mesh.quaternion.z, w: mesh.quaternion.w },
      true
    );
  },

  /**
   * Create a physics shape from a Three.js geometry
   * @param {THREE.Geometry|THREE.BufferGeometry} geometry - Three.js geometry
   * @returns {RAPIER.ColliderDesc} Rapier collider description
   */
  createShapeFromGeometry(geometry) {
    // Simplified implementation for common geometry types
    if (geometry instanceof THREE.BoxGeometry) {
      const params = geometry.parameters;
      return RAPIER.ColliderDesc.cuboid(
        params.width / 2,
        params.height / 2,
        params.depth / 2
      );
    } 
    else if (geometry instanceof THREE.SphereGeometry) {
      return RAPIER.ColliderDesc.ball(geometry.parameters.radius);
    } 
    else if (geometry instanceof THREE.CylinderGeometry) {
      const params = geometry.parameters;
      return RAPIER.ColliderDesc.cylinder(
        params.height / 2,
        Math.max(params.radiusTop, params.radiusBottom)
      );
    }
    else if (geometry instanceof THREE.PlaneGeometry) {
      // For a plane, create a thin box collider
      const params = geometry.parameters;
      return RAPIER.ColliderDesc.cuboid(
        params.width / 2,
        0.01, // Very thin in the Y direction
        params.height / 2
      );
    }
    
    // Default to a box for unsupported geometries
    console.warn('Unsupported geometry type, using box collider');
    return RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
  },

  /**
   * Create a physics shape from a Three.js mesh
   * @param {THREE.Mesh} mesh - Three.js mesh
   * @returns {RAPIER.ColliderDesc} Rapier collider description
   */
  createShapeFromMesh(mesh) {
    if (!mesh || !mesh.geometry) {
      console.warn('Invalid mesh for physics shape');
      return null;
    }

    // Get the world scale of the mesh
    const worldScale = new THREE.Vector3();
    mesh.getWorldScale(worldScale);

    // Create shape based on geometry type
    const colliderDesc = this.createShapeFromGeometry(mesh.geometry);

    // Apply position offset
    const worldPosition = new THREE.Vector3();
    mesh.getWorldPosition(worldPosition);
    const localPosition = mesh.position.clone();

    // If there's an offset between world and local position, apply it
    if (!worldPosition.equals(localPosition)) {
      const offset = new THREE.Vector3().subVectors(worldPosition, localPosition);
      colliderDesc.setTranslation(offset.x, offset.y, offset.z);
    }

    return colliderDesc;
  },

  /**
   * Create a heightfield collider from a height array
   * @param {Array} heights - Array of height values
   * @param {number} width - Width of the heightfield
   * @param {number} depth - Depth of the heightfield
   * @param {number} scale - Scale factor for heights
   * @returns {RAPIER.ColliderDesc} Rapier heightfield collider
   */
  createHeightfieldCollider(heights, width, depth, scale = 1) {
    const numCols = Math.sqrt(heights.length);
    const numRows = heights.length / numCols;

    // Create heightfield description
    return RAPIER.ColliderDesc.heightfield(
      numRows - 1,
      numCols - 1,
      new Float32Array(heights.map(h => h * scale)),
      { x: width, y: 1, z: depth }
    );
  },

  /**
   * Create a convex hull collider from points
   * @param {Array<THREE.Vector3>} points - Array of points
   * @returns {RAPIER.ColliderDesc} Rapier convex hull collider
   */
  createConvexHull(points) {
    // Convert THREE.Vector3 array to flat Float32Array
    const flatPoints = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      flatPoints[i * 3] = points[i].x;
      flatPoints[i * 3 + 1] = points[i].y;
      flatPoints[i * 3 + 2] = points[i].z;
    }

    return RAPIER.ColliderDesc.convexHull(flatPoints);
  },

  /**
   * Create a trimesh collider from a Three.js geometry
   * @param {THREE.Geometry|THREE.BufferGeometry} geometry - Three.js geometry
   * @returns {RAPIER.ColliderDesc} Rapier trimesh collider
   */
  createTrimeshCollider(geometry) {
    let vertices, indices;

    // Get vertices and indices from geometry
    if (geometry.isBufferGeometry) {
      // Get vertices
      vertices = geometry.attributes.position.array;

      // Get indices
      if (geometry.index) {
        indices = geometry.index.array;
      } else {
        // Create sequential indices if not indexed
        indices = new Uint32Array(vertices.length / 3);
        for (let i = 0; i < indices.length; i++) {
          indices[i] = i;
        }
      }
    } else {
      console.warn('Geometry must be a BufferGeometry');
      return null;
    }

    return RAPIER.ColliderDesc.trimesh(vertices, indices);
  }
};

export default physicsSync;