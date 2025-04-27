// src/components/GameUI.jsx
import React, { useState, useEffect } from 'react';
import GameEngine from '../GameEngine/GameEngine';

const GameUI = () => {
  // Game state
  const [gameCanvas, setGameCanvas] = useState(null);
  const [gameEngine, setGameEngine] = useState(null);
  const [gameState, setGameState] = useState({
    currentHole: 1,
    totalHoles: 9,
    holeStrokes: 0,
    totalStrokes: 0,
    powerUp: null,
    showPowerUpIndicator: false,
    holeCompleted: false,
    gameCompleted: false,
    dailyModifier: null,
    charging: false,
    chargePower: 0
  });
  
  // Component did mount
  useEffect(() => {
    // Initialize game when canvas is ready
    if (gameCanvas && !gameEngine) {
      const init = async () => {
        await initializeGame();
      };
      init().catch(console.error);
    }
    
    // Cleanup on unmount
    return () => {
      if (gameEngine) {
        gameEngine.dispose();
      }
    };
  }, [gameCanvas, gameEngine]);
  
  // Initialize the game engine
  const initializeGame = async () => {
    // Create new game engine instance
    const engine = new GameEngine(gameCanvas);
    
    // Wait for initialization to complete
    await engine.init();
    
    // Set up event listeners
    engine.on('courseGenerated', handleCourseGenerated);
    engine.on('stroke', handleStroke);
    engine.on('powerUpCollected', handlePowerUpCollected);
    engine.on('holeCompleted', handleHoleCompleted);
    engine.on('gameCompleted', handleGameCompleted);
    
    // Store engine instance
    setGameEngine(engine);
  };
  
  // Toggle the visual style
  const toggleVisualStyle = () => {
    if (gameEngine) {
      gameEngine.toggleVisualStyle();
    }
  };
  
  // Handle course generated event
  const handleCourseGenerated = (data) => {
    setGameState(prevState => ({
      ...prevState,
      currentHole: data.currentHole,
      totalHoles: data.totalHoles,
      holeStrokes: 0,
      holeCompleted: false,
      dailyModifier: data.dailyModifier
    }));
  };
  
  // Handle stroke event
  const handleStroke = (data) => {
    setGameState(prevState => ({
      ...prevState,
      holeStrokes: data.holeStrokes,
      totalStrokes: data.totalStrokes
    }));
  };
  
  // Handle power-up collected event
  const handlePowerUpCollected = (data) => {
    setGameState(prevState => ({
      ...prevState,
      powerUp: data.type,
      showPowerUpIndicator: true
    }));
    
    // Hide power-up indicator after a few seconds
    setTimeout(() => {
      setGameState(prevState => ({
        ...prevState,
        showPowerUpIndicator: false
      }));
    }, 3000);
  };
  
  // Handle hole completed event
  const handleHoleCompleted = (data) => {
    setGameState(prevState => ({
      ...prevState,
      holeStrokes: data.holeStrokes,
      totalStrokes: data.totalStrokes,
      holeCompleted: true
    }));
  };
  
  // Handle game completed event
  const handleGameCompleted = (data) => {
    setGameState(prevState => ({
      ...prevState,
      gameCompleted: true,
      totalStrokes: data.totalStrokes
    }));
  };
  
  // Handle next hole button click
  const handleNextHole = () => {
    if (gameEngine && gameState.holeCompleted) {
      gameEngine.nextHole();
    }
  };
  
  // Handle restart game button click
  const handleRestartGame = () => {
    if (gameEngine) {
      // Reset game state
      setGameState({
        currentHole: 1,
        totalHoles: 9,
        holeStrokes: 0,
        totalStrokes: 0,
        powerUp: null,
        showPowerUpIndicator: false,
        holeCompleted: false,
        gameCompleted: false,
        dailyModifier: null,
        charging: false,
        chargePower: 0
      });
      
      // Reinitialize game
      gameEngine.dispose();
      initializeGame();
    }
  };
  
  // Get formatted daily modifier name
  const getModifierName = (modifier) => {
    if (!modifier) return 'None';
    
    switch (modifier) {
      case 'zeroG':
        return 'Zero Gravity';
      case 'bouncy':
        return 'Extra Bouncy';
      case 'foggy':
        return 'Foggy Course';
      case 'nightMode':
        return 'Night Mode';
      case 'windyCourse':
        return 'Windy Course';
      case 'mirrorMode':
        return 'Mirror Mode';
      default:
        return modifier;
    }
  };
  
  // Get formatted power-up name
  const getPowerUpName = (powerUp) => {
    if (!powerUp) return '';
    
    switch (powerUp) {
      case 'rocketDash':
        return 'Rocket Dash';
      case 'stickyMode':
        return 'Sticky Mode';
      case 'bouncy':
        return 'Bouncy Shield';
      case 'gravityFlip':
        return 'Gravity Flip';
      default:
        return powerUp;
    }
  };
  
  // Render game completed modal
  const renderGameCompletedModal = () => {
    if (!gameState.gameCompleted) return null;
    
    return (
      <div className="game-completed-modal">
        <div className="modal-content">
          <h2>Course Completed!</h2>
          <p>You completed all {gameState.totalHoles} holes with {gameState.totalStrokes} total strokes.</p>
          <button onClick={handleRestartGame}>Play Again</button>
        </div>
      </div>
    );
  };
  
  // Render hole completed overlay
  const renderHoleCompletedOverlay = () => {
    if (!gameState.holeCompleted || gameState.gameCompleted) return null;
    
    return (
      <div className="hole-completed-overlay">
        <h3>Hole {gameState.currentHole} Completed!</h3>
        <p>Strokes: {gameState.holeStrokes}</p>
        <button onClick={handleNextHole}>Next Hole</button>
      </div>
    );
  };
  
  // Render power-up indicator
  const renderPowerUpIndicator = () => {
    if (!gameState.showPowerUpIndicator || !gameState.powerUp) return null;
    
    return (
      <div className="power-up-indicator">
        <div className="power-up-icon"></div>
        <span>Power-Up: {getPowerUpName(gameState.powerUp)}</span>
      </div>
    );
  };

  return (
    <div className="game-container">
      {/* Game canvas */}
      <canvas 
        ref={canvas => setGameCanvas(canvas)}
        className="game-canvas"
      />
      
      {/* Game UI */}
      <div className="game-ui">
        {/* Header bar */}
        <div className="game-header">
          <div className="hole-info">
            <span>Hole {gameState.currentHole} / {gameState.totalHoles}</span>
          </div>
          <div className="stroke-counter">
            <span>Strokes: {gameState.holeStrokes}</span>
            <span>Total: {gameState.totalStrokes}</span>
          </div>
          <div className="daily-modifier">
            <span>Daily Modifier: {getModifierName(gameState.dailyModifier)}</span>
          </div>
        </div>
        
        {/* Visual style toggle button */}
        <button 
          className="visual-style-toggle"
          onClick={toggleVisualStyle}
        >
          Toggle Moebius Style
        </button>
        
        {/* Power-up indicator */}
        {renderPowerUpIndicator()}
        
        {/* Instructions */}
        <div className="game-instructions">
          <p>Space: Charge & Release Shot | E: Activate Power-Up | R: Reset Ball (Penalty) | V: Toggle Visual Style</p>
        </div>
        
        {/* Hole completed overlay */}
        {renderHoleCompletedOverlay()}
        
        {/* Game completed modal */}
        {renderGameCompletedModal()}
      </div>
    </div>
  );
};

export default GameUI;