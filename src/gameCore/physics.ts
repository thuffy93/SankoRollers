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
      // Kirby's Dream Course has high friction on walls to allow clinging
      collider.setFriction(wallsConfig.clingingFriction);
      collider.setRestitution(0.1); // Not very bouncy
      break;
      
    case SurfaceType.ICE:
      // Kirby's Dream Course has extremely slippery ice
      collider.setFriction(terrainConfig.iceFriction * 0.5); // Even more slippery
      collider.setRestitution(0.1);
      break;
      
    case SurfaceType.SAND:
      // Kirby's Dream Course has very high friction in sand
      collider.setFriction(terrainConfig.sandFriction * 1.3); // Even higher friction
      collider.setRestitution(0.05); // Almost no bounce
      break;
      
    case SurfaceType.BOUNCE_PAD:
      collider.setFriction(terrainConfig.defaultFriction);
      // Kirby's Dream Course has very bouncy bounce pads
      collider.setRestitution(terrainConfig.bouncePadRestitution * 1.2); // Even bouncier
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
 * Check if a body is on a wall - Kirby's Dream Course style wall clinging
 * @param body The rigid body to check
 * @param world The physics world
 */
export function isOnWall(body: RAPIER.RigidBody, world: RAPIER.World): boolean {
  // Get body position and velocity
  const position = body.translation();
  const velocity = body.linvel();
  
  // Perform ray-casting in multiple directions to detect walls
  const rayLength = 0.6; // Slightly larger than ball radius (Kirby-style close detection)
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
  let wallCount = 0;
  let wallNormal = { x: 0, y: 0, z: 0 };
  
  for (const dir of rayDirections) {
    const ray = new RAPIER.Ray(position, dir);
    const hit = world.castRay(ray, rayLength, true);
    
    if (hit) {
      wallCount++;
      
      // Get the collider that was hit
      const collider = world.getCollider(hit.collider.handle);
      const surfaceType = getSurfaceType(collider);
      
      // Only count as wall if it's actually a wall surface type
      if (surfaceType === SurfaceType.WALL) {
        // Accumulate wall normal (opposite of ray direction)
        wallNormal.x -= dir.x;
        wallNormal.y -= dir.y;
        wallNormal.z -= dir.z;
      }
    }
  }
  
  // Normalize the accumulated wall normal
  const normalLength = Math.sqrt(
    wallNormal.x * wallNormal.x + 
    wallNormal.y * wallNormal.y + 
    wallNormal.z * wallNormal.z
  );
  
  if (normalLength > 0) {
    wallNormal.x /= normalLength;
    wallNormal.y /= normalLength;
    wallNormal.z /= normalLength;
  }
  
  // Check conditions for being on a wall - Kirby's Dream Course style
  const isElevated = position.y > 0.6; // Slightly above the ground
  const hasLowVerticalVelocity = Math.abs(velocity.y) < 0.9; // Not moving much vertically (more lenient)
  const hasHorizontalVelocity = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) > 0.1; // Some horizontal motion
  const isTouchingWall = wallCount > 0; // At least one ray hit
  
  // If we're elevated, not falling fast, moving horizontally, and touching a wall, we're clinging
  return isElevated && hasLowVerticalVelocity && isTouchingWall;
}

/**
 * Apply wall-clinging effect to a body when appropriate
 * Enhanced to match Kirby's Dream Course wall-clinging physics
 * @param body The rigid body (player ball)
 * @param world The physics world
 */
export function applyWallClingEffect(body: RAPIER.RigidBody, world: RAPIER.World): void {
  if (isOnWall(body, world)) {
    // Reduce gravity effect when on wall - Kirby's Dream Course style
    const originalGravity = PhysicsConfig.world.gravity;
    const reducedGravity = {
      x: originalGravity.x * 0.15, // Stronger reduction (was 0.2)
      y: originalGravity.y * 0.15, // Stronger reduction (was 0.2)
      z: originalGravity.z * 0.15  // Stronger reduction (was 0.2)
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
          y: vel.y * 0.8, // Stronger damping factor (was 0.85)
          z: vel.z 
        },
        true
      );
    }
    
    // Apply slight inward force to keep ball against wall - Kirby's Dream Course style
    const pos = body.translation();
    const centerDist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    
    if (centerDist > 0.1) {
      const inwardForce = 0.25 * body.mass(); // Stronger inward force (was 0.2)
      body.addForce(
        {
          x: -pos.x / centerDist * inwardForce,
          y: 0,
          z: -pos.z / centerDist * inwardForce
        },
        true
      );
    }
    
    // Slow down horizontal movement slightly for better wall control - Kirby style
    body.setLinvel(
      {
        x: vel.x * 0.98,
        y: vel.y,
        z: vel.z * 0.98
      },
      true
    );
  }
}

/**
 * Synchronize a Three.js mesh with a Rapier rigid body
 * @param mesh The Three.js mesh to update
 * @param body The Rapier rigid body
 */
export function syncMeshWithBody(mesh: THREE.Object3D, body: RAPIER.RigidBody) {
  if (!mesh || !body || !body.isValid()) return;
  
  try {
    // Get the position and rotation from the physics body
    const position = body.translation();
    const rotation = body.rotation();
    
    // Update the mesh position
    mesh.position.set(position.x, position.y, position.z);
    
    // Update the mesh quaternion (rotation)
    mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  } catch (e) {
    console.warn("Error syncing mesh with body:", e);
  }
}