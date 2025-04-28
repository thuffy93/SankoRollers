// src/GameEngine/Systems/RenderingSystem.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import System from '../ECS/System';

/**
 * RenderingSystem - Handles rendering with Three.js
 */
class RenderingSystem extends System {
  /**
   * Create a new rendering system
   * @param {World} world - Reference to the world
   */
  constructor(world) {
    super(world);
    this.requiredComponents = ['Transform', 'Renderer'];
    this.priority = 5; // Run after most systems but before composing the final frame
    
    // Three.js objects
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    
    // Visual effects
    this.postProcessing = {
      composer: null,
      effects: []
    };
    
    // Map of entity IDs to Three.js objects
    this.meshes = new Map();
    
    // Visual style
    this.visualStyle = 'standard'; // 'standard' or 'moebius'
    
    // Lighting
    this.lights = {
      ambient: null,
      directional: null,
      hemisphere: null
    };
    
    // Helper objects
    this.helpers = {
      grid: null,
      axes: null
    };
  }
  
  /**
   * Initialize the rendering system
   */
  init() {
    // Create Three.js scene if not already created
    if (!this.scene) {
      this.scene = this.world.scene || new THREE.Scene();
      this.world.scene = this.scene;
    }
    
    // Create camera if not already created
    if (!this.camera) {
      this.camera = this.world.camera || this.createCamera();
      this.world.camera = this.camera;
    }
    
    // Create renderer if not already created
    if (!this.renderer) {
      this.renderer = this.world.renderer || this.createRenderer();
      this.world.renderer = this.renderer;
    }
    
    // Create orbit controls
    if (!this.controls) {
      this.controls = this.createControls();
    }
    
    // Set up lighting
    this.setupLighting();
    
    // Set up helpers
    if (this.world.debug) {
      this.setupHelpers();
    }
    
    // Set up post-processing
    this.setupPostProcessing();
    
    // Listen for visual style toggle event
    this.world.on('visualStyleToggle', this.toggleVisualStyle.bind(this));
    
    // Add existing entities to scene
    const entities = this.getCompatibleEntities();
    for (const entity of entities) {
      this.addEntityToScene(entity);
    }
    
    // Listen for entity added/removed events
    this.world.on('entityAdded', data => {
      const entity = data.entity;
      if (this.isCompatibleEntity(entity)) {
        this.addEntityToScene(entity);
      }
    });
    
    this.world.on('entityRemoved', data => {
      const entity = data.entity;
      this.removeEntityFromScene(entity);
    });
  }
  
  /**
   * Create a camera
   * @returns {THREE.PerspectiveCamera} Camera
   */
  createCamera() {
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    
    camera.position.set(0, 10, 15);
    camera.lookAt(0, 0, 0);
    
    return camera;
  }
  
  /**
   * Create a renderer
   * @returns {THREE.WebGLRenderer} Renderer
   */
  createRenderer() {
    const renderer = new THREE.WebGLRenderer({
      antialias: true
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Append renderer to DOM
    document.body.appendChild(renderer.domElement);
    
    return renderer;
  }
  
  /**
   * Create orbit controls
   * @returns {OrbitControls} Controls
   */
  createControls() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent camera from going below ground
    controls.minDistance = 5;
    controls.maxDistance = 30;
    
    return controls;
  }
  
  /**
   * Set up lighting
   */
  setupLighting() {
    // Ambient light
    this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.lights.ambient);
    
    // Directional light (sun)
    this.lights.directional = new THREE.DirectionalLight(0xffffff, 0.8);
    this.lights.directional.position.set(50, 200, 100);
    this.lights.directional.castShadow = true;
    
    // Configure shadow properties
    this.lights.directional.shadow.mapSize.width = 2048;
    this.lights.directional.shadow.mapSize.height = 2048;
    const d = 50;
    this.lights.directional.shadow.camera.left = -d;
    this.lights.directional.shadow.camera.right = d;
    this.lights.directional.shadow.camera.top = d;
    this.lights.directional.shadow.camera.bottom = -d;
    this.lights.directional.shadow.camera.far = 3500;
    this.lights.directional.shadow.bias = -0.0001;
    
    this.scene.add(this.lights.directional);
    
    // Hemisphere light for more natural environmental lighting
    this.lights.hemisphere = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.3);
    this.scene.add(this.lights.hemisphere);
  }
  
  /**
   * Set up debug helpers
   */
  setupHelpers() {
    // Grid helper
    this.helpers.grid = new THREE.GridHelper(50, 50);
    this.scene.add(this.helpers.grid);
    
    // Axes helper
    this.helpers.axes = new THREE.AxesHelper(5);
    this.scene.add(this.helpers.axes);
    
    // Light helpers
    const directionalLightHelper = new THREE.DirectionalLightHelper(this.lights.directional, 5);
    this.scene.add(directionalLightHelper);
    
    // Shadow camera helper
    const shadowCameraHelper = new THREE.CameraHelper(this.lights.directional.shadow.camera);
    this.scene.add(shadowCameraHelper);
  }
  
  /**
   * Set up post-processing effects
   * This is a simplified implementation - a real game would use more sophisticated effects
   */
  setupPostProcessing() {
    // Setup would go here if using EffectComposer and post-processing effects
    // For now, we'll just use basic rendering
  }
  
  /**
   * Add an entity to the scene
   * @param {Entity} entity - Entity to add
   */
  addEntityToScene(entity) {
    const transform = entity.getComponent('Transform');
    const renderer = entity.getComponent('Renderer');
    
    if (!transform || !renderer || !renderer.mesh) return;
    
    // Apply transform to mesh
    renderer.mesh.position.copy(transform.position);
    renderer.mesh.quaternion.copy(transform.rotation);
    renderer.mesh.scale.copy(transform.scale);
    
    // Set up shadows
    renderer.mesh.castShadow = renderer.castShadow;
    renderer.mesh.receiveShadow = renderer.receiveShadow;
    
    // Add to scene
    this.scene.add(renderer.mesh);
    
    // Add trail if needed
    if (renderer.hasTrail && !renderer.trail) {
      const trail = renderer.createTrail();
      if (trail) {
        this.scene.add(trail);
      }
    }
    
    // Store mesh reference
    this.meshes.set(entity.id, renderer.mesh);
    
    // Add any child entities
    for (const otherEntity of this.world.entities) {
      if (otherEntity.parent === entity.id) {
        this.addChildEntityToParent(otherEntity, entity);
      }
    }
  }
  
  /**
   * Add a child entity to a parent entity
   * @param {Entity} childEntity - Child entity
   * @param {Entity} parentEntity - Parent entity
   */
  addChildEntityToParent(childEntity, parentEntity) {
    // Get child components
    const childTransform = childEntity.getComponent('Transform');
    const childRenderer = childEntity.getComponent('Renderer');
    
    // Get parent renderer
    const parentRenderer = parentEntity.getComponent('Renderer');
    
    if (!childTransform || !childRenderer || !childRenderer.mesh || !parentRenderer || !parentRenderer.mesh) {
      return;
    }
    
    // Apply transform to mesh (relative to parent)
    childRenderer.mesh.position.copy(childTransform.position);
    childRenderer.mesh.quaternion.copy(childTransform.rotation);
    childRenderer.mesh.scale.copy(childTransform.scale);
    
    // Set up shadows
    childRenderer.mesh.castShadow = childRenderer.castShadow;
    childRenderer.mesh.receiveShadow = childRenderer.receiveShadow;
    
    // Add to parent mesh
    parentRenderer.mesh.add(childRenderer.mesh);
    
    // Store mesh reference
    this.meshes.set(childEntity.id, childRenderer.mesh);
  }
  
  /**
   * Remove an entity from the scene
   * @param {Entity} entity - Entity to remove
   */
  removeEntityFromScene(entity) {
    // Get mesh
    const mesh = this.meshes.get(entity.id);
    if (!mesh) return;
    
    // Remove from scene or parent
    if (mesh.parent) {
      mesh.parent.remove(mesh);
    }
    
    // Remove any attached trail
    const renderer = entity.getComponent('Renderer');
    if (renderer && renderer.trail) {
      if (renderer.trail.parent) {
        renderer.trail.parent.remove(renderer.trail);
      }
      renderer.trail.geometry.dispose();
      renderer.trail.material.dispose();
    }
    
    // Clean up
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(material => material.dispose());
      } else {
        mesh.material.dispose();
      }
    }
    
    // Remove from map
    this.meshes.delete(entity.id);
  }
  
  /**
   * Update the rendering system
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    // Update entity meshes
    const entities = this.getCompatibleEntities();
    for (const entity of entities) {
      this.updateEntityMesh(entity, deltaTime);
    }
    
    // Update orbit controls
    if (this.controls) {
      this.controls.update();
    }
    
    // Update camera to follow ball if there's a ball entity
    this.updateCameraTarget();
    
    // Render scene
    this.render();
  }
  
  /**
   * Update an entity's mesh
   * @param {Entity} entity - Entity to update
   * @param {number} deltaTime - Time since last update in seconds
   */
  updateEntityMesh(entity, deltaTime) {
    const transform = entity.getComponent('Transform');
    const renderer = entity.getComponent('Renderer');
    
    if (!transform || !renderer || !renderer.mesh) return;
    
    // Check if parent entity exists
    if (entity.parent) {
      // Child entities are updated relative to their parent
      // No need to update their world position here
      return;
    }
    
    // Update position
    renderer.mesh.position.copy(transform.position);
    renderer.mesh.quaternion.copy(transform.rotation);
    renderer.mesh.scale.copy(transform.scale);
    
    // Update animation if any
    if (renderer.currentAnimation) {
      renderer.updateAnimation(deltaTime);
    }
    
    // Update trail if any
    if (renderer.trail && renderer.hasTrail) {
      renderer.updateTrail(transform.position);
    }
    
    // Update LOD if any
    if (renderer.lodLevels.length > 0 && this.camera) {
      const distance = transform.position.distanceTo(this.camera.position);
      renderer.updateLOD(distance);
    }
    
    // Handle moving platforms
    const movingPlatform = entity.getComponent('MovingPlatform');
    if (movingPlatform) {
      this.updateMovingPlatform(entity, movingPlatform, deltaTime);
    }
    
    // Handle rotating obstacles
    const rotatingObstacle = entity.getComponent('RotatingObstacle');
    if (rotatingObstacle) {
      this.updateRotatingObstacle(entity, rotatingObstacle, deltaTime);
    }
    
    // Handle floating objects
    const floatingObject = entity.getComponent('FloatingObject');
    if (floatingObject) {
      this.updateFloatingObject(entity, floatingObject, deltaTime);
    }
  }
  
  /**
   * Update a moving platform
   * @param {Entity} entity - Platform entity
   * @param {Object} movingPlatform - Moving platform component
   * @param {number} deltaTime - Time since last update in seconds
   */
  updateMovingPlatform(entity, movingPlatform, deltaTime) {
    const transform = entity.getComponent('Transform');
    if (!transform) return;
    
    // Get current position along movement axis
    const axis = movingPlatform.axis || 'x';
    const currentPos = transform.position[axis];
    
    // Move platform
    transform.position[axis] += movingPlatform.speed * movingPlatform.direction;
    
    // Check bounds and reverse direction if needed
    if (transform.position[axis] > movingPlatform.maxPosition) {
      transform.position[axis] = movingPlatform.maxPosition;
      movingPlatform.direction = -1;
    } else if (transform.position[axis] < movingPlatform.minPosition) {
      transform.position[axis] = movingPlatform.minPosition;
      movingPlatform.direction = 1;
    }
    
    // Update physics body
    const physics = entity.getComponent('Physics');
    if (physics && physics.rapierBody) {
      // In a real implementation, would update the Rapier body position here
    }
  }
  
  /**
   * Update a rotating obstacle
   * @param {Entity} entity - Obstacle entity
   * @param {Object} rotatingObstacle - Rotating obstacle component
   * @param {number} deltaTime - Time since last update in seconds
   */
  updateRotatingObstacle(entity, rotatingObstacle, deltaTime) {
    const transform = entity.getComponent('Transform');
    if (!transform) return;
    
    // Get rotation axis
    const axis = rotatingObstacle.axis || 'y';
    
    // Create rotation quaternion
    const rotationAmount = rotatingObstacle.speed;
    const rotationEuler = new THREE.Euler();
    
    if (axis === 'x') rotationEuler.x = rotationAmount;
    if (axis === 'y') rotationEuler.y = rotationAmount;
    if (axis === 'z') rotationEuler.z = rotationAmount;
    
    const rotationQuaternion = new THREE.Quaternion().setFromEuler(rotationEuler);
    
    // Apply rotation
    transform.rotation.premultiply(rotationQuaternion);
    transform.updateMatrix();
    
    // Update mesh
    const renderer = entity.getComponent('Renderer');
    if (renderer && renderer.mesh) {
      renderer.mesh.quaternion.copy(transform.rotation);
    }
    
    // Update child entities
    for (const otherEntity of this.world.entities) {
      if (otherEntity.parent === entity.id) {
        // Get child transform
        const childTransform = otherEntity.getComponent('Transform');
        const childRenderer = otherEntity.getComponent('Renderer');
        
        if (childTransform && childRenderer && childRenderer.mesh) {
          // Rotate around parent origin
          const childPos = childTransform.position.clone();
          childPos.applyQuaternion(rotationQuaternion);
          childTransform.position.copy(childPos);
          
          // Update mesh
          childRenderer.mesh.position.copy(childTransform.position);
          childRenderer.mesh.quaternion.copy(childTransform.rotation);
        }
      }
    }
  }
  
  /**
   * Update a floating object
   * @param {Entity} entity - Floating object entity
   * @param {Object} floatingObject - Floating object component
   * @param {number} deltaTime - Time since last update in seconds
   */
  updateFloatingObject(entity, floatingObject, deltaTime) {
    const transform = entity.getComponent('Transform');
    const renderer = entity.getComponent('Renderer');
    
    if (!transform || !renderer || !renderer.mesh) return;
    
    // Update float time
    floatingObject.time = (floatingObject.time || 0) + deltaTime * floatingObject.floatSpeed;
    
    // Update Y position
    const initialY = floatingObject.initialY;
    const floatHeight = floatingObject.floatHeight || 0.2;
    
    transform.position.y = initialY + Math.sin(floatingObject.time) * floatHeight;
    
    // Update rotation
    if (floatingObject.rotationSpeed) {
      const rotationEuler = new THREE.Euler(0, floatingObject.rotationSpeed * deltaTime, 0);
      const rotationQuaternion = new THREE.Quaternion().setFromEuler(rotationEuler);
      
      transform.rotation.premultiply(rotationQuaternion);
      transform.updateMatrix();
    }
    
    // Update mesh
    renderer.mesh.position.copy(transform.position);
    renderer.mesh.quaternion.copy(transform.rotation);
  }
  
  /**
   * Update camera target to follow ball
   */
  updateCameraTarget() {
    // Find ball entity
    const ballEntities = this.world.getEntitiesByTag('ball');
    if (ballEntities.length === 0) return;
    
    const ballEntity = ballEntities[0];
    const transform = ballEntity.getComponent('Transform');
    
    if (!transform) return;
    
    // Get ball position
    const ballPosition = transform.position;
    
    // Update camera target
    this.controls.target.copy(ballPosition);
    
    // Check if player input is in aiming or moving state
    const playerInput = ballEntity.getComponent('PlayerInput');
    if (!playerInput) return;
    
    const shotState = playerInput.getShotState();
    
    // Update camera position based on shot state
    if (shotState === 'aiming' || shotState === 'shot_panel' || shotState === 'power') {
      // Position camera behind ball for aiming
      const direction = new THREE.Vector3(
        playerInput.aimDirection.x,
        0,
        playerInput.aimDirection.z
      );
      
      // Position camera behind ball
      const cameraOffset = direction.clone().multiplyScalar(10);
      cameraOffset.y = 5; // Height offset
      
      // Smooth camera movement
      const currentPosition = this.camera.position.clone();
      const targetPosition = new THREE.Vector3(
        ballPosition.x + cameraOffset.x,
        ballPosition.y + cameraOffset.y,
        ballPosition.z + cameraOffset.z
      );
      
      // Interpolate camera position
      this.camera.position.lerp(targetPosition, 0.1);
    } else if (shotState === 'moving') {
      // Follow ball from an elevated position
      const cameraOffset = new THREE.Vector3(0, 8, 10);
      
      // Smooth camera movement
      const currentPosition = this.camera.position.clone();
      const targetPosition = new THREE.Vector3(
        ballPosition.x + cameraOffset.x,
        ballPosition.y + cameraOffset.y,
        ballPosition.z + cameraOffset.z
      );
      
      // Interpolate camera position
      this.camera.position.lerp(targetPosition, 0.05);
    }
  }
  
  /**
   * Toggle visual style
   */
  toggleVisualStyle() {
    this.visualStyle = this.visualStyle === 'standard' ? 'moebius' : 'standard';
    
    // Apply visual style to scene
    if (this.visualStyle === 'moebius') {
      this.applyMoebiusStyle();
    } else {
      this.removePostProcessing();
    }
    
    // Trigger event
    this.world.triggerEvent('visualStyleChanged', {
      style: this.visualStyle
    });
  }
  
  /**
   * Apply Moebius-inspired visual style
   */
  applyMoebiusStyle() {
    // In a real implementation, this would set up post-processing effects
    // to achieve a comic book style inspired by Moebius
    // For now, we'll just change some material properties
    
    this.scene.traverse(object => {
      if (object.isMesh && object.material) {
        // Save original material if not already saved
        if (!object.userData.originalMaterial) {
          if (Array.isArray(object.material)) {
            object.userData.originalMaterial = object.material.map(mat => mat.clone());
          } else {
            object.userData.originalMaterial = object.material.clone();
          }
        }
        
        // Apply toon shader
        if (Array.isArray(object.material)) {
          object.material = object.material.map(mat => {
            return new THREE.MeshToonMaterial({
              color: mat.color || new THREE.Color(0xffffff),
              map: mat.map,
              transparent: mat.transparent,
              opacity: mat.opacity,
              side: mat.side
            });
          });
        } else {
          object.material = new THREE.MeshToonMaterial({
            color: object.material.color || new THREE.Color(0xffffff),
            map: object.material.map,
            transparent: object.material.transparent,
            opacity: object.material.opacity,
            side: object.material.side
          });
        }
      }
    });
  }
  
  /**
   * Remove post-processing effects
   */
  removePostProcessing() {
    // Restore original materials
    this.scene.traverse(object => {
      if (object.isMesh && object.userData.originalMaterial) {
        object.material = object.userData.originalMaterial;
        delete object.userData.originalMaterial;
      }
    });
  }
  
  /**
   * Render the scene
   */
  render() {
    if (!this.renderer || !this.scene || !this.camera) return;
    
    // Render with post-processing if enabled
    if (this.postProcessing.composer && this.visualStyle === 'moebius') {
      this.postProcessing.composer.render();
    } else {
      // Standard rendering
      this.renderer.render(this.scene, this.camera);
    }
  }
  
  /**
   * Handle window resize
   */
  handleResize() {
    if (!this.camera || !this.renderer) return;
    
    // Update camera aspect ratio
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    
    // Update renderer size
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update post-processing composer size
    if (this.postProcessing.composer) {
      this.postProcessing.composer.setSize(window.innerWidth, window.innerHeight);
    }
  }
  
  /**
   * Dispose resources
   */
  dispose() {
    // Dispose meshes
    this.meshes.forEach((mesh, entityId) => {
      if (mesh.geometry) mesh.geometry.dispose();
      
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(material => material.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
    
    // Clear mesh map
    this.meshes.clear();
    
    // Dispose post-processing effects
    if (this.postProcessing.composer) {
      // Dispose would go here for effect passes
    }
    
    // Dispose orbit controls
    if (this.controls) {
      this.controls.dispose();
    }
    
    // Remove renderer from DOM
    if (this.renderer) {
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
    }
    
    // Clear references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
  }
}

export default RenderingSystem;