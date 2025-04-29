class Entity {
  id: string;
  components: Map<string, any>;

  constructor(id: string) {
    this.id = id;
    this.components = new Map();
  }

  addComponent(component: any): void {
    this.components.set(component.constructor.name, component);
  }

  removeComponent(componentName: string): void {
    this.components.delete(componentName);
  }

  getComponent(componentName: string): any {
    return this.components.get(componentName);
  }
}

export default Entity; 