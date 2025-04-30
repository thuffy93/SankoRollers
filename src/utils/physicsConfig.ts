/**
 * Physics configuration for Cosmic Rollers
 * Enhanced with Kirby's Dream Course-like physics values
 */

export const PhysicsConfig = {
  // World settings
  world: {
    gravity: { x: 0, y: -9.81, z: 0 }, // Standard gravity
    timeStep: 1/60,
  },
  
  // Player ball settings - Adjusted for Kirby-like feel
  playerBall: {
    radius: 0.5,
    mass: 1.0,
    friction: 0.25, // Slightly higher base friction for better control
    restitution: 0.75, // Slightly higher bounciness (Kirby bounces a lot)
    linearDamping: 0.12, // Slightly higher damping to simulate air resistance
    angularDamping: 0.25, // Higher spin damping to match Kirby's behavior
    ccdEnabled: true, // Continuous collision detection
    maxLinearVelocity: 35, // Higher max speed for more dynamic shots
  },
  
  // Terrain settings - Adjusted for Kirby-like surfaces
  terrain: {
    defaultFriction: 0.35, // Slightly higher default friction
    iceFriction: 0.02, // Very low friction for ice (Kirby slides a lot)
    sandFriction: 0.9, // Higher friction for sand traps
    bouncePadRestitution: 1.5, // Very bouncy bounce pads
  },
  
  // Shot settings - Adjusted for Kirby-like shot mechanics
  shot: {
    powerMultiplier: 0.23, // Slightly higher power for longer shots
    maxPower: 100,
    spinMultiplier: 0.07, // Stronger spin effect like in Dream Course
    bounceImpulse: 6.5, // Stronger bounce (Kirby's B button bounce is strong)
    minVelocityToStop: 0.12, // When to consider the ball stopped
  },
  
  // Camera settings
  camera: {
    followDistance: 15,
    followHeight: 10,
    followLerp: 0.08, // Slightly smoother camera for Kirby-like feel
    aimingHeight: 15,
    aimingDistance: 20,
  },
  
  // Wall settings - Adjusted for Kirby-like wall clinging
  walls: {
    clingingFriction: 1.2, // Even higher friction for wall clinging
    normalFriction: 0.3,
  },
  
  // Obstacle settings - Adjusted for Kirby's Dream Course feel
  obstacles: {
    bumperRestitution: 1.8, // Super bouncy bumpers like in Dream Course
    bouncePadImpulse: 18, // Stronger bounce pads
    targetBounce: 5.0, // How much upward bounce when hitting a target
  },
  
  // Kirby's Dream Course specific settings
  kirbyStyle: {
    // Shot mechanics
    maxBounces: 3, // Maximum number of mid-shot bounces
    bounceTimeout: 300, // Milliseconds between bounce attempts
    minBounceVelocity: 0.5, // Minimum velocity required to bounce
    maxBounceVelocity: 15, // Maximum velocity for bounce effectiveness
    
    // Power settings
    powerOscillationSpeed: 2, // How fast power level oscillates
    
    // Camera settings
    targetHitCameraZoom: 0.8, // Camera zoom level when hitting a target
    goalZoomInSpeed: 0.05, // How fast camera zooms in at goal
    
    // Hit position settings
    maxHitPositionOffset: 0.3, // Maximum offset for hit position adjustment
    hitPositionImpact: 0.3, // How much hit position affects trajectory
    
    // Visual effects
    targetHitEffectDuration: 1000, // Milliseconds for target hit effect
    starBurstCount: 8, // Number of stars in burst effect
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

export function getKirbyStyleValues() {
  return PhysicsConfig.kirbyStyle;
}