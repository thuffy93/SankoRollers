import * as THREE from 'three';

/**
 * Input state interface for tracking user input
 */
export interface InputState {
  power: number;       // Power level for shots (0-100)
  angle: number;       // Angle for shots (in radians)
  spinning: boolean;   // Whether the player is adding spin
  spinDirection: { x: number; y: number }; // Direction of spin
}

/**
 * Trajectory point with additional metadata
 */
export interface TrajectoryPoint {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  surfaceType?: string; // Optional surface type at this point
}

/**
 * Input device types
 */
export enum InputDevice {
  KEYBOARD = 'KEYBOARD',
  GAMEPAD = 'GAMEPAD',
  TOUCH = 'TOUCH'
} 