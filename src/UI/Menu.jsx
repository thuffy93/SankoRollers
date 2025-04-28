// src/UI/Menu.jsx
import React, { useState, useEffect } from 'react';
import { useUIContext } from './UIContext';

/**
 * Menu component for main menu and settings
 */
const Menu = () => {
  const {
    gameStarted,
    showSettings,
    setShowSettings,
    settings,
    setSettings,
    startGame,
    dailyModifier
  } = useUIContext();
  
  // Format daily modifier name
  const formatDailyModifier = (modifier) => {
    if (!modifier) return 'None';
    
    // Convert camelCase to proper format
    return modifier
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
  };
  
  // Get daily modifier description
  const getDailyModifierDescription = (modifier) => {
    if (!modifier) return 'No special modifiers.';
    
    switch (modifier) {
      case 'zeroG':
        return 'Reduced gravity makes shots travel further.';
      case 'bouncy':
        return 'All surfaces are extra bouncy.';
      case 'foggy':
        return 'Limited visibility makes aiming more challenging.';
      case 'nightMode':
        return 'It\'s dark! Look for lit obstacles to find your way.';
      case 'windyCourse':
        return 'A constant wind affects your shots.';
      case 'mirrorMode':
        return 'Course layout is mirrored horizontally.';
      default:
        return 'Unknown modifier type.';
    }
  };
  
  // Handle start game click
  const handleStartGame = () => {
    startGame();
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
  
  // Generate a daily challenge modifier name based on today's date
  const getDailyModifierName = () => {
    if (dailyModifier) {
      return formatDailyModifier(dailyModifier);
    }
    
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
  
  // Render welcome screen if game not started
  if (!gameStarted) {
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
        
        {/* Render settings modal if shown */}
        {renderSettingsModal()}
      </div>
    );
  }
  
  // Render settings modal if game started and settings shown
  if (gameStarted && showSettings) {
    return renderSettingsModal();
  }
  
  // Return null if game started and settings not shown
  return null;
  
  // Helper function to render settings modal
  function renderSettingsModal() {
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
            
            <div className="setting-item">
              <label>Visual Style:</label>
              <select
                value={settings.visualStyle}
                onChange={(e) => handleSettingChange('visualStyle', e.target.value)}
              >
                <option value="standard">Standard</option>
                <option value="moebius">Moebius (Comic Style)</option>
              </select>
            </div>
          </div>
          
          <div className="settings-actions">
            <button onClick={handleCloseSettings}>Close</button>
          </div>
        </div>
      </div>
    );
  }
};

export default Menu;