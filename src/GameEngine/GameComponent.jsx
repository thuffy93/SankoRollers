// src/GameEngine/GameComponent.jsx
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useRapier } from '@react-three/rapier';

// Main Game Component
const GameComponent = () => {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const rollerRef = useRef(null);
  const [powerUp, setPowerUp] = useState(null);
  const [score, setScore] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [shotPower, setShotPower] = useState(0);

  // Initialize the game
  useEffect(() => {
    if (!canvasRef.current) return;

    // Setup Three.js
    sceneRef.current = new THREE.Scene();
    cameraRef.current = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    
    rendererRef.current = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      antialias: true
    });
    rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current.setClearColor(0x121212);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    sceneRef.current.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 5);
    sceneRef.current.add(directionalLight);
    
    // Position camera
    cameraRef.current.position.set(0, 5, 10);
    cameraRef.current.lookAt(0, 0, 0);
    
    // Create roller (ball)
    createRoller();
    
    // Create course
    createCourse();
    
    // Start animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      updatePhysics();
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    animate();
    
    // Handle window resize
    const handleResize = () => {
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    
    // Input handlers
    const handleKeyDown = (e) => {
      if (e.key === ' ') {
        // Start charging shot
        setIsCharging(true);
        chargeShotPower();
      }
      
      // Handle power-up activation
      if (e.key === 'e' && powerUp) {
        activatePowerUp();
      }
    };
    
    const handleKeyUp = (e) => {
      if (e.key === ' ' && isCharging) {
        // Release shot
        releaseShot();
        setIsCharging(false);
        setShotPower(0);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  // Create the roller (ball)
  const createRoller = () => {
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x00ff9f, 
      emissive: 0x00662b,
      emissiveIntensity: 0.3,
      shininess: 100
    });
    
    rollerRef.current = new THREE.Mesh(geometry, material);
    rollerRef.current.position.set(0, 1, 0);
    sceneRef.current.add(rollerRef.current);
    
    // TODO: Add Rapier physics body for the roller
  };
  
  // Create the course
  const createCourse = () => {
    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(30, 30);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x222266,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    sceneRef.current.add(ground);
    
    // Add hole (target)
    const holeGeometry = new THREE.CircleGeometry(0.7, 32);
    const holeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const hole = new THREE.Mesh(holeGeometry, holeMaterial);
    hole.position.set(10, 0.01, 0);
    hole.rotation.x = -Math.PI / 2;
    sceneRef.current.add(hole);
    
    // Add walls and obstacles
    createWalls();
    createObstacles();
    
    // Add power-up pickup
    createPowerUpPickup();
    
    // TODO: Add Rapier physics bodies for the course elements
  };
  
  // Create walls
  const createWalls = () => {
    const wallMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x6666ff,
      emissive: 0x0000ff,
      emissiveIntensity: 0.2,
      metalness: 0.5,
      roughness: 0.2
    });
    
    // Left wall
    const leftWallGeometry = new THREE.BoxGeometry(1, 2, 30);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(-15, 1, 0);
    sceneRef.current.add(leftWall);
    
    // Right wall
    const rightWallGeometry = new THREE.BoxGeometry(1, 2, 30);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(15, 1, 0);
    sceneRef.current.add(rightWall);
    
    // Back wall
    const backWallGeometry = new THREE.BoxGeometry(30, 2, 1);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, 1, -15);
    sceneRef.current.add(backWall);
    
    // Front wall
    const frontWallGeometry = new THREE.BoxGeometry(30, 2, 1);
    const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
    frontWall.position.set(0, 1, 15);
    sceneRef.current.add(frontWall);
  };
  
  // Create obstacles
  const createObstacles = () => {
    const obstacleMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff00ff,
      emissive: 0x660066,
      emissiveIntensity: 0.3,
      metalness: 0.7,
      roughness: 0.2
    });
    
    // Create some simple obstacles
    const obstacle1Geometry = new THREE.BoxGeometry(3, 1, 3);
    const obstacle1 = new THREE.Mesh(obstacle1Geometry, obstacleMaterial);
    obstacle1.position.set(5, 0.5, 5);
    sceneRef.current.add(obstacle1);
    
    const obstacle2Geometry = new THREE.CylinderGeometry(1, 1, 2, 32);
    const obstacle2 = new THREE.Mesh(obstacle2Geometry, obstacleMaterial);
    obstacle2.position.set(-3, 1, -4);
    sceneRef.current.add(obstacle2);
    
    const obstacle3Geometry = new THREE.BoxGeometry(1, 1, 5);
    const obstacle3 = new THREE.Mesh(obstacle3Geometry, obstacleMaterial);
    obstacle3.position.set(2, 0.5, -2);
    obstacle3.rotation.y = Math.PI / 4;
    sceneRef.current.add(obstacle3);
  };
  
  // Create power-up pickup
  const createPowerUpPickup = () => {
    const powerUpGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const powerUpMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffff00,
      emissive: 0x999900,
      emissiveIntensity: 0.5,
    });
    
    const powerUpMesh = new THREE.Mesh(powerUpGeometry, powerUpMaterial);
    powerUpMesh.position.set(-5, 0.5, 3);
    sceneRef.current.add(powerUpMesh);
    
    // TODO: Add collision detection with power-up
  };
  
  // Charge shot power
  const chargeShotPower = () => {
    // Increase shot power while space is held
    const powerInterval = setInterval(() => {
      if (isCharging) {
        setShotPower((prev) => Math.min(prev + 0.1, 10));
      } else {
        clearInterval(powerInterval);
      }
    }, 100);
    
    return () => clearInterval(powerInterval);
  };
  
  // Release shot
  const releaseShot = () => {
    if (!rollerRef.current) return;
    
    // TODO: Apply force to roller based on shotPower and direction
    console.log(`Shot released with power: ${shotPower}`);
    
    // Increment score
    setScore((prev) => prev + 1);
  };
  
  // Activate power-up
  const activatePowerUp = () => {
    if (!powerUp) return;
    
    console.log(`Power-up activated: ${powerUp}`);
    
    switch (powerUp) {
      case 'rocketDash':
        // Apply forward impulse
        // TODO: Implement rocket dash physics
        break;
      case 'stickyMode':
        // Increase friction coefficient
        // TODO: Implement sticky mode physics
        break;
      case 'gravityFlip':
        // Invert gravity direction
        // TODO: Implement gravity flip physics
        break;
      default:
        break;
    }
    
    // Clear power-up after use
    setPowerUp(null);
  };
  
  // Update physics simulation
  const updatePhysics = () => {
    // TODO: Update Rapier physics world
    // TODO: Sync Three.js objects with Rapier bodies
    
    // Example of updating roller position with simple physics (to be replaced with Rapier)
    if (rollerRef.current) {
      // Simple dampening
      rollerRef.current.position.x *= 0.99;
      rollerRef.current.position.z *= 0.99;
    }
  };
  
  return (
    <div className="game-container">
      <canvas ref={canvasRef} className="game-canvas" />
      
      <div className="game-ui">
        <div className="power-meter" style={{ width: `${shotPower * 10}%` }} />
        <div className="score-display">Strokes: {score}</div>
        {powerUp && <div className="power-up-indicator">Power-up: {powerUp}</div>}
      </div>
    </div>
  );
};

export default GameComponent;