# Cosmic Rollers

A physics-driven, arcade-style golf game with blockchain integration.

## Overview

Cosmic Rollers is a 3D physics-based golf game built with Three.js and Rapier physics engine. Players navigate a rolling ball through procedurally generated courses with various obstacles, power-ups, and visual effects.

### Features

- **Physics-driven Gameplay**: Momentum-based ball movement with wall clinging, bouncing, and gravity manipulation
- **Procedural Courses**: Generated via RNG with daily modifiers (e.g., "Zero-G", "Bouncy")
- **Power-Ups**: Rocket Dash, Sticky Mode, Bouncy Shield, Gravity Flip
- **Visual Styles**: Toggle between standard and Moebius-inspired comic book rendering

## Technology Stack

- **Frontend**: Three.js (rendering), Rapier (physics), React (UI)
- **Build**: Webpack, Babel

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/thuffy93/SankoRollers.git
   cd SankoRollers
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Open your browser and navigate to `http://localhost:8080`

## Game Controls

- **Space**: Charge and release shot
- **Mouse/Touch**: Aim direction
- **E**: Activate power-up
- **R**: Reset ball position (adds penalty stroke)
- **V**: Toggle visual style

## Building for Production

To create a production build:

```
npm run build
```

The build files will be in the `dist` directory.

## License

This project is licensed under the MIT License - see the LICENSE file for details.