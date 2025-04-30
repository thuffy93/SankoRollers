import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Ball } from '../models/Ball';

/**
 * Test component for verifying the Ball class functionality
 */
export class BallTest {
  private scene: THREE.Scene;
  private world: RAPIER.World;
  private ball: Ball | null = null;
  
  // Test properties
  private testMode: string = 'idle'; // Current test mode
  private testTimer: number = 0;     // Timer for automated tests
  private testDuration: number = 3;  // Duration for each test in seconds
  
  constructor(scene: THREE.Scene, world: RAPIER.World) {
    this.scene = scene;
    this.world = world;
  }
  
  /**
   * Initialize the ball test by creating a ball instance
   */
  initialize(): void {
    // Create a ball instance at a specified position
    this.ball = new Ball(
      this.world,
      new THREE.Vector3(0, 5, 0),  // Position it 5 units above the origin
      0.5,                          // Radius of 0.5 units
      0x0000FF                      // Blue color
    );
    
    // Initialize the ball (adds it to the scene)
    this.ball.initialize(this.scene);
    
    console.log('Ball test initialized');
  }
  
  /**
   * Update the ball instance (will be called every frame)
   * @param deltaTime Time in seconds since the last frame
   */
  update(deltaTime: number = 1/60): void {
    if (!this.ball) return;
    
    // Update the ball
    this.ball.update();
    
    // Run automated tests if needed
    this.updateTests(deltaTime);
    
    // Log ball information for debugging
    if (this.testTimer % 1 < deltaTime) {
      this.logBallInfo();
    }
  }
  
  /**
   * Run automated tests for ball movement
   * @param deltaTime Time in seconds since the last frame
   */
  private updateTests(deltaTime: number): void {
    if (!this.ball) return;
    
    // Update the test timer
    this.testTimer += deltaTime;
    
    // Switch test modes based on the timer
    if (this.testTimer > this.testDuration) {
      this.testTimer = 0;
      this.switchTestMode();
    }
    
    // Execute actions based on current test mode
    switch (this.testMode) {
      case 'impulse':
        if (this.testTimer < 0.1) { // Only apply impulse once at the start of the test
          this.testImpulse();
        }
        break;
      
      case 'force':
        this.testForce(deltaTime);
        break;
      
      case 'velocity':
        if (this.testTimer < 0.1) { // Only set velocity once at the start of the test
          this.testVelocity();
        }
        break;
        
      case 'angular':
        if (this.testTimer < 0.1) { // Only set angular velocity once at the start of the test
          this.testAngularVelocity();
        }
        break;
        
      case 'jump':
        if (this.testTimer < 0.1) { // Only jump once at the start of the test
          this.testJump();
        }
        break;
        
      case 'roll':
        if (this.testTimer < 0.1) { // Only roll once at the start of the test
          this.testRoll();
        }
        break;
        
      case 'reset':
        if (this.testTimer < 0.1) { // Only reset once at the start of the test
          this.testReset();
        }
        break;
        
      case 'stop':
        if (this.testTimer < 0.1) { // Only stop once at the start of the test
          this.testStop();
        }
        break;
    }
  }
  
  /**
   * Switch to the next test mode in sequence
   */
  private switchTestMode(): void {
    // Define the sequence of test modes
    const modes = [
      'idle',
      'impulse',
      'force',
      'velocity',
      'angular',
      'jump',
      'roll',
      'reset',
      'stop'
    ];
    
    // Find the current mode index
    const currentIndex = modes.indexOf(this.testMode);
    
    // Switch to the next mode or wrap around to the first
    const nextIndex = (currentIndex + 1) % modes.length;
    this.testMode = modes[nextIndex];
    
    console.log(`Switched test mode to: ${this.testMode}`);
  }
  
  /**
   * Test applying an impulse to the ball
   */
  private testImpulse(): void {
    if (!this.ball) return;
    
    // Apply an impulse in a random direction
    const direction = new THREE.Vector3(
      Math.random() * 2 - 1,  // Random x between -1 and 1
      Math.random() * 0.5,    // Random y between 0 and 0.5 (slight upward)
      Math.random() * 2 - 1   // Random z between -1 and 1
    );
    
    // Apply the impulse
    this.ball.applyImpulse(direction, 5.0);
    
    console.log('Testing impulse application');
  }
  
  /**
   * Test applying a continuous force to the ball
   */
  private testForce(deltaTime: number): void {
    if (!this.ball) return;
    
    // Apply a continuous force (e.g., wind)
    const force = new THREE.Vector3(
      Math.sin(this.testTimer * 2) * 2,  // Oscillating x force
      Math.sin(this.testTimer * 3) * 0.5, // Slight oscillating y force
      Math.cos(this.testTimer * 2) * 2   // Oscillating z force
    );
    
    // Apply the force
    this.ball.applyForce(force);
  }
  
  /**
   * Test setting the linear velocity of the ball
   */
  private testVelocity(): void {
    if (!this.ball) return;
    
    // Set a specific linear velocity
    const velocity = new THREE.Vector3(3, 1, 2);
    this.ball.setLinearVelocity(velocity);
    
    console.log('Testing linear velocity setting');
  }
  
  /**
   * Test setting the angular velocity of the ball
   */
  private testAngularVelocity(): void {
    if (!this.ball) return;
    
    // Set a specific angular velocity (rotation)
    const angularVelocity = new THREE.Vector3(0, 5, 0); // Spin around Y axis
    this.ball.setAngularVelocity(angularVelocity);
    
    console.log('Testing angular velocity setting');
  }
  
  /**
   * Test the ball's jump functionality
   */
  private testJump(): void {
    if (!this.ball) return;
    
    // Make the ball jump
    this.ball.jump(7.0);
    
    console.log('Testing ball jump');
  }
  
  /**
   * Test the ball's roll functionality
   */
  private testRoll(): void {
    if (!this.ball) return;
    
    // Roll the ball in a specific direction
    const direction = new THREE.Vector3(1, 0, 1);
    this.ball.roll(direction, 3.0);
    
    console.log('Testing ball roll');
  }
  
  /**
   * Test resetting the ball to a specific position
   */
  private testReset(): void {
    if (!this.ball) return;
    
    // Reset the ball to a specific position
    const position = new THREE.Vector3(0, 5, 0);
    this.ball.reset(position);
    
    console.log('Testing ball reset');
  }
  
  /**
   * Test stopping the ball's movement
   */
  private testStop(): void {
    if (!this.ball) return;
    
    // First apply an impulse to get it moving
    this.ball.applyImpulse(new THREE.Vector3(1, 0.5, 1), 5.0);
    
    // Wait a short time, then stop it
    setTimeout(() => {
      if (this.ball) {
        this.ball.stop();
        console.log('Testing ball stop');
      }
    }, 500);
  }
  
  /**
   * Log information about the ball's current state
   */
  private logBallInfo(): void {
    if (!this.ball) return;
    
    // Only log every second to avoid console spam
    const position = this.ball.getPosition();
    const velocity = this.ball.getLinearVelocity();
    const isMoving = this.ball.isMoving();
    
    console.log(`Ball info - Position: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}), Velocity: (${velocity.x.toFixed(2)}, ${velocity.y.toFixed(2)}, ${velocity.z.toFixed(2)}), Moving: ${isMoving}`);
  }
  
  /**
   * Manually set the test mode (for user interaction)
   * @param mode The test mode to set
   */
  setTestMode(mode: string): void {
    if (['idle', 'impulse', 'force', 'velocity', 'angular', 'jump', 'roll', 'reset', 'stop'].includes(mode)) {
      this.testMode = mode;
      this.testTimer = 0;
      console.log(`Test mode set to: ${mode}`);
    } else {
      console.error(`Invalid test mode: ${mode}`);
    }
  }
  
  /**
   * Get the ball instance
   */
  getBall(): Ball | null {
    return this.ball;
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.ball) {
      this.ball.dispose();
      this.ball = null;
    }
  }
} 