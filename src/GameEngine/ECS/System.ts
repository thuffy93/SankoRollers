import Entity from './Entity';

class System {
  requiredComponents: string[];

  constructor(requiredComponents: string[]) {
    this.requiredComponents = requiredComponents;
  }

  update(entities: Map<string, Entity>, deltaTime: number): void {
    // Override in derived classes
  }
}

export default System; 