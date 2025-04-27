// src/components/GameUI.jsx
import React, { useState, useEffect, useRef } from 'react';
import GameEngine from '../GameEngine/GameEngine';

const GameUI = ({ gameSettings }) => {
  // Game state
  const [gameCanvas, setGameCanvas] = useState(null);
  const [gameEngine, setGameEngine] = useState(null);
  const [gameState, setGameState] = useState({
    currentHole: 1,
    totalHoles: gameSettings?.totalHoles || 9,
    holeStrokes: 0,
    totalStrokes: 0,
    energy: 4, // Energy tomatoes
    powerUp: null,
    showPowerUpIndicator: false,
    holeCompleted: false,
    gameCompleted: false,
    dailyModifier: null,
    shotState: 'idle', // 'idle', 'aiming', 'shot_panel', 'power', 'moving'
    shotPower: 0
  });
  
  // Shot panel state
  const [shotPanelVisible, setShotPanelVisible] = useState(false);
  const [guideType, setGuideType] = useState('short');
  
  // Power meter state
  const [powerMeterVisible, setPowerMeterVisible] = useState(false);
  const [powerMeterValue, setPowerMeterValue] = useState(0);
  const powerMeterAnimationRef = useRef(null);
  
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
      if (powerMeterAnimationRef.current) {
        cancelAnimationFrame(powerMeterAnimationRef.current);
      }
    };
  }, [gameCanvas, gameEngine]);
  
  // Initialize the game engine
  const initializeGame = async () => {
    // Create new game engine instance
    const engine = new GameEngine(gameCanvas, gameSettings);
    
    // Wait for initialization to complete
    await engine.init();
    
    // Set up event listeners
    engine.on('courseGenerated', handleCourseGenerated);
    engine.on('stroke', handleStroke);
    engine.on('powerUpCollected', handlePowerUpCollected);
    engine.on('holeCompleted', handleHoleCompleted);
    engine.on('gameCompleted', handleGameCompleted);
    engine.on('shotStateChanged', handleShotStateChanged);
    engine.on('energyChanged', handleEnergyChanged);
    
    // Set up keyboard event listeners
    setupKeyboardListeners(engine);
    
    // Store engine instance
    setGameEngine(engine);
  };
  
  // Set up keyboard event listeners
  const setupKeyboardListeners = (engine) => {
    const handleKeyDown = (event) => {
      if (!engine) return;
      
      const shotState = gameEngine ? gameEngine.getShotState() : 'idle';

      
      switch (event.key) {
        case 'ArrowLeft':
          if (shotState === 'aiming') {
            engine.setDirection('left');
          } else if (shotState === 'power' || shotState === 'shot_panel') {
            engine.applySpin(-0.5, 0);
          }
          break;
          
        case 'ArrowRight':
          if (shotState === 'aiming') {
            engine.setDirection('right');
          } else if (shotState === 'power' || shotState === 'shot_panel') {
            engine.applySpin(0.5, 0);
          }
          break;
          
        case 'ArrowUp':
          if (shotState === 'power' || shotState === 'shot_panel') {
            engine.applySpin(0, 0.5);
          } else if (shotState === 'shot_panel') {
            engine.toggleGuideType();
          }
          break;
          
        case 'ArrowDown':
          if (shotState === 'power' || shotState === 'shot_panel') {
            engine.applySpin(0, -0.5);
          } else if (shotState === 'shot_panel') {
            engine.toggleGuideType();
          }
          break;
          
        case ' ': // Space
          if (shotState === 'idle') {
            engine.startAiming();
          } else if (shotState === 'aiming') {
            engine.openShotPanel();
          } else if (shotState === 'shot_panel') {
            startPowerMeter(engine);
          } else if (shotState === 'moving') {
            engine.addBounce();
          }
          break;
          
        case 'e': // Power-up activation
          if (shotState === 'moving' && gameState.powerUp) {
            engine.activatePowerUp(gameState.powerUp);
          }
          break;
          
        case 'r': // Reset ball position
          if (!gameState.holeCompleted) {
            engine.resetBall();
          }
          break;
          
        case 'v': // Toggle visual style
          engine.toggleVisualStyle();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  };
  
  // Start the power meter animation
  const startPowerMeter = (engine) => {
    let direction = 1;
    let value = 0;
    
    const animatePowerMeter = () => {
      // Update power value
      value += direction * 0.02;
      
      // Reverse direction at bounds
      if (value >= 1) {
        value = 1;
        direction = -1;
      } else if (value <= 0) {
        value = 0;
        direction = 1;
      }
      
      // Update UI
      setPowerMeterValue(value);
      
      // Continue animation if still in power state
      const shotState = gameEngine ? gameEngine.getShotState() : 'idle';
      if (shotState === 'power') {
        powerMeterAnimationRef.current = requestAnimationFrame(animatePowerMeter);
      }
    };
    
    // Start animation
    setPowerMeterVisible(true);
    powerMeterAnimationRef.current = requestAnimationFrame(animatePowerMeter);
    
    // Tell engine to start power meter
    engine.startPowerMeter();
  };
  
  // Stop the power meter and release the shot
  const stopPowerMeter = () => {
    if (powerMeterAnimationRef.current) {
      cancelAnimationFrame(powerMeterAnimationRef.current);
      powerMeterAnimationRef.current = null;
    }
    
    setPowerMeterVisible(false);
    
    // Tell engine to release shot with current power
    if (gameEngine) {
      gameEngine.setPower(powerMeterValue * 100);
      gameEngine.releaseShot();
    }
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
      dailyModifier: data.dailyModifier,
      energy: 4, // Reset energy for new hole
      shotState: 'idle'
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
  
  // Handle shot state changed event
  const handleShotStateChanged = (data) => {
    setGameState(prevState => ({
      ...prevState,
      shotState: data.shotState,
      shotPower: data.shotPower || prevState.shotPower
    }));
    
    // Update UI based on shot state
    switch (data.shotState) {
      case 'shot_panel':
        setShotPanelVisible(true);
        setPowerMeterVisible(false);
        break;
        
      case 'power':
        setShotPanelVisible(false);
        setPowerMeterVisible(true);
        break;
        
      case 'moving':
      case 'idle':
        setShotPanelVisible(false);
        setPowerMeterVisible(false);
        break;
    }
  };
  
  // Handle energy changed event
  const handleEnergyChanged = (data) => {
    setGameState(prevState => ({
      ...prevState,
      energy: data.energy
    }));
  };
  
  // Handle power-up collected event
  const handlePowerUpCollected = (data) => {
    setGameState(prevState => ({
      ...prevState,
      powerUp: data.type,
      showPowerUpIndicator: true,
      energy: Math.min(prevState.energy + 1, 4) // Add energy when collecting power-up
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
      holeCompleted: true,
      shotState: 'idle'
    }));
  };
  
  // Handle game completed event
  const handleGameCompleted = (data) => {
    setGameState(prevState => ({
      ...prevState,
      gameCompleted: true,
      totalStrokes: data.totalStrokes,
      shotState: 'idle'
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
        totalHoles: gameSettings?.totalHoles || 9,
        holeStrokes: 0,
        totalStrokes: 0,
        energy: 4,
        powerUp: null,
        showPowerUpIndicator: false,
        holeCompleted: false,
        gameCompleted: false,
        dailyModifier: null,
        shotState: 'idle',
        shotPower: 0
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
  
  // Render energy tomatoes
  const renderEnergyTomatoes = () => {
    const tomatoes = [];
    
    for (let i = 0; i < 4; i++) {
      tomatoes.push(
        <div 
          key={i} 
          className={`energy-tomato ${i < gameState.energy ? 'active' : 'inactive'}`}
        />
      );
    }
    
    return (
      <div className="energy-tomatoes">
        {tomatoes}
      </div>
    );
  };
  
  // Render shot panel
  const renderShotPanel = () => {
    if (!shotPanelVisible) return null;
    
    return (
      <div className="shot-panel">
        <div className="guide-options">
          <div 
            className={`guide-option ${guideType === 'short' ? 'selected' : ''}`}
            onClick={() => setGuideType('short')}
          >
            Short Guide
          </div>
          <div 
            className={`guide-option ${guideType === 'long' ? 'selected' : ''}`}
            onClick={() => setGuideType('long')}
          >
            Long Guide
          </div>
        </div>
        <div className="shot-panel-hint">
          Press SPACE to continue, UP/DOWN to change guide
        </div>
      </div>
    );
  };
  
  // Render power meter
  const renderPowerMeter = () => {
    if (!powerMeterVisible) return null;
    
    return (
      <div className="power-meter-container active">
        <div 
          className="power-meter" 
          style={{ width: `${powerMeterValue * 100}%` }}
        />
        <div className="power-meter-hint">
          Press SPACE to set power
        </div>
      </div>
    );
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
  
  // Render shot state indicator
  const renderShotStateIndicator = () => {
    let message = '';
    
    switch (gameState.shotState) {
      case 'idle':
        message = 'Press SPACE to start aiming';
        break;
      case 'aiming':
        message = 'Use LEFT/RIGHT to aim, SPACE to confirm';
        break;
      case 'shot_panel':
        message = 'Use UP/DOWN to change guide, SPACE to confirm';
        break;
      case 'power':
        message = 'Press SPACE to set power, ←→↑↓ for spin';
        break;
      case 'moving':
        message = 'Press SPACE to bounce, E to use power-up';
        break;
    }
    
    return (
      <div className="shot-state-indicator">
        {message}
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
        
        {/* Energy tomatoes */}
        {renderEnergyTomatoes()}
        
        {/* Visual style toggle button */}
        <button 
          className="visual-style-toggle"
          onClick={toggleVisualStyle}
        >
          Toggle Moebius Style
        </button>
        
        {/* Power-up indicator */}
        {renderPowerUpIndicator()}
        
        {/* Shot panel */}
        {renderShotPanel()}
        
        {/* Power meter */}
        {renderPowerMeter()}
        
        {/* Shot state indicator and instructions */}
        {renderShotStateIndicator()}
        
        {/* Hole completed overlay */}
        {renderHoleCompletedOverlay()}
        
        {/* Game completed modal */}
        {renderGameCompletedModal()}
      </div>
    </div>
  );
};

export default GameUI;