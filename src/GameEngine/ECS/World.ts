import Entity from './Entity';
import System from './System';

class World {
  entities: Map<string, Entity>;
  systems: System[];
  lastTime: number;

  constructor() {
    this.entities = new Map();
    this.systems = [];
    this.lastTime = 0;
  }

  addEntity(entity: Entity): void {
    this.entities.set(entity.id, entity);
  }

  removeEntity(entityId: string): void {
    this.entities.delete(entityId);
  }

  addSystem(system: System): void {
    this.systems.push(system);
  }

  update(currentTime: number): void {
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    for (const system of this.systems) {
      system.update(this.entities, deltaTime);
    }
  }
}

export default World; 