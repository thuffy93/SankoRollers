import * as THREE from 'three';
import { PhysicsConfig } from '../utils/physicsConfig';

export function calculateTrajectoryPoints(
  startPos: THREE.Vector3,
  angle: number,
  power: number,
  maxPoints: number = 20
): THREE.Vector3[] {
  const shotPhysics = PhysicsConfig.shot;
  const force = power * shotPhysics.powerMultiplier;
  const gravity = PhysicsConfig.world.gravity;
  
  // Calculate direction vector from angle
  const directionX = Math.cos(angle);
  const directionZ = Math.sin(angle);
  
  // Calculate initial velocity
  const vel = new THREE.Vector3(
    directionX * force,
    0.1 * force, // Small upward component
    directionZ * force
  );
  
  // Points to return
  const points: THREE.Vector3[] = [];
  
  // Add start point
  points.push(startPos.clone());
  
  // Current position in simulation
  const pos = startPos.clone();
  const timestep = 0.1;
  
  // Simulate trajectory
  for (let i = 0; i < maxPoints; i++) {
    // Update velocity (apply gravity)
    vel.x += gravity.x * timestep;
    vel.y += gravity.y * timestep;
    vel.z += gravity.z * timestep;
    
    // Update position
    pos.x += vel.x * timestep;
    pos.y += vel.y * timestep;
    pos.z += vel.z * timestep;
    
    // Add point
    points.push(pos.clone());
    
    // Stop if we hit the ground
    if (pos.y <= 0) {
      // Adjust final point to be at ground level
      const lastPoint = points[points.length - 1];
      lastPoint.y = 0;
      break;
    }
  }
  
  return points;
}

export function calculateLandingPosition(
  startPos: THREE.Vector3,
  angle: number,
  power: number
): THREE.Vector3 | null {
  const points = calculateTrajectoryPoints(startPos, angle, power, 100);
  
  // Find the first point that hits the ground
  for (let i = 1; i < points.length; i++) {
    if (points[i].y <= 0) {
      return points[i];
    }
  }
  
  return null; // No landing position found
} 