/**
 * Debug visualization tools for Cosmic Rollers
 */
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventType, eventsManager } from './events';

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
  private contactPoints: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    // Listen for debug toggle
    eventsManager.subscribe(EventType.DEBUG_INFO_UPDATE, (payload) => {
      this.setEnabled(payload.debugMode || false);
    });
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
      this.clearContactPoints();
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
   * Visualize contact points between physics objects
   */
  public visualizeContactPoint(position: THREE.Vector3): void {
    if (!this.enabled) return;
    
    // Create sphere at contact point
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xff00ff });
    const sphere = new THREE.Mesh(geometry, material);
    
    sphere.position.copy(position);
    this.scene.add(sphere);
    this.contactPoints.push(sphere);
    
    // Remove after 1 second
    setTimeout(() => {
      if (sphere && this.contactPoints.includes(sphere)) {
        this.scene.remove(sphere);
        sphere.geometry.dispose();
        (sphere.material as THREE.Material).dispose();
        this.contactPoints = this.contactPoints.filter(p => p !== sphere);
      }
    }, 1000);
  }
  
  /**
   * Clear all contact point visualizations
   */
  public clearContactPoints(): void {
    this.contactPoints.forEach(point => {
      this.scene.remove(point);
      point.geometry.dispose();
      (point.material as THREE.Material).dispose();
    });
    this.contactPoints = [];
  }
  
  /**
   * Display a physics world's colliders for debug purposes
   */
  public visualizeColliders(world: RAPIER.World, showFor: number = 5000): THREE.Mesh[] {
    if (!this.enabled) return [];
    
    const colliders: THREE.Mesh[] = [];
    
    // Loop through all colliders in the world
    const colliderHandles: number[] = [];
    world.colliders.forEach((collider: RAPIER.Collider) => {
      if (collider) {
        colliderHandles.push(collider.handle);
      }
    });
    
    // Process each collider
    for (const handle of colliderHandles) {
      const collider = world.getCollider(handle);
      if (!collider) continue;
      
      // Create a wireframe mesh based on collider type
      let geometry: THREE.BufferGeometry;
      let position = collider.translation();
      
      if (collider.parent()?.bodyType() === RAPIER.RigidBodyType.KinematicPositionBased ||
          collider.parent()?.bodyType() === RAPIER.RigidBodyType.KinematicVelocityBased) {
        // For kinematic colliders, use a different color
        const material = new THREE.MeshBasicMaterial({ 
          color: 0x00ffff, 
          wireframe: true,
          transparent: true,
          opacity: 0.5
        });
        geometry = new THREE.BoxGeometry(1, 1, 1);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position.x, position.y, position.z);
        this.scene.add(mesh);
        colliders.push(mesh);
      } else {
        // Regular colliders
        const material = new THREE.MeshBasicMaterial({ 
          color: 0xff0000, 
          wireframe: true,
          transparent: true,
          opacity: 0.3
        });
        geometry = new THREE.BoxGeometry(1, 1, 1);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position.x, position.y, position.z);
        this.scene.add(mesh);
        colliders.push(mesh);
      }
    }
    
    // Remove visualizations after timeout
    if (showFor > 0) {
      setTimeout(() => {
        colliders.forEach(mesh => {
          this.scene.remove(mesh);
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
        });
      }, showFor);
    }
    
    return colliders;
  }
} 