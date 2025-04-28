// src/components/GameUI.jsx - Enhanced with Kirby's Dream Course mechanics
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
    shotState: 'idle', // 'idle', 'aiming', 'power', 'spin', 'moving'
    shotPower: 0,
    spinType: 'none' // 'none', 'top', 'back', 'left', 'right'
  });
  
  // Shot UI states
  const [aimingActive, setAimingActive] = useState(false);
  const [powerMeterActive, setPowerMeterActive] = useState(false);
  const [powerMeterValue, setPowerMeterValue] = useState(0);
  const [spinSelectorActive, setSpinSelectorActive] = useState(false);
  const [selectedSpin, setSelectedSpin] = useState('none');
  
  // Animation frame refs
  const powerMeterAnimationRef = useRef(null);
  
  // Audio state
  const [sounds, setSounds] = useState({
    aim: null,
    power: null,
    shot: null,
    bounce: null,
    hole: null,
    powerUp: null
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
    
    // Load sounds
    loadSounds();
    
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
  
  // Load game sounds
  const loadSounds = () => {
    // In a real implementation, these would be actual audio files
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Placeholder for sound loading
    console.log('Loading sounds...');
    
    // In a real implementation, we would load actual audio files
    // For now, we'll use placeholder objects
    setSounds({
      aim: { play: () => console.log('Playing aim sound') },
      power: { play: () => console.log('Playing power sound') },
      shot: { play: () => console.log('Playing shot sound') },
      bounce: { play: () => console.log('Playing bounce sound') },
      hole: { play: () => console.log('Playing hole sound') },
      powerUp: { play: () => console.log('Playing power-up sound') }
    });
  };
  
  // Initialize the game engine
  const initializeGame = async () => {
    // Create new game engine instance
    const engine = new GameEngine(gameCanvas, gameSettings);
    
    // Wait for initialization to complete
    await engine.init();
    
    // Set up event listeners for the new Kirby-style mechanics
    engine.roller.on('shotStateChanged', handleShotStateChanged);
    engine.roller.on('powerMeterUpdated', handlePowerMeterUpdated);
    engine.roller.on('spinUpdated', handleSpinUpdated);
    engine.roller.on('powerUpCollected', handlePowerUpCollected);
    engine.roller.on('powerUpActivated', handlePowerUpActivated);
    engine.roller.on('energyChanged', handleEnergyChanged);
    engine.roller.on('bounce', handleBounce);
    engine.roller.on('holeAnimationStarted', handleHoleAnimationStarted);
    engine.roller.on('holeAnimationCompleted', handleHoleAnimationCompleted);
    
    // Set up engine events
    engine.on('courseGenerated', handleCourseGenerated);
    engine.on('holeCompleted', handleHoleCompleted);
    engine.on('gameCompleted', handleGameCompleted);
    
    // Set up keyboard event listeners
    setupKeyboardListeners(engine);
    
    // Store engine instance
    setGameEngine(engine);
  };
  
  // Set up keyboard event listeners
  const setupKeyboardListeners = (engine) => {
    const handleKeyDown = (event) => {
      if (!engine) return;
      
      const shotState = gameState.shotState;
      
      switch (event.key) {
        case 'ArrowLeft':
          if (shotState === 'aiming') {
            // Rotate aim direction left
            engine.roller.setAimDirection('left');
            if (sounds.aim) sounds.aim.play();
          } else if (shotState === 'spin') {
            // Apply left spin
            setSelectedSpin('left');
            engine.roller.applySpin('left');
          } else if (shotState === 'moving' && engine.roller.airborne) {
            // Adjust bounce direction in mid-air
            engine.roller.adjustBounceDirection('left');
          }
          break;
          
        case 'ArrowRight':
          if (shotState === 'aiming') {
            // Rotate aim direction right
            engine.roller.setAimDirection('right');
            if (sounds.aim) sounds.aim.play();
          } else if (shotState === 'spin') {
            // Apply right spin
            setSelectedSpin('right');
            engine.roller.applySpin('right');
          } else if (shotState === 'moving' && engine.roller.airborne) {
            // Adjust bounce direction in mid-air
            engine.roller.adjustBounceDirection('right');
          }
          break;
          
        case 'ArrowUp':
          if (shotState === 'aiming') {
            // In Kirby, this could be used to look ahead at the course
            engine.camera.moveForward();
          } else if (shotState === 'spin') {
            // Apply top spin (forward spin)
            setSelectedSpin('top');
            engine.roller.applySpin('top');
          } else if (shotState === 'moving' && engine.roller.airborne) {
            // Adjust bounce direction in mid-air
            engine.roller.adjustBounceDirection('forward');
          }
          break;
          
        case 'ArrowDown':
          if (shotState === 'aiming') {
            // In Kirby, this could be used to look behind
            engine.camera.moveBackward();
          } else if (shotState === 'spin') {
            // Apply back spin
            setSelectedSpin('back');
            engine.roller.applySpin('back');
          } else if (shotState === 'moving' && engine.roller.airborne) {
            // Adjust bounce direction in mid-air
            engine.roller.adjustBounceDirection('backward');
          }
          break;
          
        case ' ': // Space - Progress through shot states
          if (shotState === 'idle') {
            // Start aiming
            engine.roller.startAiming();
          } else if (shotState === 'aiming') {
            // Lock in direction, start power meter
            engine.roller.startPowerMeter();
            if (sounds.power) sounds.power.play();
          } else if (shotState === 'power') {
            // Lock in power, go to spin selection
            engine.roller.setPower(powerMeterValue);
          } else if (shotState === 'spin') {
            // Launch the shot with current spin
            engine.roller.releaseShot();
            if (sounds.shot) sounds.shot.play();
          } else if (shotState === 'moving') {
            // Add mid-flight bounce (key Kirby mechanic)
            if (engine.roller.addBounce()) {
              if (sounds.bounce) sounds.bounce.play();
            }
          }
          break;
          
        case 'e': // Activate power-up
          if (shotState === 'moving' && gameState.powerUp) {
            if (engine.roller.activatePowerUp(gameState.powerUp)) {
              if (sounds.powerUp) sounds.powerUp.play();
              
              // Clear active power-up from UI
              setGameState(prevState => ({
                ...prevState,
                powerUp: null
              }));
            }
          }
          break;
          
        case 'r': // Reset ball position (with penalty)
          if (!gameState.holeCompleted && shotState !== 'idle') {
            engine.roller.reset();
            
            // Add penalty stroke
            setGameState(prevState => ({
              ...prevState,
              holeStrokes: prevState.holeStrokes + 1,
              totalStrokes: prevState.totalStrokes + 1
            }));
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
  
  // Handle shot state changed event
  const handleShotStateChanged = (data) => {
    setGameState(prevState => ({
      ...prevState,
      shotState: data.shotState,
      shotPower: data.shotPower || prevState.shotPower
    }));
    
    // Update UI based on shot state
    switch (data.shotState) {
      case 'idle':
        setAimingActive(false);
        setPowerMeterActive(false);
        setSpinSelectorActive(false);
        break;
        
      case 'aiming':
        setAimingActive(true);
        setPowerMeterActive(false);
        setSpinSelectorActive(false);
        break;
        
      case 'power':
        setAimingActive(true);
        setPowerMeterActive(true);
        setSpinSelectorActive(false);
        startPowerMeterAnimation();
        break;
        
      case 'spin':
        setAimingActive(true);
        setPowerMeterActive(false);
        setSpinSelectorActive(true);
        setSelectedSpin('none');
        break;
        
      case 'moving':
        setAimingActive(false);
        setPowerMeterActive(false);
        setSpinSelectorActive(false);
        break;
    }
  };
  
  // Handle power meter updated event
  const handlePowerMeterUpdated = (data) => {
    setPowerMeterValue(data.powerValue);
  };
  
  // Handle spin updated event
  const handleSpinUpdated = (data) => {
    setGameState(prevState => ({
      ...prevState,
      spinType: Object.entries(data.spin).find(([key, value]) => value > 0)?.[0] || 'none'
    }));
  };
  
  // Handle energy changed event
  const handleEnergyChanged = (data) => {
    setGameState(prevState => ({
      ...prevState,
      energy: data.energy
    }));
  };
  
  // Start power meter animation
  const startPowerMeterAnimation = () => {
    // Clean up any existing animation
    if (powerMeterAnimationRef.current) {
      cancelAnimationFrame(powerMeterAnimationRef.current);
    }
    
    // Power meter is now handled by the controller
    // This is just a visual sync
  };
  
  // Handle power-up collected event
  const handlePowerUpCollected = (data) => {
    setGameState(prevState => ({
      ...prevState,
      powerUp: data.type,
      showPowerUpIndicator: true
    }));
    
    if (sounds.powerUp) sounds.powerUp.play();
    
    // Hide power-up indicator after a few seconds
    setTimeout(() => {
      setGameState(prevState => ({
        ...prevState,
        showPowerUpIndicator: false
      }));
    }, 3000);
  };
  
  // Handle power-up activated event
  const handlePowerUpActivated = (data) => {
    // Show power-up in use animation
    setGameState(prevState => ({
      ...prevState,
      powerUpActive: true,
      powerUpType: data.type,
      powerUpDuration: data.duration
    }));
  };
  
  // Handle bounce event
  const handleBounce = (data) => {
    // Show bounce animation
    // In a real implementation, we might add particle effects or screen shake
    console.log('Bounce at position:', data.position);
  };
  
  // Handle hole animation started event
  const handleHoleAnimationStarted = (data) => {
    // Play hole sound
    if (sounds.hole) sounds.hole.play();
    
    // Show success animation
    console.log('Hole animation started at:', data.position);
  };
  
  // Handle hole animation completed event
  const handleHoleAnimationCompleted = () => {
    // Mark hole as completed in UI
    setGameState(prevState => ({
      ...prevState,
      holeCompleted: true
    }));
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
      shotState: 'idle',
      powerUp: null
    }));
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
        shotPower: 0,
        spinType: 'none'
      });
      
      // Reinitialize game
      gameEngine.dispose();
      initializeGame();
    }
  };
  
  // Get formatted power-up name
  const getPowerUpName = (powerUp) => {
    if (!powerUp) return '';
    
    switch (powerUp) {
      case 'rocketDash':
        return 'Rocket Dash';
      case 'stickyMode':
        return 'Wheel';
      case 'bouncy':
        return 'Ball';
      case 'gravityFlip':
        return 'UFO';
      default:
        return powerUp;
    }
  };
  
  // Render energy tomatoes (like Kirby's Dream Course)
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
  
  // Render power meter (oscillating, Kirby's Dream Course style)
  const renderPowerMeter = () => {
    if (!powerMeterActive) return null;
    
    return (
      <div className="power-meter-container kirby-style active">
        <div className="power-meter-label">Power</div>
        <div className="power-meter-background">
          <div 
            className="power-meter-fill" 
            style={{ width: `${powerMeterValue * 100}%` }}
          />
          <div className="power-meter-zones">
            <div className="weak-zone">Weak</div>
            <div className="medium-zone">Medium</div>
            <div className="strong-zone">Strong</div>
          </div>
        </div>
        <div className="power-meter-hint">
          Press SPACE to set power
        </div>
      </div>
    );
  };
  
  // Render spin selector (Kirby's Dream Course style)
  const renderSpinSelector = () => {
    if (!spinSelectorActive) return null;
    
    return (
      <div className="spin-selector-container">
        <div className="spin-selector-label">Spin</div>
        <div className="spin-selector-grid">
          <div className={`spin-option ${selectedSpin === 'none' ? 'selected' : ''}`}>
            None
          </div>
          <div className={`spin-option top ${selectedSpin === 'top' ? 'selected' : ''}`}>
            <span className="arrow">↑</span> Top
          </div>
          <div className={`spin-option back ${selectedSpin === 'back' ? 'selected' : ''}`}>
            <span className="arrow">↓</span> Back
          </div>
          <div className={`spin-option left ${selectedSpin === 'left' ? 'selected' : ''}`}>
            <span className="arrow">←</span> Left
          </div>
          <div className={`spin-option right ${selectedSpin === 'right' ? 'selected' : ''}`}>
            <span className="arrow">→</span> Right
          </div>
        </div>
        <div className="spin-selector-hint">
          Use arrow keys to select spin, SPACE to confirm
        </div>
      </div>
    );
  };
  
  // Render power-up indicator
  const renderPowerUpIndicator = () => {
    if (!gameState.showPowerUpIndicator || !gameState.powerUp) return null;
    
    return (
      <div className="power-up-indicator">
        <div className={`power-up-icon ${gameState.powerUp}`}></div>
        <span>Power-Up: {getPowerUpName(gameState.powerUp)}</span>
      </div>
    );
  };
  
  // Render shot state indicator (like Kirby's Dream Course instructions)
  const renderShotStateIndicator = () => {
    let message = '';
    
    switch (gameState.shotState) {
      case 'idle':
        message = 'Press SPACE to start aiming';
        break;
      case 'aiming':
        message = 'Use ←→ to aim, SPACE to confirm';
        break;
      case 'power':
        message = 'Press SPACE when power meter reaches desired level';
        break;
      case 'spin':
        message = 'Use ←→↑↓ to select spin, SPACE to shoot';
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
  
  // Render hole completed overlay with Kirby's Dream Course style
  const renderHoleCompletedOverlay = () => {
    if (!gameState.holeCompleted || gameState.gameCompleted) return null;
    
    // Get par for the current hole (would be defined in course data)
    const par = 4; // Example par value
    
    // Calculate score relative to par
    const relativeToPar = gameState.holeStrokes - par;
    let scoreText = '';
    
    if (relativeToPar < -2) {
      scoreText = 'Super Eagle!';
    } else if (relativeToPar === -2) {
      scoreText = 'Eagle!';
    } else if (relativeToPar === -1) {
      scoreText = 'Birdie!';
    } else if (relativeToPar === 0) {
      scoreText = 'Par';
    } else if (relativeToPar === 1) {
      scoreText = 'Bogey';
    } else if (relativeToPar === 2) {
      scoreText = 'Double Bogey';
    } else {
      scoreText = `${relativeToPar > 0 ? '+' : ''}${relativeToPar}`;
    }
    
    return (
      <div className="hole-completed-overlay kirby-style">
        <h3>Hole Complete!</h3>
        <div className="hole-stats">
          <div className="hole-number">Hole {gameState.currentHole}</div>
          <div className="hole-par">Par: {par}</div>
          <div className="hole-strokes">Strokes: {gameState.holeStrokes}</div>
          <div className={`hole-score ${relativeToPar <= 0 ? 'good' : 'bad'}`}>
            {scoreText}
          </div>
        </div>
        <button onClick={handleNextHole} className="kirby-button">
          Next Hole
        </button>
      </div>
    );
  };
  
  // Render game completed modal with Kirby's Dream Course style
  const renderGameCompletedModal = () => {
    if (!gameState.gameCompleted) return null;
    
    // Calculate final score (in a real game this would be more sophisticated)
    const totalPar = gameState.totalHoles * 4; // Example: each hole is par 4
    const relativeToPar = gameState.totalStrokes - totalPar;
    
    return (
      <div className="game-completed-modal kirby-style">
        <div className="modal-content">
          <h2>Course Completed!</h2>
          <div className="completion-stars">
            {/* Show 1-3 stars based on performance */}
            {Array(relativeToPar <= 0 ? 3 : relativeToPar <= 5 ? 2 : 1).fill(0).map((_, i) => (
              <div key={i} className="star">★</div>
            ))}
          </div>
          <div className="final-score">
            <div>Total Strokes: {gameState.totalStrokes}</div>
            <div>Par: {totalPar}</div>
            <div className={`relative-score ${relativeToPar <= 0 ? 'good' : 'bad'}`}>
              {relativeToPar === 0 ? 'Even' : `${relativeToPar > 0 ? '+' : ''}${relativeToPar}`}
            </div>
          </div>
          <button onClick={handleRestartGame} className="kirby-button">
            Play Again
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="game-container kirby-style">
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
            <span>Modifier: {gameState.dailyModifier || 'None'}</span>
          </div>
        </div>
        
        {/* Energy tomatoes (Kirby's Dream Course style) */}
        {renderEnergyTomatoes()}
        
        {/* Visual style toggle button */}
        <button 
          className="visual-style-toggle kirby-button"
          onClick={() => gameEngine?.toggleVisualStyle()}
        >
          Toggle Style
        </button>
        
        {/* Power-up indicator */}
        {renderPowerUpIndicator()}
        
        {/* Shot UI elements */}
        {/* Power meter (only visible during power state) */}
        {renderPowerMeter()}
        
        {/* Spin selector (only visible during spin state) */}
        {renderSpinSelector()}
        
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