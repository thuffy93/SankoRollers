import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

// Type for the userData we'll attach to rigid bodies
export interface PhysicsObjectData {
  mesh?: THREE.Object3D;
  type?: string;
  id?: string;
  [key: string]: any;
}

// Initialization flag to ensure we only initialize Rapier once
let isRapierInitialized = false;

/**
 * Initialize Rapier physics engine
 */
export async function initRapier(): Promise<void> {
  if (!isRapierInitialized) {
    await RAPIER.init();
    isRapierInitialized = true;
    console.log('Rapier physics initialized');
  }
}

/**
 * Create a new physics world with default settings
 */
export function createPhysicsWorld(): RAPIER.World {
  // Create a physics world with default gravity
  const gravity = { x: 0.0, y: -9.81, z: 0.0 };
  const world = new RAPIER.World(gravity);
  
  // Configure world properties
  world.timestep = 1/60; // 60fps physics update
  
  // Note: These properties might be available in other versions of Rapier
  // But we'll skip them to avoid type errors
  // world.maxVelocityIterations = 4;
  // world.maxPositionIterations = 1;
  
  return world;
}

/**
 * Creates a dynamic rigid body (affected by forces and gravity)
 */
export function createDynamicBody(
  world: RAPIER.World,
  position: THREE.Vector3,
  userData?: PhysicsObjectData
): RAPIER.RigidBody {
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(position.x, position.y, position.z);
  
  const body = world.createRigidBody(bodyDesc);
  
  if (userData) {
    body.userData = userData;
  }
  
  return body;
}

/**
 * Creates a static rigid body (immovable, used for terrain)
 */
export function createStaticBody(
  world: RAPIER.World,
  position: THREE.Vector3,
  userData?: PhysicsObjectData
): RAPIER.RigidBody {
  const bodyDesc = RAPIER.RigidBodyDesc.fixed()
    .setTranslation(position.x, position.y, position.z);
  
  const body = world.createRigidBody(bodyDesc);
  
  if (userData) {
    body.userData = userData;
  }
  
  return body;
}

/**
 * Creates a kinematic rigid body (controlled programmatically)
 */
export function createKinematicBody(
  world: RAPIER.World,
  position: THREE.Vector3,
  userData?: PhysicsObjectData
): RAPIER.RigidBody {
  const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(position.x, position.y, position.z);
  
  const body = world.createRigidBody(bodyDesc);
  
  if (userData) {
    body.userData = userData;
  }
  
  return body;
}

/**
 * Adds a sphere collider to a rigid body
 */
export function addSphereCollider(
  world: RAPIER.World,
  body: RAPIER.RigidBody,
  radius: number,
  options: {
    restitution?: number;
    friction?: number;
    density?: number;
    isSensor?: boolean;
  } = {}
): RAPIER.Collider {
  const { restitution = 0.7, friction = 0.2, density = 1.0, isSensor = false } = options;
  
  const colliderDesc = RAPIER.ColliderDesc.ball(radius)
    .setRestitution(restitution)
    .setFriction(friction)
    .setDensity(density);
  
  if (isSensor) {
    colliderDesc.setSensor(true);
  }
  
  return world.createCollider(colliderDesc, body);
}

/**
 * Adds a box collider to a rigid body
 */
export function addBoxCollider(
  world: RAPIER.World,
  body: RAPIER.RigidBody,
  halfExtents: { x: number; y: number; z: number },
  options: {
    restitution?: number;
    friction?: number;
    density?: number;
    isSensor?: boolean;
  } = {}
): RAPIER.Collider {
  const { restitution = 0.7, friction = 0.2, density = 1.0, isSensor = false } = options;
  
  const colliderDesc = RAPIER.ColliderDesc.cuboid(
    halfExtents.x,
    halfExtents.y,
    halfExtents.z
  )
    .setRestitution(restitution)
    .setFriction(friction)
    .setDensity(density);
  
  if (isSensor) {
    colliderDesc.setSensor(true);
  }
  
  return world.createCollider(colliderDesc, body);
}

/**
 * Adds a cylinder collider to a rigid body
 */
export function addCylinderCollider(
  world: RAPIER.World,
  body: RAPIER.RigidBody,
  halfHeight: number,
  radius: number,
  options: {
    restitution?: number;
    friction?: number;
    density?: number;
    isSensor?: boolean;
  } = {}
): RAPIER.Collider {
  const { restitution = 0.7, friction = 0.2, density = 1.0, isSensor = false } = options;
  
  const colliderDesc = RAPIER.ColliderDesc.cylinder(halfHeight, radius)
    .setRestitution(restitution)
    .setFriction(friction)
    .setDensity(density);
  
  if (isSensor) {
    colliderDesc.setSensor(true);
  }
  
  return world.createCollider(colliderDesc, body);
}

/**
 * Update Three.js mesh positions based on physics bodies
 */
export function syncMeshesToPhysics(bodies: Array<RAPIER.RigidBody>): void {
  // Iterate through the array of bodies instead of using RigidBodySet methods
  bodies.forEach(body => {
    const userData = body.userData as PhysicsObjectData;
    if (userData?.mesh) {
      const position = body.translation();
      userData.mesh.position.set(position.x, position.y, position.z);
      
      // Update rotation if needed
      const rotation = body.rotation();
      userData.mesh.quaternion.set(
        rotation.x,
        rotation.y,
        rotation.z,
        rotation.w
      );
    }
  });
}

/**
 * Apply an impulse force to a rigid body
 */
export function applyImpulse(
  body: RAPIER.RigidBody,
  direction: THREE.Vector3,
  power: number
): void {
  const impulse = {
    x: direction.x * power,
    y: direction.y * power,
    z: direction.z * power
  };
  
  body.applyImpulse(impulse, true);
}

/**
 * Apply a continuous force to a rigid body
 */
export function applyForce(
  body: RAPIER.RigidBody,
  force: THREE.Vector3
): void {
  const forceVector = {
    x: force.x,
    y: force.y,
    z: force.z
  };
  
  // Rapier3D-compat uses addForce instead of applyForce
  body.addForce(forceVector, true);
}

/**
 * Set the linear velocity of a rigid body directly
 */
export function setLinearVelocity(
  body: RAPIER.RigidBody,
  velocity: THREE.Vector3
): void {
  body.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
}

/**
 * Set the angular velocity of a rigid body directly
 */
export function setAngularVelocity(
  body: RAPIER.RigidBody,
  velocity: THREE.Vector3
): void {
  body.setAngvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
}

/**
 * Reset the velocities of a rigid body to zero
 */
export function stopBody(body: RAPIER.RigidBody): void {
  // Reset linear velocity
  setLinearVelocity(body, new THREE.Vector3(0, 0, 0));
  
  // Reset angular velocity
  setAngularVelocity(body, new THREE.Vector3(0, 0, 0));
}

/**
 * Reset a rigid body to a specific position with zero velocity
 */
export function resetBody(
  body: RAPIER.RigidBody,
  position: THREE.Vector3
): void {
  // Set the position
  body.setTranslation({ x: position.x, y: position.y, z: position.z }, true);
  
  // Reset velocities
  stopBody(body);
}

/**
 * Check if a rigid body is moving (has non-zero linear or angular velocity)
 */
export function isBodyMoving(
  body: RAPIER.RigidBody,
  threshold: number = 0.01
): boolean {
  const linvel = body.linvel();
  const angvel = body.angvel();
  
  // Calculate the magnitude of linear velocity
  const linvelMag = Math.sqrt(
    linvel.x * linvel.x + 
    linvel.y * linvel.y + 
    linvel.z * linvel.z
  );
  
  // Calculate the magnitude of angular velocity
  const angvelMag = Math.sqrt(
    angvel.x * angvel.x + 
    angvel.y * angvel.y + 
    angvel.z * angvel.z
  );
  
  // Check if either linear or angular velocity is above the threshold
  return linvelMag > threshold || angvelMag > threshold;
} 