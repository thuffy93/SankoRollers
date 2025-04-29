import { Mesh, Material } from 'three';

class Renderer {
  mesh: Mesh;
  material: Material;

  constructor(mesh: Mesh, material: Material) {
    this.mesh = mesh;
    this.material = material;
  }
}

export default Renderer; 