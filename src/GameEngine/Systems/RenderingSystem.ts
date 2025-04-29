import System from '../ECS/System';
import Entity from '../ECS/Entity';

class RenderingSystem extends System {
  constructor() {
    super(['Transform', 'Renderer']);
  }

  update(entities: Map<string, Entity>, deltaTime: number): void {
    // Update Three.js rendering
    // This is a placeholder for actual rendering logic
  }
}

export default RenderingSystem; 