import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { initScene } from './scene';
import { initPhysics, syncMeshWithBody, applyWallClingEffect } from './physics';
import { initCamera } from './camera';
import { initControls } from './controls';
import { GameState, gameStateManager } from '../utils/gameState';
import { EventType, eventsManager } from '../utils/events';
import { createDebugVisualizer } from '../utils/debug';
import { CourseGenerator } from './CourseGenerator';
import { GameManager, GameData } from './GameManager';
import { setupCollisionHandling, createCollisionEffect } from './collisionHandler';
import '../styles/Game.css';

// Environment check - simplified to avoid Node.js types issues
const isDevelopment = () => {
  // Default to enabled for development
  return true;
};

export const Game: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameManagerRef = useRef<GameManager | null>(null);
  const gameInfoRef = useRef<HTMLDivElement | null>(null);
  const [gameData, setGameData] = useState<GameData>({
    currentCourse: 0,
    totalCourses: 1,
    shotsPerHole: [],
    parPerHole: [],
    currentShots: 0,
    targetCount: 0,
    targetsHit: 0,
    holeComplete: false
  });
  
  // Define updateGameInfo function at component level
  const updateGameInfo = (gameInfoElement: HTMLDivElement) => {
    if (!gameInfoElement) return;
    
    gameInfoElement.innerHTML = `
      <div>Shots: ${gameData.currentShots}</div>
      <div>Targets: ${gameData.targetsHit}/${gameData.targetCount}</div>
      <div>Par: ${gameData.parPerHole[gameData.currentCourse] || 3}</div>
      <div>Course: ${gameData.currentCourse + 1}/${gameData.totalCourses}</div>
      ${gameData.holeComplete ? '<div class="complete">Hole Complete!</div>' : ''}
    `;
  };
  
  // Add effect to update game info when gameData changes
  useEffect(() => {
    if (gameInfoRef.current) {
      updateGameInfo(gameInfoRef.current);
    }
  }, [gameData]);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Initialize game engine components
    const { scene, renderer } = initScene(containerRef.current);
    const { camera, cameraController } = initCamera();
    
    // Create debug visualizer
    const debugVisualizer = createDebugVisualizer(scene);
    
    // Default to enabled in development
    debugVisualizer.setEnabled(isDevelopment());
    
    let courseGenerator: CourseGenerator;
    let playerBall: { mesh: THREE.Mesh; body: RAPIER.RigidBody };
    
    // Async setup
    const setup = async () => {
      // Initialize physics
      const { world, RAPIER } = await initPhysics();
      
      // Create player ball at origin to start
      const playerBall = createPlayerBall(scene, world);
      
      // Set up the game manager to handle game logic
      const gameManager = new GameManager(
        scene,
        world,
        playerBall,
        (updatedGameData) => {
          setGameData(updatedGameData);
        }
      );
      
      // Store reference to game manager
      gameManagerRef.current = gameManager;
      
      // Initialize controls with player ball body
      const { shotController, update } = 
        initControls(camera, renderer.domElement, playerBall.body, scene);
      
      // Create UI elements
      const uiElements = {
        powerMeter: document.createElement('div'),
        angleIndicator: document.createElement('div'),
        gameInfo: document.createElement('div'),
        resetButton: document.createElement('button')
      };
      
      // Set up UI
      setupUI(uiElements);
      
      // Set up event handlers
      setupEventHandlers(uiElements, playerBall, world);
      
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
          
          // Out of bounds check is now handled by GameManager (y < -10)
          if (position.y < -10) {
            eventsManager.publish(EventType.BALL_OUT_OF_BOUNDS, {});
          }
        }
        
        // Update controls
        update();
        
        // Render scene
        renderer.render(scene, camera);
      };
      
      animate();
    };
    
    /**
     * Create the player ball
     */
    const createPlayerBall = (
      scene: THREE.Scene,
      world: RAPIER.World,
      position = new THREE.Vector3(0, 1, 0),
      radius = 0.5
    ) => {
      // Create sphere geometry
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      
      // Create material
      const material = new THREE.MeshStandardMaterial({
        color: 0xff69b4, // Pink
        roughness: 0.3,
        metalness: 0.2
      });
      
      // Create mesh
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(position.x, position.y, position.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      
      // Create Rapier rigid body (dynamic)
      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y, position.z)
        .setCcdEnabled(true); // Enable CCD on the body
      const body = world.createRigidBody(bodyDesc);
      
      // Create collider
      const colliderDesc = RAPIER.ColliderDesc.ball(radius)
        .setRestitution(0.7) // Bounciness
        .setFriction(0.2);   // Smooth rolling
      
      world.createCollider(colliderDesc, body);
      
      return { mesh, body };
    };
    
    /**
     * Set up UI elements
     */
    const setupUI = (uiElements: { powerMeter: HTMLDivElement; angleIndicator: HTMLDivElement; gameInfo: HTMLDivElement; resetButton: HTMLButtonElement }) => {
      // Add CSS classes
      uiElements.powerMeter.className = 'power-meter';
      uiElements.powerMeter.innerHTML = '<div class="power-level"></div>';
      uiElements.angleIndicator.className = 'angle-indicator';
      uiElements.angleIndicator.innerHTML = '<div class="angle-arrow"></div>';
      uiElements.gameInfo.className = 'game-info';
      
      // Store gameInfo element in ref for updates
      gameInfoRef.current = uiElements.gameInfo;
      
      // Setup reset button
      uiElements.resetButton.className = 'reset-button';
      uiElements.resetButton.textContent = 'Reset Game';
      uiElements.resetButton.onclick = () => {
        if (gameManagerRef.current) {
          gameManagerRef.current.resetGame();
        }
        showMessage("Game Reset!");
      };
      
      // Create controls help
      const controlsHelp = document.createElement('div');
      controlsHelp.className = 'controls-help';
      controlsHelp.innerHTML = `
        <div>Space: Charge shot (power oscillates)</div>
        <div>Arrows: Adjust angle</div>
        <div>B + Arrows: Add spin & adjust hit position</div>
        <div>Z: Bounce (in motion)</div>
      `;
      
      // Append to container
      if (containerRef.current) {
        containerRef.current.appendChild(uiElements.powerMeter);
        containerRef.current.appendChild(uiElements.angleIndicator);
        containerRef.current.appendChild(uiElements.gameInfo);
        containerRef.current.appendChild(uiElements.resetButton);
        containerRef.current.appendChild(controlsHelp);
      }
      
      // Update game info
      updateGameInfo(uiElements.gameInfo);
      
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
      uiElements: { powerMeter: HTMLDivElement; angleIndicator: HTMLDivElement; gameInfo: HTMLDivElement; resetButton: HTMLButtonElement },
      playerBall: { mesh: THREE.Mesh; body: RAPIER.RigidBody },
      world: RAPIER.World
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
      
      // Listen for shot started
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
    
    /**
     * Show a message to the player
     */
    const showMessage = (text: string, duration: number = 3000) => {
      // Create message element if it doesn't exist
      let messageElement = document.getElementById('game-message');
      if (!messageElement && containerRef.current) {
        messageElement = document.createElement('div');
        messageElement.id = 'game-message';
        containerRef.current.appendChild(messageElement);
      }
      
      if (messageElement) {
        // Set message text
        messageElement.textContent = text;
        messageElement.className = 'show';
        
        // Hide after specified duration
        setTimeout(() => {
          if (messageElement) {
            messageElement.className = '';
          }
        }, duration);
      }
    };
    
    // Initialize the game
    setup().catch(console.error);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      // Remove UI elements
      const powerMeter = document.querySelector('.power-meter');
      const angleIndicator = document.querySelector('.angle-indicator');
      const gameInfo = document.querySelector('.game-info');
      const gameMessage = document.getElementById('game-message');
      const resetButton = document.querySelector('.reset-button');
      const controlsHelp = document.querySelector('.controls-help');
      
      // Clean up the DOM
      if (containerRef.current) {
        if (powerMeter) containerRef.current.removeChild(powerMeter);
        if (angleIndicator) containerRef.current.removeChild(angleIndicator);
        if (gameInfo) containerRef.current.removeChild(gameInfo);
        if (gameMessage) containerRef.current.removeChild(gameMessage);
        if (resetButton) containerRef.current.removeChild(resetButton);
        if (controlsHelp) containerRef.current.removeChild(controlsHelp);
      }
      
      // Clean up events
      eventsManager.clear();
    };
  }, []);
  
  // Handle window resize
  const handleResize = () => {
    if (!containerRef.current) return;
    
    // Let's handle this in a reference to avoid circular dependencies
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    // We'll have to update camera and renderer here in a real implementation
  };
  
  // Add window resize listener
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return <div ref={containerRef} className="game-container" />;
};