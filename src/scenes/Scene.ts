import * as THREE from 'three';

/**
 * Interface for game scenes
 */
export interface Scene {
  /**
   * Initialize the scene
   */
  init(): void;
  
  /**
   * Update the scene
   * @param deltaTime Time since last frame in seconds
   */
  update(deltaTime: number): void;
  
  /**
   * Render the scene
   * @param renderer THREE.js renderer
   */
  render(renderer: THREE.WebGLRenderer): void;
  
  /**
   * Handle window resize
   * @param width New width
   * @param height New height
   */
  resize(width: number, height: number): void;
  
  /**
   * Clean up resources
   */
  dispose(): void;
} 