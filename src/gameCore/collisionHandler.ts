// src/gameCore/collisionHandler.ts
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventType, eventsManager } from '../utils/events';
import { CourseGenerator } from './CourseGenerator';
import { SurfaceType, getSurfaceType } from './physics';
import { GameState, gameStateManager } from '../utils/gameState';

/**
 * Set up collision handling for the game
 * Enhanced to match Kirby's Dream Course collision behaviors
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
  
  // Kirby's Dream Course style hit effects
  const targetHitEffects = new Map<string, { 
    mesh: THREE.Object3D, 
    animation: number, 
    createdAt: number 
  }>();
  
  // Function to check for target collisions
  const checkTargetCollisions = () => {
    if (isCleanedUp || !playerBallBody.isValid()) return;
    
    try {
      // Get player ball position
      const ballPos = playerBallBody.translation();
      const ballRadius = 0.5; // Assuming ball radius is 0.5
      
      // Check all targets for close proximity
      const targets = courseGenerator.getTargets();
      targets.forEach((target, id) => {
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
            
            // Handle target hit - Kirby's Dream Course style
            handleKirbyStyleTargetHit(playerBallBody, target.body, id);
            
            // Create hit effect
            const position = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
            createKirbyStyleHitEffect(scene, position, id);
          }
        } catch (e) {
          console.warn("Error checking target collision:", e);
        }
      });
    } catch (e) {
      console.warn("Error in collision detection:", e);
    }
  };
  
  const checkGoalCollision = () => {
    if (isCleanedUp) return;
    
    try {
      if (holeBody && holeBody.isValid() && playerBallBody.isValid() && 
          courseGenerator.areAllTargetsHit() && gameStateManager.isState(GameState.ROLLING)) {
        // Get player ball position
        const ballPos = playerBallBody.translation();
        const holePos = holeBody.translation();
        
        // Calculate distance between ball and hole
        const dx = ballPos.x - holePos.x;
        const dy = ballPos.y - holePos.y;
        const dz = ballPos.z - holePos.z;
        const distanceSquared = dx * dx + dz * dz; // Ignoring Y for top-down detection
        
        // If ball is close enough to hole - Kirby's Dream Course style goal animation
        if (distanceSquared < 0.5 * 0.5) {
          // Ball is in the hole! - Kirby style goal animation
          handleKirbyStyleGoal(playerBallBody, holeBody, scene);
          
          // Publish events
          eventsManager.publish(EventType.GOAL_REACHED, {});
          eventsManager.publish(EventType.HOLE_COMPLETE, {
            position: new THREE.Vector3(holePos.x, holePos.y, holePos.z)
          });
        }
      }
    } catch (e) {
      console.warn("Error in goal collision check:", e);
    }
  };
  
  // Set up interval for collision checks
  const intervalId = setInterval(() => {
    if (isCleanedUp) return;
    
    checkTargetCollisions();
    checkGoalCollision();
    
    // Update hit effects animations
    updateHitEffects(scene, targetHitEffects);
  }, 100);
  
  // Setup cleanup for when the component unmounts
  eventsManager.subscribe(EventType.RESET_GAME, () => {
    isCleanedUp = true;
    clearInterval(intervalId);
    clearHitEffects(scene, targetHitEffects);
  });
  
  // Return a cleanup function
  return () => {
    isCleanedUp = true;
    clearInterval(intervalId);
    clearHitEffects(scene, targetHitEffects);
  };
}

/**
 * Handle hitting a target in Kirby's Dream Course style
 * In Kirby's Dream Course, hitting an enemy stops Kirby completely
 */
function handleKirbyStyleTargetHit(
  playerBallBody: RAPIER.RigidBody, 
  targetBody: RAPIER.RigidBody,
  targetId: string
) {
  if (!playerBallBody.isValid() || !targetBody.isValid()) return;
  
  try {
    // Get the current velocity for sound/effect intensity
    const velocity = playerBallBody.linvel();
    const speed = Math.sqrt(velocity.x**2 + velocity.y**2 + velocity.z**2);
    
    // In Kirby's Dream Course, hitting a target stops the ball completely
    playerBallBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    playerBallBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    
    // Get target position safely
    const targetPos = targetBody.translation();
    
    // Bump the ball slightly upward for visual effect (Kirby-style)
    playerBallBody.applyImpulse({ x: 0, y: 1.5, z: 0 }, true);
    
    // Publish target hit event
    eventsManager.publish(EventType.TARGET_HIT, {
      position: { x: targetPos.x, y: targetPos.y, z: targetPos.z },
      velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
      speed: speed,
      targetId: targetId
    });
    
    // Switch to idle state after a short delay (to see the upward bump)
    setTimeout(() => {
      if (playerBallBody.isValid()) {
        gameStateManager.setState(GameState.IDLE);
      }
    }, 500);
  } catch (e) {
    console.warn("Error handling target hit:", e);
  }
}

/**
 * Handle entering the goal hole - Kirby's Dream Course style
 */
function handleKirbyStyleGoal(
  playerBallBody: RAPIER.RigidBody,
  holeBody: RAPIER.RigidBody,
  scene: THREE.Scene
) {
  if (!playerBallBody.isValid() || !holeBody.isValid()) return;
  
  try {
    // Stop ball physics completely
    playerBallBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    playerBallBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    
    // Get hole position
    const holePos = holeBody.translation();
    
    // Center ball over hole
    playerBallBody.setTranslation({
      x: holePos.x,
      y: holePos.y + 0.5, // Slightly above hole
      z: holePos.z
    }, true);
    
    // Create goal animation
    createGoalEffect(scene, new THREE.Vector3(holePos.x, holePos.y, holePos.z));
    
    // Set game state to complete
    gameStateManager.setState(GameState.COMPLETE);
  } catch (e) {
    console.warn("Error handling goal:", e);
  }
}

/**
 * Create a visual effect at a collision point - Kirby's Dream Course style
 */
function createKirbyStyleHitEffect(scene: THREE.Scene, position: THREE.Vector3, targetId: string) {
  // Create a star burst effect (like in Kirby's Dream Course)
  const starCount = 8;
  const starSize = 0.2;
  const starDistance = 0.5;
  const starColor = 0xffff00; // Yellow stars
  
  // Parent object to manage all stars
  const hitEffect = new THREE.Group();
  hitEffect.position.copy(position);
  scene.add(hitEffect);
  
  // Create multiple stars in a burst pattern
  for (let i = 0; i < starCount; i++) {
    const angle = (i / starCount) * Math.PI * 2;
    
    // Create star geometry (simple triangle)
    const starGeometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      0, 0, 0,
      Math.sin(angle) * starSize, Math.cos(angle) * starSize, 0,
      Math.sin(angle + 0.3) * starSize * 0.6, Math.cos(angle + 0.3) * starSize * 0.6, 0
    ]);
    starGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    
    // Create star material
    const starMaterial = new THREE.MeshBasicMaterial({
      color: starColor,
      side: THREE.DoubleSide
    });
    
    // Create star mesh
    const star = new THREE.Mesh(starGeometry, starMaterial);
    
    // Position star in burst pattern
    star.position.set(
      Math.sin(angle) * starDistance,
      1 + Math.random() * 0.5, // Slightly randomized height
      Math.cos(angle) * starDistance
    );
    
    // Add to hit effect group
    hitEffect.add(star);
  }
  
  // Add a glow sphere at the center
  const glowGeometry = new THREE.SphereGeometry(0.3, 8, 8);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8
  });
  const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
  hitEffect.add(glowSphere);
  
  return hitEffect;
}

/**
 * Update hit effects animations - Kirby's Dream Course style
 */
function updateHitEffects(
  scene: THREE.Scene,
  hitEffects: Map<string, { mesh: THREE.Object3D, animation: number, createdAt: number }>
) {
  const now = Date.now();
  const removeIds: string[] = [];
  
  hitEffects.forEach((effect, id) => {
    const age = now - effect.createdAt;
    
    // Remove effects after 1 second
    if (age > 1000) {
      removeIds.push(id);
      return;
    }
    
    // Animate the effect
    const progress = age / 1000; // 0 to 1
    
    // Scale up effect
    effect.mesh.scale.set(
      1 + progress * 2,
      1 + progress * 2,
      1 + progress * 2
    );
    
    // Fade out
    effect.mesh.children.forEach(child => {
      const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      if (material && material.opacity !== undefined) {
        material.opacity = 1 - progress;
      }
    });
  });
  
  // Remove old effects
  removeIds.forEach(id => {
    const effect = hitEffects.get(id);
    if (effect) {
      scene.remove(effect.mesh);
      hitEffects.delete(id);
    }
  });
}

/**
 * Clear all hit effects
 */
function clearHitEffects(
  scene: THREE.Scene,
  hitEffects: Map<string, { mesh: THREE.Object3D, animation: number, createdAt: number }>
) {
  hitEffects.forEach(effect => {
    scene.remove(effect.mesh);
    
    // Dispose of geometries and materials
    effect.mesh.traverse(child => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  });
  
  hitEffects.clear();
}

/**
 * Create a goal completion effect - Kirby's Dream Course style
 */
function createGoalEffect(scene: THREE.Scene, position: THREE.Vector3) {
  // Create a burst of spinning stars
  const starCount = 12;
  const stars: THREE.Mesh[] = [];
  
  for (let i = 0; i < starCount; i++) {
    // Create star shape
    const starGeometry = new THREE.CircleGeometry(0.3, 5); // Pentagram-like star
    const starMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1
    });
    
    const star = new THREE.Mesh(starGeometry, starMaterial);
    
    // Position star at center initially
    star.position.copy(position);
    star.rotation.z = Math.random() * Math.PI * 2;
    
    // Add to scene
    scene.add(star);
    stars.push(star);
    
    // Star trajectory
    const angle = (i / starCount) * Math.PI * 2;
    const speed = 0.05 + Math.random() * 0.05;
    const delay = i * 50; // Stagger the star release
    
    // Animate star in an expanding spiral
    let frame = 0;
    
    const animateStar = () => {
      frame++;
      
      // Only start moving after delay
      if (frame < delay / 16) {
        requestAnimationFrame(animateStar);
        return;
      }
      
      const actualFrame = frame - (delay / 16);
      
      // Spiral outward
      const radius = actualFrame * speed;
      const spinAngle = angle + actualFrame * 0.05;
      
      star.position.x = position.x + Math.cos(spinAngle) * radius;
      star.position.y = position.y + 0.5 + actualFrame * 0.02; // Slowly rising
      star.position.z = position.z + Math.sin(spinAngle) * radius;
      
      // Spin the star
      star.rotation.z += 0.1;
      
      // Fade out
      if (actualFrame > 30) {
        const opacity = 1 - ((actualFrame - 30) / 30);
        (star.material as THREE.MeshBasicMaterial).opacity = opacity > 0 ? opacity : 0;
      }
      
      // Stop animation when completely faded
      if (actualFrame < 60) {
        requestAnimationFrame(animateStar);
      } else {
        // Clean up
        scene.remove(star);
        star.geometry.dispose();
        (star.material as THREE.Material).dispose();
      }
    };
    
    // Start animation
    requestAnimationFrame(animateStar);
  }
  
  // Create a central glow
  const glowGeometry = new THREE.SphereGeometry(0.5, 16, 16);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.copy(position);
  scene.add(glow);
  
  // Animate the glow
  let glowFrame = 0;
  const animateGlow = () => {
    glowFrame++;
    
    // Expand and fade
    const scale = 1 + glowFrame * 0.1;
    glow.scale.set(scale, scale, scale);
    
    // Fade out
    const opacity = 1 - (glowFrame / 20);
    glowMaterial.opacity = opacity > 0 ? opacity : 0;
    
    // Continue animation
    if (glowFrame < 20) {
      requestAnimationFrame(animateGlow);
    } else {
      // Clean up
      scene.remove(glow);
      glowGeometry.dispose();
      glowMaterial.dispose();
    }
  };
  
  // Start glow animation
  requestAnimationFrame(animateGlow);
}

/**
 * Create a visual effect at a collision point
 * Simplified version of the Kirby-style effect for compatibility
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
  
  // Create smaller particles for a Kirby-style effect
  const particleCount = 5;
  const particles: THREE.Mesh[] = [];
  
  for (let i = 0; i < particleCount; i++) {
    // Random particle direction
    const angle = Math.random() * Math.PI * 2;
    const particleGeometry = new THREE.SphereGeometry(0.05 + Math.random() * 0.05, 4, 4);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00, // Yellow particles
      transparent: true,
      opacity: 1
    });
    
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    // Set initial position at collision point
    particle.position.copy(position);
    scene.add(particle);
    particles.push(particle);
    
    // Animate particle in random direction
    const speed = 0.05 + Math.random() * 0.05;
    const dirX = Math.cos(angle) * speed;
    const dirY = 0.05 + Math.random() * 0.1; // Slight upward bias
    const dirZ = Math.sin(angle) * speed;
    
    const animate = () => {
      // Move particle
      particle.position.x += dirX;
      particle.position.y += dirY;
      particle.position.z += dirZ;
      
      // Fade out
      const material = particle.material as THREE.MeshBasicMaterial;
      material.opacity -= 0.05;
      
      if (material.opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        // Clean up when fully transparent
        scene.remove(particle);
        particle.geometry.dispose();
        material.dispose();
      }
    };
    
    // Start animation
    requestAnimationFrame(animate);
  }
  
  // Fade out the main flash
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
      
      // Heavy slowdown in sand - Kirby's Dream Course style
      playerBallBody.setLinvel({
        x: sandVelocity.x * 0.6, // More aggressive slowing (was 0.7)
        y: sandVelocity.y,
        z: sandVelocity.z * 0.6  // More aggressive slowing (was 0.7)
      }, true);
      break;
      
    case SurfaceType.ICE:
      // Ice is already handled via friction in physics.ts
      // Kirby's Dream Course has very slippery ice
      break;
      
    case SurfaceType.WALL:
      // Wall-clinging is handled in applyWallClingEffect()
      break;
  }
}