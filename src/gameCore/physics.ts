import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { PhysicsConfig } from '../utils/physicsConfig';

/**
 * Initialize the Rapier physics world
 * @returns The physics world object
 */
export async function initPhysics() {
  // Initialize Rapier
  await RAPIER.init();
  
  // Create world with gravity
  const gravity = PhysicsConfig.world.gravity;
  const world = new RAPIER.World(gravity);
  
  return { world, RAPIER };
}

/**
 * Surface types for physics properties
 */
export enum SurfaceType {
  DEFAULT = 'DEFAULT',
  WALL = 'WALL',
  ICE = 'ICE',
  SAND = 'SAND',
  BOUNCE_PAD = 'BOUNCE_PAD'
}

// Map to store collider -> surface type relationships
const surfaceTypeMap = new Map<number, SurfaceType>();

/**
 * Set surface properties for a collider
 * @param collider The collider to modify
 * @param type Surface type to apply
 */
export function setSurfaceProperties(collider: RAPIER.Collider, type: SurfaceType): void {
  const terrainConfig = PhysicsConfig.terrain;
  const wallsConfig = PhysicsConfig.walls;
  
  // Store surface type mapping
  const colliderHandle = collider.handle;
  surfaceTypeMap.set(colliderHandle, type);
  
  switch (type) {
    case SurfaceType.WALL:
      collider.setFriction(wallsConfig.clingingFriction);
      collider.setRestitution(0.1); // Not very bouncy
      break;
      
    case SurfaceType.ICE:
      collider.setFriction(terrainConfig.iceFriction);
      collider.setRestitution(0.1);
      break;
      
    case SurfaceType.SAND:
      collider.setFriction(terrainConfig.sandFriction);
      collider.setRestitution(0.05); // Almost no bounce
      break;
      
    case SurfaceType.BOUNCE_PAD:
      collider.setFriction(terrainConfig.defaultFriction);
      collider.setRestitution(terrainConfig.bouncePadRestitution);
      break;
      
    case SurfaceType.DEFAULT:
    default:
      collider.setFriction(terrainConfig.defaultFriction);
      collider.setRestitution(0.3); // Moderate bounce
      break;
  }
}

/**
 * Get surface type for a collider
 * @param collider The collider to check
 */
export function getSurfaceType(collider: RAPIER.Collider): SurfaceType {
  const colliderHandle = collider.handle;
  return surfaceTypeMap.get(colliderHandle) || SurfaceType.DEFAULT;
}

/**
 * Check if a body is on a wall
 * Helps determine when to apply wall-clinging effects
 * @param body The rigid body to check
 * @param world The physics world
 */
export function isOnWall(body: RAPIER.RigidBody, world: RAPIER.World): boolean {
  // Get body position and velocity
  const position = body.translation();
  const velocity = body.linvel();
  
  // Perform ray-casting in multiple directions to detect walls
  const rayLength = 0.7; // Slightly larger than ball radius
  const rayDirections = [
    { x: 1, y: 0, z: 0 },   // +X
    { x: -1, y: 0, z: 0 },  // -X
    { x: 0, y: 0, z: 1 },   // +Z
    { x: 0, y: 0, z: -1 },  // -Z
    { x: 0.7, y: 0, z: 0.7 },   // +X+Z
    { x: 0.7, y: 0, z: -0.7 },  // +X-Z
    { x: -0.7, y: 0, z: 0.7 },  // -X+Z
    { x: -0.7, y: 0, z: -0.7 }, // -X-Z
  ];
  
  // Cast rays to find walls
  let rayHits = 0;
  for (const dir of rayDirections) {
    const ray = new RAPIER.Ray(position, dir);
    const hit = world.castRay(ray, rayLength, true);
    if (hit) {
      rayHits++;
    }
  }
  
  // Check conditions for being on a wall
  const isElevated = position.y > 1.0; // Above the ground
  const hasLowVerticalVelocity = Math.abs(velocity.y) < 0.7; // Not moving much vertically
  const hasHorizontalVelocity = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) > 0.1; // Some horizontal motion
  const isTouchingWall = rayHits > 0; // At least one ray hit
  
  // If we're elevated, not falling fast, moving horizontally, and touching a wall, we're clinging
  return isElevated && hasLowVerticalVelocity && hasHorizontalVelocity && isTouchingWall;
}

/**
 * Apply wall-clinging effect to a body when appropriate
 * @param body The rigid body (player ball)
 * @param world The physics world
 */
export function applyWallClingEffect(body: RAPIER.RigidBody, world: RAPIER.World): void {
  if (isOnWall(body, world)) {
    // Reduce gravity effect when on wall
    const originalGravity = PhysicsConfig.world.gravity;
    const reducedGravity = {
      x: originalGravity.x * 0.2, // Further reduce gravity effect (was 0.3)
      y: originalGravity.y * 0.2, // Further reduce gravity effect (was 0.3)
      z: originalGravity.z * 0.2  // Further reduce gravity effect (was 0.3)
    };
    
    // Apply counter-force to gravity
    body.addForce(
      { 
        x: 0,
        y: -reducedGravity.y * body.mass(),
        z: 0 
      },
      true
    );
    
    // Add some downward damping to prevent climbing too high
    const vel = body.linvel();
    if (vel.y > 0) {
      body.setLinvel(
        { 
          x: vel.x,
          y: vel.y * 0.85, // Stronger damping factor (was 0.9)
          z: vel.z 
        },
        true
      );
    }
    
    // Apply slight inward force to keep ball against wall
    // This creates the impression of the ball hugging the wall
    const pos = body.translation();
    const centerDist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    
    if (centerDist > 0.1) {
      const inwardForce = 0.2 * body.mass();
      body.addForce(
        {
          x: -pos.x / centerDist * inwardForce,
          y: 0,
          z: -pos.z / centerDist * inwardForce
        },
        true
      );
    }
  }
}

/**
 * Synchronize a Three.js mesh with a Rapier rigid body
 * @param mesh The Three.js mesh to update
 * @param body The Rapier rigid body
 */
export function syncMeshWithBody(mesh: THREE.Object3D, body: RAPIER.RigidBody) {
  // Get the position and rotation from the physics body
  const position = body.translation();
  const rotation = body.rotation();
  
  // Update the mesh position
  mesh.position.set(position.x, position.y, position.z);
  
  // Update the mesh quaternion (rotation)
  mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
} 