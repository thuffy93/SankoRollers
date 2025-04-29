import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventType, eventsManager } from '../../utils/events';
import { GameState, gameStateManager } from '../../utils/gameState';
import { isOnWall } from '../physics';

/**
 * Handles detection and visualization of wall-clinging
 */
export class WallClingDetector {
  private playerBallBody: RAPIER.RigidBody;
  private playerBallMesh: THREE.Mesh;
  private world: RAPIER.World;
  private scene: THREE.Scene;
  private wallClingEffect: THREE.Mesh | null = null;
  private isClinging: boolean = false;
  
  constructor(
    scene: THREE.Scene,
    playerBallBody: RAPIER.RigidBody,
    playerBallMesh: THREE.Mesh,
    world: RAPIER.World
  ) {
    this.scene = scene;
    this.playerBallBody = playerBallBody;
    this.playerBallMesh = playerBallMesh;
    this.world = world;
    
    // Create wall-cling visual effect
    this.createWallClingEffect();
    
    // Hide effect initially
    if (this.wallClingEffect) {
      this.wallClingEffect.visible = false;
    }
  }
  
  /**
   * Create visual effect for wall clinging
   */
  private createWallClingEffect(): void {
    // Create a ring that surrounds the ball when wall-clinging
    const geometry = new THREE.RingGeometry(0.6, 0.7, 32);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00ffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    
    this.wallClingEffect = new THREE.Mesh(geometry, material);
    this.scene.add(this.wallClingEffect);
  }
  
  /**
   * Update wall-clinging detection and visuals
   */
  public update(): void {
    // Only check for wall-clinging in ROLLING state
    if (!gameStateManager.isState(GameState.ROLLING)) {
      this.hideWallClingEffect();
      return;
    }
    
    // Check if ball is clinging to a wall
    const clinging = isOnWall(this.playerBallBody, this.world);
    
    // Update state if changed
    if (clinging !== this.isClinging) {
      this.isClinging = clinging;
      
      if (clinging) {
        this.showWallClingEffect();
        eventsManager.publish(EventType.WALL_CLING_START, {});
      } else {
        this.hideWallClingEffect();
        eventsManager.publish(EventType.WALL_CLING_END, {});
      }
    }
    
    // Update effect position if visible
    if (this.isClinging && this.wallClingEffect) {
      const pos = this.playerBallBody.translation();
      this.wallClingEffect.position.set(pos.x, pos.y, pos.z);
      
      // Make effect face camera
      this.wallClingEffect.quaternion.copy(this.playerBallMesh.quaternion);
    }
  }
  
  /**
   * Show wall-cling effect
   */
  private showWallClingEffect(): void {
    if (this.wallClingEffect) {
      this.wallClingEffect.visible = true;
      
      // Animation effect - pulsing size
      this.animateWallClingEffect();
    }
  }
  
  /**
   * Hide wall-cling effect
   */
  private hideWallClingEffect(): void {
    if (this.wallClingEffect) {
      this.wallClingEffect.visible = false;
    }
  }
  
  /**
   * Animate wall-cling effect
   */
  private animateWallClingEffect(): void {
    if (!this.wallClingEffect || !this.isClinging) return;
    
    // Pulse animation
    const scale = 1 + 0.2 * Math.sin(Date.now() / 200);
    this.wallClingEffect.scale.set(scale, scale, scale);
    
    // Continue animation if still clinging
    if (this.isClinging) {
      requestAnimationFrame(() => this.animateWallClingEffect());
    }
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.wallClingEffect) {
      this.scene.remove(this.wallClingEffect);
      this.wallClingEffect.geometry.dispose();
      (this.wallClingEffect.material as THREE.Material).dispose();
      this.wallClingEffect = null;
    }
  }
} 