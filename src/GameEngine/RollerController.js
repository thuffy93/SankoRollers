import * as THREE from 'three';
import { RigidBody, vec3 } from '@react-three/rapier';

class RollerController {
  constructor(scene, world, position = { x: 0, y: 1, z: 0 }) {
    this.scene = scene;
    this.world = world;
    this.initialPosition = { ...position };
    
    // Roller properties
    this.rollerMesh = null;
    this.rollerBody = null;
    this.radius = 0.5;
    this.mass = 1;
    
    // Movement properties
    this.shotPower = 0;
    this.maxShotPower = 10;
    this.direction = new THREE.Vector3(0, 0, 1);
    this.isCharging = false;
    this.isMoving = false;
    this.friction = 0.1;
    
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
    
    // Create physics body (Rapier integration would happen here)
    // For now, we'll simulate physics with basic properties
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
  
  // Create trail effect
  createTrail() {
    // Initialize trail positions array
    for (let i = 0; i < this.trailLength; i++) {
      this.trailPositions.push(
        this.initialPosition.x,
        this.initialPosition.y - this.radius * 0.9, // Slightly below roller center
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
  
  // Start charging a shot
  startCharging() {
    if (this.isMoving) return false;
    
    this.isCharging = true;
    this.shotPower = 0;
    return true;
  }
  
  // Continue charging shot (called every frame while charging)
  updateCharge(deltaTime) {
    if (!this.isCharging) return;
    
    // Increase shot power based on time
    const chargeRate = 2; // Power units per second
    this.shotPower = Math.min(this.shotPower + chargeRate * deltaTime, this.maxShotPower);
    
    // Update visual indicator (e.g. expanding circle or power bar)
    // This would be handled by UI component
  }
  
  // Get current charge percent (0-100)
  getChargePercent() {
    return (this.shotPower / this.maxShotPower) * 100;
  }
  
  // Set shot direction based on camera and input
  setDirection(direction) {
    this.direction.copy(direction);
    this.direction.normalize();
  }
  
  // Release shot with current power and direction
  releaseShot() {
    if (!this.isCharging || this.isMoving) return false;
    
    // Calculate impulse from power and direction
    const impulse = this.direction.clone().multiplyScalar(this.shotPower);
    
    // Apply impulse to roller
    this.rollerBody.applyImpulse(impulse);
    
    // Calculate appropriate angular velocity (perpendicular to movement direction)
    const axis = new THREE.Vector3(-this.direction.z, 0, this.direction.x);
    const angularImpulse = axis.multiplyScalar(this.shotPower * 2);
    this.rollerBody.applyTorque(angularImpulse);
    
    this.isCharging = false;
    this.isMoving = true;
    
    return true;
  }
  
  // Reset roller to starting position
  reset() {
    // Reset position
    this.rollerBody.position.set(
      this.initialPosition.x,
      this.initialPosition.y,
      this.initialPosition.z
    );
    
    // Reset velocity
    this.rollerBody.velocity.set(0, 0, 0);
    this.rollerBody.angularVelocity.set(0, 0, 0);
    
    // Reset state
    this.isCharging = false;
    this.isMoving = false;
    this.shotPower = 0;
    
    // Reset power-ups
    this.deactivatePowerUp();
    
    // Reset trail
    this.resetTrail();
  }
  
  // Reset trail to current position
  resetTrail() {
    const positions = this.trail.geometry.attributes.position.array;
    
    for (let i = 0; i < this.trailLength; i++) {
      const idx = i * 3;
      positions[idx] = this.rollerBody.position.x;
      positions[idx + 1] = this.rollerBody.position.y - this.radius * 0.9;
      positions[idx + 2] = this.rollerBody.position.z;
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
        const dashDirection = this.rollerBody.velocity.clone().normalize();
        const dashImpulse = dashDirection.multiplyScalar(15);
        this.rollerBody.applyImpulse(dashImpulse);
        
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
        // Flip gravity direction (would be implemented in physics system)
        // For now, simulate with an upward impulse
        const flipImpulse = new THREE.Vector3(0, 10, 0);
        this.rollerBody.applyImpulse(flipImpulse);
        
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
        // Reset gravity (would be implemented in physics system)
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
      const distance = this.rollerBody.position.distanceTo(powerUp.mesh.position);
      
      if (distance < this.radius + 0.3) { // Roller radius + power-up radius
        // Mark as collected
        powerUp.collected = true;
        powerUp.mesh.visible = false;
        
        return powerUp.type;
      }
    }
    
    return null;
  }
  
  // Check if roller is in hole
  checkHoleCollision(holePosition) {
    if (!holePosition || !this.rollerBody) return false;
    
    // Calculate distance to hole
    const distance = Math.sqrt(
      Math.pow(this.rollerBody.position.x - holePosition.x, 2) +
      Math.pow(this.rollerBody.position.z - holePosition.z, 2)
    );
    
    // Check if distance is less than hole radius and roller is slow enough
    const holeRadius = 0.7;
    const speedThreshold = 2;
    const speed = this.rollerBody.velocity.length();
    
    return distance < holeRadius && speed < speedThreshold;
  }
  
  // Update physics and visuals
  update(deltaTime) {
    // Skip if not created yet
    if (!this.rollerMesh || !this.rollerBody) return;
    
    // Update charging if active
    if (this.isCharging) {
      this.updateCharge(deltaTime);
    }
    
    // Update roller physics
    if (this.isMoving) {
      // Apply friction to slow down roller
      const frictionForce = this.rollerBody.velocity.clone().normalize().multiplyScalar(-this.friction);
      this.rollerBody.velocity.add(frictionForce);
      
      // Apply angular friction
      const angularFriction = this.rollerBody.angularVelocity.clone().normalize().multiplyScalar(-this.friction * 0.5);
      this.rollerBody.angularVelocity.add(angularFriction);
      
      // Apply gravity if roller is above ground
      if (this.rollerBody.position.y > this.radius) {
        this.rollerBody.velocity.y -= 9.8 * deltaTime; // Gravity
      } else {
        // Keep roller on ground
        this.rollerBody.position.y = this.radius;
        
        // Bounce if hitting ground with velocity
        if (this.rollerBody.velocity.y < 0) {
          this.rollerBody.velocity.y = -this.rollerBody.velocity.y * 0.3; // Bounce with 30% energy
          
          // If bouncy power-up is active, bounce with more energy
          if (this.rollerMesh.userData.bouncy) {
            this.rollerBody.velocity.y *= 2;
          }
        }
      }
      
      // Simple wall collision detection (basic implementation)
      const courseSize = 15; // Half the course size
      
      // X bounds
      if (Math.abs(this.rollerBody.position.x) > courseSize) {
        this.rollerBody.position.x = Math.sign(this.rollerBody.position.x) * courseSize;
        this.rollerBody.velocity.x *= -0.7; // Bounce with 70% energy loss
        
        // Additional bounce for bouncy power-up
        if (this.rollerMesh.userData.bouncy) {
          this.rollerBody.velocity.x *= 1.5;
        }
      }
      
      // Z bounds
      if (Math.abs(this.rollerBody.position.z) > courseSize) {
        this.rollerBody.position.z = Math.sign(this.rollerBody.position.z) * courseSize;
        this.rollerBody.velocity.z *= -0.7; // Bounce with 70% energy loss
        
        // Additional bounce for bouncy power-up
        if (this.rollerMesh.userData.bouncy) {
          this.rollerBody.velocity.z *= 1.5;
        }
      }
      
      // Update position
      this.rollerBody.position.add(this.rollerBody.velocity.clone().multiplyScalar(deltaTime));
      
      // Update rotation based on velocity and angular velocity
      const rotationAxis = new THREE.Vector3(-this.rollerBody.velocity.z, 0, this.rollerBody.velocity.x).normalize();
      const rotationAmount = this.rollerBody.velocity.length() * deltaTime / this.radius;
      
      if (rotationAmount > 0) {
        const quaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxis, rotationAmount);
        this.rollerMesh.quaternion.premultiply(quaternion);
      }
      
      // Apply custom rotation from angular velocity
      const angularRotation = this.rollerBody.angularVelocity.clone().multiplyScalar(deltaTime);
      const angularQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(angularRotation.x, angularRotation.y, angularRotation.z)
      );
      this.rollerMesh.quaternion.premultiply(angularQuaternion);
      
      // Check if roller has stopped
      const linearSpeed = this.rollerBody.velocity.length();
      const angularSpeed = this.rollerBody.angularVelocity.length();
      
      if (linearSpeed < 0.05 && angularSpeed < 0.05) {
        this.rollerBody.velocity.set(0, 0, 0);
        this.rollerBody.angularVelocity.set(0, 0, 0);
        this.isMoving = false;
      }
      
      // Update trail
      this.updateTrail();
    }
    
    // Update roller mesh position to match physics body
    this.rollerMesh.position.copy(this.rollerBody.position);
    
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
    positions[0] = this.rollerBody.position.x;
    positions[1] = this.rollerBody.position.y - this.radius * 0.9;
    positions[2] = this.rollerBody.position.z;
    
    // Update the geometry
    this.trail.geometry.attributes.position.needsUpdate = true;
  }
  
  // Get roller state
  getState() {
    return {
      position: this.rollerBody.position.clone(),
      velocity: this.rollerBody.velocity.clone(),
      isMoving: this.isMoving,
      isCharging: this.isCharging,
      activePowerUp: this.activePowerUp,
      powerUpTimer: this.powerUpTimer
    };
  }
}

export default RollerController;