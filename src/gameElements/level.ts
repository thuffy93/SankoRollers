import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { createTerrain, createWall } from '../gameCore/objects';
import { createGoalHole } from './goalHole';
import { SurfaceType, setSurfaceProperties } from '../gameCore/physics';

/**
 * Level configuration interface
 */
export interface LevelConfig {
  // Level metadata
  id: number;
  name: string;
  par: number;
  
  // Level layout
  terrainSize: { width: number; height: number; depth: number };
  playerStart: { x: number; y: number; z: number };
  goalPosition: { x: number; y: number; z: number };
  
  // Obstacles and boundaries
  walls: Array<{
    size: { width: number; height: number; depth: number };
    position: { x: number; y: number; z: number };
  }>;
  
  // Special surfaces
  surfaces?: Array<{
    type: SurfaceType;
    size: { width: number; height: number; depth: number };
    position: { x: number; y: number; z: number };
  }>;
}

/**
 * Create a simple default level
 */
export function createDefaultLevel(): LevelConfig {
  return {
    id: 1,
    name: 'Level 1',
    par: 3,
    terrainSize: { width: 30, height: 30, depth: 1 },
    playerStart: { x: 0, y: 1, z: 0 },
    goalPosition: { x: 10, y: 0.01, z: 10 },
    walls: [
      // Left boundary
      {
        size: { width: 1, height: 2, depth: 30 },
        position: { x: -15, y: 1, z: 0 }
      },
      // Right boundary
      {
        size: { width: 1, height: 2, depth: 30 },
        position: { x: 15, y: 1, z: 0 }
      },
      // Top boundary
      {
        size: { width: 30, height: 2, depth: 1 },
        position: { x: 0, y: 1, z: -15 }
      },
      // Bottom boundary
      {
        size: { width: 30, height: 2, depth: 1 },
        position: { x: 0, y: 1, z: 15 }
      },
      // Simple obstacle
      {
        size: { width: 4, height: 2, depth: 0.5 },
        position: { x: 5, y: 1, z: 5 }
      }
    ],
    // Optional special surfaces
    surfaces: [
      // Ice patch
      {
        type: SurfaceType.ICE,
        size: { width: 4, height: 0.1, depth: 4 },
        position: { x: -5, y: 0.05, z: 5 }
      }
    ]
  };
}

/**
 * Load and build a level
 * @param scene Three.js scene
 * @param world Rapier physics world
 * @param levelConfig Level configuration
 * @returns Level objects including goal hole
 */
export function buildLevel(
  scene: THREE.Scene,
  world: RAPIER.World,
  levelConfig: LevelConfig = createDefaultLevel()
) {
  // Create main terrain
  const terrain = createTerrain(
    scene,
    world,
    levelConfig.terrainSize
  );
  
  // Create goal hole
  const goalHole = createGoalHole(
    scene,
    world,
    levelConfig.goalPosition
  );
  
  // Create walls for boundaries and obstacles
  const walls = levelConfig.walls.map(wallConfig => {
    return createWall(
      scene,
      world,
      wallConfig.size,
      wallConfig.position
    );
  });
  
  // Create special surfaces if specified
  const surfaces = [];
  if (levelConfig.surfaces) {
    for (const surfaceConfig of levelConfig.surfaces) {
      // Create surface geometry
      const geometry = new THREE.BoxGeometry(
        surfaceConfig.size.width,
        surfaceConfig.size.height,
        surfaceConfig.size.depth
      );
      
      // Create material based on surface type
      let color;
      switch (surfaceConfig.type) {
        case SurfaceType.ICE:
          color = 0xadd8e6; // Light blue
          break;
        case SurfaceType.SAND:
          color = 0xf5deb3; // Tan/sand color
          break;
        case SurfaceType.BOUNCE_PAD:
          color = 0xff69b4; // Pink
          break;
        default:
          color = 0x888888; // Gray
      }
      
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.8,
        metalness: 0.2
      });
      
      // Create mesh
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        surfaceConfig.position.x,
        surfaceConfig.position.y,
        surfaceConfig.position.z
      );
      mesh.receiveShadow = true;
      scene.add(mesh);
      
      // Create Rapier body (static)
      const bodyDesc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(
          surfaceConfig.position.x,
          surfaceConfig.position.y,
          surfaceConfig.position.z
        );
      const body = world.createRigidBody(bodyDesc);
      
      // Create collider
      const colliderDesc = RAPIER.ColliderDesc.cuboid(
        surfaceConfig.size.width / 2,
        surfaceConfig.size.height / 2,
        surfaceConfig.size.depth / 2
      );
      const collider = world.createCollider(colliderDesc, body);
      
      // Set surface properties
      setSurfaceProperties(collider, surfaceConfig.type);
      
      surfaces.push({ mesh, body, collider });
    }
  }
  
  // Return all level objects
  return {
    terrain,
    goalHole,
    walls,
    surfaces,
    playerStart: levelConfig.playerStart,
    config: levelConfig
  };
} 