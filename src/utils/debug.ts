/**
 * Debug visualization tools for Cosmic Rollers
 */
import * as THREE from 'three';

/**
 * Class for visualizing trajectories and physics values
 */
export class DebugVisualizer {
  private scene: THREE.Scene;
  private enabled: boolean = false;
  private trajectoryLine: THREE.Line | null = null;
  private trajectoryPoints: THREE.Vector3[] = [];
  private maxTrajectoryPoints: number = 100;
  private velocityArrow: THREE.ArrowHelper | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Enable or disable debug visualization
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    // Clean up visualizations if disabled
    if (!enabled) {
      this.clearTrajectory();
      this.clearVelocityArrow();
    }
  }

  /**
   * Create or update a trajectory visualization line
   */
  public visualizeTrajectory(startPoint: THREE.Vector3): void {
    if (!this.enabled) return;

    // Clear previous trajectory
    this.clearTrajectory();
    
    // Reset points collection
    this.trajectoryPoints = [startPoint.clone()];
    
    // Create geometry and material
    const geometry = new THREE.BufferGeometry().setFromPoints(this.trajectoryPoints);
    const material = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
    
    // Create line
    this.trajectoryLine = new THREE.Line(geometry, material);
    this.scene.add(this.trajectoryLine);
  }

  /**
   * Add a point to the trajectory
   */
  public addTrajectoryPoint(point: THREE.Vector3): void {
    if (!this.enabled || !this.trajectoryLine) return;
    
    this.trajectoryPoints.push(point.clone());
    
    // Keep only the most recent points
    if (this.trajectoryPoints.length > this.maxTrajectoryPoints) {
      this.trajectoryPoints.shift();
    }
    
    // Update the line geometry
    const geometry = new THREE.BufferGeometry().setFromPoints(this.trajectoryPoints);
    this.trajectoryLine.geometry.dispose();
    this.trajectoryLine.geometry = geometry;
  }

  /**
   * Clear the trajectory visualization
   */
  public clearTrajectory(): void {
    if (this.trajectoryLine) {
      this.scene.remove(this.trajectoryLine);
      this.trajectoryLine.geometry.dispose();
      (this.trajectoryLine.material as THREE.Material).dispose();
      this.trajectoryLine = null;
    }
    this.trajectoryPoints = [];
  }

  /**
   * Visualize the velocity of an object with an arrow
   */
  public visualizeVelocity(position: THREE.Vector3, velocity: THREE.Vector3): void {
    if (!this.enabled) return;

    // Clear previous arrow
    this.clearVelocityArrow();
    
    // Calculate arrow length and direction
    const length = velocity.length();
    if (length < 0.1) return; // Don't show arrows for very small velocities
    
    const directionVector = velocity.clone().normalize();
    const arrowLength = Math.min(length * 0.5, 5); // Cap arrow length
    
    // Create arrow
    this.velocityArrow = new THREE.ArrowHelper(
      directionVector,
      position,
      arrowLength,
      0x00ff00,
      arrowLength * 0.2,
      arrowLength * 0.1
    );
    this.scene.add(this.velocityArrow);
  }

  /**
   * Clear the velocity arrow visualization
   */
  public clearVelocityArrow(): void {
    if (this.velocityArrow) {
      this.scene.remove(this.velocityArrow);
      this.velocityArrow = null;
    }
  }

  /**
   * Display debug info on screen
   */
  public updateDebugInfo(info: Record<string, any>): void {
    if (!this.enabled) return;
    
    // Get or create debug container
    let debugContainer = document.getElementById('debug-info');
    if (!debugContainer) {
      debugContainer = document.createElement('div');
      debugContainer.id = 'debug-info';
      debugContainer.style.position = 'absolute';
      debugContainer.style.top = '10px';
      debugContainer.style.left = '10px';
      debugContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      debugContainer.style.color = 'white';
      debugContainer.style.padding = '10px';
      debugContainer.style.fontFamily = 'monospace';
      debugContainer.style.fontSize = '12px';
      debugContainer.style.zIndex = '100';
      document.body.appendChild(debugContainer);
    }
    
    // Update content
    let content = '<div style="text-decoration: underline; margin-bottom: 5px;">Debug Info</div>';
    
    for (const [key, value] of Object.entries(info)) {
      // Format the value nicely
      let formattedValue = value;
      
      if (typeof value === 'number') {
        formattedValue = value.toFixed(2);
      } else if (value instanceof THREE.Vector3) {
        formattedValue = `(${value.x.toFixed(2)}, ${value.y.toFixed(2)}, ${value.z.toFixed(2)})`;
      }
      
      content += `<div>${key}: ${formattedValue}</div>`;
    }
    
    debugContainer.innerHTML = content;
  }
}

// Helper function to create a debug visualizer
export function createDebugVisualizer(scene: THREE.Scene): DebugVisualizer {
  return new DebugVisualizer(scene);
} 