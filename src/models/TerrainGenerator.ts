import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { createStaticBody, addBoxCollider, PhysicsObjectData } from '../systems/PhysicsSystem';
import { TerrainSection } from './Course';
import { MaterialManager } from './MaterialManager';

/**
 * Options for generating terrain
 */
export interface TerrainGeneratorOptions {
  // Dimensions of the terrain
  width: number;
  depth: number;
  // Height range (for heightmap-based terrain)
  minHeight?: number;
  maxHeight?: number;
  // Material type
  materialType: string;
  // Level of detail (segments for the geometry)
  widthSegments?: number;
  depthSegments?: number;
  // Physics properties
  friction?: number;
  restitution?: number;
  // Heightmap data (if provided, will create heightmap-based terrain)
  heightmapData?: Float32Array;
}

/**
 * Default settings for terrain generation
 */
const DEFAULT_TERRAIN_OPTIONS: TerrainGeneratorOptions = {
  width: 50,
  depth: 50,
  minHeight: 0,
  maxHeight: 10,
  materialType: 'grass',
  widthSegments: 50,
  depthSegments: 50,
  friction: 0.5,
  restitution: 0.3
};

/**
 * Options for generating Perlin noise
 */
export interface PerlinNoiseOptions {
  scale: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  seed?: number;
}

/**
 * Class to generate terrain geometries and physics colliders
 */
export class TerrainGenerator {
  private world: RAPIER.World;
  private materialManager: MaterialManager;
  
  /**
   * Create a new TerrainGenerator
   * @param world The Rapier physics world
   * @param materialManager Material manager for terrain materials
   */
  constructor(world: RAPIER.World, materialManager?: MaterialManager) {
    this.world = world;
    this.materialManager = materialManager || new MaterialManager();
  }
  
  /**
   * Generate a flat terrain section
   * @param id Unique identifier for the terrain
   * @param position Center position for the terrain
   * @param options Options for terrain generation
   * @returns A terrain section with mesh and collider
   */
  public generateFlatTerrain(
    id: string,
    position: THREE.Vector3,
    options: Partial<TerrainGeneratorOptions> = {}
  ): TerrainSection {
    // Merge options with defaults
    const mergedOptions = { ...DEFAULT_TERRAIN_OPTIONS, ...options };
    
    // Create the flat terrain mesh
    const { mesh, geometry, material } = this.createFlatTerrainMesh(
      position,
      mergedOptions
    );
    
    // Create the physics body and collider
    const { body, collider } = this.createFlatTerrainPhysics(
      id,
      position,
      mergedOptions
    );
    
    // Create the terrain section
    const terrain: TerrainSection = {
      id,
      position: position.clone(),
      geometry: 'flat',
      dimensions: {
        width: mergedOptions.width,
        height: 0, // Flat terrain
        depth: mergedOptions.depth
      },
      materialType: mergedOptions.materialType,
      mesh,
      collider
    };
    
    // Apply material if materialManager is provided
    if (this.materialManager && mesh && collider) {
      this.materialManager.applyMaterialToTerrain(mesh, mergedOptions.materialType);
      this.materialManager.applyPhysicsToCollider(collider, mergedOptions.materialType);
    }
    
    console.log(`Created flat terrain: ${id}`);
    
    return terrain;
  }
  
  /**
   * Generate terrain from a heightmap
   * @param id Unique identifier for the terrain
   * @param position Center position for the terrain
   * @param heightmapData Float32Array of height values
   * @param options Options for terrain generation
   * @returns A terrain section with mesh and collider
   */
  public generateHeightmapTerrain(
    id: string,
    position: THREE.Vector3,
    heightmapData: Float32Array,
    options: Partial<TerrainGeneratorOptions> = {}
  ): TerrainSection {
    // Merge options with defaults
    const mergedOptions = { 
      ...DEFAULT_TERRAIN_OPTIONS, 
      ...options,
      heightmapData 
    };
    
    // Create the heightmap terrain mesh
    const { mesh, geometry, material } = this.createHeightmapTerrainMesh(
      position,
      heightmapData,
      mergedOptions
    );
    
    // Create the physics body and collider
    const { body, collider } = this.createHeightmapTerrainPhysics(
      id,
      position,
      heightmapData,
      mergedOptions
    );
    
    // Calculate the actual height range in the heightmap
    const { minHeight, maxHeight } = this.calculateHeightRange(heightmapData);
    const heightMin = minHeight ?? 0;
    const heightMax = maxHeight ?? 1;
    const height = heightMax - heightMin;
    
    // Create the terrain section
    const terrain: TerrainSection = {
      id,
      position: position.clone(),
      geometry: 'heightmap',
      dimensions: {
        width: mergedOptions.width,
        height: height,
        depth: mergedOptions.depth
      },
      heightmapData: heightmapData,
      materialType: mergedOptions.materialType,
      mesh,
      collider
    };
    
    // Apply material if materialManager is provided
    if (this.materialManager && mesh && collider) {
      this.materialManager.applyMaterialToTerrain(mesh, mergedOptions.materialType);
      this.materialManager.applyPhysicsToCollider(collider, mergedOptions.materialType);
    }
    
    console.log(`Created heightmap terrain: ${id}`);
    
    return terrain;
  }
  
  /**
   * Generate a Perlin noise heightmap
   * @param width Width of the heightmap (number of points)
   * @param depth Depth of the heightmap (number of points)
   * @param options Perlin noise options
   * @returns Float32Array of height values
   */
  public generatePerlinHeightmap(
    width: number = 32,
    depth: number = 32,
    options: Partial<PerlinNoiseOptions> = {}
  ): Float32Array {
    // Default noise options
    const noiseOptions: PerlinNoiseOptions = {
      scale: 10,
      octaves: 4,
      persistence: 0.5,
      lacunarity: 2.0,
      seed: Math.floor(Math.random() * 1000000),
      ...options
    };
    
    // Create the heightmap data
    const heightmapData = new Float32Array(width * depth);
    
    // Use a simple Perlin noise implementation
    // In a real project, you'd use a more sophisticated noise library like simplex-noise
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        const index = z * width + x;
        
        // Generate noise value
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        
        // Add multiple octaves of noise
        for (let i = 0; i < noiseOptions.octaves; i++) {
          // Get noise value at scaled coordinates
          const nx = x / width * noiseOptions.scale * frequency;
          const nz = z / depth * noiseOptions.scale * frequency;
          
          // Add noise with current amplitude
          value += this.perlinNoise2D(nx, nz, noiseOptions.seed ? noiseOptions.seed + i * 1000 : i * 1000) * amplitude;
          
          // Update amplitude and frequency for next octave
          amplitude *= noiseOptions.persistence;
          frequency *= noiseOptions.lacunarity;
        }
        
        // Normalize to 0-1 range
        value = (value + 1) / 2;
        
        // Store height value
        heightmapData[index] = value;
      }
    }
    
    return heightmapData;
  }
  
  /**
   * Create a mesh for flat terrain
   * @param position Position of the terrain
   * @param options Terrain options
   * @returns Created mesh, geometry, and material
   */
  private createFlatTerrainMesh(
    position: THREE.Vector3,
    options: TerrainGeneratorOptions
  ): { mesh: THREE.Mesh; geometry: THREE.PlaneGeometry; material: THREE.Material } {
    // Create a plane geometry
    const geometry = new THREE.PlaneGeometry(
      options.width,
      options.depth,
      options.widthSegments || 1,
      options.depthSegments || 1
    );
    
    // Rotate to be horizontal (x-z plane)
    geometry.rotateX(-Math.PI / 2);
    
    // Create material from the MaterialManager if it exists
    let material: THREE.Material;
    if (this.materialManager) {
      material = this.materialManager.createThreeMaterial(options.materialType);
    } else {
      // Fallback to a basic material
      material = new THREE.MeshStandardMaterial({
        color: 0x4CAF50, // Green
        roughness: 0.9,
        metalness: 0.0
      });
    }
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    
    // Set position
    mesh.position.copy(position);
    
    // Enable shadows
    mesh.receiveShadow = true;
    
    return { mesh, geometry, material };
  }
  
  /**
   * Create a mesh for heightmap terrain
   * @param position Position of the terrain
   * @param heightmapData Height data
   * @param options Terrain options
   * @returns Created mesh, geometry, and material
   */
  private createHeightmapTerrainMesh(
    position: THREE.Vector3,
    heightmapData: Float32Array,
    options: TerrainGeneratorOptions
  ): { mesh: THREE.Mesh; geometry: THREE.BufferGeometry; material: THREE.Material } {
    // Create width and depth for the heightmap grid
    const widthSegments = options.widthSegments || 32;
    const depthSegments = options.depthSegments || 32;
    
    // Calculate grid spacing
    const gridWidth = options.width / widthSegments;
    const gridDepth = options.depth / depthSegments;
    
    // Create a buffer geometry for the terrain
    const geometry = new THREE.BufferGeometry();
    
    // Generate vertices for the heightmap
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    
    const halfWidth = options.width / 2;
    const halfDepth = options.depth / 2;
    
    // Calculate min/max height from heightmap
    const { minHeight, maxHeight } = this.calculateHeightRange(heightmapData);
    const heightMin = minHeight ?? 0;
    const heightMax = maxHeight ?? 1;
    const heightRange = (options.maxHeight || 10) - (options.minHeight || 0);
    
    // Create vertex position for each point in the heightmap
    for (let z = 0; z <= depthSegments; z++) {
      for (let x = 0; x <= widthSegments; x++) {
        // Calculate normalized grid positions (0-1)
        const nx = x / widthSegments;
        const nz = z / depthSegments;
        
        // Get heightmap index (clamped to array bounds)
        const hx = Math.floor(nx * (widthSegments));
        const hz = Math.floor(nz * (depthSegments));
        const heightIndex = Math.min(hz * widthSegments + hx, heightmapData.length - 1);
        
        // Get height value from heightmap and scale to range
        const height = heightmapData[heightIndex];
        const scaledHeight = ((height - heightMin) / (heightMax - heightMin)) * heightRange + (options.minHeight || 0);
        
        // Calculate vertex position
        const vx = nx * options.width - halfWidth;
        const vy = scaledHeight;
        const vz = nz * options.depth - halfDepth;
        
        // Add vertex
        vertices.push(vx, vy, vz);
        
        // Add UV coordinates
        uvs.push(nx, nz);
      }
    }
    
    // Create indices for triangles
    for (let z = 0; z < depthSegments; z++) {
      for (let x = 0; x < widthSegments; x++) {
        // Calculate vertex indices for this quad
        const a = x + (widthSegments + 1) * z;
        const b = x + (widthSegments + 1) * (z + 1);
        const c = (x + 1) + (widthSegments + 1) * (z + 1);
        const d = (x + 1) + (widthSegments + 1) * z;
        
        // Add two triangles for this quad
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }
    
    // Add attributes to the geometry
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    
    // Compute vertex normals for proper lighting
    geometry.computeVertexNormals();
    
    // Create material from the MaterialManager if it exists
    let material: THREE.Material;
    if (this.materialManager) {
      material = this.materialManager.createThreeMaterial(options.materialType);
    } else {
      // Fallback to a basic material
      material = new THREE.MeshStandardMaterial({
        color: 0x4CAF50, // Green
        roughness: 0.9,
        metalness: 0.0
      });
    }
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    
    // Set position
    mesh.position.copy(position);
    
    // Enable shadows
    mesh.receiveShadow = true;
    
    return { mesh, geometry, material };
  }
  
  /**
   * Create physics body and collider for flat terrain
   * @param id Terrain ID
   * @param position Position of the terrain
   * @param options Terrain options
   * @returns Created physics body and collider
   */
  private createFlatTerrainPhysics(
    id: string,
    position: THREE.Vector3,
    options: TerrainGeneratorOptions
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    // Create a static rigid body for the terrain
    const body = createStaticBody(
      this.world,
      position,
      { type: 'terrain', id } as PhysicsObjectData
    );
    
    // Get physics properties from MaterialManager if it exists
    let friction = options.friction || DEFAULT_TERRAIN_OPTIONS.friction;
    let restitution = options.restitution || DEFAULT_TERRAIN_OPTIONS.restitution;
    
    if (this.materialManager) {
      const properties = this.materialManager.getPhysicsProperties(options.materialType);
      friction = properties.friction;
      restitution = properties.restitution;
    }
    
    // Add a box collider for the flat terrain
    const collider = addBoxCollider(
      this.world,
      body,
      { 
        x: options.width / 2, 
        y: 0.1, // Small thickness for the floor
        z: options.depth / 2 
      },
      { friction, restitution }
    );
    
    return { body, collider };
  }
  
  /**
   * Create physics body and collider for heightmap terrain
   * @param id Terrain ID
   * @param position Position of the terrain
   * @param heightmapData Height data
   * @param options Terrain options
   * @returns Created physics body and collider
   */
  private createHeightmapTerrainPhysics(
    id: string,
    position: THREE.Vector3,
    heightmapData: Float32Array,
    options: TerrainGeneratorOptions
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    // Create a static rigid body for the terrain
    const body = createStaticBody(
      this.world,
      position,
      { type: 'terrain', id } as PhysicsObjectData
    );
    
    // For simplicity, we'll create a box collider for now
    // In a more advanced implementation, we would create a height field collider
    // or a trimesh collider that matches the heightmap geometry precisely
    const { minHeight, maxHeight } = this.calculateHeightRange(heightmapData);
    const heightMin = minHeight ?? 0;
    const heightMax = maxHeight ?? 1;
    const height = heightMax - heightMin;
    
    // Get physics properties from MaterialManager if it exists
    let friction = options.friction || DEFAULT_TERRAIN_OPTIONS.friction;
    let restitution = options.restitution || DEFAULT_TERRAIN_OPTIONS.restitution;
    
    if (this.materialManager) {
      const properties = this.materialManager.getPhysicsProperties(options.materialType);
      friction = properties.friction;
      restitution = properties.restitution;
    }
    
    // Add a box collider for the terrain
    const collider = addBoxCollider(
      this.world,
      body,
      { 
        x: options.width / 2, 
        y: height / 2, // Use the average height
        z: options.depth / 2 
      },
      { friction, restitution }
    );
    
    return { body, collider };
  }
  
  /**
   * Calculate the min and max height in a heightmap
   * @param heightmapData Height data array
   * @returns Object with minHeight and maxHeight
   */
  private calculateHeightRange(heightmapData: Float32Array): { minHeight: number; maxHeight: number } {
    if (heightmapData.length === 0) {
      return { minHeight: 0, maxHeight: 1 };
    }
    
    let minHeight = heightmapData[0];
    let maxHeight = heightmapData[0];
    
    for (let i = 1; i < heightmapData.length; i++) {
      minHeight = Math.min(minHeight, heightmapData[i]);
      maxHeight = Math.max(maxHeight, heightmapData[i]);
    }
    
    // Ensure we have a non-zero height range
    if (minHeight === maxHeight) {
      maxHeight = minHeight + 1;
    }
    
    return { minHeight, maxHeight };
  }
  
  /**
   * Simple implementation of 2D Perlin noise
   * Note: This is a basic implementation. For a real project, use a library.
   * @param x X coordinate
   * @param y Y coordinate
   * @param seed Random seed
   * @returns Perlin noise value in range -1 to 1
   */
  private perlinNoise2D(x: number, y: number, seed: number = 0): number {
    // Simple hash function
    const hash = (x: number, y: number, seed: number): number => {
      return Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453 % 1;
    };
    
    // Get grid cell coordinates
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    
    // Get interpolation weights
    const sx = x - x0;
    const sy = y - y0;
    
    // Get random gradient vectors
    const n00 = hash(x0, y0, seed) * 2 - 1;
    const n10 = hash(x1, y0, seed) * 2 - 1;
    const n01 = hash(x0, y1, seed) * 2 - 1;
    const n11 = hash(x1, y1, seed) * 2 - 1;
    
    // Smooth interpolation
    const smoothX = this.fade(sx);
    const smoothY = this.fade(sy);
    
    // Interpolate the noise values
    const nx0 = this.lerp(n00, n10, smoothX);
    const nx1 = this.lerp(n01, n11, smoothX);
    const nxy = this.lerp(nx0, nx1, smoothY);
    
    return nxy;
  }
  
  /**
   * Smoothing function for Perlin noise
   * @param t Value to smooth
   * @returns Smoothed value
   */
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  
  /**
   * Linear interpolation
   * @param a First value
   * @param b Second value
   * @param t Interpolation factor (0-1)
   * @returns Interpolated value
   */
  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }
} 