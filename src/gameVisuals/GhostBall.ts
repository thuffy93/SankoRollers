import * as THREE from 'three';

export class GhostBall {
  private scene: THREE.Scene;
  private mesh: THREE.Mesh | null = null;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }
  
  public showAt(position: THREE.Vector3, radius: number = 0.5): void {
    // Clean up existing mesh first
    this.dispose();
    
    // Create ghost ball with simplified material
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    
    // Use basic material instead of standard material
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.4,
      wireframe: false
    });
    
    // Create mesh
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    
    // Add to scene
    this.scene.add(this.mesh);
  }
  
  public hide(): void {
    if (this.mesh) {
      this.mesh.visible = false;
    }
  }
  
  public dispose(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) {
        if (Array.isArray(this.mesh.material)) {
          this.mesh.material.forEach(m => m.dispose());
        } else {
          this.mesh.material.dispose();
        }
      }
      this.mesh = null;
    }
  }
} 