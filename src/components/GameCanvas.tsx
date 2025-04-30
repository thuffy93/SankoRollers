import React, { useEffect, useRef } from 'react';
import { initializeGame } from '../systems/GameSystem';

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize game systems
    let cleanupFn: (() => void) | undefined;
    
    const setup = async () => {
      cleanupFn = await initializeGame(canvasRef.current!);
    };
    
    setup();
    
    return () => {
      // Cleanup resources when unmounting
      if (cleanupFn) cleanupFn();
    };
  }, []);

  return <div ref={canvasRef} className="game-canvas" />;
};

export default GameCanvas; 