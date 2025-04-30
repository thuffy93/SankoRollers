import * as THREE from 'three';

export class TrajectoryLine {
  private scene: THREE.Scene;
  private line: THREE.Line | null = null;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }
  
  public showTrajectory(points: THREE.Vector3[]): void {
    // Clean up existing line first
    this.dispose();
    
    if (points.length < 2) return;
    
    // Create simple geometry from points
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    // Use basic material with no special properties
    const material = new THREE.LineBasicMaterial({ 
      color: 0xffff00 
    });
    
    // Create and add line
    this.line = new THREE.Line(geometry, material);
    this.scene.add(this.line);
  }
  
  public hide(): void {
    if (this.line) {
      this.line.visible = false;
    }
  }
  
  public dispose(): void {
    if (this.line) {
      this.scene.remove(this.line);
      if (this.line.geometry) this.line.geometry.dispose();
      if (this.line.material) {
        if (Array.isArray(this.line.material)) {
          this.line.material.forEach(m => m.dispose());
        } else {
          this.line.material.dispose();
        }
      }
      this.line = null;
    }
  }
} 