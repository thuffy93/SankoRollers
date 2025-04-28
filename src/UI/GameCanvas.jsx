// src/UI/GameCanvas.jsx
import React, { useRef, useEffect, useState } from 'react';
import { useUIContext } from './UIContext';
import Game from '../GameEngine/Game';

/**
 * GameCanvas component for rendering the Three.js scene
 */
const GameCanvas = ({ gameSettings = {} }) => {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Get UI context
  const {
    setGameStarted,
    setCurrentHole,
    setTotalHoles,
    setHoleStrokes,
    setTotalStrokes,
    setShotState,
    setShotPower,
    setDailyModifier,
    settings
  } = useUIContext();
  
  // Initialize the game when component mounts
  useEffect(() => {
    let isMounted = true;
    
    const initGame = async () => {
      try {
        if (!canvasRef.current) return;
        
        // Merge settings with gameSettings
        const mergedSettings = {
          ...gameSettings,
          totalHoles: settings.totalHoles,
          difficulty: settings.difficulty,
          visualStyle: settings.visualStyle
        };
        
        // Create game instance
        const game = new Game({
          canvas: canvasRef.current,
          debug: mergedSettings.debug || false,
          totalHoles: mergedSettings.totalHoles || 9,
          difficulty: mergedSettings.difficulty || 1,
          seed: mergedSettings.seed || Date.now(),
          visualStyle: mergedSettings.visualStyle || 'standard'
        });
        
        // Initialize game
        await game.init();
        
        if (isMounted) {
          // Store game reference
          gameRef.current = game;
          
          // Set up event listeners for state updates
          setupEventListeners(game);
          
          // Update UI with initial game state
          updateUIFromGameState(game);
          
          // Update loading state
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to initialize game:', error);
        
        if (isMounted) {
          setErrorMessage('Failed to initialize game. Please try refreshing the page.');
          setIsLoading(false);
        }
      }
    };
    
    initGame();
    
    // Clean up on unmount
    return () => {
      isMounted = false;
      
      if (gameRef.current) {
        // Clean up event listeners
        cleanupEventListeners(gameRef.current);
        
        // Dispose game
        gameRef.current.dispose();
        gameRef.current = null;
      }
    };
  }, [gameSettings, settings.totalHoles, settings.difficulty, settings.visualStyle]);
  
  // Set up event listeners for the game
  const setupEventListeners = (game) => {
    if (!game || !game.world) return;
    
    // Listen for hole completed event
    game.world.on('holeCompleted', handleHoleCompleted);
    
    // Listen for shot state changed event
    game.world.on('shotStateChanged', handleShotStateChanged);
    
    // Listen for game completed event
    game.world.on('gameCompleted', handleGameCompleted);
    
    // Listen for shot fired event
    game.world.on('shotFired', handleShotFired);
  };
  
  // Clean up event listeners
  const cleanupEventListeners = (game) => {
    if (!game || !game.world) return;
    
    // Remove event listeners
    game.world.off('holeCompleted', handleHoleCompleted);
    game.world.off('shotStateChanged', handleShotStateChanged);
    game.world.off('gameCompleted', handleGameCompleted);
    game.world.off('shotFired', handleShotFired);
  };
  
  // Update UI state from game state
  const updateUIFromGameState = (game) => {
    if (!game) return;
    
    // Get current game state
    const state = game.getState();
    
    // Update UI state
    setGameStarted(true);
    setCurrentHole(state.currentHole);
    setTotalHoles(state.totalHoles);
    setHoleStrokes(state.holeStrokes);
    setTotalStrokes(state.totalStrokes);
    setShotState(state.shotState);
    setDailyModifier(state.dailyModifier);
  };
  
  // Event handlers
  const handleHoleCompleted = (data) => {
    console.log('Hole completed:', data);
    
    // Update UI state
    setHoleStrokes(data.strokes);
    setTotalStrokes(data.totalStrokes);
  };
  
  const handleShotStateChanged = (data) => {
    console.log('Shot state changed:', data);
    
    // Update UI state
    setShotState(data.state);
  };
  
  const handleGameCompleted = (data) => {
    console.log('Game completed:', data);
  };
  
  const handleShotFired = (data) => {
    console.log('Shot fired:', data);
    
    // Update UI state
    setHoleStrokes(prevStrokes => prevStrokes + 1);
    setTotalStrokes(prevTotal => prevTotal + 1);
  };
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        // Update canvas dimensions
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        
        // Notify game of resize
        if (gameRef.current && gameRef.current.handleResize) {
          gameRef.current.handleResize();
        }
      }
    };
    
    // Set initial dimensions
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Apply settings changes to game
  useEffect(() => {
    if (!gameRef.current) return;
    
    // Apply visual style change
    if (settings.visualStyle === 'moebius' && 
        gameRef.current.visualStyle !== 'moebius') {
      // Toggle visual style
      gameRef.current.world.triggerEvent('visualStyleToggle');
    } else if (settings.visualStyle === 'standard' && 
              gameRef.current.visualStyle !== 'standard') {
      // Toggle visual style
      gameRef.current.world.triggerEvent('visualStyleToggle');
    }
  }, [settings.visualStyle]);
  
  return (
    <div className="game-container">
      {isLoading ? (
        <div className="loading-screen">
          <h1 className="loading-title">Cosmic Rollers</h1>
          <div className="loading-spinner"></div>
          <p>Loading game...</p>
        </div>
      ) : errorMessage ? (
        <div className="error-screen">
          <h1>Error</h1>
          <p>{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      ) : (
        <canvas ref={canvasRef} className="game-canvas" />
      )}
    </div>
  );
};

export default GameCanvas;