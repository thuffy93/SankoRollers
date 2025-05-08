<<<<<<< HEAD
# Technical Context: Cosmic Rollers

## Technology Stack

### Core Technologies
- **TypeScript**: Primary programming language for type safety and maintainability
- **Three.js**: 3D rendering library for WebGL-based graphics
- **Rapier.js**: High-performance physics engine with WASM implementation
- **SimplexNoise**: Algorithm for procedural terrain generation

### Development Environment
- **Node.js**: Runtime environment for development tools
- **Vite**: Fast, modern frontend build tool and development server
- **ESLint/Prettier**: Code quality and formatting tools
- **Jest**: Unit and integration testing framework

### Asset Pipeline
- **Blender**: 3D modeling and asset creation
- **GLTF/GLB**: Standard 3D model format for web compatibility
- **TexturePacker**: Sprite and texture atlas generation
- **Audacity**: Audio editing and sound effect creation

## Development Setup

### Prerequisites
- Node.js v16+
- npm v8+
- Modern web browser with WebGL 2.0 support

### Installation
```bash
# Clone repository
git clone https://github.com/organization/cosmic-rollers.git
cd cosmic-rollers

# Install dependencies
npm install

# Start development server
npm run dev
```

### Project Structure
```
cosmic-rollers/
├── src/                  # Source code
│   ├── core/             # Core game systems
│   ├── physics/          # Physics implementation
│   ├── rendering/        # Three.js rendering code
│   ├── gameplay/         # Game mechanics
│   ├── procedural/       # Procedural generation
│   ├── entities/         # Game entity classes
│   ├── ui/               # User interface components
│   └── utils/            # Utility functions
├── assets/               # Game assets
│   ├── models/           # 3D models
│   ├── textures/         # Textures and materials
│   ├── audio/            # Sound effects and music
│   └── shaders/          # GLSL shader code
├── tests/                # Test files
├── public/               # Static files
└── dist/                 # Build output
```

### Build Commands
- `npm run dev`: Start development server
- `npm run build`: Create production build
- `npm run preview`: Preview production build
- `npm run test`: Run unit tests
- `npm run lint`: Check code style and quality

## Technical Constraints

### Performance Targets
- **FPS**: Maintain 60fps on mid-tier devices
- **Memory**: Keep heap usage under 300MB
- **Loading Time**: Initial load under 5 seconds on broadband
- **Build Size**: Under 5MB compressed (excluding assets)

### Browser Compatibility
- **Primary Support**: Chrome 90+, Firefox 90+, Edge 90+, Safari 15+
- **Mobile Support**: iOS Safari 15+, Chrome for Android 90+
- **WebGL Support**: WebGL 2.0 required
- **Screen Size**: Minimum 768x480 resolution

### Technical Limitations
- **Physics Complexity**: Maximum of 100 active physics bodies
- **Polygon Budget**: Under 50k triangles per scene
- **Draw Calls**: Under 50 draw calls per frame
- **Texture Memory**: Maximum 32MB of texture data

## Key Dependencies

### Core Libraries
| Library | Version | Purpose |
|---------|---------|---------|
| three.js | 0.150.0+ | 3D rendering engine |
| @dimforge/rapier3d | 0.11.0+ | Physics engine |
| simplex-noise | 4.0.0+ | Procedural noise generation |
| stats.js | 0.17.0+ | Performance monitoring |

### Development Dependencies
| Library | Version | Purpose |
|---------|---------|---------|
| typescript | 5.0.0+ | Type checking and compilation |
| vite | 4.0.0+ | Build tool and dev server |
| jest | 29.0.0+ | Testing framework |
| eslint | 8.0.0+ | Code quality and linting |

## Integration Points

### Asset Loading Pipeline
1. Assets loaded through AssetManager singleton
2. GLTF models loaded via THREE.GLTFLoader
3. Textures processed through THREE.TextureLoader
4. Audio managed via Web Audio API

### Physics Integration
1. Rapier WASM module loaded asynchronously
2. Physics world created with configurable gravity
3. Three.js meshes synchronized with Rapier bodies
4. Collision detection via event-based system

### Input Handling
1. Raw input captured via browser events
2. Input normalized through InputManager
3. Command pattern translates input to game actions
4. Touch/mouse/keyboard abstracted to same interface

## Deployment Strategy

### Build Process
1. TypeScript compiled to modern JavaScript
2. Assets optimized and compressed
3. Code bundled and tree-shaken via Vite
4. Versioned files for cache control

### Hosting Requirements
- Static hosting with HTTPS support
- CORS configured for asset loading
- Compression (gzip/brotli) enabled
- Cache control headers optimized

### Performance Monitoring
- Runtime FPS monitoring via stats.js
- Error tracking via captured exceptions
- Performance marks for key operations
- Console warnings for performance issues

## Appendix: Technology Selection Rationale

### Three.js Selection
- Mature, well-documented WebGL library
- Extensive community support
- Built-in support for loaders, controls, and effects
- Compatible with modern module bundlers

### Rapier.js Selection
- High-performance WASM physics
- Smaller size compared to alternatives
- Good TypeScript support
- Active development and maintenance

### SimplexNoise Selection
- Efficient algorithm for smooth noise
- Well-suited for terrain generation
- Controllable parameters for varied outputs
- Good performance characteristics 
=======
# Technical Context

## Core Technologies

### Frontend Framework
- **React 18+**: Used for UI components and application structure
- **TypeScript 5+**: For type safety and better developer experience
- **Vite**: For fast development and optimized builds

### Game Engine Components
- **Three.js**: 3D rendering engine for WebGL
- **ECSY**: Entity Component System framework
- **ECSY-Three**: Integration layer between ECSY and Three.js
- **Rapier (WASM)**: Physics engine for accurate ball physics

### Supporting Libraries
- **React Router**: For navigation between game screens
- **Zustand/Jotai**: For lightweight state management
- **react-three-fiber**: For React integration with Three.js where needed
- **TweenJS/GSAP**: For smooth animations outside of the physics system
- **Howler.js**: For audio management

## Development Environment
- **Version Control**: Git with GitHub
- **Package Management**: npm
- **Code Quality**:
  - ESLint with TypeScript rules
  - Prettier for consistent formatting
  - Jest for unit testing
  - Playwright for e2e testing

## Technical Constraints

### Performance Requirements
- **Target FPS**: 60 FPS on high-end devices, 30+ FPS on low-end devices
- **Load Time**: Under 3 seconds initial load on 4G connection
- **Memory Usage**: Under 300MB for optimal performance

### Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge latest versions
- **Mobile Browsers**: iOS Safari, Android Chrome latest versions
- **Minimum Requirements**: WebGL 2.0 support, ES6+ compatibility

### File Size Constraints
- Individual source files limited to 300-500 lines of code
- Component complexity limited to improve maintainability
- Asset optimization for mobile (texture size limits, model complexity)

## Architecture Considerations

### Physics Implementation
- WASM-powered Rapier for optimal performance
- Abstraction layer for physics to allow for potential engine swapping
- Custom physics behaviors for special game mechanics (wall-clinging, etc.)

### Rendering Pipeline
- Deferred lighting for performance
- LOD (Level of Detail) system for complex courses
- Adaptive quality settings based on device capabilities

### State Management
- Event-driven architecture for game events
- Clear separation between UI state and game state
- Immutable data patterns where appropriate

## Development Workflow

### Code Organization Principles
- Modular structure with clear separation of concerns
- Strict adherence to the 300-500 lines per file rule
- Component-based architecture with reusable parts
- Consistent naming conventions and file structure

### Build & Deployment
- Development server with hot reloading
- Production build with code splitting and tree shaking
- Asset optimization pipeline for images and 3D models
- Automated deployment via CI/CD pipeline

### Testing Strategy
- Unit tests for core game systems
- Component testing for UI elements
- Visual regression testing for 3D rendering
- Performance testing with metrics tracking 
>>>>>>> 5080cde72b173858c5d2a159c5d70f021895bc1b
