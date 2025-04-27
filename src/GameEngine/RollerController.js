// Enhanced RollerController.js with Kirby's Dream Course-inspired mechanics
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
    
    // Shot state machine
    this.shotState = 'idle'; // 'idle', 'aiming', 'power', 'moving'
    this.shotGuideType = 'short'; // 'short' or 'long'
    
    // Movement properties
    this.shotPower = 0;
    this.maxShotPower = 10;
    this.direction = new THREE.Vector3(0, 0, 1);
    this.spin = new THREE.Vector2(0, 0); // x,y spin components
    this.isMoving = false;
    this.friction = 0.1;
    
    // Energy system (tomatoes)
    this.maxEnergy = 4;
    this.energy = this.maxEnergy;
    
    // Guide visuals
    this.guideArrow = null;
    this.guideLine = null;
    
    // Power meter
    this.powerMeter = {
      direction: 1, // 1 for up, -1 for down
      speed: 0.05,
      value: 0
    };
    
    // Trail effect
    this.trail = null;
    this.trailMaterial = null;
    this.trailLength = 20;
    this.trailPositions = [];
    
    // Power-up properties
    this.activePowerUp = null;
    this.powerUpTimer = 0;
    this.powerUpDuration = 0;
    
    // Create the roller
    this.createRoller();
    
    // Create trail effect
    this.createTrail();
    
    // Create guide visuals
    this.createGuideVisuals();
  }
  
  // Create the roller mesh and physics body
  createRoller() {
    // Create roller mesh
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: 0x00ff9f,
      emissive: 0x00662b,
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
    
    // Create physics body
    if (this.physics && this.physics.initialized) {
      this.rollerBody = this.physics.createDynamicBody(this.rollerMesh, {
        shape: 'ball',
        radius: this.radius,
        material: 'roller'
      });
    } else {
      // Fallback for when physics isn't initialized
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
    
    // Create trail material
    this.trailMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff9f,
      opacity: 0.7,
      transparent: true,
      linewidth: 1
    });
    
    // Create trail mesh
    this.trail = new THREE.Line(trailGeometry, this.trailMaterial);
    this.scene.add(this.trail);
  }
  
  // Create guide visuals for aiming
  createGuideVisuals() {
    // Create direction arrow
    const arrowGeometry = new THREE.ConeGeometry(0.2, 0.5, 8);
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.guideArrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    this.guideArrow.rotation.x = Math.PI / 2;
    this.guideArrow.visible = false;
    this.scene.add(this.guideArrow);
    
    // Create guide line for trajectory
    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 0.3,
      gapSize: 0.1,
      linewidth: 2
    });
    
    // Create short and long guide points
    const shortGuideLength = 5;
    const longGuideLength = 10;
    
    // Default to short guide
    const shortGuidePoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, shortGuideLength)
    ];
    
    lineGeometry.setFromPoints(shortGuidePoints);
    this.guideLine = new THREE.Line(lineGeometry, lineMaterial);
    this.guideLine.computeLineDistances(); // Required for dashed lines
    this.guideLine.visible = false;
    this.scene.add(this.guideLine);
  }
  
  // Start the aiming process
  startAiming() {
    if (this.isMoving || this.shotState !== 'idle') return false;
    if (this.energy <= 0) return false;
    
    this.shotState = 'aiming';
    
    // Show guide arrow
    this.guideArrow.visible = true;
    this.updateGuideArrow();
    
    return true;
  }
  
  // Update guide arrow position and rotation based on current position
  updateGuideArrow() {
    if (!this.guideArrow || !this.rollerMesh) return;
    
    // Set arrow position slightly in front of roller
    const position = this.rollerMesh.position.clone();
    const offset = this.direction.clone().multiplyScalar(this.radius * 1.5);
    position.add(offset);
    position.y += 0.3; // Raise slightly above ground
    
    this.guideArrow.position.copy(position);
    
    // Have arrow point in direction
    this.guideArrow.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      this.direction
    );
  }
  
  // Set direction based on user input (left/right/L/R)
  setDirection(directionInput) {
    if (this.shotState !== 'aiming') return;
    
    const currentAngle = Math.atan2(this.direction.x, this.direction.z);
    let newAngle = currentAngle;
    
    switch (directionInput) {
      case 'left':
        newAngle += 0.05; // Small increment
        break;
      case 'right':
        newAngle -= 0.05; // Small increment
        break;
      case 'L':
        newAngle += Math.PI / 4; // 45 degrees
        break;
      case 'R':
        newAngle -= Math.PI / 4; // 45 degrees
        break;
    }
    
    // Update direction vector
    this.direction.x = Math.sin(newAngle);
    this.direction.z = Math.cos(newAngle);
    this.direction.normalize();
    
    // Update arrow
    this.updateGuideArrow();
    
    return true;
  }
  
  // Open shot panel to select guide line
  openShotPanel() {
    if (this.shotState !== 'aiming') return false;
    
    this.shotState = 'shot_panel';
    
    // Show guide line
    this.guideLine.visible = true;
    this.updateGuideLine();
    
    return true;
  }
  
  // Toggle between short and long guide
  toggleGuideType() {
    if (this.shotState !== 'shot_panel') return false;
    
    this.shotGuideType = this.shotGuideType === 'short' ? 'long' : 'short';
    this.updateGuideLine();
    
    return true;
  }
  
  // Update guide line based on current position, direction and type
  updateGuideLine() {
    if (!this.guideLine || !this.rollerMesh) return;
    
    const position = this.rollerMesh.position.clone();
    position.y += 0.1; // Slightly above ground
    
    const guideLength = this.shotGuideType === 'short' ? 5 : 10;
    
    // Create guide points
    const guidePoints = [
      position.clone(),
      position.clone().add(this.direction.clone().multiplyScalar(guideLength))
    ];
    
    // If spin is applied, curve the line
    if (this.spin.length() > 0) {
      // Add intermediate points with curve
      const numPoints = 20;
      guidePoints.length = 0;
      guidePoints.push(position.clone());
      
      for (let i = 1; i <= numPoints; i++) {
        const t = i / numPoints;
        const dist = guideLength * t;
        const curveX = this.spin.x * t * t * 2;
        const curveZ = this.spin.y * t * t * 2;
        
        const point = position.clone().add(
          new THREE.Vector3(
            this.direction.x * dist + curveX,
            0.1,
            this.direction.z * dist + curveZ
          )
        );
        guidePoints.push(point);
      }
    }
    
    // Update the line geometry
    this.guideLine.geometry.dispose();
    this.guideLine.geometry = new THREE.BufferGeometry().setFromPoints(guidePoints);
    this.guideLine.computeLineDistances(); // Required for dashed lines
    
    // Set line position
    this.guideLine.position.set(0, 0, 0);
  }
  
  // Start the power meter
  startPowerMeter() {
    if (this.shotState !== 'shot_panel') return false;
    
    this.shotState = 'power';
    this.powerMeter.value = 0;
    this.powerMeter.direction = 1;
    
    return true;
  }
  
  // Update power meter (called every frame while in power state)
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
  }
  
  // Get current power percentage (0-100)
  getPowerPercent() {
    return this.powerMeter.value * 100;
  }
  
  // Apply spin to the shot
  applySpin(spinX, spinY) {
    if (this.shotState !== 'power' && this.shotState !== 'shot_panel') return false;
    
    this.spin.x = spinX;
    this.spin.y = spinY;
    
    // Update guide line to show spin effect
    this.updateGuideLine();
    
    return true;
  }
  
  // Set shot power directly (when power meter is locked in)
  setPower(powerPercent) {
    if (this.shotState !== 'power') return false;
    
    this.shotPower = (powerPercent / 100) * this.maxShotPower;
    return true;
  }
  
  // Release shot with current power, direction and spin
  releaseShot() {
    if (this.shotState !== 'power' || this.isMoving) return false;
    
    // Calculate impulse from power and direction
    const impulse = this.direction.clone().multiplyScalar(this.shotPower);
    
    // Apply spin adjustments
    impulse.x += this.spin.x * 2;
    impulse.z += this.spin.y * 2;
    
    // Apply impulse to roller
    if (this.physics && this.rollerBody) {
      this.physics.applyImpulse(this.rollerMesh, {
        x: impulse.x,
        y: 0,
        z: impulse.z
      });
    } else {
      // Fallback
      this.rollerBody.applyImpulse(impulse);
    }
    
    // Calculate appropriate angular velocity (perpendicular to movement direction)
    const axis = new THREE.Vector3(-this.direction.z, 0, this.direction.x);
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
    
    // Hide guides
    this.guideArrow.visible = false;
    this.guideLine.visible = false;
    
    // Update state
    this.shotState = 'moving';
    this.isMoving = true;
    
    return true;
  }
  
  // Use one energy (tomato)
  useEnergy() {
    this.energy = Math.max(0, this.energy - 1);
    return this.energy;
  }
  
  // Replenish energy (e.g., when collecting power-ups)
  replenishEnergy(amount = 1) {
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
    return this.energy;
  }
  
  // Add mid-flight bounce
  addBounce() {
    if (!this.isMoving) return false;
    
    // Apply upward impulse
    const bounceStrength = 2.0 * (1 + this.shotPower / 10);
    
    if (this.physics && this.rollerBody) {
      this.physics.applyImpulse(this.rollerMesh, {
        x: 0,
        y: bounceStrength,
        z: 0
      });
    } else {
      // Fallback
      const bounceImpulse = new THREE.Vector3(0, bounceStrength, 0);
      this.rollerBody.applyImpulse(bounceImpulse);
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
    this.shotPower = 0;
    this.spin.set(0, 0);
    
    // Reset power-ups
    this.deactivatePowerUp();
    
    // Reset trail
    this.resetTrail();
    
    // Hide guides
    if (this.guideArrow) this.guideArrow.visible = false;
    if (this.guideLine) this.guideLine.visible = false;
    
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
  
  // Activate a power-up
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
        // Increase friction coefficient
        this.friction = 0.8;
        
        // Set trail effect to sticky mode
        this.trailMaterial.color.set(0x00ff00);
        
        // Set duration
        this.powerUpDuration = 5; // 5 seconds
        break;
        
      case 'bouncy':
        // Set bouncy effect flag (applied during collisions)
        this.rollerMesh.userData.bouncy = true;
        
        // Set trail effect
        this.trailMaterial.color.set(0x0066ff);
        
        // Set duration (lasts for one hole)
        this.powerUpDuration = Infinity; // Until reset
        break;
        
      case 'gravityFlip':
        // Flip gravity direction
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
    this.trailMaterial.color.set(0x00ff9f);
    this.trailMaterial.opacity = 0.7;
    
    this.activePowerUp = null;
    this.powerUpTimer = 0;
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
        
        // Replenish energy when collecting a power-up
        this.replenishEnergy(1);
        
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
    
    return distance < holeRadius && speed < speedThreshold;
  }
  // Add these methods to the RollerController class in src/GameEngine/RollerController.js

  /**
   * Get the current charge percentage (0-100)
   * @returns {number} Charge percentage
   */
  getChargePercent() {
    if (this.maxShotPower <= 0) return 0;
    return (this.shotPower / this.maxShotPower) * 100;
  }

  /**
   * Start charging the shot
   * @returns {boolean} Whether charging started successfully
   */
  startCharging() {
    if (this.isMoving) return false;
    
    // Set shot state
    this.shotState = 'aiming';
    this.shotPower = 0;
    
    // Show guide visuals
    if (this.guideArrow) {
      this.guideArrow.visible = true;
      this.updateGuideArrow();
    }
    
    console.log("Shot charging started");
    return true;
  }

  // Update physics and visuals
  update(deltaTime) {
    // Skip if not created yet
    if (!this.rollerMesh) return;
    
    // Update shot state machine
    switch (this.shotState) {
      case 'power':
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
        } else {
          linearSpeed = this.rollerBody.velocity.length();
          angularSpeed = this.rollerBody.angularVelocity.length();
        }
        
        if (linearSpeed < 0.05 && angularSpeed < 0.05) {
          if (this.physics && this.rollerBody) {
            this.physics.setLinearVelocity(this.rollerMesh, { x: 0, y: 0, z: 0 });
            this.physics.setAngularVelocity(this.rollerMesh, { x: 0, y: 0, z: 0 });
          } else {
            this.rollerBody.velocity.set(0, 0, 0);
            this.rollerBody.angularVelocity.set(0, 0, 0);
          }
          
          this.isMoving = false;
          this.shotState = 'idle';
        }
        
        // Update trail
        this.updateTrail();
        break;
    }
    
    // Update guide visuals if in aiming or shot panel states
    if (this.shotState === 'aiming') {
      this.updateGuideArrow();
    } else if (this.shotState === 'shot_panel') {
      this.updateGuideLine();
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
      shotPower: this.shotPower
    };
  }
}

export default RollerController;