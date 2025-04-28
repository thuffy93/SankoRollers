// src/UI/UIContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

// Create UIContext
const UIContext = createContext({
  // Game state
  gameStarted: false,
  gameCompleted: false,
  gamePaused: false,
  
  // Course info
  currentHole: 1,
  totalHoles: 9,
  holeStrokes: 0,
  totalStrokes: 0,
  par: 3,
  
  // Shot info
  shotState: 'idle', // 'idle', 'aiming', 'shot_panel', 'power', 'moving'
  shotPower: 0, // 0-1 normalized
  guideType: 'short', // 'short' or 'long'
  
  // Power-ups
  activePowerUp: null,
  powerUpInventory: [],
  
  // UI state
  showSettings: false,
  showHoleCompleted: false,
  showGameCompleted: false,
  
  // Course state
  dailyModifier: null,
  
  // Settings
  settings: {
    soundEnabled: true,
    musicVolume: 70,
    sfxVolume: 80,
    difficulty: 'normal',
    totalHoles: 9,
    visualStyle: 'standard' // 'standard' or 'moebius'
  },
  
  // Actions
  setGameStarted: () => {},
  setGameCompleted: () => {},
  setGamePaused: () => {},
  setCurrentHole: () => {},
  setHoleStrokes: () => {},
  setTotalStrokes: () => {},
  setShotState: () => {},
  setShotPower: () => {},
  setGuideType: () => {},
  setActivePowerUp: () => {},
  setPowerUpInventory: () => {},
  setShowSettings: () => {},
  setShowHoleCompleted: () => {},
  setShowGameCompleted: () => {},
  setSettings: () => {},
  
  // Game actions
  startGame: () => {},
  resetGame: () => {},
  nextHole: () => {}
});

// UIProvider component
export const UIProvider = ({ children, gameInstance }) => {
  // Game state
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  
  // Course info
  const [currentHole, setCurrentHole] = useState(1);
  const [totalHoles, setTotalHoles] = useState(9);
  const [holeStrokes, setHoleStrokes] = useState(0);
  const [totalStrokes, setTotalStrokes] = useState(0);
  const [par, setPar] = useState(3);
  
  // Shot info
  const [shotState, setShotState] = useState('idle');
  const [shotPower, setShotPower] = useState(0);
  const [guideType, setGuideType] = useState('short');
  
  // Power-ups
  const [activePowerUp, setActivePowerUp] = useState(null);
  const [powerUpInventory, setPowerUpInventory] = useState([]);
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showHoleCompleted, setShowHoleCompleted] = useState(false);
  const [showGameCompleted, setShowGameCompleted] = useState(false);
  
  // Course state
  const [dailyModifier, setDailyModifier] = useState(null);
  
  // Settings
  const [settings, setSettings] = useState({
    soundEnabled: true,
    musicVolume: 70,
    sfxVolume: 80,
    difficulty: 'normal',
    totalHoles: 9,
    visualStyle: 'standard'
  });
  
  // Connect to game instance events when available
  useEffect(() => {
    if (!gameInstance) return;
    
    // Listen for game state changes
    const handleGameStateChange = (state) => {
      // Update UI state from game state
      if (state.gameStarted !== undefined) setGameStarted(state.gameStarted);
      if (state.gameCompleted !== undefined) setGameCompleted(state.gameCompleted);
      if (state.currentHole !== undefined) setCurrentHole(state.currentHole);
      if (state.totalHoles !== undefined) setTotalHoles(state.totalHoles);
      if (state.holeStrokes !== undefined) setHoleStrokes(state.holeStrokes);
      if (state.totalStrokes !== undefined) setTotalStrokes(state.totalStrokes);
      if (state.shotState !== undefined) setShotState(state.shotState);
      if (state.dailyModifier !== undefined) setDailyModifier(state.dailyModifier);
    };
    
    // Listen for shot state changes
    const handleShotStateChange = (state, power) => {
      setShotState(state);
      if (power !== undefined) setShotPower(power);
    };
    
    // Listen for power-up changes
    const handlePowerUpChange = (powerUp, inventory) => {
      setActivePowerUp(powerUp);
      setPowerUpInventory(inventory);
    };
    
    // Listen for hole completed event
    const handleHoleCompleted = ({ hole, strokes, par }) => {
      setShowHoleCompleted(true);
      setPar(par);
    };
    
    // Listen for game completed event
    const handleGameCompleted = () => {
      setGameCompleted(true);
      setShowGameCompleted(true);
    };
    
    // Register event listeners
    if (gameInstance.world) {
      gameInstance.world.on('gameStateChanged', handleGameStateChange);
      gameInstance.world.on('shotStateChanged', handleShotStateChange);
      gameInstance.world.on('powerUpChanged', handlePowerUpChange);
      gameInstance.world.on('holeCompleted', handleHoleCompleted);
      gameInstance.world.on('gameCompleted', handleGameCompleted);
      
      // Get initial state
      const state = gameInstance.getState();
      handleGameStateChange(state);
    }
    
    // Clean up event listeners
    return () => {
      if (gameInstance.world) {
        gameInstance.world.off('gameStateChanged', handleGameStateChange);
        gameInstance.world.off('shotStateChanged', handleShotStateChange);
        gameInstance.world.off('powerUpChanged', handlePowerUpChange);
        gameInstance.world.off('holeCompleted', handleHoleCompleted);
        gameInstance.world.off('gameCompleted', handleGameCompleted);
      }
    };
  }, [gameInstance]);
  
  // Game actions
  const startGame = () => {
    if (!gameInstance) return;
    
    setGameStarted(true);
    setGameCompleted(false);
    setCurrentHole(1);
    setHoleStrokes(0);
    setTotalStrokes(0);
    
    // Start game in instance
    gameInstance.start();
  };
  
  const resetGame = () => {
    if (!gameInstance) return;
    
    setGameStarted(true);
    setGameCompleted(false);
    setShowGameCompleted(false);
    setCurrentHole(1);
    setHoleStrokes(0);
    setTotalStrokes(0);
    
    // Reset game in instance
    if (gameInstance.restartGame) {
      gameInstance.restartGame();
    }
  };
  
  const nextHole = () => {
    if (!gameInstance) return;
    
    setShowHoleCompleted(false);
    
    // Trigger next hole in game
    if (gameInstance.world) {
      gameInstance.world.triggerEvent('nextHole');
    }
  };
  
  // Apply settings to game instance
  useEffect(() => {
    if (!gameInstance) return;
    
    // Apply visual style
    if (gameInstance.world) {
      // Only trigger if there's a change to avoid infinite loops
      const currentStyle = gameInstance.world.visualStyle;
      if (currentStyle !== settings.visualStyle) {
        gameInstance.world.triggerEvent('visualStyleToggle');
      }
    }
    
    // Apply sound settings
    // This would be implemented in a real game with an audio system
  }, [settings, gameInstance]);
  
  // Calculate context value
  const contextValue = {
    // Game state
    gameStarted,
    gameCompleted,
    gamePaused,
    
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
    
    // Power-ups
    activePowerUp,
    powerUpInventory,
    
    // UI state
    showSettings,
    showHoleCompleted,
    showGameCompleted,
    
    // Course state
    dailyModifier,
    
    // Settings
    settings,
    
    // State setters
    setGameStarted,
    setGameCompleted,
    setGamePaused,
    setCurrentHole,
    setHoleStrokes,
    setTotalStrokes,
    setShotState,
    setShotPower,
    setGuideType,
    setActivePowerUp,
    setPowerUpInventory,
    setShowSettings,
    setShowHoleCompleted,
    setShowGameCompleted,
    setSettings,
    
    // Game actions
    startGame,
    resetGame,
    nextHole
  };
  
  return (
    <UIContext.Provider value={contextValue}>
      {children}
    </UIContext.Provider>
  );
};

// Custom hook for using the UI context
export const useUIContext = () => {
  const context = useContext(UIContext);
  
  if (!context) {
    throw new Error('useUIContext must be used within a UIProvider');
  }
  
  return context;
};

export default UIContext;