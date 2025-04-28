// src/UI/HUD.jsx
import React, { useState, useEffect } from 'react';
import { useUIContext } from './UIContext';

/**
 * HUD (Heads-Up Display) component for showing game information
 */
const HUD = () => {
  const {
    // Game state
    gameStarted,
    gameCompleted,
    
    // Course info
    currentHole,
    totalHoles,
    holeStrokes,
    totalStrokes,
    par,
    
    // Shot info
    shotState,
    shotPower,
    guideType,
    setGuideType,
    
    // Power-ups
    activePowerUp,
    powerUpInventory,
    
    // UI state
    showHoleCompleted,
    showGameCompleted,
    
    // Course state
    dailyModifier,
    
    // Game actions
    nextHole,
    resetGame
  } = useUIContext();
  
  // State for energy tomatoes (lives)
  const [energyTomatoes, setEnergyTomatoes] = useState(4);
  
  // State for power-up notification
  const [showPowerUpNotification, setShowPowerUpNotification] = useState(false);
  const [notificationPowerUp, setNotificationPowerUp] = useState(null);
  
  // Track previous power-up to detect changes
  const [prevPowerUp, setPrevPowerUp] = useState(null);
  
  // Show power-up notification when a new power-up is activated
  useEffect(() => {
    if (activePowerUp && activePowerUp !== prevPowerUp) {
      setNotificationPowerUp(activePowerUp);
      setShowPowerUpNotification(true);
      
      // Hide notification after 3 seconds
      const timer = setTimeout(() => {
        setShowPowerUpNotification(false);
      }, 3000);
      
      // Store current power-up
      setPrevPowerUp(activePowerUp);
      
      return () => clearTimeout(timer);
    }
  }, [activePowerUp, prevPowerUp]);
  
  // Format the daily modifier name
  const formatDailyModifier = (modifier) => {
    if (!modifier) return 'None';
    
    // Convert camelCase to proper format
    return modifier
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
  };
  
  // Get instructions based on shot state
  const getShotStateInstructions = () => {
    switch (shotState) {
      case 'idle':
        return 'Press SPACE to start aiming';
        
      case 'aiming':
        return 'Use LEFT/RIGHT to aim, SPACE to confirm';
        
      case 'shot_panel':
        return 'Use UP/DOWN to change guide, SPACE to confirm';
        
      case 'power':
        return 'Press SPACE to set power, ←→↑↓ for spin';
        
      case 'moving':
        return 'Press SPACE to bounce, E to use power-up';
        
      default:
        return '';
    }
  };
  
  // Get score text based on strokes vs par
  const getScoreText = () => {
    const diff = holeStrokes - par;
    
    if (diff < -2) return 'Amazing!';
    if (diff === -2) return 'Eagle!';
    if (diff === -1) return 'Birdie!';
    if (diff === 0) return 'Par';
    if (diff === 1) return 'Bogey';
    if (diff === 2) return 'Double Bogey';
    if (diff > 2) return 'Keep practicing...';
    
    return '';
  };
  
  // Get score difference text
  const getScoreDiffText = () => {
    const diff = holeStrokes - par;
    
    if (diff === 0) return 'Even par';
    if (diff < 0) return `${Math.abs(diff)} under par`;
    return `${diff} over par`;
  };
  
  // Format power-up name
  const formatPowerUpName = (type) => {
    if (!type) return '';
    
    switch (type) {
      case 'rocketDash':
        return 'Rocket Dash';
      case 'stickyMode':
        return 'Sticky Mode';
      case 'bouncy':
        return 'Bouncy Shield';
      case 'gravityFlip':
        return 'Gravity Flip';
      default:
        return type;
    }
  };
  
  return (
    <div className="game-ui">
      {/* Game header - always visible */}
      <div className="game-header">
        <div className="hole-info">
          <span>Hole {currentHole} / {totalHoles}</span>
        </div>
        
        <div className="stroke-counter">
          <span>Strokes: {holeStrokes}</span>
          <span>Total: {totalStrokes}</span>
        </div>
        
        <div className="daily-modifier">
          <span>Daily Modifier: {formatDailyModifier(dailyModifier)}</span>
        </div>
      </div>
      
      {/* Energy tomatoes (lives) */}
      <div className="energy-tomatoes">
        {Array.from({ length: 4 }).map((_, index) => (
          <div 
            key={index} 
            className={`energy-tomato ${index < energyTomatoes ? 'active' : 'inactive'}`}
          />
        ))}
      </div>
      
      {/* Power-up indicator */}
      {showPowerUpNotification && notificationPowerUp && (
        <div className="power-up-indicator">
          <div className={`power-up-icon ${notificationPowerUp.type}`} />
          <span>Power-Up: {formatPowerUpName(notificationPowerUp.type)}</span>
        </div>
      )}
      
      {/* Shot panel - visible when shotState is 'shot_panel' */}
      {shotState === 'shot_panel' && (
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
      )}
      
      {/* Power meter - visible when shotState is 'power' */}
      <div className={`power-meter-container ${shotState === 'power' ? 'active' : ''}`}>
        <div className="power-meter" style={{ width: `${shotPower * 100}%` }} />
        <div className="power-meter-hint">Press SPACE to set power</div>
      </div>
      
      {/* Shot state indicator */}
      <div className="shot-state-indicator">
        {getShotStateInstructions()}
      </div>
      
      {/* Hole completed overlay */}
      {showHoleCompleted && (
        <div className="hole-completed-overlay">
          <h3>Hole {currentHole} Completed!</h3>
          <p>Strokes: {holeStrokes}</p>
          <p>Par: {par}</p>
          <p>{getScoreText()}</p>
          <button onClick={nextHole}>Next Hole</button>
        </div>
      )}
      
      {/* Game completed modal */}
      {showGameCompleted && (
        <div className="game-completed-modal">
          <div className="modal-content">
            <h2>Course Completed!</h2>
            <p>You completed all {totalHoles} holes with {totalStrokes} total strokes.</p>
            <p className={`relative-score ${totalStrokes <= par * totalHoles ? 'good' : 'bad'}`}>
              {getScoreDiffText()}
            </p>
            <button onClick={resetGame}>Play Again</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HUD;