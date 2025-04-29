import System from '../ECS/System';
import Entity from '../ECS/Entity';

class UISystem extends System {
  constructor() {
    super(['Score']);
  }

  update(entities: Map<string, Entity>, deltaTime: number): void {
    // Update UI state for React
    // This is a placeholder for actual UI update logic
  }
}

export default UISystem; 