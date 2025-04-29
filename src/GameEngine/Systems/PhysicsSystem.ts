import System from '../ECS/System';
import Entity from '../ECS/Entity';

class PhysicsSystem extends System {
  constructor() {
    super(['Transform', 'Physics']);
  }

  update(entities: Map<string, Entity>, deltaTime: number): void {
    // Update physics using Rapier
    // This is a placeholder for actual Rapier integration
  }
}

export default PhysicsSystem; 