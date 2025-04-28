// src/GameEngine/Entities/ObstacleEntity.js
import * as THREE from 'three';
import Entity from '../ECS/Entity';
import Transform from '../Components/Transform';
import Renderer from '../Components/Renderer';
import Physics from '../Components/Physics';
import Collider from '../Components/Collider';

/**
 * Factory function to create a box obstacle entity
 * @param {Object} options - Configuration options
 * @returns {Entity} Box obstacle entity
 */
export function createBoxObstacle(options = {}) {
  // Create entity
  const entity = new Entity();
  
  // Add obstacle tag
  entity.addTag('obstacle');
  entity.addTag('box');
  
  // Get dimensions
  const width = options.width || 1 + Math.random() * 2;
  const height = options.height || 0.5 + Math.random() * 1.5;
  const depth = options.depth || options.width || 1 + Math.random() * 2;
  
  // Add transform component
  const position = options.position || { x: 0, y: height / 2, z: 0 };
  const rotation = options.rotation || { x: 0, y: 0, z: 0 };
  
  const transform = new Transform({
    position: position,
    rotation: new THREE.Euler(rotation.x, rotation.y, rotation.z),
    scale: { x: 1, y: 1, z: 1 }
  });
  entity.addComponent('Transform', transform);
  
  // Add renderer component
  const material = {
    type: 'MeshStandardMaterial',
    color: options.color || 0xff00ff,
    emissive: options.emissive || 0x660066,
    emissiveIntensity: options.emissiveIntensity || 0.3,
    metalness: options.metalness || 0.7,
    roughness: options.roughness || 0.2
  };
  
  const renderer = new Renderer({
    type: 'mesh',
    geometry: new THREE.BoxGeometry(width, height, depth),
    material: material,
    castShadow: true,
    receiveShadow: true
  });
  entity.addComponent('Renderer', renderer);
  
  // Add physics component
  const physics = new Physics({
    isStatic: options.isStatic !== undefined ? options.isStatic : true,
    materialType: 'obstacle'
  });
  entity.addComponent('Physics', physics);
  
  // Add collider component
  const collider = new Collider({
    type: 'box',
    size: {
      x: width / 2,
      y: height / 2,
      z: depth / 2
    },
    material: 'obstacle'
  });
  entity.addComponent('Collider', collider);
  
  return entity;
}

/**
 * Factory function to create a cylinder obstacle entity
 * @param {Object} options - Configuration options
 * @returns {Entity} Cylinder obstacle entity
 */
export function createCylinderObstacle(options = {}) {
  // Create entity
  const entity = new Entity();
  
  // Add obstacle tag
  entity.addTag('obstacle');
  entity.addTag('cylinder');
  
  // Get dimensions
  const radius = options.radius || 0.5 + Math.random() * 1;
  const height = options.height || 0.5 + Math.random() * 2;
  
  // Add transform component
  const position = options.position || { x: 0, y: height / 2, z: 0 };
  const rotation = options.rotation || { x: 0, y: 0, z: 0 };
  
  const transform = new Transform({
    position: position,
    rotation: new THREE.Euler(rotation.x, rotation.y, rotation.z),
    scale: { x: 1, y: 1, z: 1 }
  });
  entity.addComponent('Transform', transform);
  
  // Add renderer component
  const material = {
    type: 'MeshStandardMaterial',
    color: options.color || 0xff00ff,
    emissive: options.emissive || 0x660066,
    emissiveIntensity: options.emissiveIntensity || 0.3,
    metalness: options.metalness || 0.7,
    roughness: options.roughness || 0.2
  };
  
  const renderer = new Renderer({
    type: 'mesh',
    geometry: new THREE.CylinderGeometry(radius, radius, height, 16),
    material: material,
    castShadow: true,
    receiveShadow: true
  });
  entity.addComponent('Renderer', renderer);
  
  // Add physics component
  const physics = new Physics({
    isStatic: options.isStatic !== undefined ? options.isStatic : true,
    materialType: 'obstacle'
  });
  entity.addComponent('Physics', physics);
  
  // Add collider component
  const collider = new Collider({
    type: 'cylinder',
    size: {
      radius: radius,
      halfHeight: height / 2
    },
    material: 'obstacle'
  });
  entity.addComponent('Collider', collider);
  
  return entity;
}

/**
 * Factory function to create a ramp obstacle entity
 * @param {Object} options - Configuration options
 * @returns {Entity} Ramp obstacle entity
 */
export function createRampObstacle(options = {}) {
  // Create entity
  const entity = new Entity();
  
  // Add obstacle tag
  entity.addTag('obstacle');
  entity.addTag('ramp');
  
  // Get dimensions
  const width = options.width || 1 + Math.random() * 2;
  const height = options.height || 0.3 + Math.random() * 1;
  const depth = options.depth || 2 + Math.random() * 3;
  
  // Add transform component
  const position = options.position || { x: 0, y: height / 2, z: 0 };
  const rotation = options.rotation || { x: 0, y: Math.random() * Math.PI * 2, z: 0 };
  
  const transform = new Transform({
    position: position,
    rotation: new THREE.Euler(rotation.x, rotation.y, rotation.z),
    scale: { x: 1, y: 1, z: 1 }
  });
  entity.addComponent('Transform', transform);
  
  // Create a custom geometry for the ramp
  const vertices = [
    // Front face (triangle)
    -width/2, 0, depth/2,
    width/2, 0, depth/2,
    0, height, depth/2,
    
    // Back face (triangle)
    -width/2, 0, -depth/2,
    width/2, 0, -depth/2,
    0, height, -depth/2,
    
    // Bottom face (rectangle)
    -width/2, 0, depth/2,
    width/2, 0, depth/2,
    -width/2, 0, -depth/2,
    width/2, 0, -depth/2,
    
    // Left face (triangle)
    -width/2, 0, depth/2,
    -width/2, 0, -depth/2,
    0, height, -depth/2,
    0, height, depth/2,
    
    // Right face (triangle)
    width/2, 0, depth/2,
    width/2, 0, -depth/2,
    0, height, -depth/2,
    0, height, depth/2
  ];
  
  const indices = [
    // Front face
    0, 1, 2,
    
    // Back face
    3, 5, 4,
    
    // Bottom face
    6, 8, 7,
    7, 8, 9,
    
    // Left face
    10, 11, 12,
    10, 12, 13,
    
    // Right face
    14, 16, 15,
    14, 17, 16
  ];
  
  // Create geometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  // Add renderer component
  const material = {
    type: 'MeshStandardMaterial',
    color: options.color || 0xff00ff,
    emissive: options.emissive || 0x660066,
    emissiveIntensity: options.emissiveIntensity || 0.3,
    metalness: options.metalness || 0.7,
    roughness: options.roughness || 0.2
  };
  
  const renderer = new Renderer({
    type: 'mesh',
    geometry: geometry,
    material: material,
    castShadow: true,
    receiveShadow: true
  });
  entity.addComponent('Renderer', renderer);
  
  // Add physics component
  const physics = new Physics({
    isStatic: options.isStatic !== undefined ? options.isStatic : true,
    materialType: 'obstacle'
  });
  entity.addComponent('Physics', physics);
  
  // Add collider component - approximate with box for simplicity
  // In a real game, you'd create a more accurate convex hull
  const collider = new Collider({
    type: 'box',
    size: {
      x: width / 2,
      y: height / 2,
      z: depth / 2
    },
    material: 'obstacle'
  });
  entity.addComponent('Collider', collider);
  
  return entity;
}

/**
 * Factory function to create a moving platform entity
 * @param {Object} options - Configuration options
 * @returns {Entity} Moving platform entity
 */
export function createMovingPlatform(options = {}) {
  // Create entity
  const entity = new Entity();
  
  // Add obstacle tag
  entity.addTag('obstacle');
  entity.addTag('moving');
  
  // Get dimensions
  const width = options.width || 3;
  const height = options.height || 0.5;
  const depth = options.depth || 3;
  
  // Add transform component
  const position = options.position || { x: 0, y: height / 2, z: 0 };
  
  const transform = new Transform({
    position: position,
    scale: { x: 1, y: 1, z: 1 }
  });
  entity.addComponent('Transform', transform);
  
  // Add renderer component
  const material = {
    type: 'MeshStandardMaterial',
    color: options.color || 0x00ffff,
    emissive: options.emissive || 0x006666,
    emissiveIntensity: options.emissiveIntensity || 0.3,
    metalness: options.metalness || 0.5,
    roughness: options.roughness || 0.2
  };
  
  const renderer = new Renderer({
    type: 'mesh',
    geometry: new THREE.BoxGeometry(width, height, depth),
    material: material,
    castShadow: true,
    receiveShadow: true
  });
  entity.addComponent('Renderer', renderer);
  
  // Add physics component
  const physics = new Physics({
    isKinematic: true,
    materialType: 'obstacle'
  });
  entity.addComponent('Physics', physics);
  
  // Add collider component
  const collider = new Collider({
    type: 'box',
    size: {
      x: width / 2,
      y: height / 2,
      z: depth / 2
    },
    material: 'obstacle'
  });
  entity.addComponent('Collider', collider);
  
  // Add moving platform component
  const axis = options.axis || (Math.random() < 0.5 ? 'x' : 'z');
  const range = options.range || 5;
  const speed = options.speed || 0.03;
  
  entity.addComponent('MovingPlatform', {
    axis: axis,
    minPosition: position[axis] - range,
    maxPosition: position[axis] + range,
    speed: speed,
    direction: 1
  });
  
  return entity;
}

/**
 * Factory function to create a rotating obstacle entity
 * @param {Object} options - Configuration options
 * @returns {Entity} Rotating obstacle entity
 */
export function createRotatingObstacle(options = {}) {
  // Create entity
  const entity = new Entity();
  
  // Add obstacle tag
  entity.addTag('obstacle');
  entity.addTag('rotating');
  
  // Add transform component
  const position = options.position || { x: 0, y: 0.5, z: 0 };
  
  const transform = new Transform({
    position: position,
    scale: { x: 1, y: 1, z: 1 }
  });
  entity.addComponent('Transform', transform);
  
  // Add rotating obstacle component
  const speed = options.speed || 0.03;
  const axis = options.axis || 'y';
  
  entity.addComponent('RotatingObstacle', {
    speed: speed,
    axis: axis
  });
  
  // Create base part
  const baseEntity = new Entity();
  baseEntity.addTag('obstacle');
  baseEntity.addTag('rotatingPart');
  baseEntity.parent = entity.id;
  
  const baseTransform = new Transform({
    position: { x: 0, y: 0, z: 0 }
  });
  baseEntity.addComponent('Transform', baseTransform);
  
  // Base dimensions
  const baseRadius = options.baseRadius || 0.5;
  const baseHeight = options.baseHeight || 0.5;
  
  // Add renderer component for base
  const baseMaterial = {
    type: 'MeshStandardMaterial',
    color: options.color || 0xff6600,
    emissive: options.emissive || 0x662200,
    emissiveIntensity: options.emissiveIntensity || 0.3,
    metalness: options.metalness || 0.6,
    roughness: options.roughness || 0.3
  };
  
  const baseRenderer = new Renderer({
    type: 'mesh',
    geometry: new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 16),
    material: baseMaterial,
    castShadow: true,
    receiveShadow: true
  });
  baseEntity.addComponent('Renderer', baseRenderer);
  
  // Add physics component for base
  const basePhysics = new Physics({
    isKinematic: true,
    materialType: 'obstacle'
  });
  baseEntity.addComponent('Physics', basePhysics);
  
  // Add collider component for base
  const baseCollider = new Collider({
    type: 'cylinder',
    size: {
      radius: baseRadius,
      halfHeight: baseHeight / 2
    },
    material: 'obstacle'
  });
  baseEntity.addComponent('Collider', baseCollider);
  
  // Create arm part
  const armEntity = new Entity();
  armEntity.addTag('obstacle');
  armEntity.addTag('rotatingPart');
  armEntity.parent = entity.id;
  
  // Arm dimensions
  const armLength = options.armLength || 5;
  const armWidth = options.armWidth || 0.5;
  const armHeight = options.armHeight || 0.5;
  
  const armTransform = new Transform({
    position: { x: armLength / 2, y: armHeight / 2, z: 0 }
  });
  armEntity.addComponent('Transform', armTransform);
  
  // Add renderer component for arm
  const armRenderer = new Renderer({
    type: 'mesh',
    geometry: new THREE.BoxGeometry(armLength, armHeight, armWidth),
    material: baseMaterial, // Use same material as base
    castShadow: true,
    receiveShadow: true
  });
  armEntity.addComponent('Renderer', armRenderer);
  
  // Add physics component for arm
  const armPhysics = new Physics({
    isKinematic: true,
    materialType: 'obstacle'
  });
  armEntity.addComponent('Physics', armPhysics);
  
  // Add collider component for arm
  const armCollider = new Collider({
    type: 'box',
    size: {
      x: armLength / 2,
      y: armHeight / 2,
      z: armWidth / 2
    },
    material: 'obstacle'
  });
  armEntity.addComponent('Collider', armCollider);
  
  return { 
    rotator: entity, 
    base: baseEntity, 
    arm: armEntity 
  };
}

export default {
  createBoxObstacle,
  createCylinderObstacle,
  createRampObstacle,
  createMovingPlatform,
  createRotatingObstacle
};