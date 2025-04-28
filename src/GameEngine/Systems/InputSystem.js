// src/GameEngine/Systems/InputSystem.js
import * as THREE from 'three';
import System from '../ECS/System';

/**
 * InputSystem - Handles player input
 */
class InputSystem extends System {
  /**
   * Create a new input system
   * @param {World} world - Reference to the world
   */
  constructor(world) {
    super(world);
    this.requiredComponents = ['PlayerInput', 'Transform'];
    this.priority = 15; // Run after physics but before rendering
    
    // Camera for raycasting
    this.camera = null;
    
    // DOM element for event listeners
    this.domElement = null;
    
    // Raycaster for converting mouse/touch position to 3D
    this.raycaster = new THREE.Raycaster();
    
    // Bound event handlers
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    
    // Input state
    this.inputState = {
      keys: new Set(),
      mouse: {
        position: new THREE.Vector2(),
        buttons: new Set()
      },
      touch: {
        active: false,
        position: new THREE.Vector2()
      }
    };
  }
  
  /**
   * Initialize the input system
   */
  init() {
    // Get camera from world
    this.camera = this.world.camera;
    
    // Set DOM element
    this.domElement = this.world.renderer ? this.world.renderer.domElement : window;
    
    // Attach event listeners
    this.attachEventListeners();
  }
  
  /**
   * Update the input system
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    // Get player entities
    const entities = this.getCompatibleEntities();
    
    for (const entity of entities) {
      const playerInput = entity.getComponent('PlayerInput');
      
      // Update player input component
      this.updatePlayerInput(entity, playerInput, deltaTime);
      
      // Handle shot states
      this.handleShotStates(entity, playerInput, deltaTime);
    }
  }
  
  /**
   * Update player input component
   * @param {Entity} entity - Player entity
   * @param {PlayerInput} playerInput - Player input component
   * @param {number} deltaTime - Time since last update in seconds
   */
  updatePlayerInput(entity, playerInput, deltaTime) {
    // Update internal state
    playerInput.update(deltaTime);
    
    // Check if the player input component has any unprocessed input
    // This handles input already captured in the component directly
  }
  
  /**
   * Handle shot states
   * @param {Entity} entity - Player entity
   * @param {PlayerInput} playerInput - Player input component
   * @param {number} deltaTime - Time since last update in seconds
   */
  handleShotStates(entity, playerInput, deltaTime) {
    const shotState = playerInput.getShotState();
    
    // Handle different shot states
    switch (shotState) {
      case 'power':
        // Update power meter
        playerInput.updatePowerMeter(deltaTime);
        break;
        
      case 'moving':
        // Check if ball has stopped
        this.checkBallStopped(entity, playerInput);
        break;
    }
  }
  
  /**
   * Check if the ball has stopped
   * @param {Entity} entity - Player entity
   * @param {PlayerInput} playerInput - Player input component
   */
  checkBallStopped(entity, playerInput) {
    const physics = entity.getComponent('Physics');
    if (!physics) return;
    
    // Get linear and angular velocity
    const linearSpeed = physics.velocity.length();
    const angularSpeed = physics.angularVelocity.length();
    
    // Speed thresholds
    const linearThreshold = 0.05;
    const angularThreshold = 0.05;
    
    // Check if ball has stopped
    if (linearSpeed < linearThreshold && angularSpeed < angularThreshold) {
      // Set velocities to zero
      physics.velocity.set(0, 0, 0);
      physics.angularVelocity.set(0, 0, 0);
      
      // Update shot state
      playerInput.setShotState('idle');
    }
  }
  
  /**
   * Handle key down event
   * @param {KeyboardEvent} event - Key down event
   */
  handleKeyDown(event) {
    // Add key to input state
    this.inputState.keys.add(event.key);
    
    // Forward to player entities
    const entities = this.getCompatibleEntities();
    for (const entity of entities) {
      const playerInput = entity.getComponent('PlayerInput');
      playerInput.handleKeyDown(event);
    }
  }
  
  /**
   * Handle key up event
   * @param {KeyboardEvent} event - Key up event
   */
  handleKeyUp(event) {
    // Remove key from input state
    this.inputState.keys.delete(event.key);
    
    // Forward to player entities
    const entities = this.getCompatibleEntities();
    for (const entity of entities) {
      const playerInput = entity.getComponent('PlayerInput');
      playerInput.handleKeyUp(event);
    }
  }
  
  /**
   * Handle mouse down event
   * @param {MouseEvent} event - Mouse down event
   */
  handleMouseDown(event) {
    // Update mouse state
    this.inputState.mouse.buttons.add(event.button);
    this.inputState.mouse.position.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    
    // Forward to player entities
    const entities = this.getCompatibleEntities();
    for (const entity of entities) {
      const playerInput = entity.getComponent('PlayerInput');
      playerInput.handleMouseDown(event);
    }
    
    // Perform raycasting for aiming
    this.handleMouseRaycast(event);
  }
  
  /**
   * Handle mouse move event
   * @param {MouseEvent} event - Mouse move event
   */
  handleMouseMove(event) {
    // Update mouse state
    this.inputState.mouse.position.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    
    // Forward to player entities
    const entities = this.getCompatibleEntities();
    for (const entity of entities) {
      const playerInput = entity.getComponent('PlayerInput');
      playerInput.handleMouseMove(event);
    }
    
    // Perform raycasting for aiming
    if (this.inputState.mouse.buttons.size > 0) {
      this.handleMouseRaycast(event);
    }
  }
  
  /**
   * Handle mouse up event
   * @param {MouseEvent} event - Mouse up event
   */
  handleMouseUp(event) {
    // Update mouse state
    this.inputState.mouse.buttons.delete(event.button);
    
    // Forward to player entities
    const entities = this.getCompatibleEntities();
    for (const entity of entities) {
      const playerInput = entity.getComponent('PlayerInput');
      playerInput.handleMouseUp(event);
    }
  }
  
  /**
   * Handle touch start event
   * @param {TouchEvent} event - Touch start event
   */
  handleTouchStart(event) {
    event.preventDefault();
    
    // Update touch state
    const touch = event.touches[0];
    this.inputState.touch.active = true;
    this.inputState.touch.position.set(
      (touch.clientX / window.innerWidth) * 2 - 1,
      -(touch.clientY / window.innerHeight) * 2 + 1
    );
    
    // Forward to player entities
    const entities = this.getCompatibleEntities();
    for (const entity of entities) {
      const playerInput = entity.getComponent('PlayerInput');
      playerInput.handleTouchStart(event);
    }
    
    // Perform raycasting for aiming
    this.handleTouchRaycast(event);
  }
  
  /**
   * Handle touch move event
   * @param {TouchEvent} event - Touch move event
   */
  handleTouchMove(event) {
    event.preventDefault();
    
    // Update touch state
    const touch = event.touches[0];
    this.inputState.touch.position.set(
      (touch.clientX / window.innerWidth) * 2 - 1,
      -(touch.clientY / window.innerHeight) * 2 + 1
    );
    
    // Forward to player entities
    const entities = this.getCompatibleEntities();
    for (const entity of entities) {
      const playerInput = entity.getComponent('PlayerInput');
      playerInput.handleTouchMove(event);
    }
    
    // Perform raycasting for aiming
    this.handleTouchRaycast(event);
  }
  
  /**
   * Handle touch end event
   * @param {TouchEvent} event - Touch end event
   */
  handleTouchEnd(event) {
    event.preventDefault();
    
    // Update touch state
    this.inputState.touch.active = false;
    
    // Forward to player entities
    const entities = this.getCompatibleEntities();
    for (const entity of entities) {
      const playerInput = entity.getComponent('PlayerInput');
      playerInput.handleTouchEnd(event);
    }
  }
  
  /**
   * Handle mouse raycasting for aiming
   * @param {MouseEvent} event - Mouse event
   */
  handleMouseRaycast(event) {
    if (!this.camera) return;
    
    // Update raycaster
    this.raycaster.setFromCamera(this.inputState.mouse.position, this.camera);
    
    // Find player entities that are in aiming mode
    const entities = this.getCompatibleEntities().filter(entity => {
      const playerInput = entity.getComponent('PlayerInput');
      return playerInput.isAiming || playerInput.getShotState() === 'aiming';
    });
    
    if (entities.length === 0) return;
    
    // Raycast to determine aim direction
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectionPoint = new THREE.Vector3();
    
    // Get intersection with ground plane
    if (this.raycaster.ray.intersectPlane(groundPlane, intersectionPoint)) {
      for (const entity of entities) {
        // Get entity position
        const transform = entity.getComponent('Transform');
        const playerInput = entity.getComponent('PlayerInput');
        
        if (!transform || !playerInput) continue;
        
        // Calculate direction from entity to intersection point
        const direction = new THREE.Vector3().subVectors(
          transform.position,
          intersectionPoint
        ).normalize();
        
        // Set direction in player input component (ignore Y component)
        direction.y = 0;
        direction.normalize();
        
        playerInput.aimDirection = {
          x: direction.x,
          y: direction.y,
          z: direction.z
        };
        
        // Call direction change callback
        if (playerInput.onDirectionChange) {
          playerInput.onDirectionChange(playerInput.aimDirection);
        }
      }
    }
  }
  
  /**
   * Handle touch raycasting for aiming
   * @param {TouchEvent} event - Touch event
   */
  handleTouchRaycast(event) {
    if (!this.camera) return;
    
    // Update raycaster
    this.raycaster.setFromCamera(this.inputState.touch.position, this.camera);
    
    // Find player entities that are in aiming mode
    const entities = this.getCompatibleEntities().filter(entity => {
      const playerInput = entity.getComponent('PlayerInput');
      return playerInput.isAiming || playerInput.getShotState() === 'aiming';
    });
    
    if (entities.length === 0) return;
    
    // Raycast to determine aim direction
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectionPoint = new THREE.Vector3();
    
    // Get intersection with ground plane
    if (this.raycaster.ray.intersectPlane(groundPlane, intersectionPoint)) {
      for (const entity of entities) {
        // Get entity position
        const transform = entity.getComponent('Transform');
        const playerInput = entity.getComponent('PlayerInput');
        
        if (!transform || !playerInput) continue;
        
        // Calculate direction from entity to intersection point
        const direction = new THREE.Vector3().subVectors(
          transform.position,
          intersectionPoint
        ).normalize();
        
        // Set direction in player input component (ignore Y component)
        direction.y = 0;
        direction.normalize();
        
        playerInput.aimDirection = {
          x: direction.x,
          y: direction.y,
          z: direction.z
        };
        
        // Call direction change callback
        if (playerInput.onDirectionChange) {
          playerInput.onDirectionChange(playerInput.aimDirection);
        }
      }
    }
  }
  
  /**
   * Attach event listeners to DOM element
   */
  attachEventListeners() {
    if (!this.domElement) {
      console.warn('No DOM element to attach event listeners to');
      return;
    }
    
    // Keyboard events
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    
    // Mouse events
    this.domElement.addEventListener('mousedown', this.handleMouseDown);
    this.domElement.addEventListener('mousemove', this.handleMouseMove);
    this.domElement.addEventListener('mouseup', this.handleMouseUp);
    
    // Touch events
    this.domElement.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.domElement.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.domElement.addEventListener('touchend', this.handleTouchEnd, { passive: false });
  }
  
  /**
   * Detach event listeners from DOM element
   */
  detachEventListeners() {
    if (!this.domElement) return;
    
    // Keyboard events
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    
    // Mouse events
    this.domElement.removeEventListener('mousedown', this.handleMouseDown);
    this.domElement.removeEventListener('mousemove', this.handleMouseMove);
    this.domElement.removeEventListener('mouseup', this.handleMouseUp);
    
    // Touch events
    this.domElement.removeEventListener('touchstart', this.handleTouchStart);
    this.domElement.removeEventListener('touchmove', this.handleTouchMove);
    this.domElement.removeEventListener('touchend', this.handleTouchEnd);
  }
  
  /**
   * Handle shot input
   * @param {Entity} entity - Player entity
   * @param {string} action - Action type ('shoot', 'cancelShot', 'bounce')
   */
  handleShotInput(entity, action) {
    const playerInput = entity.getComponent('PlayerInput');
    const physics = entity.getComponent('Physics');
    
    if (!playerInput || !physics) return;
    
    switch (action) {
      case 'shoot':
        // Check current shot state
        const shotState = playerInput.getShotState();
        
        if (shotState === 'power') {
          // Apply impulse based on direction and power
          const direction = new THREE.Vector3(
            playerInput.aimDirection.x,
            playerInput.aimDirection.y,
            playerInput.aimDirection.z
          );
          
          const impulse = direction.multiplyScalar(playerInput.shotPower);
          
          // Apply spin adjustments if any
          impulse.x += playerInput.spin.x * 2;
          impulse.z += playerInput.spin.y * 2;
          
          // Apply impulse to physics body
          physics.applyImpulse(impulse);
          
          // Calculate appropriate angular velocity (perpendicular to movement direction)
          const axis = new THREE.Vector3(-direction.z, 0, direction.x);
          const angularImpulse = axis.multiplyScalar(playerInput.shotPower * 2);
          physics.applyTorque(angularImpulse);
          
          // Add stroke to course
          const course = entity.getComponent('Course');
          if (course) {
            course.addStroke();
          }
          
          // Update shot state
          playerInput.setShotState('moving');
          
          // Trigger world event
          this.world.triggerEvent('shotFired', {
            entity,
            power: playerInput.shotPower,
            direction: playerInput.aimDirection,
            spin: playerInput.spin
          });
        }
        break;
        
      case 'cancelShot':
        // Cancel the current shot
        playerInput.setShotState('idle');
        break;
        
      case 'bounce':
        // Apply a mid-flight bounce
        if (playerInput.getShotState() === 'moving') {
          // Apply upward impulse
          const bounceStrength = 2.0 * (1 + playerInput.shotPower / 10);
          physics.applyImpulse(new THREE.Vector3(0, bounceStrength, 0));
          
          // Trigger world event
          this.world.triggerEvent('ballBounced', { entity });
        }
        break;
    }
  }
  
  /**
   * Handle power-up activation
   * @param {Entity} entity - Player entity
   */
  handlePowerUpActivation(entity) {
    // Check if entity has a power-up
    const powerUpManager = entity.getComponent('PowerUpManager');
    if (!powerUpManager || !powerUpManager.activePowerUp) return;
    
    // Activate power-up
    powerUpManager.activatePowerUp();
    
    // Trigger world event
    this.world.triggerEvent('powerUpActivated', {
      entity,
      powerUp: powerUpManager.activePowerUp
    });
  }
  
  /**
   * Handle ball reset
   * @param {Entity} entity - Player entity
   */
  handleBallReset(entity) {
    // Reset ball position
    const transform = entity.getComponent('Transform');
    const physics = entity.getComponent('Physics');
    const course = entity.getComponent('Course');
    
    if (!transform || !physics || !course) return;
    
    // Reset position to start position
    transform.position.set(
      course.startPosition.x,
      course.startPosition.y,
      course.startPosition.z
    );
    
    // Reset rotation
    transform.rotation.set(0, 0, 0, 1);
    
    // Reset velocities
    physics.velocity.set(0, 0, 0);
    physics.angularVelocity.set(0, 0, 0);
    
    // Update shot state
    const playerInput = entity.getComponent('PlayerInput');
    if (playerInput) {
      playerInput.setShotState('idle');
    }
    
    // Add penalty stroke
    course.addStroke();
    
    // Trigger world event
    this.world.triggerEvent('ballReset', { entity });
  }
  
  /**
   * Dispose resources
   */
  dispose() {
    // Detach event listeners
    this.detachEventListeners();
  }
}

export default InputSystem;