/**
 * Physics configuration for Cosmic Rollers
 * Centralized place to adjust physics parameters
 */

export const PhysicsConfig = {
  // World settings
  world: {
    gravity: { x: 0, y: -9.81, z: 0 },
    timeStep: 1/60,
  },
  
  // Player ball settings
  playerBall: {
    radius: 0.5,
    mass: 1.0,
    friction: 0.2,
    restitution: 0.7, // Bounciness
    linearDamping: 0.1, // Gradual slow down
    angularDamping: 0.2, // Spin slow down
    ccdEnabled: true, // Continuous collision detection
    maxLinearVelocity: 30, // Max speed cap
  },
  
  // Terrain settings
  terrain: {
    defaultFriction: 0.3,
    iceFriction: 0.05,
    sandFriction: 0.8,
    bouncePadRestitution: 1.2,
  },
  
  // Shot settings
  shot: {
    powerMultiplier: 0.2, // Convert power meter (0-100) to physics impulse
    maxPower: 100,
    spinMultiplier: 0.05, // For angular impulse
    bounceImpulse: 5, // For mid-shot bounce
    minVelocityToStop: 0.1, // When to consider the ball stopped
  },
  
  // Camera settings
  camera: {
    followDistance: 15,
    followHeight: 10,
    followLerp: 0.1, // Smoothing factor for camera follow
    aimingHeight: 15,
    aimingDistance: 20,
  },
  
  // Wall settings
  walls: {
    clingingFriction: 0.9, // High friction for wall clinging
    normalFriction: 0.3,
  },
  
  // Obstacle settings
  obstacles: {
    bumperRestitution: 1.5, // Super bouncy bumpers
    bouncePadImpulse: 15,
  }
};

// Helper functions to get physics values
export function getBallPhysicsValues() {
  return PhysicsConfig.playerBall;
}

export function getShotPhysicsValues() {
  return PhysicsConfig.shot;
}

export function getTerrainPhysicsValues() {
  return PhysicsConfig.terrain;
}

export function getCameraValues() {
  return PhysicsConfig.camera;
} 