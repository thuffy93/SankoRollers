import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventSystem, GameEvents } from '../../utils/EventSystem';
import { ShotType, SpinType } from '../../gameplay/shot/ShotTypes';
import { TrajectorySimulator } from './TrajectorySimulator';
import { TrajectoryRenderer } from './TrajectoryRenderer';

/**
 * TrajectorySystem - Handles visualization of shot trajectory prediction
 * 
 * This class serves as a facade for the trajectory subsystem, delegating simulation
 * to TrajectorySimulator and visualization to TrajectoryRenderer.
 */
export class TrajectorySystem {
  private scene: THREE.Scene;
  private physicsWorld: RAPIER.World;
  private eventSystem: EventSystem;
  
  // Component references
  private trajectorySimulator: TrajectorySimulator;
  private trajectoryRenderer: TrajectoryRenderer;
  
  /**
   * Constructor
   */
  constructor(scene: THREE.Scene, physicsWorld: RAPIER.World) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.eventSystem = EventSystem.getInstance();
    
    // Initialize components
    this.trajectorySimulator = new TrajectorySimulator(physicsWorld);
    this.trajectoryRenderer = new TrajectoryRenderer(scene);
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Hide trajectory when shot is executed
    this.eventSystem.on(GameEvents.SHOT_EXECUTE, this.hideTrajectory.bind(this));
    
    // Hide trajectory when shot is canceled
    this.eventSystem.on(GameEvents.SHOT_CANCEL, this.hideTrajectory.bind(this));
  }
  
  /**
   * Predict and visualize trajectory based on shot parameters
   */
  public predictTrajectory(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    power: number,
    shotType: ShotType = ShotType.GROUNDER,
    spinType: SpinType = SpinType.NONE,
    spinIntensity: number = 0
  ): void {
    // Check if this is a super shot (95%+ power)
    const isSuperShot = power >= 0.95;
    
    // Generate trajectory points using simulator
    const { points, bouncePoints, landingPoint } = this.trajectorySimulator.generateTrajectory(
      position, 
      direction, 
      power, 
      shotType, 
      spinType, 
      spinIntensity
    );
    
    // Visualize trajectory using renderer
    this.trajectoryRenderer.showTrajectory(
      points,
      bouncePoints,
      landingPoint,
      power,
      shotType,
      isSuperShot
    );
  }
  
  /**
   * Limit trajectory length to a specific distance
   * Used for shot guide visualization in Phase 2
   */
  public limitTrajectoryLength(maxDistance: number): void {
    // Get current trajectory from renderer
    const geometry = this.trajectoryRenderer.trajectoryLine?.geometry as THREE.BufferGeometry;
    if (!geometry) return;
    
    // Convert geometry to points
    const positionAttribute = geometry.getAttribute('position');
    if (!positionAttribute) return;
    
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < positionAttribute.count; i++) {
      points.push(new THREE.Vector3(
        positionAttribute.getX(i),
        positionAttribute.getY(i),
        positionAttribute.getZ(i)
      ));
    }
    
    // Calculate limited points
    const limitedPoints = this.trajectoryRenderer.limitPoints(points, maxDistance);
    
    // Update renderer with limited points
    this.trajectoryRenderer.updateGeometry(limitedPoints);
  }
  
  /**
   * Hide the trajectory visualization
   */
  public hideTrajectory(): void {
    this.trajectoryRenderer.hideTrajectory();
  }
  
  /**
   * Update method to be called each frame
   */
  public update(): void {
    this.trajectoryRenderer.update();
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    // Clean up event listeners
    this.eventSystem.off(GameEvents.SHOT_EXECUTE, this.hideTrajectory.bind(this));
    this.eventSystem.off(GameEvents.SHOT_CANCEL, this.hideTrajectory.bind(this));
    
    // Dispose components
    this.trajectoryRenderer.dispose();
  }
} 