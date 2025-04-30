import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsObjectData } from '../systems/PhysicsSystem';
import { MaterialManager } from './MaterialManager';

/**
 * Represents a targetable object in the course
 */
export interface Target {
  id: string;
  position: THREE.Vector3;
  isHit: boolean;
  collider?: RAPIER.Collider;
  mesh?: THREE.Object3D;
}

/**
 * Represents an obstacle in the course
 */
export interface Obstacle {
  id: string;
  position: THREE.Vector3;
  type: 'box' | 'cylinder' | 'sphere' | 'custom';
  dimensions: any; // Size details based on type
  rotation?: THREE.Euler;
  collider?: RAPIER.Collider;
  mesh?: THREE.Object3D;
  materialType?: string;
}

/**
 * Represents a section of terrain
 */
export interface TerrainSection {
  id: string;
  position: THREE.Vector3;
  geometry: 'flat' | 'heightmap' | 'custom';
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  heightmapData?: Float32Array;
  materialType: string;
  collider?: RAPIER.Collider;
  mesh?: THREE.Object3D;
}

/**
 * Represents a wall or boundary
 */
export interface Wall {
  id: string;
  position: THREE.Vector3;
  type: 'straight' | 'curved';
  dimensions: {
    length: number;
    height: number;
    thickness: number;
  };
  rotation?: THREE.Euler;
  curve?: {
    radius: number;
    angle: number;
  };
  collider?: RAPIER.Collider;
  mesh?: THREE.Object3D;
}

/**
 * Manages course elements including terrain, obstacles, targets, and goal
 */
export class Course {
  // Scene graph root for all course elements
  private root: THREE.Object3D;
  
  // Physics world reference
  private world: RAPIER.World;
  
  // Material manager
  private materialManager: MaterialManager;
  
  // Course elements
  private terrain: Map<string, TerrainSection> = new Map();
  private obstacles: Map<string, Obstacle> = new Map();
  private targets: Map<string, Target> = new Map();
  private walls: Map<string, Wall> = new Map();
  
  // Goal position
  private goalPosition: THREE.Vector3;
  private goalMesh?: THREE.Object3D;
  private goalCollider?: RAPIER.Collider;
  
  // Course boundaries
  private boundaries: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
  
  // Course metadata
  private name: string;
  private difficulty: 'easy' | 'medium' | 'hard';
  private par: number;
  
  /**
   * Creates a new course
   * @param scene Three.js scene to add course elements to
   * @param world Rapier physics world
   * @param name Course name
   * @param difficulty Course difficulty
   * @param par Par score for the course
   * @param materialManager Optional material manager to handle surface materials
   */
  constructor(
    scene: THREE.Scene,
    world: RAPIER.World,
    name: string = 'New Course',
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    par: number = 3,
    materialManager?: MaterialManager
  ) {
    this.world = world;
    this.name = name;
    this.difficulty = difficulty;
    this.par = par;
    
    // Initialize or use provided material manager
    this.materialManager = materialManager || new MaterialManager();
    
    // Create root object for all course elements
    this.root = new THREE.Object3D();
    this.root.name = `course-${name.toLowerCase().replace(/\s+/g, '-')}`;
    scene.add(this.root);
    
    // Set default goal position
    this.goalPosition = new THREE.Vector3(0, 0, -20);
    
    // Set default boundaries
    this.boundaries = {
      minX: -50,
      maxX: 50,
      minY: -10,
      maxY: 50,
      minZ: -50,
      maxZ: 50
    };
  }
  
  /**
   * Add a terrain section to the course
   * @param terrain Terrain section to add
   * @returns The ID of the added terrain section
   */
  addTerrain(terrain: TerrainSection): string {
    // Store the terrain section in the map
    this.terrain.set(terrain.id, terrain);
    
    // Add mesh to the scene if it exists
    if (terrain.mesh) {
      this.root.add(terrain.mesh);
    }
    
    return terrain.id;
  }
  
  /**
   * Remove a terrain section from the course
   * @param id ID of the terrain section to remove
   * @returns True if the terrain was successfully removed
   */
  removeTerrain(id: string): boolean {
    const terrain = this.terrain.get(id);
    
    if (!terrain) {
      return false;
    }
    
    // Remove mesh from scene if it exists
    if (terrain.mesh) {
      this.root.remove(terrain.mesh);
    }
    
    // Remove collider if it exists
    if (terrain.collider) {
      this.world.removeCollider(terrain.collider, false);
    }
    
    // Remove from the map
    this.terrain.delete(id);
    
    return true;
  }
  
  /**
   * Get a terrain section by ID
   * @param id ID of the terrain section
   * @returns The terrain section or undefined if not found
   */
  getTerrainById(id: string): TerrainSection | undefined {
    return this.terrain.get(id);
  }
  
  /**
   * Get all terrain sections
   * @returns Array of all terrain sections
   */
  getAllTerrain(): TerrainSection[] {
    return Array.from(this.terrain.values());
  }
  
  /**
   * Add an obstacle to the course
   * @param obstacle Obstacle to add
   * @returns The ID of the added obstacle
   */
  addObstacle(obstacle: Obstacle): string {
    // Store the obstacle in the map
    this.obstacles.set(obstacle.id, obstacle);
    
    // Add mesh to the scene if it exists
    if (obstacle.mesh) {
      this.root.add(obstacle.mesh);
    }
    
    return obstacle.id;
  }
  
  /**
   * Remove an obstacle from the course
   * @param id ID of the obstacle to remove
   * @returns True if the obstacle was successfully removed
   */
  removeObstacle(id: string): boolean {
    const obstacle = this.obstacles.get(id);
    
    if (!obstacle) {
      return false;
    }
    
    // Remove mesh from scene if it exists
    if (obstacle.mesh) {
      this.root.remove(obstacle.mesh);
    }
    
    // Remove collider if it exists
    if (obstacle.collider) {
      this.world.removeCollider(obstacle.collider, false);
    }
    
    // Remove from the map
    this.obstacles.delete(id);
    
    return true;
  }
  
  /**
   * Get an obstacle by ID
   * @param id ID of the obstacle
   * @returns The obstacle or undefined if not found
   */
  getObstacleById(id: string): Obstacle | undefined {
    return this.obstacles.get(id);
  }
  
  /**
   * Get all obstacles
   * @returns Array of all obstacles
   */
  getAllObstacles(): Obstacle[] {
    return Array.from(this.obstacles.values());
  }
  
  /**
   * Add a target to the course
   * @param target Target to add
   * @returns The ID of the added target
   */
  addTarget(target: Target): string {
    // Store the target in the map
    this.targets.set(target.id, target);
    
    // Add mesh to the scene if it exists
    if (target.mesh) {
      this.root.add(target.mesh);
    }
    
    return target.id;
  }
  
  /**
   * Remove a target from the course
   * @param id ID of the target to remove
   * @returns True if the target was successfully removed
   */
  removeTarget(id: string): boolean {
    const target = this.targets.get(id);
    
    if (!target) {
      return false;
    }
    
    // Remove mesh from scene if it exists
    if (target.mesh) {
      this.root.remove(target.mesh);
    }
    
    // Remove collider if it exists
    if (target.collider) {
      this.world.removeCollider(target.collider, false);
    }
    
    // Remove from the map
    this.targets.delete(id);
    
    return true;
  }
  
  /**
   * Get a target by ID
   * @param id ID of the target
   * @returns The target or undefined if not found
   */
  getTargetById(id: string): Target | undefined {
    return this.targets.get(id);
  }
  
  /**
   * Get all targets
   * @returns Array of all targets
   */
  getAllTargets(): Target[] {
    return Array.from(this.targets.values());
  }
  
  /**
   * Mark a target as hit
   * @param id ID of the target to mark as hit
   * @returns True if the target was successfully marked
   */
  markTargetAsHit(id: string): boolean {
    const target = this.targets.get(id);
    
    if (!target) {
      return false;
    }
    
    target.isHit = true;
    return true;
  }
  
  /**
   * Add a wall to the course
   * @param wall Wall to add
   * @returns The ID of the added wall
   */
  addWall(wall: Wall): string {
    // Store the wall in the map
    this.walls.set(wall.id, wall);
    
    // Add mesh to the scene if it exists
    if (wall.mesh) {
      this.root.add(wall.mesh);
    }
    
    return wall.id;
  }
  
  /**
   * Remove a wall from the course
   * @param id ID of the wall to remove
   * @returns True if the wall was successfully removed
   */
  removeWall(id: string): boolean {
    const wall = this.walls.get(id);
    
    if (!wall) {
      return false;
    }
    
    // Remove mesh from scene if it exists
    if (wall.mesh) {
      this.root.remove(wall.mesh);
    }
    
    // Remove collider if it exists
    if (wall.collider) {
      this.world.removeCollider(wall.collider, false);
    }
    
    // Remove from the map
    this.walls.delete(id);
    
    return true;
  }
  
  /**
   * Get a wall by ID
   * @param id ID of the wall
   * @returns The wall or undefined if not found
   */
  getWallById(id: string): Wall | undefined {
    return this.walls.get(id);
  }
  
  /**
   * Get all walls
   * @returns Array of all walls
   */
  getAllWalls(): Wall[] {
    return Array.from(this.walls.values());
  }
  
  /**
   * Set the goal position
   * @param position Goal position
   * @param mesh Optional mesh for the goal
   * @param collider Optional collider for the goal
   */
  setGoalPosition(
    position: THREE.Vector3,
    mesh?: THREE.Object3D,
    collider?: RAPIER.Collider
  ): void {
    this.goalPosition = position.clone();
    
    // Remove existing goal mesh if any
    if (this.goalMesh) {
      this.root.remove(this.goalMesh);
    }
    
    // Add new goal mesh if provided
    if (mesh) {
      this.goalMesh = mesh;
      this.root.add(mesh);
    }
    
    // Remove existing goal collider if any
    if (this.goalCollider) {
      this.world.removeCollider(this.goalCollider, false);
    }
    
    // Set new goal collider if provided
    if (collider) {
      this.goalCollider = collider;
    }
  }
  
  /**
   * Get the goal position
   * @returns The goal position
   */
  getGoalPosition(): THREE.Vector3 {
    return this.goalPosition.clone();
  }
  
  /**
   * Set the course boundaries
   * @param boundaries Course boundaries
   */
  setBoundaries(boundaries: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  }): void {
    this.boundaries = { ...boundaries };
  }
  
  /**
   * Get the course boundaries
   * @returns The course boundaries
   */
  getBoundaries(): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  } {
    return { ...this.boundaries };
  }
  
  /**
   * Check if a position is within the course boundaries
   * @param position Position to check
   * @param buffer Optional buffer distance from the boundaries
   * @returns True if the position is within the boundaries
   */
  isWithinBoundaries(position: THREE.Vector3, buffer: number = 0): boolean {
    return (
      position.x >= this.boundaries.minX + buffer &&
      position.x <= this.boundaries.maxX - buffer &&
      position.y >= this.boundaries.minY + buffer &&
      position.y <= this.boundaries.maxY - buffer &&
      position.z >= this.boundaries.minZ + buffer &&
      position.z <= this.boundaries.maxZ - buffer
    );
  }
  
  /**
   * Set course metadata
   * @param name Course name
   * @param difficulty Course difficulty
   * @param par Par score for the course
   */
  setMetadata(
    name: string,
    difficulty: 'easy' | 'medium' | 'hard',
    par: number
  ): void {
    this.name = name;
    this.difficulty = difficulty;
    this.par = par;
  }
  
  /**
   * Get course metadata
   * @returns Object containing course metadata
   */
  getMetadata(): {
    name: string;
    difficulty: 'easy' | 'medium' | 'hard';
    par: number;
  } {
    return {
      name: this.name,
      difficulty: this.difficulty,
      par: this.par
    };
  }
  
  /**
   * Clear all course elements
   */
  clear(): void {
    // Remove all terrain
    this.terrain.forEach((terrain) => {
      if (terrain.mesh) {
        this.root.remove(terrain.mesh);
      }
      if (terrain.collider) {
        this.world.removeCollider(terrain.collider, false);
      }
    });
    this.terrain.clear();
    
    // Remove all obstacles
    this.obstacles.forEach((obstacle) => {
      if (obstacle.mesh) {
        this.root.remove(obstacle.mesh);
      }
      if (obstacle.collider) {
        this.world.removeCollider(obstacle.collider, false);
      }
    });
    this.obstacles.clear();
    
    // Remove all targets
    this.targets.forEach((target) => {
      if (target.mesh) {
        this.root.remove(target.mesh);
      }
      if (target.collider) {
        this.world.removeCollider(target.collider, false);
      }
    });
    this.targets.clear();
    
    // Remove all walls
    this.walls.forEach((wall) => {
      if (wall.mesh) {
        this.root.remove(wall.mesh);
      }
      if (wall.collider) {
        this.world.removeCollider(wall.collider, false);
      }
    });
    this.walls.clear();
    
    // Remove goal mesh if it exists
    if (this.goalMesh) {
      this.root.remove(this.goalMesh);
      this.goalMesh = undefined;
    }
    
    // Remove goal collider if it exists
    if (this.goalCollider) {
      this.world.removeCollider(this.goalCollider, false);
      this.goalCollider = undefined;
    }
    
    // Reset goal position
    this.goalPosition = new THREE.Vector3(0, 0, -20);
  }
  
  /**
   * Validate the course to ensure it has all required elements
   * @returns Object with validation results
   */
  validate(): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Check if there is at least one terrain section
    if (this.terrain.size === 0) {
      errors.push('Course must have at least one terrain section');
    }
    
    // Check if a goal position is set
    if (!this.goalPosition) {
      errors.push('Course must have a goal position');
    }
    
    // Check if the course has a name
    if (!this.name) {
      errors.push('Course must have a name');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Dispose of all resources associated with the course
   */
  dispose(): void {
    this.clear();
    // Remove root object from scene
    if (this.root.parent) {
      this.root.parent.remove(this.root);
    }
  }
  
  /**
   * Update method to be called every frame
   * @param deltaTime Time since last frame
   */
  update(deltaTime: number): void {
    // This would handle any dynamic course elements
    // For now, it's empty as course elements are static
  }
  
  /**
   * Update the material of a terrain section
   * @param id ID of the terrain section
   * @param materialType New material type to apply
   * @returns True if the material was successfully applied
   */
  setTerrainMaterial(id: string, materialType: string): boolean {
    const terrain = this.terrain.get(id);
    
    if (!terrain || !terrain.mesh) {
      return false;
    }
    
    // Update the material type in terrain data
    terrain.materialType = materialType;
    
    // Apply the material to the terrain mesh
    if (terrain.mesh instanceof THREE.Mesh) {
      this.materialManager.applyMaterialToTerrain(terrain.mesh, materialType);
    }
    
    // Apply physics properties if the collider exists
    if (terrain.collider) {
      this.materialManager.applyPhysicsToCollider(terrain.collider, materialType);
    }
    
    return true;
  }
  
  /**
   * Update the material of an obstacle
   * @param id ID of the obstacle
   * @param materialType New material type to apply
   * @returns True if the material was successfully applied
   */
  setObstacleMaterial(id: string, materialType: string): boolean {
    const obstacle = this.obstacles.get(id);
    
    if (!obstacle || !obstacle.mesh) {
      return false;
    }
    
    // Update the material type in obstacle data
    obstacle.materialType = materialType;
    
    // Apply the material to the obstacle mesh
    if (obstacle.mesh instanceof THREE.Mesh) {
      if (obstacle.collider) {
        this.materialManager.applyMaterialToObstacle(
          obstacle.mesh,
          obstacle.collider,
          materialType
        );
      } else {
        // If there's no collider, just apply the visual material
        obstacle.mesh.material = this.materialManager.createThreeMaterial(materialType);
      }
    }
    
    return true;
  }
  
  /**
   * Get the material manager used by this course
   * @returns The material manager
   */
  getMaterialManager(): MaterialManager {
    return this.materialManager;
  }
  
  /**
   * Apply a material to a specific wall
   * @param id ID of the wall
   * @param materialType Material type to apply
   * @returns True if material was successfully applied
   */
  setWallMaterial(id: string, materialType: string): boolean {
    const wall = this.walls.get(id);
    
    if (!wall || !wall.mesh) {
      return false;
    }
    
    // Apply the material to the wall mesh
    if (wall.mesh instanceof THREE.Mesh) {
      if (wall.collider) {
        this.materialManager.applyMaterialToObstacle(
          wall.mesh,
          wall.collider,
          materialType
        );
      } else {
        // If there's no collider, just apply the visual material
        wall.mesh.material = this.materialManager.createThreeMaterial(materialType);
      }
    }
    
    return true;
  }
} 