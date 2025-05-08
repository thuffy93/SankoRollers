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
    // Hide aiming arrow handled by AimingController
    
    // Calculate shot vector
    const shotVector = this.parameterManager.calculateShotVector();
    
    // Check if this is a "super shot" (95%+ power)
    const isSuperShot = this.parameterManager.isSuperShot;
    
    // Apply impulse to ball
    this.ballBody.applyImpulse(
      { x: shotVector.x, y: shotVector.y, z: shotVector.z }, 
      true
    );
    
    // Apply spin based on spin type
    if (this.parameterManager.spinType !== SpinType.NONE) {
      this.applySpinToShot();
    }
    
    // For super shots, apply additional stability (reduced random factors)
    if (isSuperShot) {
      this.applySuperShotEffects();
    }
    
    console.log(`Shot executed: Power=${this.parameterManager.getActualShotPower().toFixed(2)}, Angle=${this.parameterManager.angle.toFixed(2)}, Type=${this.parameterManager.shotType}, Spin=${this.parameterManager.spinType}`);
    
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