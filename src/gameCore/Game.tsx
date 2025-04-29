import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { initScene } from './scene';
import { initPhysics, syncMeshWithBody, applyWallClingEffect } from './physics';
import { initCamera } from './camera';
import { initControls } from './controls';
import { createTerrain, createPlayerBall, createWall } from './objects';
import { GameState, gameStateManager } from '../utils/gameState';
import { EventType, eventsManager } from '../utils/events';
import { createDebugVisualizer } from '../utils/debug';
import '../styles/Game.css'; // Fixed capitalization

// Environment check - simplified to avoid Node.js types issues
const isDevelopment = () => {
  // Default to enabled for development
  return true;
};

export const Game: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Initialize game engine components
    const { scene, renderer } = initScene(containerRef.current);
    const { camera, cameraController } = initCamera();
    
    // Create debug visualizer
    const debugVisualizer = createDebugVisualizer(scene);
    
    // Default to enabled in development
    debugVisualizer.setEnabled(isDevelopment());
    
    // Async setup
    const setup = async () => {
      // Initialize physics
      const { world, RAPIER } = await initPhysics();
      
      // Create game objects
      const terrain = createTerrain(scene, world);
      const playerBall = createPlayerBall(scene, world);
      
      // Add a wall for testing wall-clinging
      const wall = createWall(scene, world);
      
      // Initialize controls with player ball body
      const { orbitControls, shotController, update: updateControls } = 
        initControls(camera, renderer.domElement, playerBall.body, scene);
      
      // Create UI elements (to be implemented)
      const uiElements = {
        powerMeter: document.createElement('div'),
        angleIndicator: document.createElement('div')
      };
      
      // Set up UI
      setupUI(uiElements);
      
      // Set up event handlers
      setupEventHandlers(uiElements, playerBall);
      
      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        
        // Update physics
        world.step();
        
        // Apply wall-clinging effect if needed
        applyWallClingEffect(playerBall.body, world);
        
        // Sync meshes with physics bodies
        syncMeshWithBody(playerBall.mesh, playerBall.body);
        
        // Update camera controller with ball position
        const ballPosition = playerBall.body.translation();
        cameraController.updateBallPosition(
          new THREE.Vector3(ballPosition.x, ballPosition.y, ballPosition.z)
        );
        cameraController.update();
        
        // Update debug visualizer with ball velocity
        if (gameStateManager.isState(GameState.ROLLING)) {
          const velocity = playerBall.body.linvel();
          const position = playerBall.body.translation();
          debugVisualizer.visualizeVelocity(
            new THREE.Vector3(position.x, position.y, position.z),
            new THREE.Vector3(velocity.x, velocity.y, velocity.z)
          );
          
          // Add to trajectory if in motion
          if (velocity.x !== 0 || velocity.y !== 0 || velocity.z !== 0) {
            debugVisualizer.addTrajectoryPoint(
              new THREE.Vector3(position.x, position.y, position.z)
            );
          }
        }
        
        // Update controls
        updateControls();
        
        // Render scene
        renderer.render(scene, camera);
      };
      
      animate();
    };
    
    /**
     * Set up UI elements
     */
    const setupUI = (uiElements: { powerMeter: HTMLDivElement; angleIndicator: HTMLDivElement }) => {
      // Add CSS classes
      uiElements.powerMeter.className = 'power-meter';
      uiElements.powerMeter.innerHTML = '<div class="power-level"></div>';
      uiElements.angleIndicator.className = 'angle-indicator';
      uiElements.angleIndicator.innerHTML = '<div class="angle-arrow"></div>';
      
      // Append to container
      if (containerRef.current) {
        containerRef.current.appendChild(uiElements.powerMeter);
        containerRef.current.appendChild(uiElements.angleIndicator);
      }
      
      // Initially hide UI elements
      uiElements.powerMeter.style.display = 'none';
      uiElements.angleIndicator.style.display = 'none';
      
      // Show/hide based on game state
      gameStateManager.onEnterState(GameState.AIMING, () => {
        uiElements.angleIndicator.style.display = 'block';
      });
      
      gameStateManager.onEnterState(GameState.CHARGING, () => {
        uiElements.powerMeter.style.display = 'block';
      });
      
      gameStateManager.onEnterState(GameState.ROLLING, () => {
        uiElements.powerMeter.style.display = 'none';
        uiElements.angleIndicator.style.display = 'none';
      });
    };
    
    /**
     * Set up event handlers
     */
    const setupEventHandlers = (
      uiElements: { powerMeter: HTMLDivElement; angleIndicator: HTMLDivElement },
      playerBall: { mesh: THREE.Mesh; body: RAPIER.RigidBody }
    ) => {
      // Update angle indicator
      eventsManager.subscribe(EventType.ANGLE_CHANGED, (payload) => {
        const angleArrow = uiElements.angleIndicator.querySelector('.angle-arrow') as HTMLElement;
        if (angleArrow) {
          angleArrow.style.transform = `rotate(${payload.angle}rad)`;
        }
      });
      
      // Update power meter
      eventsManager.subscribe(EventType.POWER_CHANGED, (payload) => {
        const powerLevel = uiElements.powerMeter.querySelector('.power-level') as HTMLElement;
        if (powerLevel) {
          const percentage = (payload.power / 100) * 100;
          powerLevel.style.height = `${percentage}%`;
          
          // Change color based on power level
          if (percentage < 33) {
            powerLevel.style.backgroundColor = '#33cc33'; // Green
          } else if (percentage < 66) {
            powerLevel.style.backgroundColor = '#ffcc00'; // Yellow
          } else {
            powerLevel.style.backgroundColor = '#ff3300'; // Red
          }
        }
      });
      
      // Start trajectory visualization when shot starts
      eventsManager.subscribe(EventType.SHOT_STARTED, () => {
        const position = playerBall.body.translation();
        debugVisualizer.visualizeTrajectory(
          new THREE.Vector3(position.x, position.y, position.z)
        );
      });
      
      // Clear trajectory when ball stops
      eventsManager.subscribe(EventType.BALL_STOPPED, () => {
        setTimeout(() => {
          debugVisualizer.clearTrajectory();
          debugVisualizer.clearVelocityArrow();
        }, 1000); // Wait a second before clearing
      });
    };
    
    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Initialize the game
    setup().catch(console.error);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      // Remove UI elements
      const powerMeter = document.querySelector('.power-meter');
      const angleIndicator = document.querySelector('.angle-indicator');
      
      if (powerMeter && containerRef.current) {
        containerRef.current.removeChild(powerMeter);
      }
      
      if (angleIndicator && containerRef.current) {
        containerRef.current.removeChild(angleIndicator);
      }
      
      // Clean up events
      eventsManager.clear();
      
      renderer.dispose();
    };
  }, []);
  
  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}; 