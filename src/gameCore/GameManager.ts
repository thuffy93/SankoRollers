// src/gameCore/GameManager.ts
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { CourseGenerator } from './CourseGenerator';
import { EventType, eventsManager } from '../utils/events';
import { GameState, gameStateManager } from '../utils/gameState';
import { setupCollisionHandling } from './collisionHandler';
import { getAllCourses } from './CourseTemplates';

/**
 * Game state interface
 */
export interface GameData {
  currentCourse: number;
  totalCourses: number;
  shotsPerHole: number[];
  parPerHole: number[];
  currentShots: number;
  targetCount: number;
  targetsHit: number;
  holeComplete: boolean;
}

/**
 * GameManager handles the game flow, course transitions, and scoring
 */
export class GameManager {
  private scene: THREE.Scene;
  private world: RAPIER.World;
  private courseGenerator: CourseGenerator;
  private playerBall: { mesh: THREE.Mesh; body: RAPIER.RigidBody };
  private gameData: GameData;
  private onGameDataUpdate: (gameData: GameData) => void;
  
  constructor(
    scene: THREE.Scene,
    world: RAPIER.World,
    playerBall: { mesh: THREE.Mesh; body: RAPIER.RigidBody },
    onGameDataUpdate: (gameData: GameData) => void
  ) {
    this.scene = scene;
    this.world = world;
    this.playerBall = playerBall;
    this.onGameDataUpdate = onGameDataUpdate;
    
    // Initialize course generator
    this.courseGenerator = new CourseGenerator(scene, world);
    
    // Get all available courses
    const allCourses = getAllCourses();
    
    // Initialize game data
    this.gameData = {
      currentCourse: 0,
      totalCourses: allCourses.length,
      shotsPerHole: [],
      parPerHole: [],
      currentShots: 0,
      targetCount: 0,
      targetsHit: 0,
      holeComplete: false
    };
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Set up collision handling
    setupCollisionHandling(world, playerBall.body, this.courseGenerator, scene);
    
    // Load the first course
    this.loadCourse(0);
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for shot started
    eventsManager.subscribe(EventType.SHOT_STARTED, () => {
      this.gameData.currentShots++;
      this.updateGameData();
    });
    
    // Listen for target hit
    eventsManager.subscribe(EventType.TARGET_HIT, () => {
      this.gameData.targetsHit++;
      this.updateGameData();
    });
    
    // Listen for hole complete
    eventsManager.subscribe(EventType.HOLE_COMPLETE, () => {
      this.completeHole();
    });
    
    // Listen for out of bounds
    eventsManager.subscribe(EventType.BALL_OUT_OF_BOUNDS, () => {
      this.handleOutOfBounds();
    });
  }
  
  /**
   * Load a specific course
   */
  public loadCourse(courseIndex: number): void {
    // Reset game state
    this.gameData.currentCourse = courseIndex;
    this.gameData.currentShots = 0;
    this.gameData.targetsHit = 0;
    this.gameData.holeComplete = false;
    
    // Clear existing course
    this.courseGenerator.clearCourse();
    
    // Get the course template
    const courses = getAllCourses();
    const courseTemplate = courses[courseIndex];
    
    if (!courseTemplate) {
      console.error(`Course index ${courseIndex} not found`);
      return;
    }
    
    // Load the course
    this.courseGenerator.createCourse(courseTemplate);
    
    // Reset player ball position
    const startPosition = this.courseGenerator.getStartPosition();
    this.playerBall.body.setTranslation({
      x: startPosition.x,
      y: startPosition.y,
      z: startPosition.z
    }, true);
    
    // Stop all motion
    this.playerBall.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.playerBall.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    
    // Update game data
    this.gameData.targetCount = this.courseGenerator.getTargets().size;
    this.gameData.parPerHole[courseIndex] = this.courseGenerator.getPar();
    
    // Reset game state to IDLE
    gameStateManager.setState(GameState.IDLE);
    
    // Notify game data update
    this.updateGameData();
    
    // Show course title
    eventsManager.publish(EventType.SHOW_MESSAGE, {
      message: `${courseTemplate.name} - Par ${courseTemplate.par}`,
      duration: 2000
    });
  }
  
  /**
   * Complete the current hole
   */
  private completeHole(): void {
    if (this.gameData.holeComplete) return;
    
    // Mark hole as complete
    this.gameData.holeComplete = true;
    
    // Record shots for this hole
    this.gameData.shotsPerHole[this.gameData.currentCourse] = this.gameData.currentShots;
    
    // Update game data
    this.updateGameData();
    
    // Show completion message
    this.showCompletionMessage();
    
    // In 3 seconds, load next course or show completion
    setTimeout(() => {
      if (this.gameData.currentCourse < this.gameData.totalCourses - 1) {
        // Load next course
        this.loadCourse(this.gameData.currentCourse + 1);
      } else {
        // Show final score
        this.showFinalScore();
      }
    }, 3000);
  }
  
  /**
   * Handle when the ball goes out of bounds
   */
  private handleOutOfBounds(): void {
    if (this.gameData.holeComplete) return;
    
    // Add penalty stroke
    this.gameData.currentShots++;
    
    // Reset player ball position
    const startPosition = this.courseGenerator.getStartPosition();
    this.playerBall.body.setTranslation({
      x: startPosition.x,
      y: startPosition.y,
      z: startPosition.z
    }, true);
    
    // Stop all motion
    this.playerBall.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.playerBall.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    
    // Set game state to IDLE
    gameStateManager.setState(GameState.IDLE);
    
    // Update game data
    this.updateGameData();
    
    // Show message
    eventsManager.publish(EventType.SHOW_MESSAGE, {
      message: "Out of bounds! +1 stroke penalty"
    });
  }
  
  /**
   * Show hole completion message
   */
  private showCompletionMessage(): void {
    const par = this.gameData.parPerHole[this.gameData.currentCourse];
    const shots = this.gameData.currentShots;
    const diff = shots - par;
    
    let scoreText = "";
    if (diff < 0) {
      // Under par
      if (diff === -1) {
        scoreText = "Birdie!";
      } else if (diff === -2) {
        scoreText = "Eagle!";
      } else if (diff === -3) {
        scoreText = "Albatross!";
      } else {
        scoreText = `${Math.abs(diff)} under par!`;
      }
    } else if (diff === 0) {
      // Par
      scoreText = "Par";
    } else {
      // Over par
      if (diff === 1) {
        scoreText = "Bogey";
      } else if (diff === 2) {
        scoreText = "Double Bogey";
      } else {
        scoreText = `${diff} over par`;
      }
    }
    
    eventsManager.publish(EventType.SHOW_MESSAGE, {
      message: `Hole Complete! ${scoreText}`
    });
  }
  
  /**
   * Show final score
   */
  private showFinalScore(): void {
    let totalShots = 0;
    let totalPar = 0;
    
    // Calculate total shots and par
    for (let i = 0; i < this.gameData.shotsPerHole.length; i++) {
      totalShots += this.gameData.shotsPerHole[i] || 0;
      totalPar += this.gameData.parPerHole[i] || 0;
    }
    
    const diff = totalShots - totalPar;
    let finalScoreText = "";
    
    if (diff < 0) {
      finalScoreText = `${Math.abs(diff)} under par`;
    } else if (diff === 0) {
      finalScoreText = "Even par";
    } else {
      finalScoreText = `${diff} over par`;
    }
    
    eventsManager.publish(EventType.SHOW_MESSAGE, {
      message: `Game Complete! Final Score: ${totalShots} (${finalScoreText})`,
      duration: 5000
    });
  }
  
  /**
   * Update game data and notify listeners
   */
  private updateGameData(): void {
    this.onGameDataUpdate({ ...this.gameData });
  }
  
  /**
   * Get the current game data
   */
  public getGameData(): GameData {
    return { ...this.gameData };
  }
  
  /**
   * Reset game to the first course
   */
  public resetGame(): void {
    // Clear any existing physics states
    eventsManager.publish(EventType.RESET_GAME, {});
    
    // Set game state to IDLE to interrupt any ongoing actions
    gameStateManager.setState(GameState.IDLE);
    
    // Wait a frame for other systems to respond to state change
    setTimeout(() => {
      // Reset game data
      this.gameData = {
        currentCourse: 0,
        totalCourses: this.gameData.totalCourses, // Keep total courses
        shotsPerHole: [],
        parPerHole: [],
        currentShots: 0,
        targetCount: 0,
        targetsHit: 0,
        holeComplete: false
      };
      
      // Reset player ball position and velocity
      const startPosition = this.courseGenerator.getStartPosition();
      if (this.playerBall && this.playerBall.body && this.playerBall.body.isValid()) {
        this.playerBall.body.setTranslation({
          x: startPosition.x,
          y: startPosition.y + 0.5, // Add small height to prevent ground clipping
          z: startPosition.z
        }, true);
        
        // Zero out all velocity and angular velocity
        this.playerBall.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        this.playerBall.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        this.playerBall.body.wakeUp(); // Ensure the body is active
      }
      
      // Load the first course
      this.loadCourse(0);
      
      // Notify listeners of reset
      eventsManager.publish(EventType.SHOW_MESSAGE, {
        message: "Game Reset!",
        duration: 2000
      });
    }, 10);
  }
}