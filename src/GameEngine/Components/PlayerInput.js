// src/GameEngine/Components/PlayerInput.js

/**
 * PlayerInput component for handling player input
 */
class PlayerInput {
    /**
     * Create a new player input component
     * @param {Object} options - Component options
     */
    constructor(options = {}) {
      // Input state
      this.isAiming = false;
      this.isCharging = false;
      this.shotState = 'idle'; // 'idle', 'aiming', 'shot_panel', 'power', 'moving'
      
      // Direction and power
      this.aimDirection = { x: 0, y: 0, z: 1 };
      this.shotPower = 0;
      this.maxShotPower = options.maxShotPower || 10;
      
      // Spin
      this.spin = { x: 0, y: 0 };
      
      // Shot panel options
      this.guideType = options.guideType || 'short'; // 'short' or 'long'
      
      // Power meter
      this.powerMeter = {
        value: 0,
        direction: 1, // 1 for up, -1 for down
        speed: options.powerMeterSpeed || 0.05,
        autoRunning: options.autoRunPowerMeter || false
      };
      
      // Input bindings
      this.bindings = {
        // Keyboard
        keyLeft: 'ArrowLeft',
        keyRight: 'ArrowRight',
        keyUp: 'ArrowUp',
        keyDown: 'ArrowDown',
        keyShot: ' ', // Space
        keyPowerUp: 'e',
        keyReset: 'r',
        keyStyle: 'v',
        
        // Mouse
        mouseAim: 0, // Left button
        
        // Touch
        touchEnabled: options.touchEnabled !== undefined ? options.touchEnabled : true
      };
      
      // User-configurable bindings
      if (options.bindings) {
        Object.assign(this.bindings, options.bindings);
      }
      
      // Input buffers for smoother control
      this.inputBuffer = {
        left: 0,
        right: 0,
        up: 0,
        down: 0,
        shot: 0,
        powerUp: 0,
        reset: 0,
        style: 0
      };
      
      // Buffer decay rate
      this.bufferDecayRate = options.bufferDecayRate || 0.2;
      
      // Mouse/Touch position
      this.pointerPosition = { x: 0, y: 0 };
      
      // Event callbacks
      this.onDirectionChange = options.onDirectionChange || null;
      this.onPowerChange = options.onPowerChange || null;
      this.onShot = options.onShot || null;
      this.onStateChange = options.onStateChange || null;
      this.onGuideTypeChange = options.onGuideTypeChange || null;
      this.onPowerUpActivate = options.onPowerUpActivate || null;
      this.onReset = options.onReset || null;
      this.onStyleToggle = options.onStyleToggle || null;
    }
    
    /**
     * Handle key down event
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyDown(event) {
      const key = event.key;
      
      // Check key bindings
      switch (key) {
        case this.bindings.keyLeft:
          this.inputBuffer.left = 1;
          this.handleDirectionInput('left');
          break;
          
        case this.bindings.keyRight:
          this.inputBuffer.right = 1;
          this.handleDirectionInput('right');
          break;
          
        case this.bindings.keyUp:
          this.inputBuffer.up = 1;
          this.handleDirectionInput('up');
          break;
          
        case this.bindings.keyDown:
          this.inputBuffer.down = 1;
          this.handleDirectionInput('down');
          break;
          
        case this.bindings.keyShot:
          this.inputBuffer.shot = 1;
          this.handleShotInput(true);
          break;
          
        case this.bindings.keyPowerUp:
          this.inputBuffer.powerUp = 1;
          this.handlePowerUpInput();
          break;
          
        case this.bindings.keyReset:
          this.inputBuffer.reset = 1;
          this.handleResetInput();
          break;
          
        case this.bindings.keyStyle:
          this.inputBuffer.style = 1;
          this.handleStyleToggleInput();
          break;
      }
    }
    
    /**
     * Handle key up event
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyUp(event) {
      const key = event.key;
      
      // Check key bindings
      switch (key) {
        case this.bindings.keyLeft:
          this.inputBuffer.left = 0;
          break;
          
        case this.bindings.keyRight:
          this.inputBuffer.right = 0;
          break;
          
        case this.bindings.keyUp:
          this.inputBuffer.up = 0;
          break;
          
        case this.bindings.keyDown:
          this.inputBuffer.down = 0;
          break;
          
        case this.bindings.keyShot:
          this.inputBuffer.shot = 0;
          this.handleShotInput(false);
          break;
          
        case this.bindings.keyPowerUp:
          this.inputBuffer.powerUp = 0;
          break;
          
        case this.bindings.keyReset:
          this.inputBuffer.reset = 0;
          break;
          
        case this.bindings.keyStyle:
          this.inputBuffer.style = 0;
          break;
      }
    }
    
    /**
     * Handle mouse down event
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseDown(event) {
      if (event.button === this.bindings.mouseAim) {
        this.pointerPosition.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointerPosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.handlePointerStart();
      }
    }
    
    /**
     * Handle mouse move event
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseMove(event) {
      this.pointerPosition.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.pointerPosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
      this.handlePointerMove();
    }
    
    /**
     * Handle mouse up event
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseUp(event) {
      if (event.button === this.bindings.mouseAim) {
        this.handlePointerEnd();
      }
    }
    
    /**
     * Handle touch start event
     * @param {TouchEvent} event - Touch event
     */
    handleTouchStart(event) {
      if (!this.bindings.touchEnabled) return;
      
      event.preventDefault();
      const touch = event.touches[0];
      this.pointerPosition.x = (touch.clientX / window.innerWidth) * 2 - 1;
      this.pointerPosition.y = -(touch.clientY / window.innerHeight) * 2 + 1;
      this.handlePointerStart();
    }
    
    /**
     * Handle touch move event
     * @param {TouchEvent} event - Touch event
     */
    handleTouchMove(event) {
      if (!this.bindings.touchEnabled) return;
      
      event.preventDefault();
      const touch = event.touches[0];
      this.pointerPosition.x = (touch.clientX / window.innerWidth) * 2 - 1;
      this.pointerPosition.y = -(touch.clientY / window.innerHeight) * 2 + 1;
      this.handlePointerMove();
    }
    
    /**
     * Handle touch end event
     * @param {TouchEvent} event - Touch event
     */
    handleTouchEnd(event) {
      if (!this.bindings.touchEnabled) return;
      
      event.preventDefault();
      this.handlePointerEnd();
    }
    
    /**
     * Handle pointer (mouse or touch) start
     */
    handlePointerStart() {
      if (this.shotState === 'idle') {
        this.setShotState('aiming');
        this.isAiming = true;
      }
    }
    
    /**
     * Handle pointer (mouse or touch) move
     */
    handlePointerMove() {
      if (this.isAiming || this.shotState === 'aiming') {
        // Update aim direction based on pointer position
        // This is simplified - in a real game, you'd use raycasting
        this.updateAimDirection();
      }
    }
    
    /**
     * Handle pointer (mouse or touch) end
     */
    handlePointerEnd() {
      if (this.isAiming) {
        this.isAiming = false;
        
        if (this.shotState === 'aiming') {
          this.setShotState('shot_panel');
        } else if (this.shotState === 'power') {
          this.releaseShot();
        }
      }
    }
    
    /**
     * Update aim direction based on pointer position
     */
    updateAimDirection() {
      // Simple 2D aiming for demo purposes
      // In a real game, this would use raycasting onto a plane
      
      // Convert pointer position to direction
      // This assumes the camera is looking down the z-axis
      const direction = {
        x: this.pointerPosition.x,
        y: 0,
        z: -this.pointerPosition.y
      };
      
      // Normalize direction
      const length = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
      if (length > 0) {
        direction.x /= length;
        direction.z /= length;
      }
      
      this.aimDirection = direction;
      
      // Call direction change callback
      if (this.onDirectionChange) {
        this.onDirectionChange(this.aimDirection);
      }
    }
    
    /**
     * Handle direction input
     * @param {string} direction - Direction ('left', 'right', 'up', 'down')
     */
    handleDirectionInput(direction) {
      if (this.shotState === 'aiming') {
        // Adjust aim direction
        const rotationAmount = 0.05; // Radians
        
        switch (direction) {
          case 'left':
            // Rotate counter-clockwise
            this.rotateDirection(rotationAmount);
            break;
            
          case 'right':
            // Rotate clockwise
            this.rotateDirection(-rotationAmount);
            break;
        }
        
        // Call direction change callback
        if (this.onDirectionChange) {
          this.onDirectionChange(this.aimDirection);
        }
      } else if (this.shotState === 'shot_panel') {
        if (direction === 'up' || direction === 'down') {
          // Toggle guide type
          this.guideType = this.guideType === 'short' ? 'long' : 'short';
          
          // Call guide type change callback
          if (this.onGuideTypeChange) {
            this.onGuideTypeChange(this.guideType);
          }
        }
      } else if (this.shotState === 'power') {
        // Apply spin
        const spinAmount = 0.5;
        
        switch (direction) {
          case 'left':
            this.spin.x -= spinAmount;
            break;
            
          case 'right':
            this.spin.x += spinAmount;
            break;
            
          case 'up':
            this.spin.y += spinAmount;
            break;
            
          case 'down':
            this.spin.y -= spinAmount;
            break;
        }
      }
    }
    
    /**
     * Rotate the aim direction
     * @param {number} angle - Angle in radians
     */
    rotateDirection(angle) {
      // Rotate in the XZ plane (around Y axis)
      const x = this.aimDirection.x;
      const z = this.aimDirection.z;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      this.aimDirection.x = x * cos - z * sin;
      this.aimDirection.z = x * sin + z * cos;
    }
    
    /**
     * Handle shot input
     * @param {boolean} pressed - Whether the button is pressed
     */
    handleShotInput(pressed) {
      if (pressed) {
        // Button pressed
        if (this.shotState === 'idle') {
          // Start aiming
          this.setShotState('aiming');
          this.isAiming = true;
        } else if (this.shotState === 'aiming') {
          // Confirm aim, go to shot panel
          this.setShotState('shot_panel');
        } else if (this.shotState === 'shot_panel') {
          // Confirm shot panel, start power meter
          this.setShotState('power');
          this.powerMeter.value = 0;
          this.powerMeter.direction = 1;
          this.shotPower = 0;
        } else if (this.shotState === 'moving') {
          // Add mid-flight bounce
          this.addBounce();
        }
      } else {
        // Button released
        if (this.shotState === 'power') {
          // Release shot
          this.releaseShot();
        }
      }
    }
    
    /**
     * Update the power meter
     * @param {number} deltaTime - Time since last update in seconds
     */
    updatePowerMeter(deltaTime) {
      if (this.shotState !== 'power') return;
      
      // Update power value based on direction
      this.powerMeter.value += this.powerMeter.direction * this.powerMeter.speed;
      
      // Reverse direction at bounds
      if (this.powerMeter.value >= 1) {
        this.powerMeter.value = 1;
        this.powerMeter.direction = -1;
      } else if (this.powerMeter.value <= 0) {
        this.powerMeter.value = 0;
        this.powerMeter.direction = 1;
      }
      
      // Map power meter value to shot power
      this.shotPower = this.powerMeter.value * this.maxShotPower;
      
      // Call power change callback
      if (this.onPowerChange) {
        this.onPowerChange(this.shotPower, this.powerMeter.value);
      }
      
      // Auto-release shot if at max power (optional)
      if (this.powerMeter.autoRunning && this.powerMeter.value === 1) {
        this.releaseShot();
      }
    }
    
    /**
     * Release the shot
     */
    releaseShot() {
      if (this.shotState !== 'power') return;
      
      // Set shot state to moving
      this.setShotState('moving');
      
      // Call shot callback
      if (this.onShot) {
        this.onShot({
          direction: this.aimDirection,
          power: this.shotPower,
          spin: this.spin
        });
      }
      
      // Reset shot properties
      this.isAiming = false;
      this.isCharging = false;
      this.spin = { x: 0, y: 0 };
    }
    
    /**
     * Add a mid-flight bounce
     */
    addBounce() {
      // Call bounce callback
      if (this.onBounce) {
        this.onBounce();
      }
    }
    
    /**
     * Handle power-up activation input
     */
    handlePowerUpInput() {
      // Call power-up activation callback
      if (this.onPowerUpActivate) {
        this.onPowerUpActivate();
      }
    }
    
    /**
     * Handle reset input
     */
    handleResetInput() {
      // Call reset callback
      if (this.onReset) {
        this.onReset();
      }
    }
    
    /**
     * Handle style toggle input
     */
    handleStyleToggleInput() {
      // Call style toggle callback
      if (this.onStyleToggle) {
        this.onStyleToggle();
      }
    }
    
    /**
     * Set shot state
     * @param {string} state - New state
     */
    setShotState(state) {
      const previousState = this.shotState;
      this.shotState = state;
      
      // Call state change callback
      if (this.onStateChange) {
        this.onStateChange(state, previousState);
      }
    }
    
    /**
     * Get shot state
     * @returns {string} Current shot state
     */
    getShotState() {
      return this.shotState;
    }
    
    /**
     * Update the component
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
      // Update power meter
      if (this.shotState === 'power') {
        this.updatePowerMeter(deltaTime);
      }
      
      // Decay input buffer for smoother control
      Object.keys(this.inputBuffer).forEach(key => {
        if (this.inputBuffer[key] > 0 && this.inputBuffer[key] < 1) {
          this.inputBuffer[key] = Math.max(0, this.inputBuffer[key] - this.bufferDecayRate * deltaTime);
        }
      });
    }
    
    /**
     * Attach input event listeners to the DOM
     * @param {HTMLElement} element - DOM element to attach listeners to
     */
    attachListeners(element) {
      // Keyboard events
      element.addEventListener('keydown', this.handleKeyDown.bind(this));
      element.addEventListener('keyup', this.handleKeyUp.bind(this));
      
      // Mouse events
      element.addEventListener('mousedown', this.handleMouseDown.bind(this));
      element.addEventListener('mousemove', this.handleMouseMove.bind(this));
      element.addEventListener('mouseup', this.handleMouseUp.bind(this));
      
      // Touch events
      if (this.bindings.touchEnabled) {
        element.addEventListener('touchstart', this.handleTouchStart.bind(this));
        element.addEventListener('touchmove', this.handleTouchMove.bind(this));
        element.addEventListener('touchend', this.handleTouchEnd.bind(this));
      }
    }
    
    /**
     * Detach input event listeners from the DOM
     * @param {HTMLElement} element - DOM element to detach listeners from
     */
    detachListeners(element) {
      // Keyboard events
      element.removeEventListener('keydown', this.handleKeyDown.bind(this));
      element.removeEventListener('keyup', this.handleKeyUp.bind(this));
      
      // Mouse events
      element.removeEventListener('mousedown', this.handleMouseDown.bind(this));
      element.removeEventListener('mousemove', this.handleMouseMove.bind(this));
      element.removeEventListener('mouseup', this.handleMouseUp.bind(this));
      
      // Touch events
      if (this.bindings.touchEnabled) {
        element.removeEventListener('touchstart', this.handleTouchStart.bind(this));
        element.removeEventListener('touchmove', this.handleTouchMove.bind(this));
        element.removeEventListener('touchend', this.handleTouchEnd.bind(this));
      }
    }
  }