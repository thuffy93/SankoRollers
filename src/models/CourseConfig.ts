/**
 * Type definitions for course configuration
 */

import * as THREE from 'three';

/**
 * Top-level course configuration
 */
export interface CourseConfig {
  // Metadata
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  par: number;
  
  // Course elements
  terrain: TerrainConfig[];
  walls?: WallConfig[];
  obstacles?: ObstacleConfig[];
  targets?: TargetConfig[];
  
  // Goal position
  goal: GoalConfig;
  
  // Boundaries
  boundaries?: BoundariesConfig;
}

/**
 * Configuration for terrain sections
 */
export interface TerrainConfig {
  id: string;
  position: Vector3Config;
  geometry: 'flat' | 'heightmap' | 'custom';
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  heightmapData?: number[][];  // 2D array of height values
  materialType: string;
}

/**
 * Configuration for walls
 */
export interface WallConfig {
  id: string;
  position: Vector3Config;
  type: 'straight' | 'curved';
  dimensions: {
    length: number;
    height: number;
    thickness: number;
  };
  rotation?: Vector3Config; // Euler angles in radians
  materialType: string;
  
  // Additional properties for curved walls
  curve?: {
    radius: number;
    angleStart: number; // Radians
    angleEnd: number;   // Radians
    segments?: number;
  };
}

/**
 * Configuration for obstacles
 */
export interface ObstacleConfig {
  id: string;
  position: Vector3Config;
  type: 'box' | 'cylinder' | 'sphere' | 'custom';
  dimensions: BoxDimensions | CylinderDimensions | SphereDimensions;
  rotation?: Vector3Config; // Euler angles in radians
  materialType: string;
}

/**
 * Configuration for targets
 */
export interface TargetConfig {
  id: string;
  position: Vector3Config;
  type: 'standard' | 'bonus' | 'custom';
  radius: number;
  value?: number; // Points awarded for hitting
  materialType?: string;
}

/**
 * Configuration for the goal
 */
export interface GoalConfig {
  position: Vector3Config;
  radius: number;
  materialType?: string;
}

/**
 * Configuration for course boundaries
 */
export interface BoundariesConfig {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  wallHeight?: number;
  wallMaterialType?: string;
}

/**
 * Vector3 for positions and rotations
 */
export interface Vector3Config {
  x: number;
  y: number;
  z: number;
}

/**
 * Dimensions for a box obstacle
 */
export interface BoxDimensions {
  width: number;
  height: number;
  depth: number;
}

/**
 * Dimensions for a cylinder obstacle
 */
export interface CylinderDimensions {
  radius: number;
  height: number;
  radialSegments?: number;
}

/**
 * Dimensions for a sphere obstacle
 */
export interface SphereDimensions {
  radius: number;
  widthSegments?: number;
  heightSegments?: number;
}

/**
 * Helper to convert Vector3Config to THREE.Vector3
 */
export function configToVector3(vec: Vector3Config): THREE.Vector3 {
  return new THREE.Vector3(vec.x, vec.y, vec.z);
}

/**
 * Helper to convert Vector3Config to THREE.Euler
 */
export function configToEuler(vec: Vector3Config): THREE.Euler {
  return new THREE.Euler(vec.x, vec.y, vec.z);
} 