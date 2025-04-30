import React, { useEffect, useState } from 'react';
import { GameState } from '../utils/gameState';
import '../styles/Game.css';

interface GameUIProps {
  gameState: GameState;
  power: number;
  angle: number;
  shotCount: number;
  par: number;
  spinActive: boolean;
  spinDirection: { x: number; y: number };
  targetsHit: number;
  totalTargets: number;
}

/**
 * React component for game UI elements
 * Enhanced to match Kirby's Dream Course UI aesthetics
 */
export const GameUI: React.FC<GameUIProps> = ({
  gameState,
  power,
  angle,
  shotCount,
  par,
  spinActive,
  spinDirection,
  targetsHit,
  totalTargets
}) => {
  // Helper to determine if UI elements should be shown based on game state
  const showAngleIndicator = gameState === GameState.AIMING || gameState === GameState.CHARGING;
  const showPowerMeter = gameState === GameState.CHARGING;
  
  // Kirby's Dream Course style glowing indicators
  const [glowIntensity, setGlowIntensity] = useState(0);
  
  // Animate the power meter glow
  useEffect(() => {
    if (showPowerMeter) {
      let increasing = true;
      const interval = setInterval(() => {
        setGlowIntensity(prev => {
          if (increasing) {
            const next = prev + 0.05;
            if (next >= 1) increasing = false;
            return next > 1 ? 1 : next;
          } else {
            const next = prev - 0.05;
            if (next <= 0) increasing = true;
            return next < 0 ? 0 : next;
          }
        });
      }, 50);
      
      return () => clearInterval(interval);
    }
  }, [showPowerMeter]);
  
  // Calculate power meter color based on power level (Kirby-style)
  const getPowerMeterColor = () => {
    if (power < 33) return '#33cc33'; // Green
    if (power < 66) return '#ffcc00'; // Yellow
    return '#ff3300'; // Red
  };
  
  // Calculate shot strength text (Kirby-style)
  const getShotStrengthText = () => {
    if (power < 25) return 'Light';
    if (power < 50) return 'Mild';
    if (power < 75) return 'Medium';
    if (power < 90) return 'Strong';
    return 'MAX';
  };
  
  // Calculate shot par difference display
  const getParDifferenceDisplay = () => {
    const diff = shotCount - par;
    if (diff < 0) return `${Math.abs(diff)} under par`;
    if (diff === 0) return 'Par';
    return `${diff} over par`;
  };
  
  // Get spin indicator class based on spin direction
  const getSpinIndicatorClass = () => {
    if (!spinActive) return 'spin-none';
    
    if (spinDirection.x < 0 && spinDirection.y === 0) return 'spin-left';
    if (spinDirection.x > 0 && spinDirection.y === 0) return 'spin-right';
    if (spinDirection.x === 0 && spinDirection.y < 0) return 'spin-down';
    if (spinDirection.x === 0 && spinDirection.y > 0) return 'spin-up';
    
    if (spinDirection.x < 0 && spinDirection.y < 0) return 'spin-downleft';
    if (spinDirection.x < 0 && spinDirection.y > 0) return 'spin-upleft';
    if (spinDirection.x > 0 && spinDirection.y < 0) return 'spin-downright';
    if (spinDirection.x > 0 && spinDirection.y > 0) return 'spin-upright';
    
    return 'spin-none';
  };
  
  return (
    <div className="game-ui">
      {/* Kirby's Dream Course style power meter */}
      {showPowerMeter && (
        <div className="kirby-power-meter">
          <div className="power-meter-shell">
            <div className="power-meter-label">POWER</div>
            <div 
              className="power-meter-level" 
              style={{ 
                height: `${power}%`,
                backgroundColor: getPowerMeterColor(),
                boxShadow: `0 0 ${5 + glowIntensity * 15}px ${getPowerMeterColor()}`
              }}
            />
          </div>
          <div className="power-meter-value">{getShotStrengthText()}</div>
        </div>
      )}
      
      {/* Angle indicator with Kirby-style arrow */}
      {showAngleIndicator && (
        <div className="kirby-angle-indicator">
          <div 
            className="angle-arrow" 
            style={{ transform: `rotate(${angle}rad)` }}
          />
        </div>
      )}
      
      {/* Spin indicator (Kirby-style) */}
      {spinActive && (
        <div className={`kirby-spin-indicator ${getSpinIndicatorClass()}`}>
          <div className="spin-indicator-center"></div>
          <div className="spin-indicator-arrow"></div>
        </div>
      )}
      
      {/* Game info display (Kirby-style) */}
      <div className="kirby-game-info">
        <div className="info-row">
          <div className="info-label">SHOT</div>
          <div className="info-value">{shotCount}</div>
        </div>
        <div className="info-row">
          <div className="info-label">PAR</div>
          <div className="info-value">{par}</div>
        </div>
        <div className="info-row">
          <div className="info-label">SCORE</div>
          <div className="info-value">{getParDifferenceDisplay()}</div>
        </div>
        <div className="info-row">
          <div className="info-label">STARS</div>
          <div className="info-value">{targetsHit}/{totalTargets}</div>
        </div>
      </div>
      
      {/* Controls help with Kirby-style appearance */}
      <div className="kirby-controls-help">
        <div className="control-item">
          <div className="control-key">Space</div>
          <div className="control-desc">Charge shot</div>
        </div>
        <div className="control-item">
          <div className="control-key">←→</div>
          <div className="control-desc">Adjust angle</div>
        </div>
        <div className="control-item">
          <div className="control-key">B+←→↑↓</div>
          <div className="control-desc">Add spin</div>
        </div>
        <div className="control-item">
          <div className="control-key">Z</div>
          <div className="control-desc">Bounce (mid-shot)</div>
        </div>
      </div>
    </div>
  );
};