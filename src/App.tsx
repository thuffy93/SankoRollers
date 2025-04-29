import React, { useEffect, useRef } from 'react';
import World from './GameEngine/ECS/World';
import PhysicsSystem from './GameEngine/Systems/PhysicsSystem';
import RenderingSystem from './GameEngine/Systems/RenderingSystem';
import InputSystem from './GameEngine/Systems/InputSystem';
import PowerUpSystem from './GameEngine/Systems/PowerUpSystem';
import CourseGenerationSystem from './GameEngine/Systems/CourseGenerationSystem';
import CollisionSystem from './GameEngine/Systems/CollisionSystem';
import UISystem from './GameEngine/Systems/UISystem';
import AnimationSystem from './GameEngine/Systems/AnimationSystem';

function App() {
  const worldRef = useRef<World | null>(null);

  useEffect(() => {
    const world = new World();
    worldRef.current = world;

    // Add systems
    world.addSystem(new PhysicsSystem());
    world.addSystem(new RenderingSystem());
    world.addSystem(new InputSystem());
    world.addSystem(new PowerUpSystem());
    world.addSystem(new CourseGenerationSystem());
    world.addSystem(new CollisionSystem());
    world.addSystem(new UISystem());
    world.addSystem(new AnimationSystem());

    // Game loop
    const gameLoop = (currentTime: number) => {
      world.update(currentTime);
      requestAnimationFrame(gameLoop);
    };

    requestAnimationFrame(gameLoop);

    return () => {
      // Cleanup
    };
  }, []);

  return (
    <div>
      <h1>Cosmic Rollers</h1>
      <canvas id="gameCanvas"></canvas>
    </div>
  );
}

export default App; 