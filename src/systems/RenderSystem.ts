import * as THREE from 'three';

/**
 * Creates and configures a WebGL renderer
 */
export function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  // Create the renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  
  // Configure renderer
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  
  // Add renderer to container
  container.appendChild(renderer.domElement);
  
  return renderer;
} 