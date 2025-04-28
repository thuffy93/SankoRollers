// src/GameEngine/Entities/PowerUpEntity.js
import * as THREE from 'three';
import Entity from '../ECS/Entity';
import Transform from '../Components/Transform';
import Renderer from '../Components/Renderer';
import Physics from '../Components/Physics';
import Collider from '../Components/Collider';
import PowerUp from '../Components/PowerUp';

/**
 * Factory function to create a power-up entity
 * @param {Object} options - Configuration options
 * @returns {Entity} Power-up entity
 */
export function createPowerUpEntity(options = {}) {
  // Create entity
  const entity = new Entity();
  
  // Get power-up type
  const powerUpType = options.type || 'rocketDash';
  
  // Add power-up tag
  entity.addTag('powerUp');
  entity.addTag(powerUpType);
  
  // Add transform component
  const position = options.position || { x: 0, y: 0.5, z: 0 };
  const transform = new Transform({
    position: position,
    scale: { x: 1, y: 1, z: 1 }
  });
  entity.addComponent('Transform', transform);
  
  // Get power-up color
  let powerUpColor;
  switch (powerUpType) {
    case 'rocketDash':
      powerUpColor = 0xff0000;
      break;
    case 'stickyMode':
      powerUpColor = 0x00ff00;
      break;
    case 'bouncy':
      powerUpColor = 0x0000ff;
      break;
    case 'gravityFlip':
      powerUpColor = 0xffff00;
      break;
    default:
      powerUpColor = 0xffffff;
      break;
  }
  
  // Add renderer component
  const powerUpMaterial = {
    type: 'MeshBasicMaterial',
    color: powerUpColor,
    emissive: powerUpColor,
    emissiveIntensity: 0.5
  };
  
  const renderer = new Renderer({
    type: 'mesh',
    geometry: new THREE.SphereGeometry(0.3, 16, 16),
    material: powerUpMaterial
  });
  entity.addComponent('Renderer', renderer);
  
  // Add physics component
  const physics = new Physics({
    isStatic: true,
    isTrigger: true
  });
  entity.addComponent('Physics', physics);
  
  // Add collider component
  const collider = new Collider({
    type: 'sphere',
    size: { radius: 0.3 },
    isTrigger: true
  });
  entity.addComponent('Collider', collider);
  
  // Add power-up component
  const powerUp = new PowerUp({
    type: powerUpType,
    duration: options.duration || 
      (powerUpType === 'rocketDash' ? 3 :
       powerUpType === 'stickyMode' ? 5 :
       powerUpType === 'bouncy' ? 10 :
       powerUpType === 'gravityFlip' ? 4 : 5)
  });
  entity.addComponent('PowerUp', powerUp);
  
  // Add floating animation data
  entity.addComponent('FloatingObject', {
    initialY: position.y,
    floatHeight: options.floatHeight || 0.2,
    floatSpeed: options.floatSpeed || 1,
    rotationSpeed: options.rotationSpeed || 0.5
  });
  
  return entity;
}

/**
 * Factory function to create a rocket dash power-up
 * @param {Object} options - Configuration options
 * @returns {Entity} Rocket dash power-up entity
 */
export function createRocketDashPowerUp(options = {}) {
  return createPowerUpEntity({
    ...options,
    type: 'rocketDash',
    duration: options.duration || 3
  });
}

/**
 * Factory function to create a sticky mode power-up
 * @param {Object} options - Configuration options
 * @returns {Entity} Sticky mode power-up entity
 */
export function createStickyModePowerUp(options = {}) {
  return createPowerUpEntity({
    ...options,
    type: 'stickyMode',
    duration: options.duration || 5
  });
}

/**
 * Factory function to create a bouncy power-up
 * @param {Object} options - Configuration options
 * @returns {Entity} Bouncy power-up entity
 */
export function createBouncyPowerUp(options = {}) {
  return createPowerUpEntity({
    ...options,
    type: 'bouncy',
    duration: options.duration || 10
  });
}

/**
 * Factory function to create a gravity flip power-up
 * @param {Object} options - Configuration options
 * @returns {Entity} Gravity flip power-up entity
 */
export function createGravityFlipPowerUp(options = {}) {
  return createPowerUpEntity({
    ...options,
    type: 'gravityFlip',
    duration: options.duration || 4
  });
}

export default {
  createPowerUpEntity,
  createRocketDashPowerUp,
  createStickyModePowerUp,
  createBouncyPowerUp,
  createGravityFlipPowerUp
};