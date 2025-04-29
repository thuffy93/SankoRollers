interface ObstacleProperties {
  [key: string]: any;
}

class Obstacle {
  type: string;
  properties: ObstacleProperties;

  constructor(type: string, properties: ObstacleProperties = {}) {
    this.type = type;
    this.properties = properties;
  }
}

export default Obstacle; 