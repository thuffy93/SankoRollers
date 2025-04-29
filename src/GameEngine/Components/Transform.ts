interface Vector3 {
  x: number;
  y: number;
  z: number;
}

class Transform {
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;

  constructor(
    position: Vector3 = { x: 0, y: 0, z: 0 },
    rotation: Vector3 = { x: 0, y: 0, z: 0 },
    scale: Vector3 = { x: 1, y: 1, z: 1 }
  ) {
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
  }
}

export default Transform; 