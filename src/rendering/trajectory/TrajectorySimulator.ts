import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { ShotType, SpinType } from '../../gameplay/shot/ShotTypes';

/**
 * TrajectorySimulator - Handles the simulation of shot trajectories
 * 
 * Responsible for:
 * - Simulating ball physics for trajectory prediction
 * - Calculating bounce points and trajectories
 * - Handling different shot types and spin effects
 * - Supporting both ground shots and fly shots
 */
export class TrajectorySimulator {
  // Physics world reference
  private gravity: { x: number; y: number; z: number };
  
  // Simulation properties
  private simulationSteps: number = 100;
  private maxPoints: number = 50;
  
  /**
   * Constructor
   */
  constructor(physicsWorld: RAPIER.World) {
    // Get gravity from physics world
    const gravity = physicsWorld.gravity;
    this.gravity = { x: gravity.x, y: gravity.y, z: gravity.z };
  }
  
  /**
   * Generate trajectory points using physics simulation
   * 
   * @returns An object containing the trajectory points and bounce points
   */
  public generateTrajectory(
    startPos: THREE.Vector3,
    direction: THREE.Vector3,
    power: number,
    shotType: ShotType = ShotType.GROUNDER,
    spinType: SpinType = SpinType.NONE,
    spinIntensity: number = 0
  ): { 
    points: THREE.Vector3[]; 
    bouncePoints: THREE.Vector3[];
    landingPoint: THREE.Vector3 | null;
  } {
    // Calculate if this is a super shot (95%+ power)
    const isSuperShot = power >= 0.95;
    
    // Calculate initial velocity
    const velocityMultiplier = 30; // Adjust to match actual physics force
    const initialVelocity = this.calculateInitialVelocity(
      direction, 
      power * velocityMultiplier,
      shotType
    );
    
    // Apply spin effects (reduced for super shots to show more predictable path)
    if (isSuperShot) {
      // For super shots, reduce spin effect to show the more predictable path
      this.applySpinToVelocity(initialVelocity, spinType, spinIntensity * 0.7, power);
    } else {
      this.applySpinToVelocity(initialVelocity, spinType, spinIntensity, power);
    }
    
    // Prepare result containers
    const points: THREE.Vector3[] = [];
    const bouncePoints: THREE.Vector3[] = [];
    let landingPoint: THREE.Vector3 | null = null;
    
    // Add starting point
    points.push(startPos.clone());
    
    // Simulation variables
    const pos = startPos.clone();
    const vel = initialVelocity.clone();
    const timestep = 0.1; // Simulation time step
    
    // Bounce tracking
    let bounceCount = 0;
    const maxBounces = shotType === ShotType.FLY ? 4 : 2;
    let hasHitGround = false;
    
    // Simulate trajectory
    for (let i = 0; i < this.simulationSteps; i++) {
      // Apply gravity
      vel.x += this.gravity.x * timestep;
      vel.y += this.gravity.y * timestep;
      vel.z += this.gravity.z * timestep;
      
      // Apply progressive spin effects
      this.applyProgressiveSpin(vel, spinType, spinIntensity, hasHitGround, bounceCount);
      
      // Apply air resistance
      vel.x *= 0.995;
      vel.z *= 0.995;
      
      // Update position
      pos.x += vel.x * timestep;
      pos.y += vel.y * timestep;
      pos.z += vel.z * timestep;
      
      // Ground collision detection and bounce handling
      if (pos.y <= 0 && vel.y < 0) {
        bounceCount++;
        hasHitGround = true;
        
        // Store bounce point
        const bouncePoint = pos.clone();
        bouncePoint.y = 0.01; // Just above ground
        bouncePoints.push(bouncePoint);
        
        // Track landing point (first time hitting ground)
        if (bounceCount === 1) {
          landingPoint = bouncePoint.clone();
        }
        
        // Handle bounce physics based on shot type
        if (shotType === ShotType.GROUNDER) {
          // GROUNDER shots have minimal bounce
          vel.y = -vel.y * 0.3; // 30% energy retained
          
          // Apply more friction to horizontal velocity
          vel.x *= 0.7;
          vel.z *= 0.7;
        } else {
          // FLY shots have significant bounce
          vel.y = -vel.y * 0.6; // 60% energy retained
          
          // Apply less friction to horizontal velocity
          vel.x *= 0.8;
          vel.z *= 0.8;
          
          // Apply spin effects to bounce
          if (spinType === SpinType.TOP) {
            // Top spin increases forward momentum after bounce
            vel.x *= 1.2;
            vel.z *= 1.2;
            vel.y *= 0.7; // Lower bounce
          } else if (spinType === SpinType.BACK) {
            // Back spin decreases forward momentum but increases bounce height
            vel.x *= 0.7;
            vel.z *= 0.7;
            vel.y *= 1.3; // Higher bounce
          }
        }
        
        // Prevent getting stuck in ground
        pos.y = 0.01;
        
        // Stop after max bounces
        if (bounceCount >= maxBounces) {
          // For GROUNDER shots, simulate rolling to a stop
          if (shotType === ShotType.GROUNDER) {
            this.simulateRollingPoints(pos, vel, spinType, spinIntensity, points);
          }
          break;
        }
      }
      
      // Add point to trajectory
      points.push(pos.clone());
      
      // Stop if velocity becomes too small after at least one bounce
      if (vel.length() < 0.5 && hasHitGround) {
        break;
      }
    }
    
    return {
      points,
      bouncePoints,
      landingPoint
    };
  }
  
  /**
   * Calculate initial velocity based on direction, power, and shot type
   */
  private calculateInitialVelocity(
    direction: THREE.Vector3,
    force: number,
    shotType: ShotType
  ): THREE.Vector3 {
    // Create normalized direction vector
    const normalizedDir = direction.clone().normalize();
    
    // Calculate initial velocity based on shot type
    if (shotType === ShotType.GROUNDER) {
      // GROUNDER shots have minimal upward component
      return new THREE.Vector3(
        normalizedDir.x * force,
        0.05 * force, // Minimal upward component
        normalizedDir.z * force
      );
    } else {
      // FLY shots have significant upward component
      return new THREE.Vector3(
        normalizedDir.x * force,
        0.4 * force, // Higher upward component
        normalizedDir.z * force
      );
    }
  }
  
  /**
   * Apply spin effects to velocity vector
   */
  private applySpinToVelocity(
    velocity: THREE.Vector3,
    spinType: SpinType,
    spinIntensity: number,
    powerFactor: number
  ): void {
    // Skip if no spin
    if (spinType === SpinType.NONE || spinIntensity <= 0) {
      return;
    }
    
    // Scale factor for spin effects
    const spinFactor = spinIntensity * 0.3;
    const force = powerFactor * 30; // Match the velocityMultiplier
    
    switch (spinType) {
      case SpinType.LEFT:
        // Left spin curves the trajectory left
        velocity.x -= force * spinFactor;
        break;
        
      case SpinType.RIGHT:
        // Right spin curves the trajectory right
        velocity.x += force * spinFactor;
        break;
        
      case SpinType.TOP:
        // Top spin increases forward momentum, reduces height
        velocity.x *= 1 + spinFactor;
        velocity.z *= 1 + spinFactor;
        velocity.y *= 0.8;
        break;
        
      case SpinType.BACK:
        // Back spin reduces forward momentum, increases height
        velocity.x *= 1 - spinFactor * 0.5;
        velocity.z *= 1 - spinFactor * 0.5;
        velocity.y *= 1.2;
        break;
    }
  }
  
  /**
   * Apply progressive spin effects as the trajectory continues
   */
  private applyProgressiveSpin(
    velocity: THREE.Vector3,
    spinType: SpinType,
    spinIntensity: number,
    hasHitGround: boolean,
    bounceCount: number
  ): void {
    // Skip if no spin
    if (spinType === SpinType.NONE || spinIntensity <= 0) {
      return;
    }
    
    // Spin effects are stronger after bounces
    const postBounceFactor = hasHitGround ? 1.0 + (bounceCount * 0.2) : 1.0;
    const effectiveIntensity = spinIntensity * postBounceFactor * 0.01;
    
    switch (spinType) {
      case SpinType.LEFT:
        // Progressive curve to the left
        velocity.x -= velocity.length() * effectiveIntensity;
        break;
        
      case SpinType.RIGHT:
        // Progressive curve to the right
        velocity.x += velocity.length() * effectiveIntensity;
        break;
        
      case SpinType.TOP:
        // Top spin increases forward momentum progressively
        if (hasHitGround) {
          const forwardBoost = velocity.length() * effectiveIntensity;
          // Boost in the direction of horizontal movement
          const horizLength = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
          if (horizLength > 0) {
            velocity.x += (velocity.x / horizLength) * forwardBoost;
            velocity.z += (velocity.z / horizLength) * forwardBoost;
          }
        }
        break;
        
      case SpinType.BACK:
        // Back spin decreases forward momentum progressively
        if (hasHitGround && bounceCount > 0) {
          const backwardFactor = 1.0 - effectiveIntensity;
          velocity.x *= backwardFactor;
          velocity.z *= backwardFactor;
        }
        break;
    }
  }
  
  /**
   * Simulate rolling to a stop for GROUNDER shots and add points to the trajectory
   */
  private simulateRollingPoints(
    startPos: THREE.Vector3,
    startVel: THREE.Vector3,
    spinType: SpinType,
    spinIntensity: number,
    pointsArray: THREE.Vector3[]
  ): void {
    // Simulate rolling with gradual deceleration
    const pos = startPos.clone();
    const vel = startVel.clone();
    const timestep = 0.1;
    
    // Calculate initial speed and deceleration
    const initialSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    const rollingFactor = 0.95; // Deceleration per step
    
    // Adjust for spin effects
    let spinRollingBonus = 1.0;
    if (spinType === SpinType.LEFT || spinType === SpinType.RIGHT) {
      // Horizontal spin increases rolling distance slightly
      spinRollingBonus = 1.0 + spinIntensity * 0.3;
    } else if (spinType === SpinType.TOP) {
      // Top spin increases rolling distance
      spinRollingBonus = 1.0 + spinIntensity * 0.6;
    } else if (spinType === SpinType.BACK) {
      // Back spin decreases rolling distance
      spinRollingBonus = 1.0 - spinIntensity * 0.4;
    }
    
    // Calculate spin curvature (for LEFT/RIGHT spin)
    const spinCurveFactor = spinIntensity * 0.03;
    let spinCurvature = 0;
    
    if (spinType === SpinType.LEFT) {
      spinCurvature = -spinCurveFactor;
    } else if (spinType === SpinType.RIGHT) {
      spinCurvature = spinCurveFactor;
    }
    
    // Add rolling points
    let currentSpeed = initialSpeed;
    let maxRollingPoints = 15;
    
    for (let i = 0; i < maxRollingPoints && currentSpeed > 0.05; i++) {
      // Gradual deceleration
      currentSpeed *= rollingFactor;
      
      // Apply spin curve effect (rotation)
      if (spinCurvature !== 0) {
        // Rotate velocity vector to create curved path
        const angle = spinCurvature * (1.0 - currentSpeed / initialSpeed);
        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);
        
        const oldVelX = vel.x;
        vel.x = vel.x * cosAngle - vel.z * sinAngle;
        vel.z = oldVelX * sinAngle + vel.z * cosAngle;
      }
      
      // Normalize and scale by current speed
      const velLength = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
      if (velLength > 0) {
        vel.x = (vel.x / velLength) * currentSpeed;
        vel.z = (vel.z / velLength) * currentSpeed;
      }
      
      // Update position
      pos.x += vel.x * timestep * spinRollingBonus;
      pos.y = 0.01; // Stay just above ground
      pos.z += vel.z * timestep * spinRollingBonus;
      
      // Add point to the provided array
      pointsArray.push(pos.clone());
    }
  }
} 