import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { ShotParameterManager } from './ShotParameterManager';
import { ShotType, SpinType } from './ShotTypes';

/**
 * ShotPhysics - Handles the physics calculations and application for shots
 * 
 * Responsible for:
 * - Calculating shot vectors based on parameters
 * - Applying impulses to the ball
 * - Handling different shot types (grounder, fly)
 * - Applying spin effects to shots
 */
export class ShotPhysics {
  private ballBody: RAPIER.RigidBody;
  private parameterManager: ShotParameterManager;
  
  constructor(ballBody: RAPIER.RigidBody, parameterManager: ShotParameterManager) {
    this.ballBody = ballBody;
    this.parameterManager = parameterManager;
  }
  
  /**
   * Execute the shot by applying appropriate physics forces
   * @returns True if shot was successfully executed
   */
  public executeShot(): boolean {
    // Calculate shot vector
    const shotVector = this.parameterManager.calculateShotVector();
    
    // CRITICAL DEBUG OUTPUT
    const ballPos = this.ballBody.translation();
    console.log("PRE-SHOT BALL STATE:", {
      position: { x: ballPos.x.toFixed(2), y: ballPos.y.toFixed(2), z: ballPos.z.toFixed(2) },
      sleeping: this.ballBody.isSleeping(),
      linvel: this.ballBody.linvel(),
      angvel: this.ballBody.angvel()
    });
    
    // Ensure vector has meaningful magnitude
    if (shotVector.length() < 0.1) {
      console.error("Shot vector too small:", shotVector);
      return false;
    }
    
    // FORCE WAKE THE BALL - Multiple methods to ensure it wakes up
    this.ballBody.wakeUp();
    
    // Method 1: Set zero linear velocity to reset any "at rest" state
    this.ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    
    // Method 2: Apply slightly stronger impulse (1.2x force)
    const impulseVector = {
      x: shotVector.x * 1.2,
      y: Math.max(shotVector.y, 0.3), // Ensure some upward component
      z: shotVector.z * 1.2
    };
    
    console.log("APPLYING IMPULSE:", {
      x: impulseVector.x.toFixed(2),
      y: impulseVector.y.toFixed(2),
      z: impulseVector.z.toFixed(2)
    });
    
    this.ballBody.applyImpulse(impulseVector, true);
    
    // Check if ball is still sleeping (should never happen after above steps)
    if (this.ballBody.isSleeping()) {
      console.log("Ball still sleeping after impulse! Forcing direct velocity");
      this.ballBody.setLinvel({
        x: shotVector.x * 0.3,
        y: Math.max(shotVector.y, 0.2),
        z: shotVector.z * 0.3
      }, true);
    }
    
    // Apply spin based on spin type
    if (this.parameterManager.spinType !== SpinType.NONE) {
      this.applySpinToShot();
    }
    
    // For super shots, apply additional stability (reduced random factors)
    if (this.parameterManager.isSuperShot) {
      this.applySuperShotEffects();
    }
    
    // Schedule debug output after a short delay to see if the ball actually moved
    setTimeout(() => {
      const postBallPos = this.ballBody.translation();
      const postVel = this.ballBody.linvel();
      console.log("POST-SHOT BALL STATE (after 50ms):", {
        position: { x: postBallPos.x.toFixed(2), y: postBallPos.y.toFixed(2), z: postBallPos.z.toFixed(2) },
        sleeping: this.ballBody.isSleeping(),
        linvel: { x: postVel.x.toFixed(2), y: postVel.y.toFixed(2), z: postVel.z.toFixed(2) },
        speed: Math.sqrt(postVel.x * postVel.x + postVel.y * postVel.y + postVel.z * postVel.z).toFixed(2)
      });
    }, 50);
    
    console.log(`Shot executed: Power=${this.parameterManager.getActualShotPower().toFixed(2)}, Angle=${this.parameterManager.angle.toFixed(2)}, Type=${this.parameterManager.shotType}, Spin=${this.parameterManager.spinType}`);
    console.log(`Applied shot vector: x=${shotVector.x.toFixed(2)}, y=${shotVector.y.toFixed(2)}, z=${shotVector.z.toFixed(2)}`);
    
    return true;
  }
  
  /**
   * Apply spin forces to the shot
   */
  private applySpinToShot(): void {
    // Get direction from parameter manager
    const direction = this.parameterManager.getShotDirection();
    
    // Calculate spin force based on spin type and intensity
    const spinForce = new THREE.Vector3();
    const spinStrength = 2.0 * this.parameterManager.spinIntensity;
    
    switch (this.parameterManager.spinType) {
      case SpinType.LEFT:
        // Spin around y-axis (left spin)
        spinForce.set(0, spinStrength, 0);
        break;
        
      case SpinType.RIGHT:
        // Spin around y-axis (right spin)
        spinForce.set(0, -spinStrength, 0);
        break;
        
      case SpinType.TOP:
        // Top spin (affects fly shots)
        // Calculate perpendicular vector to direction on xz plane
        const perpVector = new THREE.Vector3(-direction.z, 0, direction.x);
        spinForce.copy(perpVector).multiplyScalar(spinStrength);
        break;
        
      case SpinType.BACK:
        // Back spin (affects fly shots)
        const perpVectorBack = new THREE.Vector3(-direction.z, 0, direction.x);
        spinForce.copy(perpVectorBack).multiplyScalar(-spinStrength);
        break;
        
      default:
        // No spin
        return;
    }
    
    // Apply torque impulse for spin
    this.ballBody.applyTorqueImpulse(
      { x: spinForce.x, y: spinForce.y, z: spinForce.z },
      true
    );
  }
  
  /**
   * Apply additional effects for super shots (95-100% power)
   */
  private applySuperShotEffects(): void {
    // Reduce angular velocity (makes the shot more stable and predictable)
    this.ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    
    // Reduce linear damping temporarily for more precise movement
    const originalDamping = this.ballBody.linearDamping();
    this.ballBody.setLinearDamping(originalDamping * 0.7);
    
    console.log('SUPER SHOT! Applied physics enhancements');
  }
} 