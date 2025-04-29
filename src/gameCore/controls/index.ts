import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { InputManager } from './InputManager';
import { ShotController } from './ShotController';
import { TrajectoryVisualizer } from './TrajectoryVisualizer';
import { WallClingDetector } from './WallClingDetector';
import { InputState, InputDevice, TrajectoryPoint } from './types';

// Re-export all types and classes
export {
  InputManager,
  ShotController,
  TrajectoryVisualizer,
  WallClingDetector,
  InputState,
  InputDevice,
  TrajectoryPoint
};

/**
 * Initialize all control systems
 */
export function initControls(
  camera: THREE.Camera, 
  domElement: HTMLElement,
  playerBallBody: RAPIER.RigidBody,
  playerBallMesh: THREE.Mesh,
  scene: THREE.Scene,
  world: RAPIER.World
) {
  // Create input manager
  const inputManager = new InputManager();
  
  // Create shot controller
  const shotController = new ShotController(scene, playerBallBody, world);
  
  // Create wall cling detector
  const wallClingDetector = new WallClingDetector(
    scene,
    playerBallBody,
    playerBallMesh,
    world
  );
  
  // Create update function
  const updateControls = () => {
    inputManager.update();
    wallClingDetector.update();
  };
  
  // Return all controllers and update function
  return {
    inputManager,
    shotController,
    wallClingDetector,
    updateControls
  };
} 