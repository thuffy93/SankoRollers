import React, { useEffect, useState } from 'react';
import { EventType, eventsManager } from '../utils/events';
import { GameState, gameStateManager } from '../utils/gameState';

interface LevelCompleteUIProps {
  onNextLevel: () => void;
  onRestartLevel: () => void;
}

/**
 * Level complete UI component
 */
export const LevelCompleteUI: React.FC<LevelCompleteUIProps> = ({
  onNextLevel,
  onRestartLevel
}) => {
  const [visible, setVisible] = useState(false);
  const [levelStats, setLevelStats] = useState({
    shotCount: 0,
    par: 0,
    scoreText: ''
  });
  
  useEffect(() => {
    // Show UI when level is completed
    const unsubscribe = eventsManager.subscribe(
      EventType.HOLE_COMPLETE,
      (payload) => {
        setLevelStats({
          shotCount: payload.shotCount,
          par: payload.par,
          scoreText: payload.scoreText
        });
        setVisible(true);
      }
    );
    
    // Also show when game state changes to COMPLETE
    const stateListener = () => {
      if (gameStateManager.isState(GameState.COMPLETE)) {
        setVisible(true);
      }
    };
    
    gameStateManager.onEnterState(GameState.COMPLETE, stateListener);
    
    return () => {
      unsubscribe();
      // Since gameStateManager doesn't have an off method, we'll leave this listener active
      // In a more complete implementation, we'd track all listeners to properly remove them
    };
  }, []);
  
  // Handle next level button click
  const handleNextLevel = () => {
    setVisible(false);
    onNextLevel();
  };
  
  // Handle restart level button click
  const handleRestartLevel = () => {
    setVisible(false);
    onRestartLevel();
  };
  
  // If not visible, don't render anything
  if (!visible) {
    return null;
  }
  
  return (
    <div className="level-complete-overlay">
      <div className="level-complete-modal">
        <h2>Level Complete!</h2>
        
        <div className="level-stats">
          <p>Shots: {levelStats.shotCount}</p>
          <p>Par: {levelStats.par}</p>
          <p className="score-text">{levelStats.scoreText}</p>
        </div>
        
        <div className="level-complete-buttons">
          <button onClick={handleRestartLevel}>Restart Level</button>
          <button onClick={handleNextLevel} className="next-level-button">Next Level</button>
        </div>
      </div>
    </div>
  );
}; 