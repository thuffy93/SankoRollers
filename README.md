# Cosmic Rollers

A physics-based 3D golf game inspired by Kirby's Dream Course, built for modern web browsers using React, Three.js, and Rapier physics.

## About

Cosmic Rollers transforms players into a colorful ball character navigating through vibrant isometric courses. Players control angle, power, and spin to hit target characters scattered throughout each course. When a target is hit, it transforms into a collectible star, and the last target becomes the goal hole.

## Technical Stack

- JavaScript (ES6+)
- React
- Three.js for 3D rendering
- Rapier physics (via WebAssembly)
- ECSY (Entity Component System)
- Vite for bundling and development

## Development

To get started with development:

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Run the development server:
```bash
npm run dev
```

## Project Structure

- `src/` - Source code
  - `components/` - React components
  - `systems/` - ECSY systems
  - `entities/` - Game entities
  - `hooks/` - Custom React hooks
  - `utils/` - Utility functions

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 