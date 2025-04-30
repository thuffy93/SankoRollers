import * as THREE from 'three';
import { PhysicsConfig } from './physicsConfig';

/**
 * Shared utility for simulating projectile motion
 * Used by both trajectory line and ghost ball preview
 * 
 * @param startPos Starting position
 * @param initialVelocity Initial velocity
 * @param maxSteps Maximum simulation steps
 * @param timestep Time step for simulation
 * @returns Array of positions and velocities
 */
export function simulateProjectileMotion(
  startPos: THREE.Vector3 | { x: number; y: number; z: number },
  initialVelocity: THREE.Vector3 | { x: number; y: number; z: number },
  maxSteps = 100,
  timestep = 0.1
) {
  const gravity = PhysicsConfig.world.gravity;
  const positions: Array<{ x: number; y: number; z: number }> = [];
  const velocities: Array<{ x: number; y: number; z: number }> = [];
  
  // Copy start position and velocity to avoid modifying originals
  const pos = {
    x: startPos instanceof THREE.Vector3 ? startPos.x : startPos.x,
    y: startPos instanceof THREE.Vector3 ? startPos.y : startPos.y,
    z: startPos instanceof THREE.Vector3 ? startPos.z : startPos.z
  };
  
  const vel = {
    x: initialVelocity instanceof THREE.Vector3 ? initialVelocity.x : initialVelocity.x,
    y: initialVelocity instanceof THREE.Vector3 ? initialVelocity.y : initialVelocity.y,
    z: initialVelocity instanceof THREE.Vector3 ? initialVelocity.z : initialVelocity.z
  };
  
  // Store initial state
  positions.push({...pos});
  velocities.push({...vel});
  
  // Track highest point for landing calculations
  let highestPoint = pos.y;
  let lastPos = { ...pos };
  
  // Simulation loop
  for (let i = 0; i < maxSteps; i++) {
    // Save last position
    lastPos = { ...pos };
    
    // Update velocity (apply gravity)
    vel.x += gravity.x * timestep;
    vel.y += gravity.y * timestep;
    vel.z += gravity.z * timestep;
    
    // Update position
    pos.x += vel.x * timestep;
    pos.y += vel.y * timestep;
    pos.z += vel.z * timestep;
    
    // Track highest point
    if (pos.y > highestPoint) {
      highestPoint = pos.y;
    }
    
    // Store updated state
    positions.push({...pos});
    velocities.push({...vel});
    
    // Stop if we hit the ground after reaching a peak
    if (pos.y < 0 && highestPoint > positions[0].y) {
      // Calculate landing position through interpolation
      const overshoot = -pos.y;
      const stepHeight = lastPos.y - pos.y;
      
      if (stepHeight > 0) {
        // What fraction of the step got us to exactly y=0
        const fraction = lastPos.y / stepHeight;
        
        // Interpolate landing position
        const landingX = lastPos.x + fraction * (pos.x - lastPos.x);
        const landingZ = lastPos.z + fraction * (pos.z - lastPos.z);
        
        // Replace last position with accurate landing position
        positions[positions.length - 1] = { x: landingX, y: 0, z: landingZ };
      }
      
      break;
    }
  }
  
  return { 
    positions,
    velocities,
    landingPosition: positions[positions.length - 1],
    highestPoint 
  };
} 