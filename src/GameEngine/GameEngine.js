// src/GameEngine/GameEngine.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import CourseGenerator from './CourseGenerator';
import RollerController from './RollerController';
import MoebiusShader from './Shaders/MoebiusShader';
import PhysicsSystem from './PhysicsSystem';

class GameEngine {
  constructor(canvasRef) {
    // DOM element reference
    this.canvasRef = canvasRef;
    
    // Core Three.js components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.clock = null;
    
    // Game components
    this.physics = null;
    this.courseGenerator = null;
    this.rollerController = null;
    
    // Visual effects
    this.moebiusShader = null;
    this.visualStyle = 'moebius'; // Options: 'standard', 'moebius'
    
    // Game state
    this.gameState = {
      currentHole: 1,
      totalHoles: 9,
      strokes: 0,
      holeStrokes: 0,
      courseSeed: Date.now(),
      dailyModifier: null,
      holeCompleted: false,
      gameCompleted: false
    };
    
    // Input state
    this.inputState = {
      isAiming: false,
      aimDirection: new THREE.Vector3(0, 0, 1),
      mousePosition: { x: 0, y: 0 }
    };
    
    // Event listeners
    this.eventListeners = {};
    
    // Initialize the game engine
    this.init();
  }
  
  // Initialize the game engine
  async init() {
    // Skip if canvas is not available
    if (!this.canvasRef) {
      console.error('Canvas reference not available');
      return;
    }
    
    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    
    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 10, 15);
    this.camera.lookAt(0, 0, 0);
    
    // Initialize orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent camera from going below ground
    this.controls.minDistance = 5;
    this.controls.maxDistance = 30;
    
    // Initialize clock for delta time
    this.clock = new THREE.Clock();
    
    // Set up lighting
    this.setupLights();
    
    // Initialize physics
    this.physics = new PhysicsSystem();
    await this.physics.waitForInit();
    
    // Set up physics event handlers
    this.setupPhysicsEvents();
    
    // Initialize course generator with physics
    this.courseGenerator = new CourseGenerator(this.scene, this.physics);
    
    // Initialize roller controller with physics
    this.rollerController = new RollerController(this.scene, this.physics);
    
    // Set up visual style with Moebius shader
    this.setupVisualStyle();
    
    // Generate daily modifier using pseudorandom hash
    this.gameState.dailyModifier = this.getDailyModifier();
    
    // Generate first course
    this.generateCourse();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Start animation loop
    this.animate();
    
    // Handle window resize
    window.addEventListener('resize', this.handleWindowResize.bind(this));
  }
  
  // Set up physics event handlers
  setupPhysicsEvents() {
    if (!this.physics) return;
    
    // Collision handler
    this.physics.on('collision', (object1, object2) => {
      // Check if one of the objects is the roller
      if (object1 === this.rollerController.rollerMesh) {
        // Handle roller collision with obstacle
        this.handleRollerCollision(object2);
      } else if (object2 === this.rollerController.rollerMesh) {
        // Handle roller collision with obstacle
        this.handleRollerCollision(object1);
      }
    });
    
    // Sensor enter handler (for power-ups and hole)
    this.physics.on('sensorEnter', (sensor, object) => {
      // Check if object is the roller
      if (object === this.rollerController.rollerMesh) {
        // Check if sensor is a power-up
        const powerUp = this.courseGenerator.powerUps.find(
          p => p.mesh === sensor && !p.collected
        );
        
        if (powerUp) {
          // Mark power-up as collected
          powerUp.collected = true;
          powerUp.mesh.visible = false;
          
          // Trigger power-up collected event
          this.triggerEvent('powerUpCollected', { type: powerUp.type });
        }
        
        // Check if sensor is the hole
        if (sensor.geometry && sensor.geometry.type === 'CircleGeometry') {
          // Check if ball is slow enough
          const velocity = this.physics.getLinearVelocity(this.rollerController.rollerMesh);
          const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
          
          if (speed < 2) {
            // Mark hole as completed
            this.gameState.holeCompleted = true;
            
            // Trigger hole completed event
            this.triggerEvent('holeCompleted', {
              holeStrokes: this.gameState.holeStrokes,
              totalStrokes: this.gameState.strokes,
              currentHole: this.gameState.currentHole,
              totalHoles: this.gameState.totalHoles
            });
            
            // Auto-advance to next hole after delay
            setTimeout(() => {
              if (this.gameState.holeCompleted) {
                this.nextHole();
              }
            }, 3000);
          }
        }
      }
    });
  }
  
  // Handle roller collision with an obstacle
  handleRollerCollision(obstacle) {
    // Check if obstacle is a moving platform
    if (obstacle.userData && obstacle.userData.isMoving) {
      // Apply gentle force in the direction of platform movement
      const axis = obstacle.userData.movementAxis || 'x';
      const direction = obstacle.userData.direction || 1;
      const force = {};
      
      force.x = axis === 'x' ? direction * 2 : 0;
      force.y = axis === 'y' ? direction * 2 : 0;
      force.z = axis === 'z' ? direction * 2 : 0;
      
      this.physics.applyForce(this.rollerController.rollerMesh, force);
    }
    
    // Play collision sound (would be implemented here)
  }
  
  // Set up visual style (Moebius shader)
  setupVisualStyle() {
    if (this.visualStyle === 'moebius') {
      // Create Moebius shader
      this.moebiusShader = new MoebiusShader(this.renderer, this.scene, this.camera, {
        outlineThickness: 1.2,
        outlineColor: new THREE.Color(0x000000),
        crossHatchingEnabled: true,
        crossHatchingIntensity: 0.3,
        wiggleEnabled: true,
        wiggleIntensity: 0.004,
        wiggleSpeed: 0.2,
        grainEnabled: true,
        grainIntensity: 0.05,
        colorAdjustment: true,
        saturation: 1.2,
        contrast: 1.15
      });
    }
  }
  
  // Toggle visual style
  toggleVisualStyle() {
    if (this.visualStyle === 'standard') {
      this.visualStyle = 'moebius';
      this.setupVisualStyle();
    } else {
      this.visualStyle = 'standard';
      if (this.moebiusShader) {
        this.moebiusShader.dispose();
        this.moebiusShader = null;
      }
    }
  } new CourseGenerator(this.scene);
    
    // Initialize roller controller
    this.rollerController = new RollerController(this.scene);
    
    // Generate daily modifier using pseudorandom hash
    this.gameState.dailyModifier = this.getDailyModifier();
    
    // Generate first course
    this.generateCourse();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Start animation loop
    this.animate();
    
    // Handle window resize
    window.addEventListener('resize', this.handleWindowResize.bind(this));
  }
  
  // Set up lighting
  setupLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 200, 100);
    directionalLight.castShadow = true;
    
    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    const d = 50;
    directionalLight.shadow.camera.left = -d;
    directionalLight.shadow.camera.right = d;
    directionalLight.shadow.camera.top = d;
    directionalLight.shadow.camera.bottom = -d;
    directionalLight.shadow.camera.far = 3500;
    directionalLight.shadow.bias = -0.0001;
    
    this.scene.add(directionalLight);
    
    // Add a hemisphere light for more natural environmental lighting
    const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.3);
    this.scene.add(hemisphereLight);
  }
  
  // Set up event listeners
  setupEventListeners() {
    // Mouse events for aiming
    this.canvasRef.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvasRef.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvasRef.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Touch events for mobile
    this.canvasRef.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvasRef.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvasRef.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Keyboard events
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }
  
  // Handle window resize
  handleWindowResize() {
    if (!this.camera || !this.renderer) return;
    
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Resize Moebius shader if active
    if (this.moebiusShader) {
      this.moebiusShader.resize();
    }
  }
  
  // Handle mouse down event
  handleMouseDown(event) {
    // Only handle left mouse button
    if (event.button !== 0) return;
    
    // Skip if roller is moving
    if (this.rollerController.isMoving) return;
    
    // Start aiming
    this.inputState.isAiming = true;
    this.inputState.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.inputState.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Start charging shot
    this.rollerController.startCharging();
    
    // Disable orbit controls while aiming
    this.controls.enabled = false;
    
    // Create aim line if not exists
    this.createAimLine();
  }
  
  // Handle mouse move event
  handleMouseMove(event) {
    // Update mouse position
    this.inputState.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.inputState.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update aim direction if aiming
    if (this.inputState.isAiming) {
      this.updateAimDirection();
    }
  }
  
  // Handle mouse up event
  handleMouseUp(event) {
    // Skip if not aiming
    if (!this.inputState.isAiming) return;
    
    // Release shot
    if (this.rollerController.releaseShot()) {
      // Increment stroke count if shot was released
      this.gameState.strokes++;
      this.gameState.holeStrokes++;
      
      // Trigger stroke event
      this.triggerEvent('stroke', {
        holeStrokes: this.gameState.holeStrokes,
        totalStrokes: this.gameState.strokes
      });
    }
    
    // End aiming
    this.inputState.isAiming = false;
    
    // Re-enable orbit controls
    this.controls.enabled = true;
    
    // Remove aim line
    this.removeAimLine();
  }
  
  // Handle touch start event
  handleTouchStart(event) {
    event.preventDefault();
    
    // Skip if roller is moving
    if (this.rollerController.isMoving) return;
    
    // Get touch position
    const touch = event.touches[0];
    
    // Start aiming
    this.inputState.isAiming = true;
    this.inputState.mousePosition.x = (touch.clientX / window.innerWidth) * 2 - 1;
    this.inputState.mousePosition.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    
    // Start charging shot
    this.rollerController.startCharging();
    
    // Disable orbit controls while aiming
    this.controls.enabled = false;
    
    // Create aim line if not exists
    this.createAimLine();
  }
  
  // Handle touch move event
  handleTouchMove(event) {
    event.preventDefault();
    
    // Get touch position
    const touch = event.touches[0];
    
    // Update touch position
    this.inputState.mousePosition.x = (touch.clientX / window.innerWidth) * 2 - 1;
    this.inputState.mousePosition.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    
    // Update aim direction if aiming
    if (this.inputState.isAiming) {
      this.updateAimDirection();
    }
  }
  
  // Handle touch end event
  handleTouchEnd(event) {
    event.preventDefault();
    
    // Skip if not aiming
    if (!this.inputState.isAiming) return;
    
    // Release shot
    if (this.rollerController.releaseShot()) {
      // Increment stroke count if shot was released
      this.gameState.strokes++;
      this.gameState.holeStrokes++;
      
      // Trigger stroke event
      this.triggerEvent('stroke', {
        holeStrokes: this.gameState.holeStrokes,
        totalStrokes: this.gameState.strokes
      });
    }
    
    // End aiming
    this.inputState.isAiming = false;
    
    // Re-enable orbit controls
    this.controls.enabled = true;
    
    // Remove aim line
    this.removeAimLine();
  }
  
  // Handle key down event
  handleKeyDown(event) {
    switch (event.key) {
      case ' ': // Space - Start charging
        if (!this.rollerController.isMoving && !this.inputState.isAiming) {
          this.inputState.isAiming = true;
          this.rollerController.startCharging();
          this.controls.enabled = false;
          this.createAimLine();
        }
        break;
        
      case 'e': // E - Activate power-up
        if (this.rollerController.activePowerUp) {
          this.rollerController.activatePowerUp(this.rollerController.activePowerUp);
        }
        break;
        
      case 'r': // R - Reset ball position
        if (!this.gameState.holeCompleted) {
          this.rollerController.reset();
          this.gameState.holeStrokes++; // Penalty stroke
          
          // Trigger reset event
          this.triggerEvent('reset', {
            holeStrokes: this.gameState.holeStrokes,
            totalStrokes: this.gameState.strokes
          });
        }
        break;
        
      case 'v': // V - Toggle visual style
        this.toggleVisualStyle();
        break;
        
      case 'n': // N - Next hole (for testing)
        if (this.gameState.holeCompleted) {
          this.nextHole();
        }
        break;
    }
  }
  
  // Handle key up event
  handleKeyUp(event) {
    switch (event.key) {
      case ' ': // Space - Release shot
        if (this.inputState.isAiming) {
          // Release shot
          if (this.rollerController.releaseShot()) {
            // Increment stroke count if shot was released
            this.gameState.strokes++;
            this.gameState.holeStrokes++;
            
            // Trigger stroke event
            this.triggerEvent('stroke', {
              holeStrokes: this.gameState.holeStrokes,
              totalStrokes: this.gameState.strokes
            });
          }
          
          // End aiming
          this.inputState.isAiming = false;
          
          // Re-enable orbit controls
          this.controls.enabled = true;
          
          // Remove aim line
          this.removeAimLine();
        }
        break;
    }
  }
  
  // Create aim line for visualizing shot direction
  createAimLine() {
    // Remove existing aim line
    this.removeAimLine();
    
    // Get roller position
    const rollerPosition = this.rollerController.getState().position;
    
    // Create line geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
      rollerPosition.x, rollerPosition.y, rollerPosition.z,
      rollerPosition.x, rollerPosition.y, rollerPosition.z
    ]);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    
    // Create line material
    const material = new THREE.LineBasicMaterial({
      color: 0xff0000,
      linewidth: 3
    });
    
    // Create line mesh
    this.aimLine = new THREE.Line(geometry, material);
    this.scene.add(this.aimLine);
    
    // Update aim direction immediately
    this.updateAimDirection();
  }
  
  // Remove aim line
  removeAimLine() {
    if (this.aimLine) {
      this.scene.remove(this.aimLine);
      this.aimLine.geometry.dispose();
      this.aimLine.material.dispose();
      this.aimLine = null;
    }
  }
  
  // Update aim direction based on mouse position
  updateAimDirection() {
    if (!this.aimLine) return;
    
    // Create raycaster from camera and mouse position
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(this.inputState.mousePosition, this.camera);
    
    // Create plane at roller height for intersection
    const rollerPosition = this.rollerController.getState().position;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -rollerPosition.y);
    
    // Calculate intersection point
    const intersectionPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectionPoint);
    
    // Calculate direction from roller to intersection
    const direction = new THREE.Vector3()
      .subVectors(rollerPosition, intersectionPoint)
      .normalize();
    
    // Update aim direction
    this.inputState.aimDirection.copy(direction);
    
    // Set direction in roller controller
    this.rollerController.setDirection(direction);
    
    // Update aim line visualization
    const positions = this.aimLine.geometry.attributes.position.array;
    
    // Set start point at roller position
    positions[0] = rollerPosition.x;
    positions[1] = rollerPosition.y;
    positions[2] = rollerPosition.z;
    
    // Calculate power scale for line length
    const powerPercent = this.rollerController.getChargePercent() / 100;
    const lineLength = 2 + powerPercent * 8; // Line length based on power
    
    // Set end point
    positions[3] = rollerPosition.x + direction.x * lineLength;
    positions[4] = rollerPosition.y + direction.y * lineLength;
    positions[5] = rollerPosition.z + direction.z * lineLength;
    
    // Update line geometry
    this.aimLine.geometry.attributes.position.needsUpdate = true;
  }
  
  // Generate a course
  generateCourse() {
    // Determine difficulty based on current hole
    const difficulty = Math.min(1 + (this.gameState.currentHole - 1) * 0.2, 5);
    
    // Apply physics modifiers based on daily modifier
    if (this.physics && this.gameState.dailyModifier) {
      switch (this.gameState.dailyModifier) {
        case 'zeroG':
          // Lower gravity for zero-G effect
          this.physics.setGravity({ x: 0, y: -2, z: 0 }, 0.2); // 20% of normal gravity
          break;
          
        case 'bouncy':
          // Increase bounciness of all materials
          this.physics.setMaterial('default', { friction: 0.5, restitution: 0.8 });
          this.physics.setMaterial('roller', { friction: 0.1, restitution: 1.2 });
          this.physics.setMaterial('wall', { friction: 0.8, restitution: 0.9 });
          this.physics.setMaterial('obstacle', { friction: 0.7, restitution: 1.0 });
          break;
          
        case 'windyCourse':
          // Add constant sideways force (simulating wind)
          this.physics.on('collision', (obj1, obj2) => {
            if (obj1 === this.rollerController.rollerMesh || obj2 === this.rollerController.rollerMesh) {
              this.physics.applyForce(this.rollerController.rollerMesh, { 
                x: Math.sin(Date.now() * 0.001) * 2, 
                y: 0, 
                z: Math.cos(Date.now() * 0.001) * 2 
              });
            }
          });
          break;
          
        default:
          // Reset to normal physics
          this.physics.setGravity({ x: 0, y: -9.81, z: 0 }, 1);
          this.physics.setMaterial('default', { friction: 0.5, restitution: 0.3 });
          this.physics.setMaterial('roller', { friction: 0.1, restitution: 0.6 });
          this.physics.setMaterial('wall', { friction: 0.8, restitution: 0.2 });
          this.physics.setMaterial('obstacle', { friction: 0.7, restitution: 0.4 });
          break;
      }
    }
    
    // Generate course with current seed and difficulty
    const courseData = this.courseGenerator.generateCourse(
      this.gameState.courseSeed + this.gameState.currentHole,
      difficulty,
      this.gameState.dailyModifier
    );
    
    // Reset roller to starting position
    this.rollerController.reset();
    
    // Reset hole state
    this.gameState.holeStrokes = 0;
    this.gameState.holeCompleted = false;
    
    // Update camera to focus on roller
    this.updateCameraFocus();
    
    // Trigger course generated event
    this.triggerEvent('courseGenerated', {
      currentHole: this.gameState.currentHole,
      totalHoles: this.gameState.totalHoles,
      difficulty,
      dailyModifier: this.gameState.dailyModifier
    });
  }
  
  // Move to next hole
  nextHole() {
    // Advance to next hole
    this.gameState.currentHole++;
    
    if (this.gameState.currentHole > this.gameState.totalHoles) {
      // Game completed
      this.gameState.gameCompleted = true;
      
      // Trigger game completed event
      this.triggerEvent('gameCompleted', {
        totalStrokes: this.gameState.strokes,
        totalHoles: this.gameState.totalHoles
      });
      
      return;
    }
    
    // Generate new course for next hole
    this.generateCourse();
  }
  
  // Update camera focus on the roller
  updateCameraFocus() {
    if (!this.rollerController) return;
    
    const rollerPosition = this.rollerController.getState().position;
    
    // Set orbit controls target to roller position
    this.controls.target.copy(rollerPosition);
    
    // Adjust camera position to maintain relative position to roller
    const cameraOffset = new THREE.Vector3(0, 10, 15);
    this.camera.position.copy(rollerPosition).add(cameraOffset);
    
    // Update controls
    this.controls.update();
  }
  
  // Get daily modifier from date hash
  getDailyModifier() {
    // Get current date in YYYY-MM-DD format
    const now = new Date();
    const dateString = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    
    // Create simple hash from date string
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
      hash = ((hash << 5) - hash) + dateString.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // List of possible modifiers
    const modifiers = [
      'zeroG',
      'bouncy',
      'foggy',
      'nightMode',
      'windyCourse',
      'mirrorMode'
    ];
    
    // Select modifier based on hash
    const index = Math.abs(hash) % modifiers.length;
    return modifiers[index];
  }
  
  // Animation loop
  animate() {
    requestAnimationFrame(this.animate.bind(this));
    
    // Get delta time
    const deltaTime = this.clock.getDelta();
    
    // Update course elements
    if (this.courseGenerator) {
      this.courseGenerator.update(deltaTime);
    }
    
    // Update roller physics
    if (this.rollerController) {
      this.rollerController.update(deltaTime);
      
      // Check for power-up collision
      if (this.courseGenerator && this.courseGenerator.powerUps) {
        const powerUpType = this.rollerController.checkPowerUpCollision(this.courseGenerator.powerUps);
        
        if (powerUpType) {
          // Trigger power-up collected event
          this.triggerEvent('powerUpCollected', { type: powerUpType });
        }
      }
      
      // Check for hole collision
      if (this.courseGenerator && 
          this.courseGenerator.holePosition && 
          !this.gameState.holeCompleted &&
          this.rollerController.checkHoleCollision(this.courseGenerator.holePosition)) {
        
        // Mark hole as completed
        this.gameState.holeCompleted = true;
        
        // Trigger hole completed event
        this.triggerEvent('holeCompleted', {
          holeStrokes: this.gameState.holeStrokes,
          totalStrokes: this.gameState.strokes,
          currentHole: this.gameState.currentHole,
          totalHoles: this.gameState.totalHoles
        });
        
        // Auto-advance to next hole after delay
        setTimeout(() => {
          if (this.gameState.holeCompleted) {
            this.nextHole();
          }
        }, 3000);
      }
    }
    
    // Update aim line if aiming
    if (this.inputState.isAiming && this.aimLine) {
      this.updateAimDirection();
    }
    
    // Update orbit controls
    if (this.controls) {
      this.controls.update();
    }
    
    // Update Moebius shader if active
    if (this.moebiusShader) {
      this.moebiusShader.update(deltaTime);
      this.moebiusShader.render();
    } else {
      // Standard rendering
      this.renderer.render(this.scene, this.camera);
    }
  }
  
  // Register event listener
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    
    this.eventListeners[event].push(callback);
    return this;
  }
  
  // Remove event listener
  off(event, callback) {
    if (!this.eventListeners[event]) return this;
    
    this.eventListeners[event] = this.eventListeners[event].filter(
      listener => listener !== callback
    );
    
    return this;
  }
  
  // Trigger event
  triggerEvent(event, data) {
    if (!this.eventListeners[event]) return;
    
    this.eventListeners[event].forEach(callback => {
      callback(data);
    });
  }
  
  // Cleanup resources
  dispose() {
    // Remove event listeners
    this.canvasRef.removeEventListener('mousedown', this.handleMouseDown);
    this.canvasRef.removeEventListener('mousemove', this.handleMouseMove);
    this.canvasRef.removeEventListener('mouseup', this.handleMouseUp);
    this.canvasRef.removeEventListener('touchstart', this.handleTouchStart);
    this.canvasRef.removeEventListener('touchmove', this.handleTouchMove);
    this.canvasRef.removeEventListener('touchend', this.handleTouchEnd);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleWindowResize);
    
    // Dispose Moebius shader
    if (this.moebiusShader) {
      this.moebiusShader.dispose();
      this.moebiusShader = null;
    }
    
    // Dispose physics system
    if (this.physics) {
      this.physics.dispose();
      this.physics = null;
    }
    
    // Dispose Three.js resources
    if (this.scene) {
      this.disposeScene(this.scene);
    }
    
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    if (this.controls) {
      this.controls.dispose();
    }
  }
  
  // Recursively dispose scene objects
  disposeScene(scene) {
    scene.traverse(object => {
      if (object.geometry) {
        object.geometry.dispose();
      }
      
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }
}

export default GameEngine;