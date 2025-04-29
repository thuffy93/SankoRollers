import React from 'react';

interface GameUIProps {
  power: number;
  angle: number;
  shooting: boolean;
  score: number;
}

/**
 * Game UI component that renders power meter, angle indicator and score
 */
export const GameUI: React.FC<GameUIProps> = ({ power, angle, shooting, score }) => {
  return (
    <div className="game-ui">
      {/* Power meter */}
      <div className="power-meter">
        <div 
          className="power-level" 
          style={{ 
            height: `${power}%`,
            opacity: shooting ? 1 : 0.5 
          }}
        />
      </div>
      
      {/* Angle indicator */}
      <div className="angle-indicator">
        <div 
          className="angle-arrow" 
          style={{ transform: `rotate(${angle}rad)` }}
        />
      </div>
      
      {/* Score display */}
      <div className="game-info">
        <div className="score">Score: {score}</div>
      </div>
      
      {/* Controls help */}
      <div className="controls-help">
        <div>Space: Charge shot</div>
        <div>Arrows: Adjust angle</div>
        <div>B + Arrows: Add spin</div>
      </div>
    </div>
  );
}; 