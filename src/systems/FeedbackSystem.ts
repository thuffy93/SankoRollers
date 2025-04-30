import * as THREE from 'three';
import { IsometricCamera } from './CameraSystem';

/**
 * Types of feedback to display
 */
export enum FeedbackType {
  SHOT_EXECUTED = 'shot_executed',
  BALL_STOPPED = 'ball_stopped',
  BALL_COLLISION = 'ball_collision',
  POWER_SELECTED = 'power_selected',
  SPIN_APPLIED = 'spin_applied'
}

/**
 * Parameters for feedback effects
 */
interface FeedbackParams {
  power?: number;
  direction?: THREE.Vector3;
  duration?: number;
  intensity?: number;
  color?: number;
}

/**
 * Active feedback effect
 */
interface ActiveEffect {
  type: FeedbackType;
  position: THREE.Vector3;
  startTime: number;
  duration: number;
  params: FeedbackParams;
  mesh?: THREE.Object3D;
  update: (time: number, progress: number) => void;
  remove: () => void;
}

/**
 * System for providing visual feedback for game events
 */
export class FeedbackSystem {
  // Scene reference for adding visuals
  private scene: THREE.Scene;
  
  // Camera reference for positioning screen-space effects
  private camera: IsometricCamera;
  
  // Active effects
  private activeEffects: ActiveEffect[] = [];
  
  // Running time for animations
  private time: number = 0;
  
  /**
   * Create a new FeedbackSystem
   * @param scene The THREE.js scene
   * @param camera The camera
   */
  constructor(scene: THREE.Scene, camera: IsometricCamera) {
    this.scene = scene;
    this.camera = camera;
  }
  
  /**
   * Get the default duration for an effect type
   * @param type The effect type
   * @returns Default duration in seconds
   */
  private getDefaultDuration(type: FeedbackType): number {
    switch (type) {
      case FeedbackType.SHOT_EXECUTED:
        return 1.0;
      case FeedbackType.BALL_STOPPED:
        return 0.8;
      case FeedbackType.BALL_COLLISION:
        return 0.5;
      case FeedbackType.POWER_SELECTED:
        return 0.6;
      case FeedbackType.SPIN_APPLIED:
        return 0.7;
      default:
        return 1.0;
    }
  }

  /**
   * Create shot executed effect
   * @param position World position
   * @param params Effect parameters
   * @param duration Effect duration
   * @returns Active effect object
   */
  private createShotExecutedEffect(
    position: THREE.Vector3,
    params: FeedbackParams,
    duration: number
  ): ActiveEffect {
    // Create a directional trail effect
    const color = params.color || 0xFFCC00;
    const intensity = params.intensity || 1.0;
    
    // Create particle system for shot trail
    const geometry = new THREE.BufferGeometry();
    const particleCount = 100;
    const positions = new Float32Array(particleCount * 3);
    
    // Initial positions (all at origin)
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: color,
      size: 0.2 * intensity,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
    
    // Direction for the trail
    const direction = params.direction || new THREE.Vector3(0, 1, 0);
    
    return {
      type: FeedbackType.SHOT_EXECUTED,
      position: position.clone(),
      startTime: this.time,
      duration: duration,
      params: params,
      mesh: particles,
      update: (time, progress) => {
        // Update particle positions for trail effect
        const positions = (particles.geometry as THREE.BufferGeometry).attributes.position.array as Float32Array;
        
        for (let i = 0; i < particleCount; i++) {
          // Calculate particle offset based on index
          const offset = (i / particleCount) * 2.0;
          const particleProgress = Math.min(1.0, progress + offset);
          
          if (particleProgress < 1.0) {
            // Move particle outward from origin
            positions[i * 3] = position.x + direction.x * particleProgress * 3;
            positions[i * 3 + 1] = position.y + direction.y * particleProgress * 3 + Math.sin(particleProgress * Math.PI) * 0.5;
            positions[i * 3 + 2] = position.z + direction.z * particleProgress * 3;
            
            // Fade out based on progress
            if (particles.material instanceof THREE.PointsMaterial) {
              particles.material.opacity = 0.8 * (1 - particleProgress);
              particles.material.size = 0.2 * intensity * (1 - particleProgress * 0.5);
            }
          }
        }
        
        (particles.geometry as THREE.BufferGeometry).attributes.position.needsUpdate = true;
      },
      remove: () => {
        this.scene.remove(particles);
        particles.geometry.dispose();
        if (particles.material instanceof THREE.Material) {
          particles.material.dispose();
        }
      }
    };
  }
  
  /**
   * Create ball stopped effect
   * @param position World position
   * @param params Effect parameters
   * @param duration Effect duration
   * @returns Active effect object
   */
  private createBallStoppedEffect(
    position: THREE.Vector3,
    params: FeedbackParams,
    duration: number
  ): ActiveEffect {
    // Create a ripple effect
    const color = params.color || 0x3399FF;
    const intensity = params.intensity || 1.0;
    
    // Create the ripple ring
    const geometry = new THREE.RingGeometry(0.1, 0.2, 32);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(geometry, material);
    ring.position.copy(position);
    ring.position.y += 0.05; // Slightly above ground
    ring.rotation.x = -Math.PI / 2; // Flat on ground
    
    this.scene.add(ring);
    
    return {
      type: FeedbackType.BALL_STOPPED,
      position: position.clone(),
      startTime: this.time,
      duration: duration,
      params: params,
      mesh: ring,
      update: (time, progress) => {
        // Expand the ring
        const scale = 1 + progress * 5 * intensity;
        ring.scale.set(scale, scale, scale);
        
        // Fade out
        if (ring.material instanceof THREE.Material) {
          ring.material.opacity = 0.7 * (1 - progress);
        }
      },
      remove: () => {
        this.scene.remove(ring);
        ring.geometry.dispose();
        if (ring.material instanceof THREE.Material) {
          ring.material.dispose();
        }
      }
    };
  }
  
  /**
   * Create ball collision effect
   * @param position World position
   * @param params Effect parameters
   * @param duration Effect duration
   * @returns Active effect object
   */
  private createBallCollisionEffect(
    position: THREE.Vector3,
    params: FeedbackParams,
    duration: number
  ): ActiveEffect {
    // Create a simple particle burst
    const color = params.color || 0xFFFFFF;
    const intensity = params.intensity || 1.0;
    
    // Particle system for collision
    const particleCount = 20;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    // All particles start at the collision point
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: color,
      size: 0.1 * intensity,
      transparent: true,
      opacity: 0.8
    });
    
    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
    
    // Generate random directions for particles
    const directions: THREE.Vector3[] = [];
    for (let i = 0; i < particleCount; i++) {
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize();
      directions.push(dir);
    }
    
    return {
      type: FeedbackType.BALL_COLLISION,
      position: position.clone(),
      startTime: this.time,
      duration: duration,
      params: params,
      mesh: particles,
      update: (time, progress) => {
        // Update particles to move outward
        const positions = (particles.geometry as THREE.BufferGeometry).attributes.position.array as Float32Array;
        
        for (let i = 0; i < particleCount; i++) {
          const dir = directions[i];
          const moveDistance = progress * 1.0 * intensity;
          
          positions[i * 3] = position.x + dir.x * moveDistance;
          positions[i * 3 + 1] = position.y + dir.y * moveDistance;
          positions[i * 3 + 2] = position.z + dir.z * moveDistance;
        }
        
        // Fade out
        if (particles.material instanceof THREE.PointsMaterial) {
          particles.material.opacity = 0.8 * (1 - progress);
        }
        
        (particles.geometry as THREE.BufferGeometry).attributes.position.needsUpdate = true;
      },
      remove: () => {
        this.scene.remove(particles);
        particles.geometry.dispose();
        if (particles.material instanceof THREE.Material) {
          particles.material.dispose();
        }
      }
    };
  }
  
  /**
   * Create power selected effect
   * @param position World position
   * @param params Effect parameters
   * @param duration Effect duration
   * @returns Active effect object
   */
  private createPowerSelectedEffect(
    position: THREE.Vector3,
    params: FeedbackParams,
    duration: number
  ): ActiveEffect {
    // Power indicator flash
    const color = params.color || 0xFF3333;
    const power = params.power || 0.5;
    const intensity = params.intensity || 1.0;
    
    // Create a power flash
    const geometry = new THREE.SphereGeometry(0.3 * power * intensity, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.7,
      wireframe: true
    });
    
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);
    
    this.scene.add(sphere);
    
    return {
      type: FeedbackType.POWER_SELECTED,
      position: position.clone(),
      startTime: this.time,
      duration: duration,
      params: params,
      mesh: sphere,
      update: (time, progress) => {
        // Pulse effect
        const scale = 1 + Math.sin(progress * Math.PI) * 2 * intensity;
        sphere.scale.set(scale, scale, scale);
        
        // Fade out
        if (sphere.material instanceof THREE.Material) {
          sphere.material.opacity = 0.7 * (1 - progress);
        }
      },
      remove: () => {
        this.scene.remove(sphere);
        sphere.geometry.dispose();
        if (sphere.material instanceof THREE.Material) {
          sphere.material.dispose();
        }
      }
    };
  }
  
  /**
   * Create spin applied effect
   * @param position World position
   * @param params Effect parameters
   * @param duration Effect duration
   * @returns Active effect object
   */
  private createSpinAppliedEffect(
    position: THREE.Vector3,
    params: FeedbackParams,
    duration: number
  ): ActiveEffect {
    // Spin indicator - rotating arrows
    const color = params.color || 0x00CCFF;
    const intensity = params.intensity || 1.0;
    
    // Create a group to hold arrows
    const group = new THREE.Group();
    group.position.copy(position);
    
    // Add arrows indicating spin
    const arrowLength = 0.5 * intensity;
    const arrowHelperX = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      arrowLength,
      0xFF0000
    );
    
    const arrowHelperY = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      arrowLength,
      0x00FF00
    );
    
    const arrowHelperZ = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0),
      arrowLength,
      0x0000FF
    );
    
    group.add(arrowHelperX);
    group.add(arrowHelperY);
    group.add(arrowHelperZ);
    
    this.scene.add(group);
    
    // Initial rotation to represent spin
    if (params.direction) {
      // Adjust rotation based on requested direction
      group.rotation.x = params.direction.x * Math.PI;
      group.rotation.y = params.direction.y * Math.PI;
      group.rotation.z = params.direction.z * Math.PI;
    }
    
    return {
      type: FeedbackType.SPIN_APPLIED,
      position: position.clone(),
      startTime: this.time,
      duration: duration,
      params: params,
      mesh: group,
      update: (time, progress) => {
        // Rotate to indicate spin
        group.rotation.x += 0.1;
        group.rotation.y += 0.1;
        
        // Fade out - properly type cast the materials
        if (arrowHelperX.line.material instanceof THREE.Material) {
          arrowHelperX.line.material.opacity = 1 - progress;
        }
        if (arrowHelperY.line.material instanceof THREE.Material) {
          arrowHelperY.line.material.opacity = 1 - progress;
        }
        if (arrowHelperZ.line.material instanceof THREE.Material) {
          arrowHelperZ.line.material.opacity = 1 - progress;
        }
        
        // Shrink as it fades
        const scale = 1 - progress * 0.5;
        group.scale.set(scale, scale, scale);
      },
      remove: () => {
        this.scene.remove(group);
        // Arrow helpers don't need explicit disposal as they're just Object3Ds
      }
    };
  }
  
  /**
   * Show a feedback effect
   * @param type The type of feedback to show
   * @param position World position for the effect
   * @param params Optional parameters for the effect
   */
  public showFeedback(
    type: FeedbackType, 
    position: THREE.Vector3,
    params: FeedbackParams = {}
  ): void {
    // Set default duration if not specified
    const duration = params.duration || this.getDefaultDuration(type);
    
    // Create effect based on type
    let effect: ActiveEffect;
    
    switch (type) {
      case FeedbackType.SHOT_EXECUTED:
        effect = this.createShotExecutedEffect(position, params, duration);
        break;
        
      case FeedbackType.BALL_STOPPED:
        effect = this.createBallStoppedEffect(position, params, duration);
        break;
        
      case FeedbackType.BALL_COLLISION:
        effect = this.createBallCollisionEffect(position, params, duration);
        break;
        
      case FeedbackType.POWER_SELECTED:
        effect = this.createPowerSelectedEffect(position, params, duration);
        break;
        
      case FeedbackType.SPIN_APPLIED:
        effect = this.createSpinAppliedEffect(position, params, duration);
        break;
        
      default:
        console.warn(`Unknown feedback type: ${type}`);
        return;
    }
    
    // Add to active effects
    this.activeEffects.push(effect);
  }
  
  /**
   * Update all active effects
   * @param deltaTime Time since last update
   */
  public update(deltaTime: number): void {
    this.time += deltaTime;
    
    // Update all active effects
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i];
      const elapsedTime = this.time - effect.startTime;
      
      if (elapsedTime >= effect.duration) {
        // Effect is complete, remove it
        effect.remove();
        this.activeEffects.splice(i, 1);
      } else {
        // Update the effect
        const progress = elapsedTime / effect.duration;
        effect.update(this.time, progress);
      }
    }
  }
} 