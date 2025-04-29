import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { SurfaceType, setSurfaceProperties } from './physics';

/**
 * Create the terrain for the game
 * @param scene Three.js scene to add the terrain to
 * @param world Rapier physics world for collision
 * @param size Dimensions of the terrain
 * @returns Terrain object with mesh and body
 */
export function createTerrain(
  scene: THREE.Scene,
  world: RAPIER.World,
  size = { width: 20, height: 20, depth: 5 }
) {
  // Create flat terrain geometry
  const geometry = new THREE.BoxGeometry(size.width, size.depth, size.height);
  
  // Create grass-like material
  const material = new THREE.MeshStandardMaterial({ 
    color: 0x67c240,
    roughness: 0.8,
    metalness: 0.2
  });
  
  // Create mesh
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, -size.depth / 2, 0);
  mesh.receiveShadow = true;
  scene.add(mesh);
  
  // Create Rapier rigid body (static)
  const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -size.depth / 2, 0);
  const body = world.createRigidBody(bodyDesc);
  
  // Create collider
  const colliderDesc = RAPIER.ColliderDesc.cuboid(
    size.width / 2,
    size.depth / 2,
    size.height / 2
  );
  colliderDesc.setFriction(0.3);
  world.createCollider(colliderDesc, body);
  
  return { mesh, body };
}

/**
 * Create the player ball
 * @param scene Three.js scene to add the ball to
 * @param world Rapier physics world for physics
 * @param radius Radius of the ball
 * @param position Initial position
 * @returns Player ball object with mesh and body
 */
export function createPlayerBall(
  scene: THREE.Scene,
  world: RAPIER.World,
  radius = 0.5,
  position = { x: 0, y: 2, z: 0 }
) {
  // Create sphere geometry
  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  
  // Create material
  const material = new THREE.MeshStandardMaterial({
    color: 0xff69b4, // Pink like Kirby
    roughness: 0.3,
    metalness: 0.2
  });
  
  // Create mesh
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x, position.y, position.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  
  // Create Rapier rigid body (dynamic)
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(position.x, position.y, position.z)
    .setCcdEnabled(true); // Enable CCD on the body
  const body = world.createRigidBody(bodyDesc);
  
  // Create collider
  const colliderDesc = RAPIER.ColliderDesc.ball(radius)
    .setRestitution(0.7) // Bounciness
    .setFriction(0.2);   // Smooth rolling
  
  world.createCollider(colliderDesc, body);
  
  return { mesh, body };
}

/**
 * Create a wall for the player to cling to
 * @param scene Three.js scene to add the wall to
 * @param world Rapier physics world for physics
 * @param size Dimensions of the wall
 * @param position Position of the wall
 * @returns Wall object with mesh and body
 */
export function createWall(
  scene: THREE.Scene,
  world: RAPIER.World,
  size = { width: 10, height: 5, depth: 0.5 },
  position = { x: 5, y: 2.5, z: 0 }
) {
  // Create wall geometry
  const geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
  
  // Create material with distinctive color for walls
  const material = new THREE.MeshStandardMaterial({
    color: 0x8888ff, // Blue-ish for walls
    roughness: 0.6,
    metalness: 0.1
  });
  
  // Create mesh
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x, position.y, position.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  
  // Create Rapier rigid body (static)
  const bodyDesc = RAPIER.RigidBodyDesc.fixed()
    .setTranslation(position.x, position.y, position.z);
  const body = world.createRigidBody(bodyDesc);
  
  // Create collider with wall properties
  const colliderDesc = RAPIER.ColliderDesc.cuboid(
    size.width / 2,
    size.height / 2,
    size.depth / 2
  );
  const collider = world.createCollider(colliderDesc, body);
  
  // Set as wall type for cling physics
  setSurfaceProperties(collider, SurfaceType.WALL);
  
  return { mesh, body, collider };
} 