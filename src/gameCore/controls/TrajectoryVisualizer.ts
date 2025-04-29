import * as THREE from 'three';
import { PhysicsConfig } from '../../utils/physicsConfig';
import { TrajectoryPoint } from './types';
import { SurfaceType } from '../physics';

/**
 * Visualizes the predicted trajectory of a shot
 */
export class TrajectoryVisualizer {
  private scene: THREE.Scene;
  private line: THREE.Line;
  private points: THREE.Vector3[] = [];
  private maxPoints: number = 30;
  private gravity: { x: number; y: number; z: number };
  private bounceIndicators: THREE.Mesh[] = [];
  
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
   */
  public showTrajectory(
    position: THREE.Vector3, 
    angle: number, 
    power: number
  ): void {
    const shotPhysics = PhysicsConfig.shot;
    const force = power * shotPhysics.powerMultiplier;
    
    // Calculate direction vector from angle
    const directionX = Math.cos(angle);
    const directionZ = Math.sin(angle);
    
    // Calculate initial velocity
    const initialVelocity = new THREE.Vector3(
      directionX * force,
      0.1 * force, // Small upward component
      directionZ * force
    );
    
    // Generate trajectory points using projectile motion
    this.generateTrajectoryPoints(position, initialVelocity);
    
    // Update line geometry
    this.updateLine(power);
    
    // Show line
    this.line.visible = true;
  }
  
  /**
   * Generate trajectory points using simple physics simulation
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
    
    let hasBounced = false;
    
    for (let i = 0; i < this.maxPoints; i++) {
      // Update velocity (apply gravity)
      vel.x += this.gravity.x * timestep;
      vel.y += this.gravity.y * timestep;
      vel.z += this.gravity.z * timestep;
      
      // Update position
      pos.x += vel.x * timestep;
      pos.y += vel.y * timestep;
      pos.z += vel.z * timestep;
      
      // Simple bounce detection - assuming y=0 is ground
      if (pos.y <= 0 && vel.y < 0) {
        // Create bounce indicator
        this.addBounceIndicator(pos.clone());
        
        // Bounce - reflect velocity with some energy loss
        vel.y = -vel.y * 0.7; // 70% energy retained
        pos.y = 0.01; // Prevent getting stuck in ground
        hasBounced = true;
      }
      
      // Add point to trajectory
      this.points.push(pos.clone());
      
      // Stop if velocity becomes too small
      if (hasBounced && vel.length() < 0.5) break;
    }
  }
  
  /**
   * Add a bounce indicator at position
   */
  private addBounceIndicator(position: THREE.Vector3): void {
    // Create circle at bounce point
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
   * Clear all bounce indicators
   */
  private clearBounceIndicators(): void {
    this.bounceIndicators.forEach(indicator => {
      this.scene.remove(indicator);
      indicator.geometry.dispose();
      (indicator.material as THREE.Material).dispose();
    });
    
    this.bounceIndicators = [];
  }
  
  /**
   * Update the line geometry with power-based coloring
   */
  private updateLine(power: number): void {
    if (this.points.length < 2) return;
    
    // Update geometry
    const geometry = new THREE.BufferGeometry().setFromPoints(this.points);
    this.line.geometry.dispose();
    this.line.geometry = geometry;
    
    // Change color based on power
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