import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Game } from './core/Game';

// Main entry point
const container = document.getElementById('gameCanvas');

if (container) {
  // Initialize the game directly if using pure Three.js
  Game.initialize(container);
} 