// Enhanced RollerController.js with Kirby's Dream Course shot mechanics
import * as THREE from 'three';

class RollerController {
  constructor(scene, physics, position = { x: 0, y: 1, z: 0 }) {
    this.scene = scene;
    this.physics = physics;
    this.initialPosition = { ...position };
    
    // Roller properties
    this.rollerMesh = null;
    this.rollerBody = null;
    this.radius = 0.5;
    this.mass = 1;
    
    // Shot state machine - Following Kirby's Dream Course 3-step process
    this.shotState = 'idle'; // 'idle', 'aiming', 'power', 'spin', 'moving'
    
    // Direction aiming properties
    this.aimDirection = new THREE.Vector3(0, 0, 1);
    this.aimArrow = null;
    this.aimLine = null;
    
    // Power meter properties
    this.powerMeter = {
      value: 0,          // Current power value (0-1)
      direction: 1,      // 1 for increasing, -1 for decreasing
      speed: 1.5,        // Oscillation speed
      oscillating: false // Whether the power meter is active
    };
    this.shotPower = 0;
    this.maxShotPower = 10;
    
    // Spin properties
    this.spin = {
      topSpin: 0,  // Forward spin (0-1)
      backSpin: 0, // Backward spin (0-1)
      leftSpin: 0, // Left spin (0-1)
      rightSpin: 0 // Right spin (0-1)
    };
    
    // Movement properties
    this.isMoving = false;
    this.friction = 0.1;
    this.airborne = false;
    
    // Energy system (tomatoes in Kirby's Dream Course)
    this.maxEnergy = 4;
    this.energy = this.maxEnergy;
    
    // Trail effect
    this.trail = null;
    this.trailMaterial = null;
    this.trailLength = 20;
    this.trailPositions = [];
    
    // Power-up properties
    this.activePowerUp = null;
    this.powerUpTimer = 0;
    this.powerUpDuration = 0;
    
    // Event handlers
    this.eventHandlers = {};
    
    // Create the roller
    this.createRoller();
    
    // Create trail effect
    this.createTrail();
    
    // Create aim visuals
    this.createAimVisuals();
  }
  
  // Register event handler
  on(event, callback) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(callback);
  }
  
  // Trigger event
  triggerEvent(event, data) {
    if (!this.eventHandlers[event]) return;
    this.eventHandlers[event].forEach(callback => callback(data));
  }
  
  // Create the roller mesh and physics body
  createRoller() {
    // Create roller mesh - pink like Kirby
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: 0xff9ec6, // Pink color like Kirby
      emissive: 0x662b4e,
      emissiveIntensity: 0.3,
      shininess: 100
    });
    
    this.rollerMesh = new THREE.Mesh(geometry, material);
    this.rollerMesh.position.set(
      this.initialPosition.x,
      this.initialPosition.y,
      this.initialPosition.z
    );
    this.rollerMesh.castShadow = true;
    this.rollerMesh.receiveShadow = false;
    
    this.scene.add(this.rollerMesh);
    
    // Create physics body if physics system is initialized
    if (this.physics && this.physics.initialized) {
      this.rollerBody = this.physics.createDynamicBody(this.rollerMesh, {
        shape: 'ball',
        radius: this.radius,
        material: 'roller'
      });
    } else {
      // Fallback for when physics isn't initialized
      console.warn('Physics system not initialized, using fallback physics');
      this.rollerBody = {
        position: new THREE.Vector3(
          this.initialPosition.x,
          this.initialPosition.y,
          this.initialPosition.z
        ),
        velocity: new THREE.Vector3(0, 0, 0),
        angularVelocity: new THREE.Vector3(0, 0, 0),
        applyImpulse: (impulse) => {
          this.rollerBody.velocity.add(impulse.clone().divideScalar(this.mass));
        },
        applyTorque: (torque) => {
          this.rollerBody.angularVelocity.add(torque.clone().divideScalar(this.mass));
        }
      };
    }
  }
  
  // Create trail effect
  createTrail() {
    // Initialize trail positions array
    for (let i = 0; i < this.trailLength; i++) {
      this.trailPositions.push(
        this.initialPosition.x,
        this.initialPosition.y - this.radius * 0.9,
        this.initialPosition.z
      );
    }
    
    // Create trail geometry
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(this.trailPositions, 3)
    );
    
    // Create trail material - pink like Kirby
    this.trailMaterial = new THREE.LineBasicMaterial({
      color: 0xff9ec6,
      opacity: 0.7,
      transparent: true,
      linewidth: 1
    });
    
    // Create trail mesh
    this.trail = new THREE.Line(trailGeometry, this.trailMaterial);
    this.scene.add(this.trail);
  }
  
  // Create aim visuals for direction step
  createAimVisuals() {
    // Create direction arrow (Kirby style)
    const arrowGeometry = new THREE.ConeGeometry(0.2, 0.5, 8);
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.aimArrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    this.aimArrow.rotation.x = Math.PI / 2;
    this.aimArrow.visible = false;
    this.scene.add(this.aimArrow);
    
    // Create aim line for trajectory preview
    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 0.2,
      gapSize: 0.1,
      linewidth: 2
    });
    
    // Create default guide points
    const guidePoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 5)
    ];
    
    lineGeometry.setFromPoints(guidePoints);
    this.aimLine = new THREE.Line(lineGeometry, lineMaterial);
    this.aimLine.computeLineDistances(); // Required for dashed lines
    this.aimLine.visible = false;
    this.scene.add(this.aimLine);
  }
  
  // -------------------- KIRBY'S DREAM COURSE 3-STEP PROCESS --------------------
  
  // STEP 1: Start the aiming process
  startAiming() {
    if (this.isMoving || this.shotState !== 'idle') return false;
    if (this.energy <= 0) return false;
    
    // Set shot state to aiming
    this.shotState = 'aiming';
    
    // Show aim visuals
    this.aimArrow.visible = true;
    this.aimLine.visible = true;
    this.updateAimVisuals();
    
    // Trigger shot state changed event
    this.triggerEvent('shotStateChanged', { shotState: 'aiming' });
    
    return true;
  }
  
  // Update aim visuals (arrow and line)
  updateAimVisuals() {
    if (!this.aimArrow || !this.aimLine || !this.rollerMesh) return;
    
    // Set arrow position slightly in front of roller
    const position = this.rollerMesh.position.clone();
    const offset = this.aimDirection.clone().multiplyScalar(this.radius * 1.5);
    position.add(offset);
    position.y += 0.1; // Raise slightly above ground
    
    // Update arrow position and rotation
    this.aimArrow.position.copy(position);
    this.aimArrow.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      this.aimDirection
    );
    
    // Update aim line
    const linePoints = [this.rollerMesh.position.clone()];
    
    // Create points for trajectory preview based on direction and terrain
    const previewDistance = 5; // Base preview distance
    const steps = 10; // Number of points in preview
    
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const distance = previewDistance * t;
      
      // Basic trajectory calculation (would be enhanced with terrain awareness)
      const point = this.rollerMesh.position.clone().add(
        this.aimDirection.clone().multiplyScalar(distance)
      );
      
      // Adjust for simple terrain height (could be improved with actual terrain data)
      point.y += 0.1; // Keep slightly above ground
      
      linePoints.push(point);
    }
    
    // Update line geometry
    this.aimLine.geometry.dispose();
    this.aimLine.geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    this.aimLine.computeLineDistances(); // Required for dashed lines
  }
  
  // Adjust aim direction based on input
  setAimDirection(direction) {
    if (this.shotState !== 'aiming') return false;
    
    // Create a quaternion for rotation
    const rotationAmount = Math.PI / 36; // 5 degrees
    const rotationAxis = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    
    switch (direction) {
      case 'left':
        quaternion.setFromAxisAngle(rotationAxis, rotationAmount);
        break;
      case 'right':
        quaternion.setFromAxisAngle(rotationAxis, -rotationAmount);
        break;
      case 'leftLarge':
        quaternion.setFromAxisAngle(rotationAxis, Math.PI / 4); // 45 degrees
        break;
      case 'rightLarge':
        quaternion.setFromAxisAngle(rotationAxis, -Math.PI / 4); // 45 degrees
        break;
      default:
        return false;
    }
    
    // Apply rotation to direction vector
    this.aimDirection.applyQuaternion(quaternion);
    this.aimDirection.normalize();
    
    // Update aim visuals
    this.updateAimVisuals();
    
    return true;
  }
  
  // STEP 2: Start the power meter (after aiming is confirmed)
  startPowerMeter() {
    if (this.shotState !== 'aiming') return false;
    
    // Set shot state to power
    this.shotState = 'power';
    
    // Reset power meter
    this.powerMeter.value = 0;
    this.powerMeter.direction = 1;
    this.powerMeter.oscillating = true;
    
    // Hide aim arrow but keep line visible
    this.aimArrow.visible = false;
    
    // Trigger shot state changed event
    this.triggerEvent('shotStateChanged', { shotState: 'power' });
    
    return true;
  }
  
  // Update power meter during power step
  updatePowerMeter(deltaTime) {
    if (this.shotState !== 'power' || !this.powerMeter.oscillating) return;
    
    // Update power value based on oscillation
    this.powerMeter.value += this.powerMeter.direction * this.powerMeter.speed * deltaTime;
    
    // Reverse direction at boundaries
    if (this.powerMeter.value >= 1) {
      this.powerMeter.value = 1;
      this.powerMeter.direction = -1;
    } else if (this.powerMeter.value <= 0) {
      this.powerMeter.value = 0;
      this.powerMeter.direction = 1;
    }
    
    // Map to shot power
    this.shotPower = this.powerMeter.value * this.maxShotPower;
    
    // Trigger power meter update event
    this.triggerEvent('powerMeterUpdated', { 
      powerValue: this.powerMeter.value,
      shotPower: this.shotPower
    });
  }
  
  // Set power directly (when power meter is locked in)
  setPower(powerValue) {
    if (this.shotState !== 'power') return false;
    
    // Stop oscillation
    this.powerMeter.oscillating = false;
    
    // Set power values
    this.powerMeter.value = Math.max(0, Math.min(1, powerValue));
    this.shotPower = this.powerMeter.value * this.maxShotPower;
    
    // Advance to spin step (Kirby's Dream Course has spin after power)
    this.shotState = 'spin';
    
    // Trigger shot state changed event
    this.triggerEvent('shotStateChanged', { 
      shotState: 'spin',
      shotPower: this.shotPower
    });
    
    return true;
  }
  
  // STEP 3: Apply spin to the shot
  applySpin(spinType, value = 1.0) {
    if (this.shotState !== 'spin') return false;
    
    // Reset all spin values first
    this.spin.topSpin = 0;
    this.spin.backSpin = 0;
    this.spin.leftSpin = 0;
    this.spin.rightSpin = 0;
    
    // Set the specified spin type
    switch (spinType) {
      case 'top':
        this.spin.topSpin = value;
        break;
      case 'back':
        this.spin.backSpin = value;
        break;
      case 'left':
        this.spin.leftSpin = value;
        break;
      case 'right':
        this.spin.rightSpin = value;
        break;
      case 'none':
        // All spins already reset to 0
        break;
      default:
        return false;
    }
    
    // Trigger spin updated event
    this.triggerEvent('spinUpdated', { spin: { ...this.spin } });
    
    return true;
  }
  
  // FINAL STEP: Release shot with current direction, power and spin
  releaseShot() {
    if (this.shotState !== 'spin' || this.isMoving) return false;
    
    // Calculate impulse from power and direction
    const impulse = this.aimDirection.clone().multiplyScalar(this.shotPower);
    
    // Apply spin adjustments
    // Forward/backward spin affects the vertical component
    if (this.spin.topSpin > 0) {
      impulse.y -= this.spin.topSpin * 0.5; // Lower trajectory for longer roll
    } else if (this.spin.backSpin > 0) {
      impulse.y += this.spin.backSpin * 1.0; // Higher trajectory for stopping quicker
    }
    
    // Left/right spin affects horizontal direction
    const sidewaysVector = new THREE.Vector3(this.aimDirection.z, 0, -this.aimDirection.x);
    if (this.spin.leftSpin > 0) {
      impulse.add(sidewaysVector.clone().multiplyScalar(this.spin.leftSpin * 1.5));
    } else if (this.spin.rightSpin > 0) {
      impulse.add(sidewaysVector.clone().multiplyScalar(-this.spin.rightSpin * 1.5));
    }
    
    // Apply impulse to roller
    if (this.physics && this.rollerBody) {
      this.physics.applyImpulse(this.rollerMesh, {
        x: impulse.x,
        y: impulse.y,
        z: impulse.z
      });
    } else {
      // Fallback
      this.rollerBody.applyImpulse(impulse);
    }
    
    // Calculate appropriate angular velocity (perpendicular to movement direction)
    const axis = new THREE.Vector3(-this.aimDirection.z, 0, this.aimDirection.x);
    const angularImpulse = axis.multiplyScalar(this.shotPower * 2);
    
    if (this.physics && this.rollerBody) {
      this.physics.applyTorque(this.rollerMesh, {
        x: angularImpulse.x,
        y: angularImpulse.y,
        z: angularImpulse.z
      });
    } else {
      // Fallback
      this.rollerBody.applyTorque(angularImpulse);
    }
    
    // Use energy
    this.useEnergy();
    
    // Hide aim visuals
    this.aimArrow.visible = false;
    this.aimLine.visible = false;
    
    // Update state
    this.shotState = 'moving';
    this.isMoving = true;
    
    // Trigger shot state changed event
    this.triggerEvent('shotStateChanged', { shotState: 'moving' });
    
    return true;
  }
  
  // Use one energy (tomato in Kirby's Dream Course)
  useEnergy() {
    this.energy = Math.max(0, this.energy - 1);
    this.triggerEvent('energyChanged', { energy: this.energy });
    return this.energy;
  }
  
  // Replenish energy (e.g., when collecting power-ups)
  replenishEnergy(amount = 1) {
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
    this.triggerEvent('energyChanged', { energy: this.energy });
    return this.energy;
  }
  
  // Add mid-flight bounce (Kirby's Dream Course key mechanic)
  addBounce() {
    if (this.shotState !== 'moving' || !this.isMoving) return false;
    
    // Apply upward impulse
    const bounceStrength = 3.0; // Strong bounce like in Kirby's Dream Course
    
    if (this.physics && this.rollerBody) {
      this.physics.applyImpulse(this.rollerMesh, {
        x: 0,
        y: bounceStrength,
        z: 0
      });
      
      // Kirby's Dream Course also allows adjusting direction during bounce
      // This would be connected to input handling
    } else {
      // Fallback
      const bounceImpulse = new THREE.Vector3(0, bounceStrength, 0);
      this.rollerBody.applyImpulse(bounceImpulse);
    }
    
    this.airborne = true;
    
    // Trigger bounce event
    this.triggerEvent('bounce', { position: this.rollerMesh.position.clone() });
    
    return true;
  }
  
  // Adjust direction during bounce (Kirby's Dream Course mechanic)
  adjustBounceDirection(direction) {
    if (this.shotState !== 'moving' || !this.airborne) return false;
    
    // Get current velocity
    let velocity;
    if (this.physics && this.rollerBody) {
      velocity = this.physics.getLinearVelocity(this.rollerMesh);
    } else {
      velocity = this.rollerBody.velocity;
    }
    
    // Create horizontal velocity vector
    const horizontalVelocity = new THREE.Vector3(velocity.x, 0, velocity.z);
    const speed = horizontalVelocity.length();
    
    // Define adjustment amount
    const adjustmentFactor = 0.5; // How much to adjust direction
    
    // Create adjustment vector based on input direction
    let adjustmentVector = new THREE.Vector3(0, 0, 0);
    switch (direction) {
      case 'left':
        adjustmentVector.set(-adjustmentFactor, 0, 0);
        break;
      case 'right':
        adjustmentVector.set(adjustmentFactor, 0, 0);
        break;
      case 'forward':
        adjustmentVector.set(0, 0, -adjustmentFactor);
        break;
      case 'backward':
        adjustmentVector.set(0, 0, adjustmentFactor);
        break;
    }
    
    // Apply adjustment to velocity
    if (this.physics && this.rollerBody) {
      // Keep the same speed but adjust direction
      horizontalVelocity.normalize().add(adjustmentVector).normalize().multiplyScalar(speed);
      
      this.physics.setLinearVelocity(this.rollerMesh, {
        x: horizontalVelocity.x,
        y: velocity.y, // Keep vertical velocity
        z: horizontalVelocity.z
      });
    } else {
      // Fallback
      horizontalVelocity.normalize().add(adjustmentVector).normalize().multiplyScalar(speed);
      this.rollerBody.velocity.x = horizontalVelocity.x;
      this.rollerBody.velocity.z = horizontalVelocity.z;
    }
    
    return true;
  }
  
  // Reset roller to starting position
  reset() {
    // Reset position
    if (this.physics && this.rollerBody) {
      this.physics.setLinearVelocity(this.rollerMesh, { x: 0, y: 0, z: 0 });
      this.physics.setAngularVelocity(this.rollerMesh, { x: 0, y: 0, z: 0 });
      
      // Reset position
      this.rollerMesh.position.set(
        this.initialPosition.x,
        this.initialPosition.y,
        this.initialPosition.z
      );
    } else {
      // Fallback
      this.rollerBody.position.set(
        this.initialPosition.x,
        this.initialPosition.y,
        this.initialPosition.z
      );
      
      // Reset velocity
      this.rollerBody.velocity.set(0, 0, 0);
      this.rollerBody.angularVelocity.set(0, 0, 0);
    }
    
    // Reset state
    this.shotState = 'idle';
    this.isMoving = false;
    this.airborne = false;
    this.shotPower = 0;
    
    // Reset spin
    this.spin.topSpin = 0;
    this.spin.backSpin = 0;
    this.spin.leftSpin = 0;
    this.spin.rightSpin = 0;
    
    // Reset power-ups
    this.deactivatePowerUp();
    
    // Reset trail
    this.resetTrail();
    
    // Hide aim visuals
    if (this.aimArrow) this.aimArrow.visible = false;
    if (this.aimLine) this.aimLine.visible = false;
    
    // Trigger shot state changed event
    this.triggerEvent('shotStateChanged', { shotState: 'idle' });
    
    return true;
  }
  
  // Reset trail to current position
  resetTrail() {
    if (!this.trail) return;
    
    const positions = this.trail.geometry.attributes.position.array;
    const rollerPosition = this.rollerMesh.position;
    
    for (let i = 0; i < this.trailLength; i++) {
      const idx = i * 3;
      positions[idx] = rollerPosition.x;
      positions[idx + 1] = rollerPosition.y - this.radius * 0.9;
      positions[idx + 2] = rollerPosition.z;
    }
    
    this.trail.geometry.attributes.position.needsUpdate = true;
  }
  
  // Activate a power-up (similar to Kirby's copy abilities)
  activatePowerUp(type) {
    // Deactivate current power-up if any
    this.deactivatePowerUp();
    
    this.activePowerUp = type;
    
    // Apply power-up effects
    switch (type) {
      case 'rocketDash':
        // Apply a strong impulse in the current direction
        let velocity;
        if (this.physics && this.rollerBody) {
          velocity = this.physics.getLinearVelocity(this.rollerMesh);
        } else {
          velocity = this.rollerBody.velocity;
        }
        
        const dashDirection = new THREE.Vector3(velocity.x, 0, velocity.z).normalize();
        const dashImpulse = dashDirection.multiplyScalar(15);
        
        if (this.physics && this.rollerBody) {
          this.physics.applyImpulse(this.rollerMesh, {
            x: dashImpulse.x,
            y: dashImpulse.y,
            z: dashImpulse.z
          });
        } else {
          this.rollerBody.applyImpulse(dashImpulse);
        }
        
        // Set trail effect to rocket mode
        this.trailMaterial.color.set(0xff3300);
        this.trailMaterial.opacity = 0.9;
        
        // Set duration
        this.powerUpDuration = 3; // 3 seconds
        break;
        
      case 'stickyMode':
        // Increase friction coefficient (for climbing walls like Wheel Kirby)
        this.friction = 0.8;
        
        // Set trail effect to sticky mode
        this.trailMaterial.color.set(0x00ff00);
        
        // Set duration
        this.powerUpDuration = 5; // 5 seconds
        break;
        
      case 'bouncy':
        // Set bouncy effect flag (like Ball Kirby)
        this.rollerMesh.userData.bouncy = true;
        
        // Set trail effect
        this.trailMaterial.color.set(0x0066ff);
        
        // Set duration (lasts for one hole)
        this.powerUpDuration = Infinity; // Until reset
        break;
        
      case 'gravityFlip':
        // Flip gravity direction (like UFO Kirby)
        if (this.physics && this.physics.initialized) {
          this.physics.flipGravity();
        }
        
        // Apply upward impulse
        const flipImpulse = new THREE.Vector3(0, 10, 0);
        
        if (this.physics && this.rollerBody) {
          this.physics.applyImpulse(this.rollerMesh, {
            x: 0,
            y: 10,
            z: 0
          });
        } else {
          this.rollerBody.applyImpulse(flipImpulse);
        }
        
        // Set trail effect
        this.trailMaterial.color.set(0xffff00);
        
        // Set duration
        this.powerUpDuration = 4; // 4 seconds
        break;
        
      default:
        console.warn(`Unknown power-up type: ${type}`);
        this.activePowerUp = null;
        this.powerUpDuration = 0;
        return false;
    }
    
    this.powerUpTimer = this.powerUpDuration;
    
    // Trigger power-up activated event
    this.triggerEvent('powerUpActivated', { 
      type: this.activePowerUp,
      duration: this.powerUpDuration
    });
    
    return true;
  }
  
  // Deactivate current power-up
  deactivatePowerUp() {
    if (!this.activePowerUp) return;
    
    // Revert power-up effects
    switch (this.activePowerUp) {
      case 'stickyMode':
        this.friction = 0.1; // Reset friction
        break;
        
      case 'bouncy':
        this.rollerMesh.userData.bouncy = false;
        break;
        
      case 'gravityFlip':
        // Reset gravity
        if (this.physics && this.physics.initialized) {
          this.physics.setGravity({ x: 0, y: -9.81, z: 0 }, 1);
        }
        break;
    }
    
    // Reset trail effect
    this.trailMaterial.color.set(0xff9ec6); // Back to Kirby pink
    this.trailMaterial.opacity = 0.7;
    
    // Trigger power-up deactivated event
    this.triggerEvent('powerUpDeactivated', { type: this.activePowerUp });
    
    this.activePowerUp = null;
    this.powerUpTimer = 0;
  }
  
  // Update physics and visuals
  update(deltaTime) {
    // Skip if not created yet
    if (!this.rollerMesh) return;
    
    // Update shot state machine
    switch (this.shotState) {
      case 'aiming':
        // Update aim visuals while aiming
        this.updateAimVisuals();
        break;
        
      case 'power':
        // Update power meter during power step
        this.updatePowerMeter(deltaTime);
        break;
        
      case 'moving':
        // Check if roller has stopped
        let linearSpeed = 0;
        let angularSpeed = 0;
        
        if (this.physics && this.rollerBody) {
          const velocity = this.physics.getLinearVelocity(this.rollerMesh);
          linearSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
          
          const angVelocity = this.physics.getAngularVelocity(this.rollerMesh);
          angularSpeed = Math.sqrt(angVelocity.x * angVelocity.x + angVelocity.z * angVelocity.z);
          
          // Check if roller is on ground (not airborne)
          // Simple y-velocity check (would be improved with actual ground collision detection)
          const yVelocity = Math.abs(velocity.y);
          this.airborne = yVelocity > 0.5; // Consider airborne if moving vertically
          
          // Apply different friction based on surface type
          // In a real implementation, this would check what type of surface the roller is on
          if (!this.airborne) {
            // Apply friction to slow down the roller (like in Kirby's Dream Course)
            const frictionFactor = 0.98; // Basic friction
            
            // Apply additional friction based on active power-up
            if (this.activePowerUp === 'stickyMode') {
              this.physics.setLinearVelocity(this.rollerMesh, {
                x: velocity.x * 0.95, // Higher friction for sticky mode
                y: velocity.y,
                z: velocity.z * 0.95
              });
            }
          }
        } else {
          // Fallback behavior when physics system isn't available
          linearSpeed = this.rollerBody.velocity.length();
          angularSpeed = this.rollerBody.angularVelocity.length();
          
          // Simple dampening
          this.rollerBody.velocity.multiplyScalar(0.98);
          this.rollerBody.angularVelocity.multiplyScalar(0.98);
        }
        
        // Update trail
        this.updateTrail();
        
        // Check if the roller has stopped moving
        const velocityThreshold = 0.1;
        const angularThreshold = 0.1;
        
        if (linearSpeed < velocityThreshold && angularSpeed < angularThreshold && !this.airborne) {
          // Ball has stopped - set to idle state
          if (this.physics && this.rollerBody) {
            this.physics.setLinearVelocity(this.rollerMesh, { x: 0, y: 0, z: 0 });
            this.physics.setAngularVelocity(this.rollerMesh, { x: 0, y: 0, z: 0 });
          } else {
            this.rollerBody.velocity.set(0, 0, 0);
            this.rollerBody.angularVelocity.set(0, 0, 0);
          }
          
          this.isMoving = false;
          this.shotState = 'idle';
          
          // Trigger shot state changed event
          this.triggerEvent('shotStateChanged', { shotState: 'idle' });
        }
        break;
    }
    
    // Update power-up timer
    if (this.activePowerUp && this.powerUpTimer > 0) {
      this.powerUpTimer -= deltaTime;
      
      if (this.powerUpTimer <= 0) {
        this.deactivatePowerUp();
      }
    }
  }
  
  // Update trail positions
  updateTrail() {
    if (!this.trail || !this.rollerMesh) return;
    
    const positions = this.trail.geometry.attributes.position.array;
    
    // Shift positions array forward
    for (let i = this.trailLength - 1; i > 0; i--) {
      const currentIdx = i * 3;
      const prevIdx = (i - 1) * 3;
      
      positions[currentIdx] = positions[prevIdx];
      positions[currentIdx + 1] = positions[prevIdx + 1];
      positions[currentIdx + 2] = positions[prevIdx + 2];
    }
    
    // Set first position to current roller position
    positions[0] = this.rollerMesh.position.x;
    positions[1] = this.rollerMesh.position.y - this.radius * 0.9;
    positions[2] = this.rollerMesh.position.z;
    
    // Update the geometry
    this.trail.geometry.attributes.position.needsUpdate = true;
    
    // Apply power-up effects to trail
    if (this.activePowerUp) {
      // Make trail more visible during power-ups
      this.trailMaterial.opacity = 0.9;
      
      // Pulse effect for power-ups
      const pulse = Math.sin(Date.now() * 0.01) * 0.1 + 0.9;
      this.trailMaterial.opacity *= pulse;
    } else {
      // Normal trail
      this.trailMaterial.opacity = 0.7;
    }
  }
  
  // Check for power-up collision
  checkPowerUpCollision(powerUps) {
    if (!powerUps || !this.rollerMesh) return null;
    
    for (let i = 0; i < powerUps.length; i++) {
      const powerUp = powerUps[i];
      
      if (powerUp.collected || !powerUp.mesh) continue;
      
      // Simple distance check for collision
      const distance = this.rollerMesh.position.distanceTo(powerUp.mesh.position);
      
      if (distance < this.radius + 0.3) { // Roller radius + power-up radius
        // Mark as collected
        powerUp.collected = true;
        powerUp.mesh.visible = false;
        
        // Replenish energy when collecting a power-up (like in Kirby's Dream Course)
        this.replenishEnergy(1);
        
        // Trigger power-up collected event
        this.triggerEvent('powerUpCollected', { type: powerUp.type });
        
        return powerUp.type;
      }
    }
    
    return null;
  }
  
  // Check if roller is in hole
  checkHoleCollision(holePosition) {
    if (!holePosition || !this.rollerMesh) return false;
    
    // Calculate distance to hole
    const distance = Math.sqrt(
      Math.pow(this.rollerMesh.position.x - holePosition.x, 2) +
      Math.pow(this.rollerMesh.position.z - holePosition.z, 2)
    );
    
    // Check if distance is less than hole radius and roller is slow enough
    const holeRadius = 0.7;
    
    let speed = 0;
    if (this.physics && this.rollerBody) {
      const velocity = this.physics.getLinearVelocity(this.rollerMesh);
      speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    } else {
      speed = this.rollerBody.velocity.length();
    }
    
    const speedThreshold = 2;
    
    if (distance < holeRadius && speed < speedThreshold) {
      // Add the falling into hole animation like in Kirby's Dream Course
      this.startHoleAnimation();
      return true;
    }
    
    return false;
  }
  
  // Start the hole animation (Kirby falling into hole)
  startHoleAnimation() {
    if (this.holeAnimationActive) return;
    
    this.holeAnimationActive = true;
    
    // Disable physics during animation
    if (this.physics && this.rollerBody) {
      this.physics.setLinearVelocity(this.rollerMesh, { x: 0, y: 0, z: 0 });
      this.physics.setAngularVelocity(this.rollerMesh, { x: 0, y: 0, z: 0 });
    }
    
    // Store starting Y position for animation
    this.holeAnimationStartY = this.rollerMesh.position.y;
    this.holeAnimationTimer = 0;
    this.holeAnimationDuration = 1.0; // 1 second animation
    
    // Trigger hole animation started event
    this.triggerEvent('holeAnimationStarted', { position: this.rollerMesh.position.clone() });
  }
  
  // Update hole animation
  updateHoleAnimation(deltaTime) {
    if (!this.holeAnimationActive) return;
    
    this.holeAnimationTimer += deltaTime;
    
    // Calculate animation progress (0 to 1)
    const progress = Math.min(this.holeAnimationTimer / this.holeAnimationDuration, 1.0);
    
    // Animate Kirby falling into hole
    // Start with a small jump up, then fall down
    let yOffset;
    if (progress < 0.2) {
      // Initial small jump
      yOffset = Math.sin(progress * Math.PI * 2.5) * 0.3;
    } else {
      // Fall down and shrink
      yOffset = -(progress - 0.2) * 2;
      
      // Shrink the ball as it falls
      const scale = 1.0 - (progress - 0.2) * 1.25;
      this.rollerMesh.scale.set(scale, scale, scale);
    }
    
    // Update position
    this.rollerMesh.position.y = this.holeAnimationStartY + yOffset;
    
    // Spin the ball
    this.rollerMesh.rotation.y += deltaTime * 10;
    
    // Check if animation is complete
    if (progress >= 1.0) {
      this.holeAnimationActive = false;
      
      // Hide the ball
      this.rollerMesh.visible = false;
      
      // Trigger hole animation completed event
      this.triggerEvent('holeAnimationCompleted', {});
    }
  }
  
  // Get roller state
  getState() {
    return {
      position: this.rollerMesh ? this.rollerMesh.position.clone() : new THREE.Vector3(),
      velocity: this.physics && this.rollerBody ? 
                this.physics.getLinearVelocity(this.rollerMesh) : 
                this.rollerBody ? this.rollerBody.velocity.clone() : new THREE.Vector3(),
      isMoving: this.isMoving,
      shotState: this.shotState,
      activePowerUp: this.activePowerUp,
      powerUpTimer: this.powerUpTimer,
      energy: this.energy,
      shotPower: this.shotPower,
      airborne: this.airborne,
      spin: { ...this.spin }
    };
  }
}

export default RollerController;