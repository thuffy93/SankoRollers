// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/GameStyles.css';
import './styles/WelcomeStyles.css';
import './styles/BlockchainStyles.css';

// Import Rapier physics engine
import RAPIER from '@dimforge/rapier3d-compat';

// Initialize Rapier physics engine
const initRapier = async () => {
    try {
      await RAPIER.init();
      console.log('Rapier physics initialized');
      // Now we can mount the React app
      const root = createRoot(document.getElementById('root'));
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    } catch (error) {
      console.error('Failed to initialize Rapier:', error);
    }
};
  
// Start initializing Rapier
initRapier();