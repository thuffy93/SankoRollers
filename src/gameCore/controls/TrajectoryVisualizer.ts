import * as THREE from 'three';
import { PhysicsConfig } from '../../utils/physicsConfig';
import { TrajectoryPoint } from './types';
import { SurfaceType } from '../physics';

/**
 * Visualizes the predicted trajectory of a shot
 * Enhanced to better match Kirby's Dream Course trajectory visualization
 */
export class TrajectoryVisualizer {
  private scene: THREE.Scene;
  private line: THREE.Line;
  private points: THREE.Vector3[] = [];
  private maxPoints: number = 30;
  private gravity: { x: number; y: number; z: number };
  private bounceIndicators: THREE.Mesh[] = [];
  private predictedLandingIndicator: THREE.Mesh | null = null;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.gravity = PhysicsConfig.world.gravity;
    
    // Create line geometry with gradients
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({ 
      color: 0xffff00,
      opacity: 0.8,
      transparent: true,
      linewidth: 3
    });
    
    this.line = new THREE.Line(geometry, material);
    this.scene.add(this.line);
    
    // Initially hide
    this.line.visible = false;
  }
  
  /**
   * Show trajectory based on initial position, velocity, and power
   * Enhanced to include Kirby-style hit position offset
   */
  public showTrajectory(
    position: THREE.Vector3, 
    angle: number, 
    power: number,
    hitPositionOffset: { x: number, y: number } = { x: 0, y: 0 }
  ): void {
    const shotPhysics = PhysicsConfig.shot;
    const force = power * shotPhysics.powerMultiplier;
    
    // Calculate direction vector from angle
    const directionX = Math.cos(angle);
    const directionZ = Math.sin(angle);
    
    // Apply hit position offset (Kirby's Dream Course style)
    const adjustedDirX = directionX + hitPositionOffset.x * 0.3;
    const adjustedDirZ = directionZ + hitPositionOffset.y * 0.3;
    
    // Calculate initial velocity with Kirby-style adjustments
    const initialVelocity = new THREE.Vector3(
      adjustedDirX * force,
      0.2 * force, // Small upward component like in Dream Course
      adjustedDirZ * force
    );
    
    // Generate trajectory points using projectile motion
    this.generateTrajectoryPoints(position, initialVelocity);
    
    // Update line geometry
    this.updateLine(power);
    
    // Show line
    this.line.visible = true;
    
    // Show landing indicator at the predicted landing spot
    this.showPredictedLanding();
  }
  
  /**
   * Generate trajectory points using simple physics simulation
   * Enhanced to include multiple bounces like in Kirby's Dream Course
   */
  private generateTrajectoryPoints(
    startPos: THREE.Vector3, 
    initialVelocity: THREE.Vector3
  ): void {
    // Clear previous points
    this.points = [];
    
    // Clear previous bounce indicators
    this.clearBounceIndicators();
    
    // Add starting point
    this.points.push(startPos.clone());
    
    // Simulate trajectory
    const pos = startPos.clone();
    const vel = initialVelocity.clone();
    const timestep = 0.1; // Simulation timestep
    
    let bounceCount = 0;
    const maxBounces = 3; // Kirby's Dream Course allows multiple bounces
    
    for (let i = 0; i < this.maxPoints; i++) {
      // Update velocity (apply gravity)
      vel.x += this.gravity.x * timestep;
      vel.y += this.gravity.y * timestep;
      vel.z += this.gravity.z * timestep;
      
      // Apply slight air resistance (Kirby-style)
      vel.x *= 0.99;
      vel.z *= 0.99;
      
      // Update position
      pos.x += vel.x * timestep;
      pos.y += vel.y * timestep;
      pos.z += vel.z * timestep;
      
      // Simple bounce detection - assuming y=0 is ground
      if (pos.y <= 0 && vel.y < 0) {
        // Create bounce indicator
        this.addBounceIndicator(pos.clone());
        
        bounceCount++;
        
        // Bounce - reflect velocity with some energy loss (Kirby-style physics)
        vel.y = -vel.y * 0.65; // 65% energy retained
        
        // Apply some friction on bounce (Kirby-style)
        vel.x *= 0.8;
        vel.z *= 0.8;
        
        pos.y = 0.01; // Prevent getting stuck in ground
        
        // Stop after max bounces
        if (bounceCount >= maxBounces) {
          break;
        }
      }
      
      // Add point to trajectory
      this.points.push(pos.clone());
      
      // Stop if velocity becomes too small
      if (vel.length() < 0.5 && bounceCount > 0) break;
    }
  }
  
  /**
   * Add a bounce indicator at position (Kirby-style)
   */
  private addBounceIndicator(position: THREE.Vector3): void {
    // Create circle at bounce point - styled like Kirby's Dream Course
    const geometry = new THREE.RingGeometry(0.1, 0.2, 16);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xffaa00, 
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    
    const indicator = new THREE.Mesh(geometry, material);
    indicator.position.copy(position);
    indicator.position.y += 0.01; // Just above ground
    indicator.rotation.x = Math.PI / 2; // Flat on ground
    
    this.scene.add(indicator);
    this.bounceIndicators.push(indicator);
  }
  
  /**
   * Add an indicator showing the predicted landing spot (Kirby-style)
   */
  private showPredictedLanding(): void {
    // Clear existing landing indicator
    if (this.predictedLandingIndicator) {
      this.scene.remove(this.predictedLandingIndicator);
      this.predictedLandingIndicator.geometry.dispose();
      (this.predictedLandingIndicator.material as THREE.Material).dispose();
      this.predictedLandingIndicator = null;
    }
    
    if (this.points.length < 2) return;
    
    // Find the last point that's at ground level (y ≈ 0)
    let landingPoint = this.points[this.points.length - 1].clone();
    for (let i = 1; i < this.points.length; i++) {
      if (this.points[i].y <= 0.1) {
        landingPoint = this.points[i].clone();
        landingPoint.y = 0.01; // Ensure it's just above ground
        break;
      }
    }
    
    // Create a landing indicator (styled like Kirby's Dream Course)
    const geometry = new THREE.CircleGeometry(0.3, 16);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    
    this.predictedLandingIndicator = new THREE.Mesh(geometry, material);
    this.predictedLandingIndicator.position.copy(landingPoint);
    this.predictedLandingIndicator.rotation.x = Math.PI / 2; // Flat on ground
    
    this.scene.add(this.predictedLandingIndicator);
    
    // Add pulsing animation for the landing indicator
    this.animateLandingIndicator();
  }
  
  /**
   * Animate the landing indicator with a pulsing effect (Kirby-style)
   */
  private animateLandingIndicator(): void {
    if (!this.predictedLandingIndicator) return;
    
    let scale = 1.0;
    let increasing = true;
    
    const animate = () => {
      if (!this.predictedLandingIndicator || !this.line.visible) return;
      
      // Pulse scale up and down
      if (increasing) {
        scale += 0.02;
        if (scale >= 1.3) increasing = false;
      } else {
        scale -= 0.02;
        if (scale <= 0.7) increasing = true;
      }
      
      this.predictedLandingIndicator.scale.set(scale, scale, scale);
      
      // Continue animation if the trajectory is still visible
      if (this.line.visible) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  /**
   * Clear all bounce indicators
   */
  private clearBounceIndicators(): void {
    this.bounceIndicators.forEach(indicator => {
      this.scene.remove(indicator);
      indicator.geometry.dispose();
      (indicator.material as THREE.Material).dispose();
    });
    
    this.bounceIndicators = [];
    
    // Also clear landing indicator
    if (this.predictedLandingIndicator) {
      this.scene.remove(this.predictedLandingIndicator);
      this.predictedLandingIndicator.geometry.dispose();
      (this.predictedLandingIndicator.material as THREE.Material).dispose();
      this.predictedLandingIndicator = null;
    }
  }
  
  /**
   * Update the line geometry with power-based coloring (Kirby-style)
   */
  private updateLine(power: number): void {
    if (this.points.length < 2) return;
    
    // Update geometry
    const geometry = new THREE.BufferGeometry().setFromPoints(this.points);
    this.line.geometry.dispose();
    this.line.geometry = geometry;
    
    // Change color based on power (like in Kirby's Dream Course)
    const material = this.line.material as THREE.LineBasicMaterial;
    
    if (power < 33) {
      material.color.set(0x00ff00); // Green for low power
    } else if (power < 66) {
      material.color.set(0xffff00); // Yellow for medium power
    } else {
      material.color.set(0xff0000); // Red for high power
    }
  }
  
  /**
   * Hide the trajectory line
   */
  public hideTrajectory(): void {
    this.line.visible = false;
    this.clearBounceIndicators();
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    this.line.geometry.dispose();
    (this.line.material as THREE.Material).dispose();
    this.scene.remove(this.line);
    this.clearBounceIndicators();
  }
}