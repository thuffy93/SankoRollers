// src/components/Game.jsx
import React, { useEffect, useRef, useState } from 'react';
import Game from '../GameEngine/Game';

const GameComponent = ({ gameSettings = {} }) => {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Initialize the game when component mounts
  useEffect(() => {
    let isMounted = true;
    
    const initGame = async () => {
      try {
        if (!canvasRef.current) return;

        // Create game instance
        const game = new Game({
          canvas: canvasRef.current,
          debug: gameSettings.debug || false,
          totalHoles: gameSettings.totalHoles || 9,
          difficulty: gameSettings.difficulty || 1,
          seed: gameSettings.seed || Date.now(),
          visualStyle: gameSettings.visualStyle || 'standard'
        });

        // Initialize game
        await game.init();
        
        if (isMounted) {
          // Store game reference
          gameRef.current = game;
          
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
        gameRef.current.dispose();
        gameRef.current = null;
      }
    };
  }, [gameSettings]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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

export default GameComponent;