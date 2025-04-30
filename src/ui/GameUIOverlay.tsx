import React from 'react';
import { GameState } from '../utils/gameState';
import '../styles/Game.css';

interface GameUIOverlayProps {
  gameState: GameState;
  power: number;
  angle: number;
  shotCount: number;
  par: number;
}

/**
 * React component for game UI elements
 * Replaces direct DOM manipulation with React components
 */
export const GameUIOverlay: React.FC<GameUIOverlayProps> = ({
  gameState,
  power,
  angle,
  shotCount,
  par
}) => {
  // Helper to determine if UI elements should be shown based on game state
  const showAngleIndicator = gameState === GameState.AIMING;
  const showPowerMeter = gameState === GameState.CHARGING;
  
  // Calculate power meter color based on power level
  const getPowerMeterColor = () => {
    if (power < 33) return '#33cc33'; // Green
    if (power < 66) return '#ffcc00'; // Yellow
    return '#ff3300'; // Red
  };
  
  return (
    <>
      {/* Power meter */}
      {showPowerMeter && (
        <div className="power-meter">
          <div 
            className="power-level" 
            style={{ 
              height: `${power}%`,
              backgroundColor: getPowerMeterColor()
            }}
          />
        </div>
      )}
      
      {/* Angle indicator */}
      {showAngleIndicator && (
        <div className="angle-indicator">
          <div 
            className="angle-arrow" 
            style={{ transform: `rotate(${angle}rad)` }}
          />
        </div>
      )}
      
      {/* Shot counter */}
      <div className="shot-counter">
        Shots: {shotCount} / Par: {par}
      </div>
      
      {/* Controls help */}
      <div className="controls-help">
        <div>Space: Charge shot</div>
        <div>Arrows: Adjust angle</div>
        <div>B + Arrows: Add spin</div>
        <div>Z: Bounce (mid-flight)</div>
      </div>
    </>
  );
}; 