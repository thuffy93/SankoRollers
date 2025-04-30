import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsObjectData } from '../systems/PhysicsSystem';

/**
 * Physics material properties for surface types
 */
export interface PhysicsMaterialProperties {
  friction: number;
  restitution: number;
  rollingFriction?: number; // For future use with rolling resistance
  roughness?: number; // Used to control ball spin behavior
  density?: number; // For future use with dynamic rigidbodies
}

/**
 * Visual material properties
 */
export interface VisualMaterialProperties {
  color: number;
  roughness: number;
  metalness: number;
  opacity?: number;
  transparent?: boolean;
  wireframe?: boolean;
  mapTexture?: string; // Texture path
  normalMapTexture?: string; // Normal map path
  roughnessMapTexture?: string; // Roughness map path
}

/**
 * Combined material definition including both physics and visual properties
 */
export interface MaterialDefinition {
  id: string;
  name: string;
  category: string;
  physics: PhysicsMaterialProperties;
  visual: VisualMaterialProperties;
  description?: string;
}

/**
 * Default material types and their properties
 */
export const DEFAULT_MATERIALS: { [key: string]: MaterialDefinition } = {
  // Standard grass terrain
  'grass': {
    id: 'grass',
    name: 'Grass',
    category: 'terrain',
    physics: {
      friction: 0.5,
      restitution: 0.3,
      rollingFriction: 0.6,
      roughness: 0.6
    },
    visual: {
      color: 0x4CAF50, // Green
      roughness: 0.9,
      metalness: 0.0
    },
    description: 'Standard grass surface with medium friction'
  },
  
  // Fairway (shorter grass) - lower friction
  'fairway': {
    id: 'fairway',
    name: 'Fairway',
    category: 'terrain',
    physics: {
      friction: 0.4,
      restitution: 0.4,
      rollingFriction: 0.3,
      roughness: 0.3
    },
    visual: {
      color: 0x8BC34A, // Light green
      roughness: 0.7,
      metalness: 0.0
    },
    description: 'Short grass fairway with lower friction for better rolling'
  },
  
  // Green (very short grass) - very low friction
  'green': {
    id: 'green',
    name: 'Green',
    category: 'terrain',
    physics: {
      friction: 0.2,
      restitution: 0.5,
      rollingFriction: 0.1,
      roughness: 0.1
    },
    visual: {
      color: 0xA5D6A7, // Very light green
      roughness: 0.5,
      metalness: 0.0
    },
    description: 'Putting green with very low friction for smooth ball rolling'
  },
  
  // Rough terrain (tall grass) - high friction
  'rough': {
    id: 'rough',
    name: 'Rough',
    category: 'terrain',
    physics: {
      friction: 0.8,
      restitution: 0.2,
      rollingFriction: 0.9,
      roughness: 0.9
    },
    visual: {
      color: 0x33691E, // Dark green
      roughness: 1.0,
      metalness: 0.0
    },
    description: 'Tall grass rough with high friction that slows the ball'
  },
  
  // Sand bunker - high friction, low restitution
  'sand': {
    id: 'sand',
    name: 'Sand',
    category: 'terrain',
    physics: {
      friction: 0.9,
      restitution: 0.1,
      rollingFriction: 0.8,
      roughness: 0.8
    },
    visual: {
      color: 0xFFECB3, // Light sand color
      roughness: 1.0,
      metalness: 0.0
    },
    description: 'Sand bunker with high friction and minimal bounce'
  },
  
  // Water hazard
  'water': {
    id: 'water',
    name: 'Water',
    category: 'terrain',
    physics: {
      friction: 0.3,
      restitution: 0.0, // No bounce (ball would sink)
      rollingFriction: 0.0,
      roughness: 0.0
    },
    visual: {
      color: 0x2196F3, // Blue
      roughness: 0.1,
      metalness: 0.3,
      opacity: 0.8,
      transparent: true
    },
    description: 'Water hazard that will cause the ball to be lost'
  },
  
  // Ice - very slippery
  'ice': {
    id: 'ice',
    name: 'Ice',
    category: 'terrain',
    physics: {
      friction: 0.05,
      restitution: 0.8,
      rollingFriction: 0.02,
      roughness: 0.0
    },
    visual: {
      color: 0xE1F5FE, // Very light blue
      roughness: 0.1,
      metalness: 0.5,
      opacity: 0.9,
      transparent: true
    },
    description: 'Icy surface with very low friction for slippery conditions'
  },
  
  // Mud - very high friction
  'mud': {
    id: 'mud',
    name: 'Mud',
    category: 'terrain',
    physics: {
      friction: 0.95,
      restitution: 0.05,
      rollingFriction: 0.95,
      roughness: 0.9
    },
    visual: {
      color: 0x5D4037, // Brown
      roughness: 0.9,
      metalness: 0.1
    },
    description: 'Mud that significantly slows ball movement'
  },
  
  // Standard wall material
  'wall': {
    id: 'wall',
    name: 'Wall',
    category: 'obstacle',
    physics: {
      friction: 0.3,
      restitution: 0.6
    },
    visual: {
      color: 0x607D8B, // Blue gray
      roughness: 0.7,
      metalness: 0.3
    },
    description: 'Standard wall material with moderate bounce'
  },
  
  // Metal material - high bounce
  'metal': {
    id: 'metal',
    name: 'Metal',
    category: 'obstacle',
    physics: {
      friction: 0.2,
      restitution: 0.9
    },
    visual: {
      color: 0x9E9E9E, // Medium gray
      roughness: 0.2,
      metalness: 0.8
    },
    description: 'Metal surface with high bounce'
  },
  
  // Wood material
  'wood': {
    id: 'wood',
    name: 'Wood',
    category: 'obstacle',
    physics: {
      friction: 0.4,
      restitution: 0.5
    },
    visual: {
      color: 0x8D6E63, // Brown
      roughness: 0.8,
      metalness: 0.1
    },
    description: 'Wooden surface with moderate friction and bounce'
  },
  
  // Stone material
  'stone': {
    id: 'stone',
    name: 'Stone',
    category: 'obstacle',
    physics: {
      friction: 0.5,
      restitution: 0.4
    },
    visual: {
      color: 0x757575, // Dark gray
      roughness: 0.9,
      metalness: 0.1
    },
    description: 'Stone surface with moderate friction'
  },
  
  // Glass material
  'glass': {
    id: 'glass',
    name: 'Glass',
    category: 'obstacle',
    physics: {
      friction: 0.1,
      restitution: 0.8
    },
    visual: {
      color: 0xCFD8DC, // Very light blue-gray
      roughness: 0.1,
      metalness: 0.3,
      opacity: 0.3,
      transparent: true
    },
    description: 'Glass surface with low friction and high bounce'
  },
  
  // Rubber material - absorbs impact
  'rubber': {
    id: 'rubber',
    name: 'Rubber',
    category: 'obstacle',
    physics: {
      friction: 0.7,
      restitution: 0.3
    },
    visual: {
      color: 0x212121, // Nearly black
      roughness: 0.9,
      metalness: 0.0
    },
    description: 'Rubber surface with high friction and low bounce'
  }
};

/**
 * Material manager for handling physics and visual materials
 */
export class MaterialManager {
  private materials: Map<string, MaterialDefinition>;
  private textureLoader: THREE.TextureLoader;
  
  /**
   * Create a new MaterialManager
   */
  constructor() {
    this.materials = new Map();
    this.textureLoader = new THREE.TextureLoader();
    
    // Initialize with default materials
    this.initializeDefaultMaterials();
  }
  
  /**
   * Initialize with default material definitions
   */
  private initializeDefaultMaterials(): void {
    // Add all default materials to the map
    Object.values(DEFAULT_MATERIALS).forEach(material => {
      this.materials.set(material.id, material);
    });
    
    console.log(`Initialized ${this.materials.size} default materials`);
  }
  
  /**
   * Add a custom material definition
   * @param material The material definition to add
   * @returns True if added successfully
   */
  public addMaterial(material: MaterialDefinition): boolean {
    // Check if the material id already exists
    if (this.materials.has(material.id)) {
      console.warn(`Material with id ${material.id} already exists`);
      return false;
    }
    
    // Add the material
    this.materials.set(material.id, material);
    console.log(`Added new material: ${material.name} (${material.id})`);
    return true;
  }
  
  /**
   * Get a material definition by ID
   * @param id Material ID
   * @returns The material definition or undefined if not found
   */
  public getMaterial(id: string): MaterialDefinition | undefined {
    return this.materials.get(id);
  }
  
  /**
   * Create a THREE.js material from a material definition ID
   * @param materialId Material ID
   * @returns Created THREE.js material
   */
  public createThreeMaterial(materialId: string): THREE.Material {
    // Get the material definition
    const materialDef = this.materials.get(materialId);
    
    // If material not found, return a default material
    if (!materialDef) {
      console.warn(`Material ${materialId} not found, using default`);
      return new THREE.MeshStandardMaterial({
        color: 0xFF0000, // Red to indicate error
        roughness: 0.5,
        metalness: 0.3
      });
    }
    
    // Extract visual properties
    const visual = materialDef.visual;
    
    // Create different material types based on properties
    if (visual.transparent) {
      // For transparent materials (glass, water, etc.)
      return new THREE.MeshPhysicalMaterial({
        color: visual.color,
        roughness: visual.roughness,
        metalness: visual.metalness,
        transparent: true,
        opacity: visual.opacity || 0.5,
        wireframe: visual.wireframe || false,
        side: THREE.DoubleSide
      });
    } else {
      // Standard materials
      const material = new THREE.MeshStandardMaterial({
        color: visual.color,
        roughness: visual.roughness,
        metalness: visual.metalness,
        wireframe: visual.wireframe || false,
        side: THREE.DoubleSide
      });
      
      // Load and apply textures if specified
      if (visual.mapTexture) {
        material.map = this.textureLoader.load(visual.mapTexture);
      }
      
      if (visual.normalMapTexture) {
        material.normalMap = this.textureLoader.load(visual.normalMapTexture);
      }
      
      if (visual.roughnessMapTexture) {
        material.roughnessMap = this.textureLoader.load(visual.roughnessMapTexture);
      }
      
      return material;
    }
  }
  
  /**
   * Get physics properties for a material by ID
   * @param materialId Material ID
   * @returns Physics properties
   */
  public getPhysicsProperties(materialId: string): PhysicsMaterialProperties {
    // Get the material definition
    const materialDef = this.materials.get(materialId);
    
    // If material not found, return default properties
    if (!materialDef) {
      console.warn(`Material ${materialId} not found, using default physics properties`);
      return {
        friction: 0.5,
        restitution: 0.5
      };
    }
    
    return materialDef.physics;
  }
  
  /**
   * Apply physics material properties to a RAPIER collider
   * @param collider The collider to update
   * @param materialId Material ID
   */
  public applyPhysicsToCollider(collider: RAPIER.Collider, materialId: string): void {
    // Get the physics properties
    const properties = this.getPhysicsProperties(materialId);
    
    // Set the physics properties on the collider
    collider.setFriction(properties.friction);
    collider.setRestitution(properties.restitution);
    
    // Future: set density and other properties when RAPIER supports them
  }
  
  /**
   * Update terrain geometry with material properties
   * @param mesh The terrain mesh
   * @param materialId Material ID
   */
  public applyMaterialToTerrain(mesh: THREE.Mesh, materialId: string): void {
    // Get the material definition
    const materialDef = this.materials.get(materialId);
    
    // If material not found, log a warning and return
    if (!materialDef) {
      console.warn(`Material ${materialId} not found, terrain appearance unchanged`);
      return;
    }
    
    // Apply the THREE.js material to the mesh
    mesh.material = this.createThreeMaterial(materialId);
    
    // Set additional properties like receiveShadow
    mesh.receiveShadow = true;
  }
  
  /**
   * Apply a material to a wall or obstacle
   * @param mesh The wall/obstacle mesh
   * @param collider The physics collider
   * @param materialId Material ID
   */
  public applyMaterialToObstacle(
    mesh: THREE.Mesh,
    collider: RAPIER.Collider,
    materialId: string
  ): void {
    // Apply visual material
    mesh.material = this.createThreeMaterial(materialId);
    
    // Set shadow properties
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Apply physics properties
    this.applyPhysicsToCollider(collider, materialId);
  }
  
  /**
   * List all available material IDs
   * @param category Optional category filter
   * @returns Array of material IDs
   */
  public listMaterialIds(category?: string): string[] {
    const results: string[] = [];
    
    this.materials.forEach((material, id) => {
      if (!category || material.category === category) {
        results.push(id);
      }
    });
    
    return results;
  }
  
  /**
   * Get a list of all materials
   * @param category Optional category filter
   * @returns Array of material definitions
   */
  public getAllMaterials(category?: string): MaterialDefinition[] {
    const results: MaterialDefinition[] = [];
    
    this.materials.forEach(material => {
      if (!category || material.category === category) {
        results.push(material);
      }
    });
    
    return results;
  }
} 