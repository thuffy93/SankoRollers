// Import Three.js
import * as THREE from 'three';

// Import Rapier physics
import RAPIER from '@dimforge/rapier3d-compat';
import { initRapier } from './systems/PhysicsSystem';

// Import components
import { MaterialTestScene } from './scenes/MaterialTestScene';
import { CourseLoaderTestScene } from './scenes/CourseLoaderTestScene';
import { Scene as GameScene } from './scenes/Scene';

// Main function
async function main() {
  // Initialize Rapier physics
  await initRapier();
  
  // Initialize the renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
  
  // Create scene based on URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const sceneParam = urlParams.get('scene');
  
  let scene: GameScene;
  
  switch (sceneParam) {
    case 'material':
      scene = new MaterialTestScene();
      break;
    case 'course':
    default:
      scene = new CourseLoaderTestScene();
      break;
  }
  
  scene.init();
  
  // Handle window resize
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    scene.resize(window.innerWidth, window.innerHeight);
  });
  
  // Animation loop
  const clock = new THREE.Clock();
  
  function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = Math.min(clock.getDelta(), 0.1); // Cap delta time to avoid huge jumps
    
    // Update and render the scene
    scene.update(deltaTime);
    scene.render(renderer);
  }
  
  // Start the animation loop
  animate();
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    scene.dispose();
  });
}

// Start the application
main().catch(console.error); 