// src/GameEngine/Systems/AnimationSystem.js
import * as THREE from 'three';
import System from '../ECS/System';

/**
 * AnimationSystem - Handles animations and visual effects
 */
class AnimationSystem extends System {
  /**
   * Create a new animation system
   * @param {World} world - Reference to the world
   */
  constructor(world) {
    super(world);
    this.requiredComponents = ['Renderer'];
    this.priority = 8; // Run after physics but before rendering
    
    // Animation mixer instances
    this.mixers = new Map();
    
    // Particle systems
    this.particles = new Map();
    
    // Tween animations
    this.tweens = new Map();
    
    // Clock for animation timing
    this.clock = new THREE.Clock();
  }
  
  /**
   * Initialize the animation system
   */
  init() {
    // Set up event listeners
    this.setupEventListeners();
    
    // Perform initial scan of entities
    this.scanEntities();
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for entity added event
    this.world.on('entityAdded', data => {
      const entity = data.entity;
      if (this.isCompatibleEntity(entity)) {
        this.setupEntityAnimation(entity);
      }
    });
    
    // Listen for specific game events
    this.world.on('powerUpCollected', this.handlePowerUpCollected.bind(this));
    this.world.on('powerUpActivated', this.handlePowerUpActivated.bind(this));
    this.world.on('shotFired', this.handleShotFired.bind(this));
    this.world.on('holeCompleted', this.handleHoleCompleted.bind(this));
    this.world.on('ballBounced', this.handleBallBounced.bind(this));
  }
  
  /**
   * Scan existing entities for initial setup
   */
  scanEntities() {
    const entities = this.getCompatibleEntities();
    for (const entity of entities) {
      this.setupEntityAnimation(entity);
    }
  }
  
  /**
   * Set up animation for an entity
   * @param {Entity} entity - Entity to set up animation for
   */
  setupEntityAnimation(entity) {
    const renderer = entity.getComponent('Renderer');
    
    // Skip if no renderer or mesh
    if (!renderer || !renderer.mesh) return;
    
    // Set up animation based on entity type
    if (entity.hasTag('ball')) {
      this.setupBallAnimation(entity, renderer);
    } else if (entity.hasTag('powerUp')) {
      this.setupPowerUpAnimation(entity, renderer);
    } else if (entity.hasTag('obstacle') && entity.hasComponent('MovingPlatform')) {
      this.setupMovingPlatformAnimation(entity, renderer);
    } else if (entity.hasTag('obstacle') && entity.hasComponent('RotatingObstacle')) {
      // Rotating obstacles are handled directly by the physics system
    }
  }
  
  /**
   * Set up ball animation
   * @param {Entity} entity - Ball entity
   * @param {Renderer} renderer - Renderer component
   */
  setupBallAnimation(entity, renderer) {
    // Add trail effect if not already present
    if (renderer.hasTrail && !renderer.trail) {
      const trail = renderer.createTrail();
      if (trail) {
        this.world.scene.add(trail);
      }
    }
  }
  
  /**
   * Set up power-up animation
   * @param {Entity} entity - Power-up entity
   * @param {Renderer} renderer - Renderer component
   */
  setupPowerUpAnimation(entity, renderer) {
    // No need to create a mixer, we'll use transform-based animation for simple floating
    
    // Add glow effect
    this.addGlowEffect(entity, renderer);
  }
  
  /**
   * Set up moving platform animation
   * @param {Entity} entity - Moving platform entity
   * @param {Renderer} renderer - Renderer component
   */
  setupMovingPlatformAnimation(entity, renderer) {
    // Moving platforms are updated by the physics system
    // We can add visual effects if needed
  }
  
  /**
   * Add a glow effect to an entity
   * @param {Entity} entity - Entity to add glow to
   * @param {Renderer} renderer - Renderer component
   */
  addGlowEffect(entity, renderer) {
    if (!renderer.mesh) return;
    
    // Determine glow color based on entity type
    let glowColor = 0x00ff9f; // Default
    
    if (entity.hasTag('powerUp')) {
      const powerUp = entity.getComponent('PowerUp');
      if (powerUp) {
        switch (powerUp.type) {
          case 'rocketDash':
            glowColor = 0xff3300;
            break;
          case 'stickyMode':
            glowColor = 0x00ff00;
            break;
          case 'bouncy':
            glowColor = 0x0066ff;
            break;
          case 'gravityFlip':
            glowColor = 0xffff00;
            break;
        }
      }
    }
    
    // Create glow mesh
    const geometry = renderer.mesh.geometry.clone();
    
    // Create glow material
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.5,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending
    });
    
    // Create glow mesh
    const glowMesh = new THREE.Mesh(geometry, glowMaterial);
    glowMesh.scale.multiplyScalar(1.2); // Slightly larger
    
    // Add to mesh
    renderer.mesh.add(glowMesh);
    
    // Store reference
    renderer.glowMesh = glowMesh;
    
    // Add pulsing animation
    this.addPulsingAnimation(entity.id, glowMesh);
  }
  
  /**
   * Add a pulsing animation to a mesh
   * @param {string} entityId - Entity ID
   * @param {THREE.Mesh} mesh - Mesh to animate
   */
  addPulsingAnimation(entityId, mesh) {
    const pulseData = {
      mesh,
      time: 0,
      speed: 1 + Math.random() * 0.5, // Random speed variation
      minScale: 1.1,
      maxScale: 1.3,
      minOpacity: 0.3,
      maxOpacity: 0.7
    };
    
    // Store pulse data
    this.tweens.set(`${entityId}_pulse`, pulseData);
  }
  
  /**
   * Create a particle effect
   * @param {THREE.Vector3} position - Position of the effect
   * @param {Object} options - Particle options
   * @returns {Object} Particle system data
   */
  createParticleEffect(position, options = {}) {
    // Set default options
    const opts = {
      count: options.count || 50,
      size: options.size || 0.1,
      lifetime: options.lifetime || 1.0,
      speed: options.speed || 1.0,
      color: options.color || 0xffffff,
      gravity: options.gravity !== undefined ? options.gravity : true,
      ...options
    };
    
    // Create particle geometry
    const particles = new THREE.BufferGeometry();
    
    // Create particle material
    const particleMaterial = new THREE.PointsMaterial({
      color: opts.color,
      size: opts.size,
      transparent: true,
      blending: THREE.AdditiveBlending,
      map: options.texture || null,
      depthWrite: false
    });
    
    // Create particle system
    const particleSystem = new THREE.Points(particles, particleMaterial);
    particleSystem.frustumCulled = false;
    
    // Add to scene
    if (this.world.scene) {
      this.world.scene.add(particleSystem);
    }
    
    // Create particle data
    const positions = new Float32Array(opts.count * 3);
    const velocities = new Float32Array(opts.count * 3);
    const lifetimes = new Float32Array(opts.count);
    
    // Initialize particles
    for (let i = 0; i < opts.count; i++) {
      // Random direction
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = Math.random();
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      // Set initial position
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      
      // Set velocity
      velocities[i * 3] = x * opts.speed;
      velocities[i * 3 + 1] = y * opts.speed;
      velocities[i * 3 + 2] = z * opts.speed;
      
      // Set lifetime
      lifetimes[i] = opts.lifetime * (0.5 + Math.random() * 0.5);
    }
    
    // Set attribute
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Store particle data
    const particleData = {
      system: particleSystem,
      geometry: particles,
      material: particleMaterial,
      positions,
      velocities,
      lifetimes,
      maxLifetime: opts.lifetime,
      currentTime: 0,
      gravity: opts.gravity,
      onComplete: opts.onComplete || null
    };
    
    // Generate unique ID for this particle system
    const particleId = 'particle_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    this.particles.set(particleId, particleData);
    
    return {
      id: particleId,
      particleSystem
    };
  }
  
  /**
   * Update a particle system
   * @param {string} id - Particle system ID
   * @param {number} deltaTime - Time since last update in seconds
   * @returns {boolean} Whether the particle system is still active
   */
  updateParticleSystem(id, deltaTime) {
    const particleData = this.particles.get(id);
    if (!particleData) return false;
    
    // Update current time
    particleData.currentTime += deltaTime;
    
    // Check if all particles are dead
    let allDead = true;
    
    // Update positions
    const positions = particleData.positions;
    const velocities = particleData.velocities;
    const lifetimes = particleData.lifetimes;
    
    for (let i = 0; i < lifetimes.length; i++) {
      // Update lifetime
      lifetimes[i] -= deltaTime;
      
      if (lifetimes[i] > 0) {
        allDead = false;
        
        // Update position
        positions[i * 3] += velocities[i * 3] * deltaTime;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * deltaTime;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * deltaTime;
        
        // Apply gravity
        if (particleData.gravity) {
          velocities[i * 3 + 1] -= 9.8 * deltaTime;
        }
        
        // Update opacity based on lifetime
        const lifeRatio = lifetimes[i] / particleData.maxLifetime;
        particleData.material.opacity = lifeRatio;
      } else {
        // Hide dead particles by moving them far away
        positions[i * 3] = 10000;
        positions[i * 3 + 1] = 10000;
        positions[i * 3 + 2] = 10000;
      }
    }
    
    // Update buffer attribute
    particleData.geometry.attributes.position.needsUpdate = true;
    
    // Remove if all particles are dead
    if (allDead) {
      this.disposeParticleSystem(id);
      return false;
    }
    
    return true;
  }
  
  /**
   * Dispose of a particle system
   * @param {string} id - Particle system ID
   */
  disposeParticleSystem(id) {
    const particleData = this.particles.get(id);
    if (!particleData) return;
    
    // Remove from scene
    if (this.world.scene) {
      this.world.scene.remove(particleData.system);
    }
    
    // Dispose of resources
    particleData.geometry.dispose();
    particleData.material.dispose();
    
    // Call completion callback if any
    if (particleData.onComplete) {
      particleData.onComplete();
    }
    
    // Remove from map
    this.particles.delete(id);
  }
  
  /**
   * Update tweens
   * @param {number} deltaTime - Time since last update in seconds
   */
  updateTweens(deltaTime) {
    // Iterate through all tweens
    this.tweens.forEach((tweenData, id) => {
      // Update time
      tweenData.time += deltaTime * tweenData.speed;
      
      // Update based on tween type
      if (id.includes('_pulse')) {
        // Pulsing animation
        const pulseFactor = (Math.sin(tweenData.time * 3) + 1) / 2; // 0 to 1
        
        // Calculate scale and opacity
        const scale = tweenData.minScale + pulseFactor * (tweenData.maxScale - tweenData.minScale);
        const opacity = tweenData.minOpacity + pulseFactor * (tweenData.maxOpacity - tweenData.minOpacity);
        
        // Apply to mesh
        tweenData.mesh.scale.set(scale, scale, scale);
        tweenData.mesh.material.opacity = opacity;
      }
    });
  }
  
  /**
   * Handle power-up collected event
   * @param {Object} data - Event data
   */
  handlePowerUpCollected(data) {
    const { entity, powerUp, powerUpEntity } = data;
    
    if (!entity || !powerUp || !powerUpEntity) return;
    
    // Create collect effect
    const transform = powerUpEntity.getComponent('Transform');
    if (!transform) return;
    
    // Get power-up color
    let color;
    switch (powerUp.type) {
      case 'rocketDash':
        color = 0xff3300;
        break;
      case 'stickyMode':
        color = 0x00ff00;
        break;
      case 'bouncy':
        color = 0x0066ff;
        break;
      case 'gravityFlip':
        color = 0xffff00;
        break;
      default:
        color = 0x00ff9f;
        break;
    }
    
    // Create particle effect
    this.createParticleEffect(transform.position, {
      count: 30,
      size: 0.2,
      lifetime: 1.0,
      speed: 2.0,
      color: color,
      gravity: false
    });
  }
  
  /**
   * Handle power-up activated event
   * @param {Object} data - Event data
   */
  handlePowerUpActivated(data) {
    const { entity, powerUp } = data;
    
    if (!entity || !powerUp) return;
    
    // Get entity position
    const transform = entity.getComponent('Transform');
    if (!transform) return;
    
    // Get power-up color
    let color;
    switch (powerUp.type) {
      case 'rocketDash':
        color = 0xff3300;
        break;
      case 'stickyMode':
        color = 0x00ff00;
        break;
      case 'bouncy':
        color = 0x0066ff;
        break;
      case 'gravityFlip':
        color = 0xffff00;
        break;
      default:
        color = 0x00ff9f;
        break;
    }
    
    // Create activation effect
    this.createParticleEffect(transform.position, {
      count: 50,
      size: 0.15,
      lifetime: 1.5,
      speed: 3.0,
      color: color,
      gravity: false
    });
    
    // Apply special effects based on power-up type
    switch (powerUp.type) {
      case 'rocketDash':
        this.createRocketDashEffect(entity);
        break;
      case 'gravityFlip':
        this.createGravityFlipEffect(entity);
        break;
    }
  }
  
  /**
   * Create rocket dash effect
   * @param {Entity} entity - Entity to apply effect to
   */
  createRocketDashEffect(entity) {
    const renderer = entity.getComponent('Renderer');
    if (!renderer) return;
    
    // Enhanced trail effect
    if (renderer.trail) {
      // Store original properties
      const originalColor = renderer.trailMaterial.color.getHex();
      const originalOpacity = renderer.trailMaterial.opacity;
      
      // Set enhanced properties
      renderer.trailMaterial.color.setHex(0xff3300);
      renderer.trailMaterial.opacity = 1.0;
      
      // Restore after 3 seconds
      setTimeout(() => {
        if (renderer.trailMaterial) {
          renderer.trailMaterial.color.setHex(originalColor);
          renderer.trailMaterial.opacity = originalOpacity;
        }
      }, 3000);
    }
  }
  
  /**
   * Create gravity flip effect
   * @param {Entity} entity - Entity to apply effect to
   */
  createGravityFlipEffect(entity) {
    const renderer = entity.getComponent('Renderer');
    if (!renderer) return;
    
    // Create a distortion effect (warped grid around ball)
    const transform = entity.getComponent('Transform');
    if (!transform) return;
    
    // Create a ring effect
    const ringGeometry = new THREE.RingGeometry(0.7, 1.2, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2; // Horizontal ring
    
    // Add to scene
    if (this.world.scene) {
      this.world.scene.add(ring);
    }
    
    // Expansion animation
    const expandRing = () => {
      let scale = 1.0;
      let opacity = 0.6;
      
      const animate = () => {
        scale += 0.05;
        opacity -= 0.01;
        
        ring.scale.set(scale, scale, scale);
        ringMaterial.opacity = opacity;
        
        if (opacity > 0) {
          requestAnimationFrame(animate);
        } else {
          // Clean up
          this.world.scene.remove(ring);
          ringGeometry.dispose();
          ringMaterial.dispose();
        }
      };
      
      animate();
    };
    
    // Update ring position and start animation
    const updateRingPosition = () => {
      ring.position.copy(transform.position);
      
      // Continue updating until power-up ends (4 seconds)
      setTimeout(() => {
        updateRingPosition();
      }, 50);
    };
    
    // Start animation
    expandRing();
    updateRingPosition();
  }
  
  /**
   * Handle shot fired event
   * @param {Object} data - Event data
   */
  handleShotFired(data) {
    const { entity, power, direction } = data;
    
    if (!entity) return;
    
    // Get entity position
    const transform = entity.getComponent('Transform');
    if (!transform) return;
    
    // Create shot effect
    this.createShotEffect(transform.position, direction, power);
  }
  
  /**
   * Create shot effect
   * @param {THREE.Vector3} position - Shot position
   * @param {Object} direction - Shot direction
   * @param {number} power - Shot power
   */
  createShotEffect(position, direction, power) {
    // Create dust effect
    this.createParticleEffect(position, {
      count: 20 + Math.floor(power * 5),
      size: 0.1,
      lifetime: 0.8,
      speed: 0.5 + power * 0.1,
      color: 0xcccccc,
      gravity: true
    });
    
    // Create impact indicator
    const impactGeometry = new THREE.RingGeometry(0.1, 0.5, 16);
    const impactMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    const impact = new THREE.Mesh(impactGeometry, impactMaterial);
    
    // Position impact at shot location
    impact.position.copy(position);
    impact.position.y += 0.05; // Slightly above ground
    
    // Rotate to face upward
    impact.rotation.x = Math.PI / 2;
    
    // Add to scene
    if (this.world.scene) {
      this.world.scene.add(impact);
    }
    
    // Expansion animation
    let scale = 0.5;
    let opacity = 0.8;
    
    const expandImpact = () => {
      scale += 0.2;
      opacity -= 0.05;
      
      impact.scale.set(scale, scale, scale);
      impactMaterial.opacity = opacity;
      
      if (opacity > 0) {
        requestAnimationFrame(expandImpact);
      } else {
        // Clean up
        this.world.scene.remove(impact);
        impactGeometry.dispose();
        impactMaterial.dispose();
      }
    };
    
    // Start animation
    expandImpact();
  }
  
  /**
   * Handle hole completed event
   * @param {Object} data - Event data
   */
  handleHoleCompleted(data) {
    const { entity, course } = data;
    
    if (!entity || !course) return;
    
    // Get entity position
    const transform = entity.getComponent('Transform');
    if (!transform) return;
    
    // Create completion effect
    this.createHoleCompletionEffect(transform.position);
  }
  
  /**
   * Create hole completion effect
   * @param {THREE.Vector3} position - Hole position
   */
  createHoleCompletionEffect(position) {
    // Create confetti effect
    this.createParticleEffect(position, {
      count: 100,
      size: 0.15,
      lifetime: 3.0,
      speed: 2.5,
      color: 0xffffff,
      gravity: true,
      colorVariation: true
    });
    
    // Create light flash
    this.createLightFlash(position);
  }
  
  /**
   * Create a light flash effect
   * @param {THREE.Vector3} position - Flash position
   */
  createLightFlash(position) {
    // Create a point light
    const light = new THREE.PointLight(0xffffff, 2, 10);
    light.position.copy(position);
    light.position.y += 1; // Raise slightly
    
    // Add to scene
    if (this.world.scene) {
      this.world.scene.add(light);
    }
    
    // Flash animation
    let intensity = 3;
    
    const animateFlash = () => {
      intensity -= 0.1;
      
      light.intensity = intensity;
      
      if (intensity > 0) {
        requestAnimationFrame(animateFlash);
      } else {
        // Clean up
        this.world.scene.remove(light);
      }
    };
    
    // Start animation
    animateFlash();
  }
  
  /**
   * Handle ball bounced event
   * @param {Object} data - Event data
   */
  handleBallBounced(data) {
    const { entity } = data;
    
    if (!entity) return;
    
    // Get entity position
    const transform = entity.getComponent('Transform');
    if (!transform) return;
    
    // Create bounce effect
    this.createBounceEffect(transform.position);
  }
  
  /**
   * Create bounce effect
   * @param {THREE.Vector3} position - Bounce position
   */
  createBounceEffect(position) {
    // Simple dust particles
    this.createParticleEffect(position, {
      count: 10,
      size: 0.08,
      lifetime: 0.5,
      speed: 1.0,
      color: 0xdddddd,
      gravity: true
    });
  }
  
  /**
   * Update the animation system
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    // Update animation mixers
    this.mixers.forEach(mixer => {
      mixer.update(deltaTime);
    });
    
    // Update particle systems
    this.particles.forEach((_, id) => {
      this.updateParticleSystem(id, deltaTime);
    });
    
    // Update tweens
    this.updateTweens(deltaTime);
    
    // Update entity-specific animations
    this.updateEntityAnimations(deltaTime);
  }
  
  /**
   * Update entity-specific animations
   * @param {number} deltaTime - Time since last update in seconds
   */
  updateEntityAnimations(deltaTime) {
    const entities = this.getCompatibleEntities();
    
    for (const entity of entities) {
      const renderer = entity.getComponent('Renderer');
      
      if (!renderer) continue;
      
      // Update trail if present
      if (renderer.trail && renderer.hasTrail) {
        const transform = entity.getComponent('Transform');
        if (transform) {
          renderer.updateTrail(transform.position);
        }
      }
      
      // Update custom animations
      if (renderer.currentAnimation) {
        renderer.updateAnimation(deltaTime);
      }
    }
  }
  
  /**
   * Dispose resources
   */
  dispose() {
    // Dispose of animation mixers
    this.mixers.clear();
    
    // Dispose of particle systems
    this.particles.forEach((particleData, id) => {
      this.disposeParticleSystem(id);
    });
    this.particles.clear();
    
    // Clean up tweens
    this.tweens.clear();
  }
}

export default AnimationSystem;