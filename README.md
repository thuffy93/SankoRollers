# Cosmic Rollers

A physics-based golf game inspired by Kirby's Dream Course, built with Three.js and Rapier physics.

## Description

Cosmic Rollers is a browser-based 3D golf game where players control a ball to navigate through colorful courses, hit targets, and reach a goal hole in as few shots as possible. The game features realistic physics, isometric view, and intuitive controls reminiscent of the classic Kirby's Dream Course.

## Features

- Physics-based ball rolling with realistic collisions
- Power and angle-based shot system with spin mechanics
- Wall-clinging physics for strategic gameplay
- Target enemies that transform when hit
- Procedurally generated courses with various obstacles and hazards

## Development Phases

### Phase 1: Core Structure (Current)
- Project setup with TypeScript, React, Three.js, and Rapier
- Basic scene rendering with isometric camera
- Fundamental physics implementation
- Player controls framework
- Simple terrain and player ball

### Phase 2: Ball Physics & Controls
- Implement power, angle, and spin control system
- Develop collision detection and response
- Add camera follow behavior
- Implement basic UI elements (power meter, angle indicator)

### Phase 3: Game Elements
- Add target enemies with collision effects
- Create goal hole with win conditions
- Develop scoring system
- Design first playable course

### Phase 4: Polish & Features
- Refine physics and controls
- Add visual effects and audio
- Implement complete UI and menus
- Create additional courses and obstacles

### Phase 5: Optional Features
- NFT integration for cosmetics
- Leaderboards
- Multiplayer support
- Course editor

## Tech Stack

- Three.js - 3D rendering
- Rapier - Physics engine
- React - UI components
- TypeScript - Type safety
- Webpack - Bundling

## Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/SankoRollers.git
cd SankoRollers

# Install dependencies
npm install

# Start development server
npm start
```

## Controls
- **Space:** Hold to charge shot, release to shoot
- **Arrow Keys:** Adjust angle during shot preparation
- **B + Arrow Keys:** Add spin during shot preparation

## License

This project is licensed under the ISC License - see the LICENSE file for details.
