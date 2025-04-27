// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/GameStyles.css';
import './styles/WelcomeStyles.css';
import './styles/BlockchainStyles.css';

// Import Rapier physics engine
import RAPIER from '@dimforge/rapier3d-compat';

// Initialize Rapier physics engine
const initRapier = async () => {
  await RAPIER.init();
  console.log('Rapier physics initialized');
};

// Start initializing Rapier in background
initRapier();

// Add global styles for font and reset
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&display=swap');
  
  *, *::before, *::after {
    box-sizing: border-box;
  }
  
  body, html {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: 'Orbitron', sans-serif;
    background-color: #000;
  }
  
  #root {
    width: 100%;
    height: 100%;
  }
`;

// Create a style element and append it to the head
const style = document.createElement('style');
style.textContent = globalStyles;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);