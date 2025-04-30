import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GameState, gameStateManager } from '../utils/gameState';
import { EventType, eventsManager } from '../utils/events';

/**
 * Creates a goal hole that the player aims to reach
 * @param scene Three.js scene to add the hole to
 * @param world Rapier physics world
 * @param position Position of the hole
 * @returns Object containing the hole mesh and body
 */
export function createGoalHole(
  scene: THREE.Scene,
  world: RAPIER.World,
  position = { x: 10, y: 0.01, z: 10 } // Default position
) {
  // Create hole geometry - a black cylinder
  const geometry = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 32);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0x000000,
    roughness: 0.8,
    metalness: 0.2
  });
  
  // Create hole mesh
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x, position.y, position.z);
  mesh.receiveShadow = true;
  scene.add(mesh);
  
  // Add a glow effect around the hole
  const glowGeometry = new THREE.RingGeometry(0.4, 0.6, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x00ffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7
  });
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  glowMesh.position.set(position.x, position.y + 0.05, position.z);
  glowMesh.rotation.x = -Math.PI / 2; // Lay flat
  scene.add(glowMesh);
  
  // Create Rapier rigid body (static)
  const bodyDesc = RAPIER.RigidBodyDesc.fixed()
    .setTranslation(position.x, position.y, position.z);
  const body = world.createRigidBody(bodyDesc);
  
  // Create collider with sensor (no physical collision)
  const colliderDesc = RAPIER.ColliderDesc.cylinder(0.05, 0.4)
    .setSensor(true); // Important: Must be a sensor to detect entry without collision
  const collider = world.createCollider(colliderDesc, body);
  
  // Set user data for identification in collision detection
  body.userData = { type: 'hole', mesh };
  
  // Create a simple animation for the glow
  const animateGlow = () => {
    glowMesh.rotation.z += 0.01;
    requestAnimationFrame(animateGlow);
  };
  animateGlow();
  
  return { mesh, body, collider, glowMesh };
}

/**
 * Sets up goal hole collision detection
 * @param world Rapier physics world
 * @param playerBallBody Player ball rigid body
 * @param goalHoleBody Goal hole rigid body
 */
export function setupGoalDetection(
  world: RAPIER.World,
  playerBallBody: RAPIER.RigidBody,
  goalHole: { body: RAPIER.RigidBody }
) {
  // Check for intersections with the player ball
  const checkIntersection = () => {
    // Only check if the ball is in a rolling state
    if (!gameStateManager.isState(GameState.ROLLING)) {
      return;
    }
    
    // Use Rapier's intersection test
    const ballPos = playerBallBody.translation();
    const holePos = goalHole.body.translation();
    
    // Calculate distance between ball and hole centers
    const dx = ballPos.x - holePos.x;
    const dz = ballPos.z - holePos.z;
    const distanceSquared = dx * dx + dz * dz;
    
    // Check if ball is inside hole (using a slightly smaller radius than the visual hole)
    if (distanceSquared < 0.2 * 0.2) {
      // Ball is in the hole!
      handleGoalReached();
      
      // Stop checking
      clearInterval(intersectionInterval);
    }
  };
  
  // Check for intersections every 100ms
  const intersectionInterval = setInterval(checkIntersection, 100);
  
  // Clean up function
  const cleanUp = () => {
    clearInterval(intersectionInterval);
  };
  
  return { cleanUp };
}

/**
 * Handle when the player reaches the goal
 */
function handleGoalReached() {
  console.log('Goal reached!');
  
  // Publish event
  eventsManager.publish(EventType.GOAL_REACHED, {});
  
  // Change game state
  gameStateManager.setState(GameState.COMPLETE);
} 