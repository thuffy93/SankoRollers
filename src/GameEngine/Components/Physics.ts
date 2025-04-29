interface Vector3 {
  x: number;
  y: number;
  z: number;
}

class Physics {
  velocity: Vector3;
  mass: number;

  constructor(velocity: Vector3 = { x: 0, y: 0, z: 0 }, mass: number = 1) {
    this.velocity = velocity;
    this.mass = mass;
  }
}

export default Physics; 