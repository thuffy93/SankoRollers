// src/App.jsx
import React, { useState } from 'react';
import GameUI from './components/GameUI';
import './styles/GameStyles.css';

const App = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Game settings
  const [settings, setSettings] = useState({
    soundEnabled: true,
    musicVolume: 70,
    sfxVolume: 80,
    difficulty: 'normal',
    totalHoles: 9
  });
  
  // Handle start game click
  const handleStartGame = () => {
    setGameStarted(true);
  };
  
  // Handle settings button click
  const handleSettingsClick = () => {
    setShowSettings(true);
  };
  
  // Handle close settings
  const handleCloseSettings = () => {
    setShowSettings(false);
  };
  
  // Handle settings change
  const handleSettingChange = (setting, value) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      [setting]: value
    }));
  };
  
  // Render welcome screen
  const renderWelcomeScreen = () => {
    return (
      <div className="welcome-screen">
        <div className="welcome-content">
          <h1 className="game-title">Cosmic Rollers</h1>
          <div className="game-description">
            <p>A physics-driven, arcade-style golf game with blockchain integration</p>
          </div>
          
          <div className="welcome-buttons">
            <button className="start-button" onClick={handleStartGame}>
              Start Game
            </button>
            <button className="settings-button" onClick={handleSettingsClick}>
              Settings
            </button>
          </div>
          
          <div className="daily-challenge">
            <h3>Daily Challenge</h3>
            <p>Today's Modifier: {getDailyModifierName()}</p>
          </div>
        </div>
      </div>
    );
  };
  
  // Render settings modal
  const renderSettingsModal = () => {
    if (!showSettings) return null;
    
    return (
      <div className="settings-modal">
        <div className="settings-content">
          <h2>Game Settings</h2>
          
          <div className="settings-group">
            <h3>Audio</h3>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
                />
                Sound Enabled
              </label>
            </div>
            
            <div className="setting-item">
              <label>Music Volume: {settings.musicVolume}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.musicVolume}
                onChange={(e) => handleSettingChange('musicVolume', parseInt(e.target.value))}
              />
            </div>
            
            <div className="setting-item">
              <label>SFX Volume: {settings.sfxVolume}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.sfxVolume}
                onChange={(e) => handleSettingChange('sfxVolume', parseInt(e.target.value))}
              />
            </div>
          </div>
          
          <div className="settings-group">
            <h3>Gameplay</h3>
            <div className="setting-item">
              <label>Difficulty:</label>
              <select
                value={settings.difficulty}
                onChange={(e) => handleSettingChange('difficulty', e.target.value)}
              >
                <option value="easy">Easy</option>
                <option value="normal">Normal</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            
            <div className="setting-item">
              <label>Number of Holes:</label>
              <select
                value={settings.totalHoles}
                onChange={(e) => handleSettingChange('totalHoles', parseInt(e.target.value))}
              >
                <option value="3">3 Holes (Quick Play)</option>
                <option value="9">9 Holes (Standard)</option>
                <option value="18">18 Holes (Tournament)</option>
              </select>
            </div>
          </div>
          
          <div className="settings-actions">
            <button onClick={handleCloseSettings}>Close</button>
          </div>
        </div>
      </div>
    );
  };
  
  // Get daily modifier name based on today's date
  const getDailyModifierName = () => {
    // Get current date in YYYY-MM-DD format
    const now = new Date();
    const dateString = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    
    // Create simple hash from date string
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
      hash = ((hash << 5) - hash) + dateString.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // List of possible modifiers
    const modifiers = [
      'Zero Gravity',
      'Extra Bouncy',
      'Foggy Course',
      'Night Mode',
      'Windy Course',
      'Mirror Mode'
    ];
    
    // Select modifier based on hash
    const index = Math.abs(hash) % modifiers.length;
    return modifiers[index];
  };
  
  return (
    <div className="app-container">
      {gameStarted ? (
        <GameUI gameSettings={settings} />
      ) : (
        renderWelcomeScreen()
      )}
      
      {renderSettingsModal()}
    </div>
  );
};

export default App;