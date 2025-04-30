import * as THREE from 'three';
import { Ball } from '../models/Ball';
import { ShotParameters } from './ShotSystem';
import { IsometricCamera } from './CameraSystem';

/**
 * Shot statistics structure
 */
export interface ShotStats {
  distance: number;          // Total distance traveled
  maxHeight: number;         // Maximum height reached
  finalPosition: THREE.Vector3; // Final resting position
  initialPosition: THREE.Vector3; // Starting position
  accuracy?: number;         // Optional accuracy metric (e.g., distance to target)
  time?: number;             // Time the ball was in motion
}

/**
 * Shot history entry
 */
export interface ShotHistoryEntry {
  stats: ShotStats;
  parameters: ShotParameters;
  timestamp: number;
}

/**
 * System for tracking and displaying shot results
 */
export class ShotResultsSystem {
  // Scene reference for adding visuals
  private scene: THREE.Scene;
  
  // Camera reference for positioning UI elements
  private camera: IsometricCamera;
  
  // Reference to the ball
  private ball: Ball | null = null;
  
  // Track starting position for distance calculation
  private shotStartPosition: THREE.Vector3 | null = null;
  
  // Track maximum height during shot
  private maxHeight: number = 0;
  
  // Track shot time
  private shotStartTime: number = 0;
  
  // Is tracking active
  private isTracking: boolean = false;
  
  // Results display
  private resultsContainer: THREE.Group;
  private resultsVisible: boolean = false;
  private displayDuration: number = 5.0; // How long to show results in seconds
  private displayTimer: number = 0;
  
  // Shot history
  private shotHistory: ShotHistoryEntry[] = [];
  private maxHistoryEntries: number = 10;
  
  // UI elements
  private distanceText: THREE.Mesh | null = null;
  private heightText: THREE.Mesh | null = null;
  private timeText: THREE.Mesh | null = null;
  
  /**
   * Create a new ShotResultsSystem
   * @param scene THREE.js scene
   * @param camera Camera for positioning UI
   */
  constructor(scene: THREE.Scene, camera: IsometricCamera) {
    this.scene = scene;
    this.camera = camera;
    
    // Create container for results display
    this.resultsContainer = new THREE.Group();
    this.resultsContainer.visible = false;
    this.scene.add(this.resultsContainer);
    
    // Create UI elements
    this.createUIElements();
  }
  
  /**
   * Set the ball reference
   * @param ball The ball to track
   */
  public setBall(ball: Ball): void {
    this.ball = ball;
  }
  
  /**
   * Create UI elements for displaying results
   */
  private createUIElements(): void {
    // Create panel background
    const panelGeometry = new THREE.PlaneGeometry(4, 2);
    const panelMaterial = new THREE.MeshBasicMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    this.resultsContainer.add(panel);
    
    // We don't have actual TextGeometry in this implementation,
    // so we'll create placeholders that would be replaced with
    // proper text rendering in a complete implementation
    
    // Distance text placeholder
    const distancePlaceholder = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 0.4),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1
      })
    );
    distancePlaceholder.position.set(0, 0.5, 0.01);
    this.resultsContainer.add(distancePlaceholder);
    this.distanceText = distancePlaceholder;
    
    // Height text placeholder
    const heightPlaceholder = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 0.4),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1
      })
    );
    heightPlaceholder.position.set(0, 0, 0.01);
    this.resultsContainer.add(heightPlaceholder);
    this.heightText = heightPlaceholder;
    
    // Time text placeholder
    const timePlaceholder = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 0.4),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1
      })
    );
    timePlaceholder.position.set(0, -0.5, 0.01);
    this.resultsContainer.add(timePlaceholder);
    this.timeText = timePlaceholder;
    
    // In a real implementation, we would create actual text here
    // For example with THREE.TextGeometry or HTML overlays
  }
  
  /**
   * Start tracking a new shot
   * @param shotParams Initial shot parameters
   */
  public startTracking(shotParams: ShotParameters): void {
    if (!this.ball) return;
    
    // Reset tracking variables
    this.shotStartPosition = this.ball.getPosition().clone();
    this.maxHeight = this.shotStartPosition.y;
    this.shotStartTime = performance.now();
    this.isTracking = true;
    
    console.log('Started tracking shot from position:', this.shotStartPosition);
  }
  
  /**
   * Stop tracking and calculate results
   * @returns Shot statistics
   */
  public stopTracking(): ShotStats | null {
    if (!this.isTracking || !this.ball || !this.shotStartPosition) return null;
    
    // Get current ball position
    const finalPosition = this.ball.getPosition();
    
    // Calculate distance (only in XZ plane for golf-like distance)
    const startPositionXZ = new THREE.Vector2(this.shotStartPosition.x, this.shotStartPosition.z);
    const finalPositionXZ = new THREE.Vector2(finalPosition.x, finalPosition.z);
    const distance = startPositionXZ.distanceTo(finalPositionXZ);
    
    // Calculate shot time
    const shotTime = (performance.now() - this.shotStartTime) / 1000; // Convert to seconds
    
    // Create shot statistics
    const stats: ShotStats = {
      distance: distance,
      maxHeight: this.maxHeight - this.shotStartPosition.y, // Relative to start
      finalPosition: finalPosition.clone(),
      initialPosition: this.shotStartPosition.clone(),
      time: shotTime
    };
    
    // Reset tracking state
    this.isTracking = false;
    
    // Save to history
    this.addToHistory(stats);
    
    // Show results
    this.showResults(stats);
    
    console.log('Shot results:', stats);
    
    return stats;
  }
  
  /**
   * Add shot to history
   * @param stats Shot statistics
   */
  private addToHistory(stats: ShotStats): void {
    // Get current shot parameters (would come from shotSystem in real implementation)
    const params: ShotParameters = {
      angle: new THREE.Vector2(0, 0), // Placeholder - would be real in implementation
      power: 0, // Placeholder - would be real in implementation
      spin: new THREE.Vector3(0, 0, 0), // Placeholder - would be real in implementation
      position: stats.initialPosition
    };
    
    // Create history entry
    const entry: ShotHistoryEntry = {
      stats: stats,
      parameters: params,
      timestamp: Date.now()
    };
    
    // Add to history (maintain maximum size)
    this.shotHistory.unshift(entry);
    if (this.shotHistory.length > this.maxHistoryEntries) {
      this.shotHistory.pop();
    }
  }
  
  /**
   * Show shot results UI
   * @param stats Shot statistics to display
   */
  public showResults(stats: ShotStats): void {
    // Position the results panel near the camera
    const cameraPos = new THREE.Vector3();
    this.camera.getCamera().getWorldPosition(cameraPos);
    
    // Position the results in front of the camera
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(this.camera.getCamera().quaternion);
    
    const displayPosition = cameraPos.clone().add(
      cameraDirection.multiplyScalar(5) // 5 units in front of camera
    );
    
    // Add a bit of height to be in view
    displayPosition.y += 1;
    
    // Set position of the container
    this.resultsContainer.position.copy(displayPosition);
    
    // Make the container face the camera
    this.resultsContainer.lookAt(cameraPos);
    
    // Update text content (in a real implementation, we would update actual text)
    // For this simulation, we'll just log the values and change colors
    
    // Update distance display
    if (this.distanceText) {
      console.log(`Distance: ${stats.distance.toFixed(2)}m`);
      (this.distanceText.material as THREE.MeshBasicMaterial).color.set(0xffcc00);
    }
    
    // Update height display
    if (this.heightText) {
      console.log(`Max Height: ${stats.maxHeight.toFixed(2)}m`);
      (this.heightText.material as THREE.MeshBasicMaterial).color.set(0x00ccff);
    }
    
    // Update time display
    if (this.timeText && stats.time) {
      console.log(`Flight Time: ${stats.time.toFixed(2)}s`);
      (this.timeText.material as THREE.MeshBasicMaterial).color.set(0x66ff66);
    }
    
    // Show the results
    this.resultsContainer.visible = true;
    this.resultsVisible = true;
    this.displayTimer = 0;
  }
  
  /**
   * Hide results display
   */
  private hideResults(): void {
    this.resultsContainer.visible = false;
    this.resultsVisible = false;
  }
  
  /**
   * Get shot history
   * @returns Array of shot history entries
   */
  public getShotHistory(): ShotHistoryEntry[] {
    return [...this.shotHistory];
  }
  
  /**
   * Update the system
   * @param deltaTime Time since last update in seconds
   */
  public update(deltaTime: number): void {
    // Update tracking if active
    if (this.isTracking && this.ball) {
      // Check for new maximum height
      const currentHeight = this.ball.getPosition().y;
      if (currentHeight > this.maxHeight) {
        this.maxHeight = currentHeight;
      }
    }
    
    // Update results display timer
    if (this.resultsVisible) {
      this.displayTimer += deltaTime;
      
      // Auto-hide after duration
      if (this.displayTimer >= this.displayDuration) {
        this.hideResults();
      }
    }
    
    // Update UI position if needed
    if (this.resultsVisible) {
      // Make sure UI faces the camera
      const cameraPos = new THREE.Vector3();
      this.camera.getCamera().getWorldPosition(cameraPos);
      this.resultsContainer.lookAt(cameraPos);
    }
  }
} 