// src/GameEngine/Entities/BallEntity.js
import * as THREE from 'three';
import Entity from '../ECS/Entity';
import Transform from '../Components/Transform';
import Renderer from '../Components/Renderer';
import Physics from '../Components/Physics';
import Collider from '../Components/Collider';
import PlayerInput from '../Components/PlayerInput';
import Course from '../Components/Course';

/**
 * Factory function to create a ball entity
 * @param {Object} options - Configuration options
 * @returns {Entity} Ball entity
 */
export function createBallEntity(options = {}) {
  // Create entity
  const entity = new Entity();
  
  // Add ball tag
  entity.addTag('ball');
  entity.addTag('player');
  
  // Add transform component
  const position = options.position || { x: 0, y: 1, z: 0 };
  const transform = new Transform({
    position: position,
    scale: { x: 1, y: 1, z: 1 }
  });
  entity.addComponent('Transform', transform);
  
  // Add renderer component
  const ballMaterial = {
    type: 'MeshPhongMaterial',
    color: options.color || 0x00ff9f,
    emissive: 0x00662b,
    emissiveIntensity: 0.3,
    shininess: 100
  };
  
  const renderer = new Renderer({
    type: 'mesh',
    geometry: new THREE.SphereGeometry(0.5, 32, 32),
    material: ballMaterial,
    castShadow: true,
    receiveShadow: false,
    hasTrail: true,
    trailOptions: {
      length: 20,
      color: 0x00ff9f,
      opacity: 0.7
    }
  });
  entity.addComponent('Renderer', renderer);
  
  // Add physics component
  const physics = new Physics({
    mass: 1,
    friction: 0.1,
    restitution: 0.6,
    linearDamping: 0.02,
    angularDamping: 0.02,
    materialType: 'roller'
  });
  entity.addComponent('Physics', physics);
  
  // Add collider component
  const collider = new Collider({
    type: 'sphere',
    size: { radius: 0.5 },
    material: 'roller'
  });
  entity.addComponent('Collider', collider);
  
  // Add player input component if specified
  if (options.addInput) {
    const playerInput = new PlayerInput({
      maxShotPower: options.maxShotPower || 10,
      powerMeterSpeed: options.powerMeterSpeed || 0.05,
      touchEnabled: options.touchEnabled !== undefined ? options.touchEnabled : true
    });
    entity.addComponent('PlayerInput', playerInput);
  }
  
  // Add course component if specified
  if (options.addCourse) {
    const course = new Course({
      totalHoles: options.totalHoles || 9,
      currentHole: options.currentHole || 1,
      difficulty: options.difficulty || 1,
      seed: options.seed || Date.now(),
      dailyModifier: options.dailyModifier || Course.generateDailyModifier(),
      startPosition: position
    });
    entity.addComponent('Course', course);
  }
  
  return entity;
}

/**
 * Factory function to create a simple rolling ball entity
 * @param {Object} options - Configuration options
 * @returns {Entity} Simple ball entity
 */
export function createSimpleBallEntity(options = {}) {
  // Create entity
  const entity = new Entity();
  
  // Add ball tag
  entity.addTag('ball');
  
  // Add transform component
  const position = options.position || { x: 0, y: 1, z: 0 };
  const transform = new Transform({
    position: position,
    scale: { x: 1, y: 1, z: 1 }
  });
  entity.addComponent('Transform', transform);
  
  // Add renderer component
  const ballMaterial = {
    type: 'MeshStandardMaterial',
    color: options.color || 0xffffff
  };
  
  const renderer = new Renderer({
    type: 'mesh',
    geometry: new THREE.SphereGeometry(0.5, 16, 16),
    material: ballMaterial,
    castShadow: true,
    receiveShadow: true
  });
  entity.addComponent('Renderer', renderer);
  
  // Add physics component
  const physics = new Physics({
    mass: 1,
    friction: 0.1,
    restitution: 0.6
  });
  entity.addComponent('Physics', physics);
  
  // Add collider component
  const collider = new Collider({
    type: 'sphere',
    size: { radius: 0.5 }
  });
  entity.addComponent('Collider', collider);
  
  return entity;
}

export default { createBallEntity, createSimpleBallEntity };