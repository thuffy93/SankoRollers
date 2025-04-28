// src/GameEngine/Components/Renderer.js
import * as THREE from 'three';

/**
 * Renderer component for visual representation
 */
class Renderer {
  /**
   * Create a new renderer component
   * @param {Object} options - Component options
   * @param {THREE.Mesh} options.mesh - Three.js mesh
   * @param {string} options.type - Renderer type (mesh, sprite, etc.)
   * @param {boolean} options.castShadow - Whether the object casts shadows
   * @param {boolean} options.receiveShadow - Whether the object receives shadows
   * @param {boolean} options.visible - Whether the object is visible
   * @param {Object} options.material - Material options
   */
  constructor(options = {}) {
    this.type = options.type || 'mesh';
    this.castShadow = options.castShadow !== undefined ? options.castShadow : true;
    this.receiveShadow = options.receiveShadow !== undefined ? options.receiveShadow : true;
    this.visible = options.visible !== undefined ? options.visible : true;
    
    // Store the mesh or create a new one
    if (options.mesh) {
      this.mesh = options.mesh;
    } else {
      // Create a default mesh based on type
      switch (this.type) {
        case 'mesh':
          const geometry = options.geometry || new THREE.BoxGeometry(1, 1, 1);
          const material = this.createMaterial(options.material);
          this.mesh = new THREE.Mesh(geometry, material);
          break;
          
        case 'sprite':
          const spriteMaterial = new THREE.SpriteMaterial(options.material || {
            color: 0xffffff,
            map: null
          });
          this.mesh = new THREE.Sprite(spriteMaterial);
          break;
          
        case 'line':
          const lineGeometry = options.geometry || new THREE.BufferGeometry();
          const lineMaterial = new THREE.LineBasicMaterial(options.material || {
            color: 0xffffff
          });
          this.mesh = new THREE.Line(lineGeometry, lineMaterial);
          break;
          
        case 'points':
          const pointsGeometry = options.geometry || new THREE.BufferGeometry();
          const pointsMaterial = new THREE.PointsMaterial(options.material || {
            color: 0xffffff,
            size: 0.1
          });
          this.mesh = new THREE.Points(pointsGeometry, pointsMaterial);
          break;
          
        case 'group':
          this.mesh = new THREE.Group();
          break;
          
        default:
          console.warn(`Unknown renderer type: ${this.type}, creating default mesh`);
          this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial({ color: 0xff00ff })
          );
          break;
      }
    }
    
    // Apply shadow and visibility settings
    this.mesh.castShadow = this.castShadow;
    this.mesh.receiveShadow = this.receiveShadow;
    this.mesh.visible = this.visible;
    
    // Animation properties
    this.animations = new Map();
    this.currentAnimation = null;
    
    // Visual effects
    this.effects = [];
    
    // Trail effect
    this.hasTrail = options.hasTrail || false;
    this.trailOptions = options.trailOptions || {
      length: 20,
      color: 0x00ff9f,
      opacity: 0.7
    };
    this.trail = null;
    
    // LOD (Level of Detail) options
    this.lodLevels = options.lodLevels || [];
    this.currentLodLevel = 0;
  }
  
  /**
   * Create a material based on options
   * @param {Object} options - Material options
   * @returns {THREE.Material} Three.js material
   */
  createMaterial(options = {}) {
    const type = options.type || 'MeshStandardMaterial';
    let material;
    
    switch (type) {
      case 'MeshBasicMaterial':
        material = new THREE.MeshBasicMaterial(options);
        break;
        
      case 'MeshLambertMaterial':
        material = new THREE.MeshLambertMaterial(options);
        break;
        
      case 'MeshPhongMaterial':
        material = new THREE.MeshPhongMaterial(options);
        break;
        
      case 'MeshStandardMaterial':
        material = new THREE.MeshStandardMaterial(options);
        break;
        
      case 'MeshToonMaterial':
        material = new THREE.MeshToonMaterial(options);
        break;
        
      case 'MeshPhysicalMaterial':
        material = new THREE.MeshPhysicalMaterial(options);
        break;
        
      case 'MeshNormalMaterial':
        material = new THREE.MeshNormalMaterial(options);
        break;
        
      case 'LineBasicMaterial':
        material = new THREE.LineBasicMaterial(options);
        break;
        
      case 'LineDashedMaterial':
        material = new THREE.LineDashedMaterial(options);
        break;
        
      case 'PointsMaterial':
        material = new THREE.PointsMaterial(options);
        break;
        
      case 'SpriteMaterial':
        material = new THREE.SpriteMaterial(options);
        break;
        
      default:
        console.warn(`Unknown material type: ${type}, creating MeshStandardMaterial`);
        material = new THREE.MeshStandardMaterial(options);
        break;
    }
    
    return material;
  }
  
  /**
   * Set material properties
   * @param {Object} properties - Material properties
   */
  setMaterialProperties(properties = {}) {
    if (!this.mesh || !this.mesh.material) return;
    
    Object.keys(properties).forEach(key => {
      if (key === 'color' || key === 'emissive' || key === 'specular') {
        this.mesh.material[key].set(properties[key]);
      } else {
        this.mesh.material[key] = properties[key];
      }
    });
    
    this.mesh.material.needsUpdate = true;
  }
  
  /**
   * Add a child mesh
   * @param {THREE.Object3D} child - Child to add
   * @returns {THREE.Object3D} Added child
   */
  addChild(child) {
    if (this.mesh) {
      return this.mesh.add(child);
    }
    return null;
  }
  
  /**
   * Create a trail effect
   * @param {Object} options - Trail options
   */
  createTrail(options = {}) {
    if (!this.hasTrail) return;
    
    const opts = { ...this.trailOptions, ...options };
    
    // Create points for trail
    const positions = new Float32Array(opts.length * 3);
    for (let i = 0; i < opts.length; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
    }
    
    // Create trail geometry
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Create trail material
    const trailMaterial = new THREE.LineBasicMaterial({
      color: opts.color,
      opacity: opts.opacity,
      transparent: true,
      linewidth: opts.linewidth || 1
    });
    
    // Create trail mesh
    this.trail = new THREE.Line(trailGeometry, trailMaterial);
    this.trail.frustumCulled = false;
    
    return this.trail;
  }
  
  /**
   * Update the trail effect
   * @param {THREE.Vector3} position - Current position
   */
  updateTrail(position) {
    if (!this.trail) return;
    
    const positions = this.trail.geometry.attributes.position.array;
    
    // Shift positions array forward
    for (let i = this.trailOptions.length - 1; i > 0; i--) {
      const currentIdx = i * 3;
      const prevIdx = (i - 1) * 3;
      
      positions[currentIdx] = positions[prevIdx];
      positions[currentIdx + 1] = positions[prevIdx + 1];
      positions[currentIdx + 2] = positions[prevIdx + 2];
    }
    
    // Set first position to current position
    positions[0] = position.x;
    positions[1] = position.y;
    positions[2] = position.z;
    
    // Update the geometry
    this.trail.geometry.attributes.position.needsUpdate = true;
  }
  
  /**
   * Add an animation
   * @param {string} name - Animation name
   * @param {Object} animation - Animation data
   */
  addAnimation(name, animation) {
    this.animations.set(name, animation);
  }
  
  /**
   * Play an animation
   * @param {string} name - Animation name
   * @param {Object} options - Animation options
   */
  playAnimation(name, options = {}) {
    const animation = this.animations.get(name);
    if (!animation) {
      console.warn(`Animation "${name}" not found`);
      return;
    }
    
    this.currentAnimation = {
      name,
      animation,
      time: 0,
      duration: options.duration || animation.duration,
      loop: options.loop !== undefined ? options.loop : true,
      speed: options.speed || 1.0,
      startTime: options.startTime || 0,
      onComplete: options.onComplete
    };
  }
  
  /**
   * Stop the current animation
   */
  stopAnimation() {
    this.currentAnimation = null;
  }
  
  /**
   * Update the current animation
   * @param {number} deltaTime - Time since last update in seconds
   */
  updateAnimation(deltaTime) {
    if (!this.currentAnimation) return;
    
    // Update animation time
    this.currentAnimation.time += deltaTime * this.currentAnimation.speed;
    
    // Handle animation end
    if (this.currentAnimation.time > this.currentAnimation.duration) {
      if (this.currentAnimation.loop) {
        // Loop animation
        this.currentAnimation.time = this.currentAnimation.time % this.currentAnimation.duration;
      } else {
        // Complete animation
        if (this.currentAnimation.onComplete) {
          this.currentAnimation.onComplete();
        }
        this.currentAnimation = null;
        return;
      }
    }
    
    // Apply animation
    // This is a simplified implementation - would need to be expanded based on animation type
    if (this.currentAnimation.animation.update) {
      this.currentAnimation.animation.update(
        this.mesh,
        this.currentAnimation.time / this.currentAnimation.duration
      );
    }
  }
  
  /**
   * Update LOD based on camera distance
   * @param {number} distance - Distance to camera
   */
  updateLOD(distance) {
    if (this.lodLevels.length === 0) return;
    
    // Find appropriate LOD level
    let newLevel = 0;
    for (let i = 0; i < this.lodLevels.length; i++) {
      if (distance > this.lodLevels[i].distance) {
        newLevel = i;
      } else {
        break;
      }
    }
    
    // Switch LOD if needed
    if (newLevel !== this.currentLodLevel) {
      this.currentLodLevel = newLevel;
      const lod = this.lodLevels[newLevel];
      
      // Apply LOD changes
      if (lod.geometry && this.mesh.geometry) {
        this.mesh.geometry.dispose();
        this.mesh.geometry = lod.geometry;
      }
      
      if (lod.material && this.mesh.material) {
        this.mesh.material.dispose();
        this.mesh.material = lod.material;
      }
    }
  }
  
  /**
   * Dispose of resources
   */
  dispose() {
    if (this.mesh) {
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
      
      if (this.mesh.material) {
        if (Array.isArray(this.mesh.material)) {
          this.mesh.material.forEach(material => material.dispose());
        } else {
          this.mesh.material.dispose();
        }
      }
    }
    
    if (this.trail) {
      this.trail.geometry.dispose();
      this.trail.material.dispose();
    }
  }
}

export default Renderer;