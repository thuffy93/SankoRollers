import React, { useEffect, useState } from 'react';
import GameCanvas from './GameCanvas';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate asset loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="app-container">
      {isLoading ? (
        <div className="loading-screen">
          <h1>Cosmic Rollers</h1>
          <p>Loading...</p>
        </div>
      ) : (
        <GameCanvas />
      )}
    </div>
  );
};

export default App; 