// src/gameCore/collisionHandler.ts
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventType, eventsManager } from '../utils/events';
import { CourseGenerator } from './CourseGenerator';
import { SurfaceType, getSurfaceType } from './physics';

/**
 * Set up collision handling for the game
 */
export function setupCollisionHandling(
  world: RAPIER.World,
  playerBallBody: RAPIER.RigidBody,
  courseGenerator: CourseGenerator,
  scene: THREE.Scene
) {
  // Set up manual hole detection with goal check
  const holeBody = courseGenerator.getHole()?.body;
  let isCleanedUp = false;
  
  // Function to check for target collisions
  const checkTargetCollisions = () => {
    if (isCleanedUp || !playerBallBody.isValid()) return;
    
    try {
      // Get player ball position
      const ballPos = playerBallBody.translation();
      const ballRadius = 0.5; // Assuming ball radius is 0.5
      
      // Check all targets for close proximity
      const targets = courseGenerator.getTargets();
      targets.forEach(target => {
        if (target.hit) return; // Skip already hit targets
        
        try {
          if (!target.body.isValid()) return;
          
          const targetPos = target.body.translation();
          
          // Calculate distance between ball and target
          const dx = ballPos.x - targetPos.x;
          const dy = ballPos.y - targetPos.y;
          const dz = ballPos.z - targetPos.z;
          const distanceSquared = dx * dx + dy * dy + dz * dz;
          
          // Check if within collision distance (ball radius + target radius)
          const minDistance = ballRadius + 0.5; // Assuming target radius is 0.5
          
          if (distanceSquared < minDistance * minDistance) {
            // Mark target as hit
            courseGenerator.hitTarget(target.body);
            
            // Handle target hit
            handleTargetHit(playerBallBody, target.body);
            
            // Create hit effect
            const position = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
            createCollisionEffect(scene, position, new THREE.Vector3(0, 1, 0));
          }
        } catch (e) {
          console.warn("Error checking target collision:", e);
        }
      });
    } catch (e) {
      console.warn("Error in collision detection:", e);
    }
  };
  
  const intervalId = setInterval(() => {
    if (isCleanedUp) return;
    
    try {
      if (holeBody && holeBody.isValid() && playerBallBody.isValid() && courseGenerator.areAllTargetsHit()) {
        // Get player ball position
        const ballPos = playerBallBody.translation();
        const holePos = holeBody.translation();
        
        // Calculate distance between ball and hole
        const dx = ballPos.x - holePos.x;
        const dy = ballPos.y - holePos.y;
        const dz = ballPos.z - holePos.z;
        const distanceSquared = dx * dx + dz * dz; // Ignoring Y for top-down detection
        
        // If ball is close enough to hole
        if (distanceSquared < 0.4 * 0.4) {
          // Ball is in the hole!
          eventsManager.publish(EventType.GOAL_REACHED, {});
          eventsManager.publish(EventType.HOLE_COMPLETE, {
            position: new THREE.Vector3(holePos.x, holePos.y, holePos.z)
          });
        }
      }
      
      // Also check for target collisions
      checkTargetCollisions();
    } catch (e) {
      console.warn("Error in collision interval:", e);
    }
  }, 100);
  
  // Setup cleanup for when the component unmounts
  eventsManager.subscribe(EventType.RESET_GAME, () => {
    isCleanedUp = true;
    clearInterval(intervalId);
  });
  
  // Return a cleanup function
  return () => {
    isCleanedUp = true;
    clearInterval(intervalId);
  };
}

/**
 * Handle hitting a target
 */
function handleTargetHit(playerBallBody: RAPIER.RigidBody, targetBody: RAPIER.RigidBody) {
  if (!playerBallBody.isValid() || !targetBody.isValid()) return;
  
  try {
    // Get the current velocity
    const velocity = playerBallBody.linvel();
    
    // Slow down the ball (simulate hitting the target)
    playerBallBody.setLinvel({
      x: velocity.x * 0.5,
      y: velocity.y * 0.5,
      z: velocity.z * 0.5
    }, true);
    
    // Get target position safely
    const targetPos = targetBody.translation();
    
    // Publish target hit event
    eventsManager.publish(EventType.TARGET_HIT, {
      position: { x: targetPos.x, y: targetPos.y, z: targetPos.z },
      velocity: { x: velocity.x, y: velocity.y, z: velocity.z }
    });
  } catch (e) {
    console.warn("Error handling target hit:", e);
  }
}

/**
 * Check for special collisions with different surface types
 */
function checkForSpecialCollisions(collider: RAPIER.Collider, playerBallBody: RAPIER.RigidBody) {
  // Get the surface type
  const surfaceType = getSurfaceType(collider);
  
  switch (surfaceType) {
    case SurfaceType.BOUNCE_PAD:
      // Apply extra bounce force
      const normal = new THREE.Vector3(0, 1, 0); // Default upward if no contact normal
      const bounceForce = 15; // Strong bounce
      
      playerBallBody.applyImpulse(
        { x: normal.x * bounceForce, y: normal.y * bounceForce, z: normal.z * bounceForce },
        true
      );
      
      // Publish bounce pad event
      eventsManager.publish(EventType.SHOT_BOUNCE, {
        position: playerBallBody.translation(),
        force: bounceForce
      });
      break;
      
    case SurfaceType.SAND:
      // Apply strong damping in sand
      const sandVelocity = playerBallBody.linvel();
      
      // Heavy slowdown in sand
      playerBallBody.setLinvel({
        x: sandVelocity.x * 0.7,
        y: sandVelocity.y,
        z: sandVelocity.z * 0.7
      }, true);
      break;
      
    case SurfaceType.ICE:
      // Ice is already handled via friction in physics.ts
      break;
      
    case SurfaceType.WALL:
      // Wall-clinging is handled in applyWallClingEffect()
      break;
  }
}

/**
 * Create a visual effect at a collision point
 */
export function createCollisionEffect(scene: THREE.Scene, position: THREE.Vector3, normal: THREE.Vector3) {
  // Create a small flash at the collision point
  const flashGeometry = new THREE.SphereGeometry(0.2, 8, 8);
  const flashMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8
  });
  
  const flash = new THREE.Mesh(flashGeometry, flashMaterial);
  flash.position.copy(position);
  
  // Offset slightly along normal to avoid z-fighting
  flash.position.add(normal.multiplyScalar(0.05));
  
  scene.add(flash);
  
  // Fade out and remove
  let opacity = 0.8;
  const fadeOut = () => {
    opacity -= 0.05;
    (flash.material as THREE.MeshBasicMaterial).opacity = opacity;
    
    if (opacity > 0) {
      requestAnimationFrame(fadeOut);
    } else {
      scene.remove(flash);
      flash.geometry.dispose();
      (flash.material as THREE.Material).dispose();
    }
  };
  
  requestAnimationFrame(fadeOut);
}