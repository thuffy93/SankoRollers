interface ColliderProperties {
  [key: string]: any;
}

class Collider {
  shape: any;
  properties: ColliderProperties;

  constructor(shape: any, properties: ColliderProperties = {}) {
    this.shape = shape;
    this.properties = properties;
  }
}

export default Collider; 