import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { createStaticBody, addBoxCollider, PhysicsObjectData } from '../systems/PhysicsSystem';
import { Wall } from './Course';
import { MaterialManager } from './MaterialManager';

/**
 * Options for generating walls
 */
export interface WallOptions {
  // Dimensions
  length: number;
  height: number;
  thickness: number;
  // Material
  materialType: string;
  color?: number;
  // Properties
  friction?: number;
  restitution?: number;
  // Curved wall options
  isCurved?: boolean;
  radius?: number;
  angleStart?: number;
  angleEnd?: number;
  segments?: number;
}

/**
 * Default settings for wall generation
 */
const DEFAULT_WALL_OPTIONS: WallOptions = {
  length: 10,
  height: 2,
  thickness: 0.5,
  materialType: 'wall',
  friction: 0.3, 
  restitution: 0.5,
  isCurved: false,
  segments: 16
};

/**
 * Class responsible for generating wall and boundary meshes
 */
export class WallGenerator {
  private world: RAPIER.World;
  private materialManager: MaterialManager;
  
  /**
   * Create a new WallGenerator
   * @param world The Rapier physics world
   * @param materialManager Material manager for wall materials
   */
  constructor(world: RAPIER.World, materialManager?: MaterialManager) {
    this.world = world;
    this.materialManager = materialManager || new MaterialManager();
  }
  
  /**
   * Generate a straight wall
   * @param id Unique identifier for the wall
   * @param position Position of the wall
   * @param rotation Rotation of the wall
   * @param options Wall generation options
   * @returns The created wall object
   */
  public generateStraightWall(
    id: string,
    position: THREE.Vector3,
    rotation: THREE.Euler = new THREE.Euler(),
    options: Partial<WallOptions> = {}
  ): Wall {
    // Merge options with defaults
    const mergedOptions = { ...DEFAULT_WALL_OPTIONS, ...options, isCurved: false };
    
    // Create the wall mesh
    const { mesh, geometry, material } = this.createStraightWallMesh(
      position,
      rotation,
      mergedOptions
    );
    
    // Create the physics body and collider
    const { body, collider } = this.createStraightWallPhysics(
      id,
      position,
      rotation,
      mergedOptions
    );
    
    // Create the wall object
    const wall: Wall = {
      id,
      position: position.clone(),
      type: 'straight',
      dimensions: {
        length: mergedOptions.length,
        height: mergedOptions.height,
        thickness: mergedOptions.thickness
      },
      rotation: rotation.clone(),
      mesh,
      collider
    };
    
    // Apply material if materialManager is provided
    if (this.materialManager && mesh && collider) {
      this.materialManager.applyMaterialToObstacle(mesh, collider, mergedOptions.materialType);
    }
    
    console.log(`Created straight wall: ${id}`);
    
    return wall;
  }
  
  /**
   * Generate a curved wall
   * @param id Unique identifier for the wall
   * @param position Position of the wall (center point)
   * @param options Wall generation options
   * @returns The created wall object
   */
  public generateCurvedWall(
    id: string,
    position: THREE.Vector3,
    options: Partial<WallOptions> = {}
  ): Wall {
    // Merge options with defaults for curved walls
    const curvedDefaults = {
      ...DEFAULT_WALL_OPTIONS,
      isCurved: true,
      radius: 10,
      angleStart: 0,
      angleEnd: Math.PI / 2, // 90 degrees
      segments: 16
    };
    
    const mergedOptions = { ...curvedDefaults, ...options };
    
    // Create the wall mesh
    const { mesh, geometry, material } = this.createCurvedWallMesh(
      position,
      mergedOptions
    );
    
    // Create the physics body and colliders
    const { body, collider, curveInfo } = this.createCurvedWallPhysics(
      id,
      position,
      mergedOptions
    );
    
    // Create the wall object
    const wall: Wall = {
      id,
      position: position.clone(),
      type: 'curved',
      dimensions: {
        length: mergedOptions.length,
        height: mergedOptions.height,
        thickness: mergedOptions.thickness
      },
      curve: {
        radius: mergedOptions.radius || curvedDefaults.radius,
        angle: (mergedOptions.angleEnd || curvedDefaults.angleEnd) - 
               (mergedOptions.angleStart || curvedDefaults.angleStart)
      },
      mesh,
      collider
    };
    
    // Apply material if materialManager is provided
    if (this.materialManager && mesh && collider) {
      this.materialManager.applyMaterialToObstacle(mesh, collider, mergedOptions.materialType);
    }
    
    console.log(`Created curved wall: ${id}`);
    
    return wall;
  }
  
  /**
   * Generate walls that form a rectangular boundary
   * @param baseId Base ID for the walls
   * @param centerPosition Center position of the boundary
   * @param size Size of the boundary (width, height, length)
   * @param options Wall generation options
   * @returns Array of wall objects that form the boundary
   */
  public generateBoundary(
    baseId: string,
    centerPosition: THREE.Vector3,
    size: THREE.Vector3,
    options: Partial<WallOptions> = {}
  ): Wall[] {
    const walls: Wall[] = [];
    
    // Merge options with defaults
    const mergedOptions = { ...DEFAULT_WALL_OPTIONS, ...options, isCurved: false };
    
    // Calculate half extents
    const halfWidth = size.x / 2;
    const halfLength = size.z / 2;
    
    // Create four walls to form a rectangular boundary
    
    // North wall (positive Z)
    const northPosition = new THREE.Vector3(
      centerPosition.x,
      centerPosition.y + mergedOptions.height / 2,
      centerPosition.z + halfLength
    );
    const northWall = this.generateStraightWall(
      `${baseId}-north`,
      northPosition,
      new THREE.Euler(0, 0, 0), // No rotation
      {
        ...mergedOptions,
        length: size.x, // Width of the boundary
      }
    );
    walls.push(northWall);
    
    // South wall (negative Z)
    const southPosition = new THREE.Vector3(
      centerPosition.x,
      centerPosition.y + mergedOptions.height / 2,
      centerPosition.z - halfLength
    );
    const southWall = this.generateStraightWall(
      `${baseId}-south`,
      southPosition,
      new THREE.Euler(0, 0, 0), // No rotation
      {
        ...mergedOptions,
        length: size.x, // Width of the boundary
      }
    );
    walls.push(southWall);
    
    // East wall (positive X)
    const eastPosition = new THREE.Vector3(
      centerPosition.x + halfWidth,
      centerPosition.y + mergedOptions.height / 2,
      centerPosition.z
    );
    const eastWall = this.generateStraightWall(
      `${baseId}-east`,
      eastPosition,
      new THREE.Euler(0, Math.PI / 2, 0), // Rotated 90 degrees
      {
        ...mergedOptions,
        length: size.z, // Length of the boundary
      }
    );
    walls.push(eastWall);
    
    // West wall (negative X)
    const westPosition = new THREE.Vector3(
      centerPosition.x - halfWidth,
      centerPosition.y + mergedOptions.height / 2,
      centerPosition.z
    );
    const westWall = this.generateStraightWall(
      `${baseId}-west`,
      westPosition,
      new THREE.Euler(0, Math.PI / 2, 0), // Rotated 90 degrees
      {
        ...mergedOptions,
        length: size.z, // Length of the boundary
      }
    );
    walls.push(westWall);
    
    console.log(`Created boundary walls with base ID: ${baseId}`);
    
    return walls;
  }
  
  /**
   * Create a mesh for a straight wall
   * @param position Position of the wall
   * @param rotation Rotation of the wall
   * @param options Wall options
   * @returns Created mesh, geometry, and material
   */
  private createStraightWallMesh(
    position: THREE.Vector3,
    rotation: THREE.Euler,
    options: WallOptions
  ): { mesh: THREE.Mesh; geometry: THREE.BoxGeometry; material: THREE.Material } {
    // Create box geometry for the wall
    const geometry = new THREE.BoxGeometry(
      options.length,
      options.height,
      options.thickness
    );
    
    // Create material from the MaterialManager if it exists
    let material: THREE.Material;
    if (this.materialManager) {
      material = this.materialManager.createThreeMaterial(options.materialType);
    } else {
      // Fallback to a basic material with the specified color
      material = new THREE.MeshStandardMaterial({
        color: options.color || 0x999999,
        roughness: 0.7,
        metalness: 0.3,
        side: THREE.DoubleSide
      });
    }
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    
    // Set position and rotation
    mesh.position.copy(position);
    mesh.rotation.copy(rotation);
    
    // Enable shadows
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    return { mesh, geometry, material };
  }
  
  /**
   * Create physics body and collider for a straight wall
   * @param id Wall ID
   * @param position Position of the wall
   * @param rotation Rotation of the wall
   * @param options Wall options
   * @returns Created physics body and collider
   */
  private createStraightWallPhysics(
    id: string,
    position: THREE.Vector3,
    rotation: THREE.Euler,
    options: WallOptions
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    // Create a static rigid body for the wall
    const body = createStaticBody(
      this.world,
      position,
      { type: 'wall', id } as PhysicsObjectData
    );
    
    // Determine dimensions based on rotation
    // If rotated around Y, swap length and thickness
    const isRotatedY = Math.abs(rotation.y) > 0.1;
    
    const halfExtents = {
      x: isRotatedY ? options.thickness / 2 : options.length / 2,
      y: options.height / 2,
      z: isRotatedY ? options.length / 2 : options.thickness / 2
    };
    
    // Get physics properties from MaterialManager if it exists
    let friction = options.friction || DEFAULT_WALL_OPTIONS.friction;
    let restitution = options.restitution || DEFAULT_WALL_OPTIONS.restitution;
    
    if (this.materialManager) {
      const properties = this.materialManager.getPhysicsProperties(options.materialType);
      friction = properties.friction;
      restitution = properties.restitution;
    }
    
    // Add a box collider for the wall
    const collider = addBoxCollider(
      this.world,
      body,
      halfExtents,
      { friction, restitution }
    );
    
    // Set rotation
    const q = new THREE.Quaternion().setFromEuler(rotation);
    body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
    
    return { body, collider };
  }
  
  /**
   * Create a mesh for a curved wall
   * @param position Center position of the curved wall
   * @param options Wall options
   * @returns Created mesh, geometry, and material
   */
  private createCurvedWallMesh(
    position: THREE.Vector3,
    options: WallOptions
  ): { mesh: THREE.Mesh; geometry: THREE.BufferGeometry; material: THREE.Material } {
    const radius = options.radius || 10;
    const segments = options.segments || 16;
    const angleStart = options.angleStart || 0;
    const angleEnd = options.angleEnd || Math.PI / 2;
    
    // Create a custom geometry for the curved wall
    const geometry = new THREE.BufferGeometry();
    
    // Generate vertices for the curved wall
    // We'll create a series of quads arranged in a curve
    
    const vertices: number[] = [];
    const indices: number[] = [];
    const angleStep = (angleEnd - angleStart) / segments;
    
    // Create vertices
    // For each segment, we create 4 vertices (2 for inner radius, 2 for outer radius)
    for (let i = 0; i <= segments; i++) {
      const angle = angleStart + i * angleStep;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      // Inner bottom vertex
      vertices.push(
        (radius - options.thickness / 2) * cos,
        0,
        (radius - options.thickness / 2) * sin
      );
      
      // Inner top vertex
      vertices.push(
        (radius - options.thickness / 2) * cos,
        options.height,
        (radius - options.thickness / 2) * sin
      );
      
      // Outer bottom vertex
      vertices.push(
        (radius + options.thickness / 2) * cos,
        0,
        (radius + options.thickness / 2) * sin
      );
      
      // Outer top vertex
      vertices.push(
        (radius + options.thickness / 2) * cos,
        options.height,
        (radius + options.thickness / 2) * sin
      );
    }
    
    // Create indices for triangles
    for (let i = 0; i < segments; i++) {
      const base = i * 4;
      
      // Inner face (two triangles for inner curved surface)
      indices.push(base, base + 1, base + 4);
      indices.push(base + 1, base + 5, base + 4);
      
      // Outer face (two triangles for outer curved surface)
      indices.push(base + 2, base + 6, base + 3);
      indices.push(base + 3, base + 6, base + 7);
      
      // Bottom face (two triangles for bottom)
      indices.push(base, base + 4, base + 2);
      indices.push(base + 2, base + 4, base + 6);
      
      // Top face (two triangles for top)
      indices.push(base + 1, base + 3, base + 5);
      indices.push(base + 3, base + 7, base + 5);
    }
    
    // Add the vertices and indices to the geometry
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    
    // Compute vertex normals for proper lighting
    geometry.computeVertexNormals();
    
    // Create material from the MaterialManager if it exists
    let material: THREE.Material;
    if (this.materialManager) {
      material = this.materialManager.createThreeMaterial(options.materialType);
    } else {
      // Fallback to a basic material with the specified color
      material = new THREE.MeshStandardMaterial({
        color: options.color || 0x999999,
        roughness: 0.7,
        metalness: 0.3,
        side: THREE.DoubleSide
      });
    }
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    
    // Set position
    mesh.position.copy(position);
    
    // Enable shadows
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    return { mesh, geometry, material };
  }
  
  /**
   * Create physics body and collider for a curved wall
   * @param id Wall ID
   * @param position Position of the wall
   * @param options Wall options
   * @returns Created physics body, main collider, and curve info
   */
  private createCurvedWallPhysics(
    id: string,
    position: THREE.Vector3,
    options: WallOptions
  ): { 
    body: RAPIER.RigidBody; 
    collider: RAPIER.Collider;
    curveInfo: { 
      radius: number; 
      angleStart: number; 
      angleEnd: number;
      segments: number;
    } 
  } {
    // Get curve parameters
    const radius = options.radius || 10;
    const segments = options.segments || 16;
    const angleStart = options.angleStart || 0;
    const angleEnd = options.angleEnd || Math.PI / 2;
    const angleStep = (angleEnd - angleStart) / segments;
    
    // Create a static rigid body for the wall
    const body = createStaticBody(
      this.world,
      position,
      { type: 'wall', id } as PhysicsObjectData
    );
    
    // Get physics properties from MaterialManager if it exists
    let friction = options.friction || DEFAULT_WALL_OPTIONS.friction;
    let restitution = options.restitution || DEFAULT_WALL_OPTIONS.restitution;
    
    if (this.materialManager) {
      const properties = this.materialManager.getPhysicsProperties(options.materialType);
      friction = properties.friction;
      restitution = properties.restitution;
    }
    
    // We'll approximate the curved wall with a series of box colliders
    // Note: With a more advanced physics library, we might use a trimesh collider
    
    // Create a "main" collider for reference (the first segment)
    // This is the one we'll return, though we'll add multiple to the body
    let mainCollider: RAPIER.Collider | null = null;
    
    for (let i = 0; i < segments; i++) {
      const angle = angleStart + i * angleStep + angleStep / 2; // Center of the segment
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      // Calculate the position of this segment relative to the center
      const segmentX = radius * cos;
      const segmentZ = radius * sin;
      
      // Create the translation for this segment
      const segmentTranslation = {
        x: segmentX,
        y: options.height / 2, // Center vertically
        z: segmentZ
      };
      
      // Calculate the rotation of this segment (perpendicular to the radius)
      const segmentRotation = Math.atan2(segmentZ, segmentX) + Math.PI / 2;
      
      // Width of the segment along the curve
      const segmentWidth = 2 * radius * Math.sin(angleStep / 2);
      
      // Set position relative to the body's origin
      // Instead of using setTranslationRelativeToBody, we need to create the collider description
      // with the relative translation and rotation
      // Create a ColliderDesc to modify before attaching it
      const colliderDesc = RAPIER.ColliderDesc.cuboid(
        segmentWidth / 2,
        options.height / 2,
        options.thickness / 2
      )
      .setTranslation(segmentTranslation.x, segmentTranslation.y, segmentTranslation.z)
      .setFriction(friction || 0.3) // Default to 0.3 if undefined
      .setRestitution(restitution || 0.5); // Default to 0.5 if undefined
      
      // Set rotation for this segment
      const q = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0), // Rotate around Y axis
        segmentRotation
      );
      
      // Set rotation using the quaternion
      colliderDesc.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
      
      // Create the collider with the desc
      const collider = this.world.createCollider(colliderDesc, body);
      
      // Store the first collider as the main reference
      if (i === 0) {
        mainCollider = collider;
      }
    }
    
    // If we didn't create any colliders, create a dummy one
    // This shouldn't happen with standard parameters
    if (!mainCollider) {
      mainCollider = addBoxCollider(
        this.world,
        body,
        {
          x: options.thickness / 2,
          y: options.height / 2,
          z: options.thickness / 2
        },
        { friction, restitution }
      );
    }
    
    return { 
      body, 
      collider: mainCollider,
      curveInfo: {
        radius,
        angleStart,
        angleEnd,
        segments
      }
    };
  }
} 