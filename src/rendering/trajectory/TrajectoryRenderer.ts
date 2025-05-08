import * as THREE from 'three';
import { ShotType } from '../../gameplay/shot/ShotTypes';

/**
 * TrajectoryRenderer - Handles the visualization of shot trajectories
 * 
 * Responsible for:
 * - Rendering the trajectory line
 * - Showing bounce indicators
 * - Displaying the landing point indicator
 * - Animating the trajectory visualization
 */
export class TrajectoryRenderer {
  private scene: THREE.Scene;
  
  // Visual elements
  public trajectoryLine: THREE.Line;
  private bounceIndicators: THREE.Mesh[] = [];
  private landingIndicator: THREE.Mesh | null = null;
  
  // Visual properties
  private lineColor: number = 0xffff00;
  private bounceColor: number = 0xffaa00;
  private landingColor: number = 0x00ff00;
  private lineOpacity: number = 0.8;
  
  // Animation properties
  private animationFrameId: number | null = null;
  
  /**
   * Constructor
   */
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    // Create trajectory line
    this.trajectoryLine = this.createTrajectoryLine();
    this.scene.add(this.trajectoryLine);
    
    // Initialize as hidden
    this.trajectoryLine.visible = false;
  }
  
  /**
   * Create the trajectory line visual
   */
  private createTrajectoryLine(): THREE.Line {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({
      color: this.lineColor,
      opacity: this.lineOpacity,
      transparent: true,
      linewidth: 3,
    });
    
    return new THREE.Line(geometry, material);
  }
  
  /**
   * Show the trajectory using the provided points
   */
  public showTrajectory(
    points: THREE.Vector3[],
    bouncePoints: THREE.Vector3[],
    landingPoint: THREE.Vector3 | null,
    power: number,
    shotType: ShotType,
    isSuperShot: boolean
  ): void {
    // Update line geometry
    this.updateTrajectoryLine(points, power, shotType, isSuperShot);
    
    // Add bounce indicators
    this.createBounceIndicators(bouncePoints);
    
    // Add landing indicator
    if (landingPoint) {
      this.showLandingIndicator(landingPoint, shotType, isSuperShot);
    }
    
    // Make trajectory visible
    this.trajectoryLine.visible = true;
  }
  
  /**
   * Update the trajectory line with new points
   */
  private updateTrajectoryLine(
    points: THREE.Vector3[],
    power: number,
    shotType: ShotType,
    isSuperShot: boolean
  ): void {
    if (points.length < 2) return;
    
    // Update geometry with new points
    this.updateGeometry(points);
    
    // Get the line material
    const material = this.trajectoryLine.material as THREE.LineBasicMaterial;
    
    // Change color based on power and shot type
    if (shotType === ShotType.GROUNDER) {
      if (power < 0.33) {
        material.color.set(0x00ff00); // Green for low power
      } else if (power < 0.66) {
        material.color.set(0xffff00); // Yellow for medium power
      } else {
        material.color.set(0xff0000); // Red for high power
      }
    } else { // FLY shot
      if (power < 0.33) {
        material.color.set(0x00ffff); // Cyan for low power
      } else if (power < 0.66) {
        material.color.set(0xff00ff); // Magenta for medium power
      } else {
        material.color.set(0xff8000); // Orange for high power
      }
    }
    
    // Adjust line thickness and opacity based on power
    if (power >= 0.9) {
      // Make line thicker and more vibrant for high-power shots
      material.opacity = 1.0;
    } else {
      material.opacity = this.lineOpacity;
    }
  }
  
  /**
   * Update geometry with new points
   */
  public updateGeometry(points: THREE.Vector3[]): void {
    if (points.length < 2) return;
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.trajectoryLine.geometry.dispose();
    this.trajectoryLine.geometry = geometry;
  }
  
  /**
   * Create bounce indicators at the given points
   */
  private createBounceIndicators(bouncePoints: THREE.Vector3[]): void {
    // Clear existing bounce indicators
    this.clearBounceIndicators();
    
    // Create new bounce indicators
    bouncePoints.forEach(point => {
      this.addBounceIndicator(point);
    });
  }
  
  /**
   * Add a bounce indicator at the given position
   */
  private addBounceIndicator(position: THREE.Vector3): void {
    // Create a ring at the bounce point
    const geometry = new THREE.RingGeometry(0.1, 0.2, 16);
    const material = new THREE.MeshBasicMaterial({
      color: this.bounceColor,
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
   * Show landing indicator at the predicted landing spot
   */
  private showLandingIndicator(
    landingPoint: THREE.Vector3,
    shotType: ShotType,
    isSuperShot: boolean
  ): void {
    // Clear existing landing indicator
    if (this.landingIndicator) {
      this.scene.remove(this.landingIndicator);
      this.landingIndicator.geometry.dispose();
      (this.landingIndicator.material as THREE.Material).dispose();
      this.landingIndicator = null;
    }
    
    // Create geometry based on shot type
    let geometry;
    if (shotType === ShotType.GROUNDER) {
      // Circular target for GROUNDER shots
      geometry = new THREE.CircleGeometry(0.3, 16);
    } else {
      // Ring for FLY shots
      geometry = new THREE.RingGeometry(0.2, 0.4, 16);
    }
    
    const material = new THREE.MeshBasicMaterial({
      color: shotType === ShotType.GROUNDER ? 0x00ff00 : 0xff9900,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    
    this.landingIndicator = new THREE.Mesh(geometry, material);
    this.landingIndicator.position.copy(landingPoint);
    this.landingIndicator.rotation.x = Math.PI / 2; // Flat on ground
    
    this.scene.add(this.landingIndicator);
    
    // Add pulsing animation
    this.animateLandingIndicator(isSuperShot);
  }
  
  /**
   * Animate the landing indicator with a pulsing effect
   */
  private animateLandingIndicator(isSuperShot: boolean): void {
    if (!this.landingIndicator) return;
    
    let scale = 1.0;
    let increasing = true;
    
    // Cancel any existing animation
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    const animate = () => {
      if (!this.landingIndicator || !this.trajectoryLine.visible) {
        this.animationFrameId = null;
        return;
      }
      
      // Pulse scale up and down
      if (increasing) {
        scale += 0.02;
        if (scale >= 1.3) increasing = false;
      } else {
        scale -= 0.02;
        if (scale <= 0.7) increasing = true;
      }
      
      this.landingIndicator.scale.set(scale, scale, scale);
      
      // Continue animation if trajectory is still visible
      if (this.trajectoryLine.visible) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = null;
      }
    };
    
    this.animationFrameId = requestAnimationFrame(animate);
  }
  
  /**
   * Clear all bounce indicators
   */
  private clearBounceIndicators(): void {
    // Remove and dispose all bounce indicators
    this.bounceIndicators.forEach(indicator => {
      this.scene.remove(indicator);
      indicator.geometry.dispose();
      (indicator.material as THREE.Material).dispose();
    });
    
    this.bounceIndicators = [];
    
    // Clear landing indicator
    if (this.landingIndicator) {
      this.scene.remove(this.landingIndicator);
      this.landingIndicator.geometry.dispose();
      (this.landingIndicator.material as THREE.Material).dispose();
      this.landingIndicator = null;
    }
    
    // Cancel animation
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * Hide the trajectory visualization
   */
  public hideTrajectory(): void {
    this.trajectoryLine.visible = false;
    this.clearBounceIndicators();
  }
  
  /**
   * Limit the visible points to a specific distance from start
   */
  public limitPoints(points: THREE.Vector3[], maxDistance: number): THREE.Vector3[] {
    if (points.length === 0) return [];
    
    // Get the starting point
    const startPoint = points[0].clone();
    
    // Filter points based on distance from start
    const limitedPoints: THREE.Vector3[] = [];
    let totalDistance = 0;
    let previousPoint = startPoint;
    
    // Add the start point
    limitedPoints.push(startPoint);
    
    // Process remaining points
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      const segmentDistance = point.distanceTo(previousPoint);
      
      // Check if adding this segment would exceed max distance
      if (totalDistance + segmentDistance > maxDistance) {
        // Calculate the partial point that would exactly reach maxDistance
        const remainingDistance = maxDistance - totalDistance;
        const direction = new THREE.Vector3()
          .subVectors(point, previousPoint)
          .normalize();
        
        const finalPoint = previousPoint.clone().add(
          direction.multiplyScalar(remainingDistance)
        );
        
        limitedPoints.push(finalPoint);
        break;
      }
      
      // Add this point
      limitedPoints.push(point.clone());
      totalDistance += segmentDistance;
      previousPoint = point;
      
      // Stop if we've reached the max distance
      if (totalDistance >= maxDistance) break;
    }
    
    return limitedPoints;
  }
  
  /**
   * Update method (no per-frame updates needed)
   */
  public update(): void {
    // Currently no per-frame updates needed
    // Animation is handled by requestAnimationFrame
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    // Dispose trajectory line
    this.trajectoryLine.geometry.dispose();
    (this.trajectoryLine.material as THREE.Material).dispose();
    this.scene.remove(this.trajectoryLine);
    
    // Clear indicators
    this.clearBounceIndicators();
    
    // Cancel animation
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
} 