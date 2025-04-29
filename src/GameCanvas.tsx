import React, { useEffect, useRef } from 'react';

function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    // Initialize Three.js scene, camera, and renderer here
    // Capture input events here

    return () => {
      // Cleanup
    };
  }, []);

  return <canvas ref={canvasRef} id="gameCanvas"></canvas>;
}

export default GameCanvas; 