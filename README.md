# Cosmic Rollers

A physics-based golf game inspired by Kirby's Dream Course, built with Three.js and Rapier physics.

## Description

Cosmic Rollers is a browser-based 3D golf game where players control a ball to navigate through colorful courses, hit targets, and reach a goal hole in as few shots as possible. The game features realistic physics, isometric view, and intuitive controls reminiscent of the classic Kirby's Dream Course.

## Features

- **Physics-Based Gameplay**: Realistic ball physics with momentum, rolling, and bouncing mechanics powered by Rapier3D-compat
- **Shot Control System**: Intuitive power, angle, and spin mechanics for precise ball control
- **Target-Based Goals**: Hit enemies to transform them into stars, with the last enemy becoming the goal
- **Debug Visualization**: Built-in physics debugging with wireframe visualization and control panel
- **Customizable Physics**: Adjust gravity and other physics parameters in real-time
- **Dynamic Object Creation**: Spawn new objects during gameplay for testing and experimentation

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/SankoRollers.git
cd SankoRollers
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## Development

### Project Structure

```
src/
├── components/      # React and game components
│   ├── App.tsx      # Main React app
│   ├── GameCanvas.tsx    # Three.js canvas wrapper
│   └── TestEnvironment.ts   # Physics test environment
├── systems/         # Core game systems
│   ├── GameSystem.ts      # Main game logic
│   ├── PhysicsSystem.ts   # Rapier physics integration
│   ├── RenderSystem.ts    # Three.js renderer
│   └── DebugRenderer.ts   # Physics visualization
├── models/          # Data models and types
├── assets/          # Game assets (textures, sounds)
├── styles.css       # Global styles
├── index.tsx        # React entry point
└── main.ts          # Application entry point
```

### Technology Stack

- **Three.js**: 3D rendering engine
- **Rapier3D-compat**: Physics engine with browser compatibility
- **TypeScript**: Type-safe JavaScript
- **React**: UI framework
- **Webpack**: Module bundler

### Debug Controls

The game includes a debug panel (powered by dat.GUI) that allows you to:

1. Toggle physics collider visualization
2. Toggle contact point visualization
3. Adjust gravity
4. Spawn random objects (cubes and spheres)

## Usage

### Basic Controls

- **Camera**: Isometric view that follows the ball
- **Shot Control**: Adjust power and angle (implementation in progress)
- **Physics Debug**: Use the panel in the top-right corner to adjust physics parameters

### Development Workflow

1. Make changes to the code
2. Webpack will automatically rebuild and refresh the browser
3. Use the debug panel to test physics interactions
4. Check the console for any errors or debug information

## Roadmap

### Phase 1: Core Mechanics (Current)
- ✅ Project setup with TypeScript, React, Three.js, and Rapier
- ✅ Physics integration with debug visualization
- ⬜ Shot control system implementation
- ⬜ Basic course design

### Phase 2: Gameplay Elements
- ⬜ Target enemies with collision effects
- ⬜ Goal hole with win conditions
- ⬜ Scoring system
- ⬜ First playable course

### Phase 3: Polish & Features
- ⬜ Visual effects and audio
- ⬜ Complete UI and menus
- ⬜ Additional courses and obstacles

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Acknowledgments

- Inspired by Nintendo's Kirby's Dream Course (1994)
- Built with Three.js and Rapier physics
