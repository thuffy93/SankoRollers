import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GameState, gameStateManager } from '../utils/gameState';
import { EventType, eventsManager } from '../utils/events';
import { PhysicsConfig } from '../utils/physicsConfig';
import RAPIER from '@dimforge/rapier3d-compat';

// Import physics functions
import { applyWallClingEffect } from './physics';

/**
 * Input state interface for tracking user input
 */
interface InputState {
  power: number;       // Power level for shots (0-100)
  angle: number;       // Angle for shots (in radians)
  spinning: boolean;   // Whether the player is adding spin
  spinDirection: { x: number; y: number }; // Direction of spin
}

/**
 * Line for visualizing shot trajectory
 */
class TrajectoryLine {
  private scene: THREE.Scene;
  private line: THREE.Line;
  private points: THREE.Vector3[];
  private maxPoints: number = 20;
  private gravity: { x: number; y: number; z: number };
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.points = [];
    this.gravity = PhysicsConfig.world.gravity;
    
    // Create line geometry
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({ 
      color: 0xffff00,
      opacity: 0.7,
      transparent: true
    });
    
    this.line = new THREE.Line(geometry, material);
    this.scene.add(this.line);
    
    // Initially hide
    this.line.visible = false;
  }
  
  /**
   * Show trajectory based on initial position, velocity, and power
   */
  public showTrajectory(
    position: THREE.Vector3, 
    angle: number, 
    power: number
  ): void {
    const shotPhysics = PhysicsConfig.shot;
    const force = power * shotPhysics.powerMultiplier;
    
    // Calculate direction vector from angle
    const directionX = Math.cos(angle);
    const directionZ = Math.sin(angle);
    
    // Calculate initial velocity
    const initialVelocity = new THREE.Vector3(
      directionX * force,
      0.1 * force, // Small upward component
      directionZ * force
    );
    
    // Generate trajectory points using projectile motion
    this.generateTrajectoryPoints(position, initialVelocity);
    
    // Update line geometry
    this.updateLine();
    
    // Show line
    this.line.visible = true;
  }
  
  /**
   * Generate trajectory points using simple physics simulation
   */
  private generateTrajectoryPoints(
    startPos: THREE.Vector3, 
    initialVelocity: THREE.Vector3
  ): void {
    // Clear previous points
    this.points = [];
    
    // Add starting point
    this.points.push(startPos.clone());
    
    // Simulate trajectory
    const pos = startPos.clone();
    const vel = initialVelocity.clone();
    const timestep = 0.1; // Simulation timestep
    
    for (let i = 0; i < this.maxPoints; i++) {
      // Update velocity (apply gravity)
      vel.x += this.gravity.x * timestep;
      vel.y += this.gravity.y * timestep;
      vel.z += this.gravity.z * timestep;
      
      // Update position
      pos.x += vel.x * timestep;
      pos.y += vel.y * timestep;
      pos.z += vel.z * timestep;
      
      // Add point to trajectory
      this.points.push(pos.clone());
      
      // Stop if we hit the ground
      if (pos.y < 0) break;
    }
  }
  
  /**
   * Update the line geometry with current points
   */
  private updateLine(): void {
    // Update geometry
    const geometry = new THREE.BufferGeometry().setFromPoints(this.points);
    this.line.geometry.dispose();
    this.line.geometry = geometry;
  }
  
  /**
   * Hide the trajectory line
   */
  public hideTrajectory(): void {
    this.line.visible = false;
  }
}

/**
 * Shot controller for player ball
 */
export class ShotController {
  private inputState: InputState;
  private keyState: { [key: string]: boolean };
  private playerBallBody: RAPIER.RigidBody;
  private debugMode: boolean = false;
  private trajectoryLine: TrajectoryLine;
  
  constructor(scene: THREE.Scene, playerBallBody: RAPIER.RigidBody) {
    this.playerBallBody = playerBallBody;
    this.trajectoryLine = new TrajectoryLine(scene);
    
    // Initialize input state
    this.inputState = {
      power: 0,
      angle: 0,
      spinning: false,
      spinDirection: { x: 0, y: 0 }
    };
    
    // Track key states
    this.keyState = {};
    
    // Set up input event listeners
    this.setupEventListeners();
    
    // Set up game state listeners
    this.setupStateListeners();
  }
  
  /**
   * Setup keyboard event listeners
   */
  private setupEventListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Toggle debug mode with 'd' key
    window.addEventListener('keydown', (event) => {
      if (event.code === 'KeyD') {
        this.debugMode = !this.debugMode;
        console.log(`Debug mode: ${this.debugMode ? 'enabled' : 'disabled'}`);
      }
    });
  }
  
  /**
   * Setup game state change listeners
   */
  private setupStateListeners(): void {
    // Start aiming when in IDLE state
    gameStateManager.onEnterState(GameState.IDLE, () => {
      // Reset input state
      this.inputState.power = 0;
      this.inputState.angle = 0;
      this.inputState.spinning = false;
      this.inputState.spinDirection = { x: 0, y: 0 };
    });
    
    // Reset player input when ball is in motion
    gameStateManager.onEnterState(GameState.ROLLING, () => {
      // Ensure power and angle are reset
      this.inputState.power = 0;
    });
    
    // Check if the ball has stopped rolling
    gameStateManager.onEnterState(GameState.ROLLING, () => {
      // Start monitoring for ball stopping
      this.startBallVelocityCheck();
    });
  }
  
  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    this.keyState[event.code] = true;
    
    // Only handle input if in appropriate game states
    const currentState = gameStateManager.getState();
    
    if (currentState === GameState.IDLE) {
      // Start aiming with space
      if (event.code === 'Space') {
        gameStateManager.setState(GameState.AIMING);
      }
    }
    else if (currentState === GameState.AIMING) {
      // Start charging with space
      if (event.code === 'Space') {
        gameStateManager.setState(GameState.CHARGING);
      }
    }
    // Handle mid-shot bounce during ROLLING state
    else if (currentState === GameState.ROLLING && event.code === 'KeyZ') {
      this.applyBounce();
    }
  }
  
  /**
   * Handle keyup events
   */
  private handleKeyUp(event: KeyboardEvent): void {
    this.keyState[event.code] = false;
    
    // Execute shot when space is released and we're in CHARGING state
    if (event.code === 'Space' && gameStateManager.isState(GameState.CHARGING)) {
      this.executeShot();
    }
  }
  
  /**
   * Update controls state (called every frame)
   */
  public update(): void {
    const currentState = gameStateManager.getState();
    
    // Update angle in AIMING state
    if (currentState === GameState.AIMING) {
      let angleChanged = false;
      
      if (this.keyState['ArrowLeft']) {
        this.inputState.angle -= 0.02;
        angleChanged = true;
        eventsManager.publish(EventType.ANGLE_CHANGED, { angle: this.inputState.angle });
      }
      if (this.keyState['ArrowRight']) {
        this.inputState.angle += 0.02;
        angleChanged = true;
        eventsManager.publish(EventType.ANGLE_CHANGED, { angle: this.inputState.angle });
      }
      
      // If angle changed, update trajectory prediction
      if (angleChanged) {
        this.updateTrajectoryPreview();
      }
      
      // Handle spin input
      this.inputState.spinning = this.keyState['KeyB'] || false;
      if (this.inputState.spinning) {
        this.inputState.spinDirection.x = this.keyState['ArrowLeft'] ? -1 : this.keyState['ArrowRight'] ? 1 : 0;
        this.inputState.spinDirection.y = this.keyState['ArrowUp'] ? 1 : this.keyState['ArrowDown'] ? -1 : 0;
      }
    }
    
    // Update power meter in CHARGING state
    if (currentState === GameState.CHARGING) {
      // Increase power while space is held
      this.inputState.power = Math.min(
        PhysicsConfig.shot.maxPower, 
        this.inputState.power + 1
      );
      
      eventsManager.publish(EventType.POWER_CHANGED, { power: this.inputState.power });
      
      // Update trajectory based on current power
      this.updateTrajectoryPreview();
      
      // Continue handling angle and spin during charging
      if (this.keyState['ArrowLeft']) {
        this.inputState.angle -= 0.01; // Slower adjustment during charge
        eventsManager.publish(EventType.ANGLE_CHANGED, { angle: this.inputState.angle });
      }
      if (this.keyState['ArrowRight']) {
        this.inputState.angle += 0.01; // Slower adjustment during charge
        eventsManager.publish(EventType.ANGLE_CHANGED, { angle: this.inputState.angle });
      }
      
      // Handle spin input
      this.inputState.spinning = this.keyState['KeyB'] || false;
      if (this.inputState.spinning) {
        this.inputState.spinDirection.x = this.keyState['ArrowLeft'] ? -1 : this.keyState['ArrowRight'] ? 1 : 0;
        this.inputState.spinDirection.y = this.keyState['ArrowUp'] ? 1 : this.keyState['ArrowDown'] ? -1 : 0;
      }
    }
    
    // Update debug info
    if (this.debugMode) {
      eventsManager.publish(EventType.DEBUG_INFO_UPDATE, {
        state: gameStateManager.getState(),
        power: this.inputState.power,
        angle: this.inputState.angle.toFixed(2),
        spinning: this.inputState.spinning,
        spinDirection: this.inputState.spinDirection
      });
    }
  }
  
  /**
   * Update the trajectory preview line
   */
  private updateTrajectoryPreview(): void {
    // Get current ball position
    const position = this.playerBallBody.translation();
    const ballPos = new THREE.Vector3(position.x, position.y, position.z);
    
    // Update trajectory with current angle and power
    this.trajectoryLine.showTrajectory(
      ballPos,
      this.inputState.angle,
      this.inputState.power > 0 ? this.inputState.power : 50 // Default power for preview
    );
  }
  
  /**
   * Execute the shot with current input values
   */
  private executeShot(): void {
    // Hide trajectory line when shooting
    this.trajectoryLine.hideTrajectory();
    
    // Get the shot physics values
    const shotPhysics = PhysicsConfig.shot;
    
    // Calculate force based on power (scale appropriately)
    const force = this.inputState.power * shotPhysics.powerMultiplier;
    
    // Calculate direction vector from angle
    const directionX = Math.cos(this.inputState.angle);
    const directionZ = Math.sin(this.inputState.angle);
    
    // Apply impulse to the ball
    this.playerBallBody.applyImpulse(
      { x: directionX * force, y: 0.1 * force, z: directionZ * force },
      true
    );
    
    // Apply spin (angular velocity) if spinning
    if (this.inputState.spinning) {
      this.playerBallBody.applyTorqueImpulse(
        { 
          x: this.inputState.spinDirection.y * force * shotPhysics.spinMultiplier,
          y: 0,
          z: -this.inputState.spinDirection.x * force * shotPhysics.spinMultiplier
        },
        true
      );
    }
    
    // Change game state to ROLLING
    gameStateManager.setState(GameState.ROLLING);
    
    // Publish shot start event
    eventsManager.publish(EventType.SHOT_STARTED, {
      power: this.inputState.power,
      angle: this.inputState.angle,
      spinning: this.inputState.spinning
    });
    
    console.log(`Shot executed: power=${this.inputState.power}, angle=${this.inputState.angle.toFixed(2)}`);
  }
  
  /**
   * Apply a bounce during flight
   */
  private applyBounce(): void {
    // Only apply bounce when ball is rolling
    if (!gameStateManager.isState(GameState.ROLLING)) return;
    
    // Apply an upward impulse
    this.playerBallBody.applyImpulse(
      { x: 0, y: PhysicsConfig.shot.bounceImpulse, z: 0 },
      true
    );
    
    console.log("Bounce applied!");
  }
  
  /**
   * Check ball velocity to detect when it stops
   */
  private startBallVelocityCheck(): void {
    // Set up an interval to check ball velocity
    const velocityCheckInterval = setInterval(() => {
      // Skip if we're not in ROLLING state anymore
      if (!gameStateManager.isState(GameState.ROLLING)) {
        clearInterval(velocityCheckInterval);
        return;
      }
      
      // Get current velocity
      const velocity = this.playerBallBody.linvel();
      const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
      
      // Check if ball has essentially stopped
      if (speed < PhysicsConfig.shot.minVelocityToStop) {
        // Ball has stopped, transition to IDLE state
        gameStateManager.setState(GameState.IDLE);
        
        // Publish ball stopped event
        eventsManager.publish(EventType.BALL_STOPPED, {
          position: this.playerBallBody.translation()
        });
        
        // Clear interval
        clearInterval(velocityCheckInterval);
        console.log("Ball stopped");
      }
    }, 100); // Check every 100ms
  }
  
  /**
   * Get current input state
   */
  public getInputState(): InputState {
    return { ...this.inputState };
  }
}

/**
 * Initialize camera controls and shot controls
 */
export function initControls(
  camera: THREE.Camera, 
  domElement: HTMLElement,
  playerBallBody: RAPIER.RigidBody,
  scene: THREE.Scene
) {
  // Create orbit controls for camera
  const orbitControls = new OrbitControls(camera, domElement);
  
  // Configure orbit controls for Kirby-like view
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.1;
  orbitControls.maxPolarAngle = Math.PI / 2.1; // Prevent going below ground
  orbitControls.minDistance = 10;
  orbitControls.maxDistance = 30;
  
  // Create shot controller
  const shotController = new ShotController(scene, playerBallBody);
  
  // Return the controls object
  return {
    orbitControls,
    shotController,
    update: () => {
      orbitControls.update();
      shotController.update();
    },
    getInputState: () => shotController.getInputState()
  };
} 