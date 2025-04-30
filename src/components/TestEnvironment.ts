import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { 
  createDynamicBody, 
  createStaticBody, 
  addBoxCollider, 
  addSphereCollider,
  PhysicsObjectData 
} from '../systems/PhysicsSystem';

export class TestEnvironment {
  private scene: THREE.Scene;
  private world: RAPIER.World;
  private physicsObjects: RAPIER.RigidBody[] = [];
  private meshes: THREE.Object3D[] = [];

  constructor(scene: THREE.Scene, world: RAPIER.World) {
    this.scene = scene;
    this.world = world;
  }

  /**
   * Create a test environment with various physics objects
   */
  initialize(): void {
    this.createGround();
    this.createDynamicObjects();
  }

  /**
   * Create a ground plane with physics
   */
  private createGround(): void {
    // Create ground plane geometry
    const groundGeometry = new THREE.PlaneGeometry(20, 20, 1, 1);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3CB371, // Medium sea green
      roughness: 0.8,
      metalness: 0.2,
    });
    
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);
    this.meshes.push(groundMesh);
    
    // Create ground physics as static body
    const groundBody = createStaticBody(
      this.world, 
      new THREE.Vector3(0, 0, 0),
      {
        type: 'ground',
        mesh: groundMesh
      } as PhysicsObjectData
    );
    
    // Add collider to the ground
    addBoxCollider(this.world, groundBody, { x: 10, y: 0.1, z: 10 });
    this.physicsObjects.push(groundBody);
  }

  /**
   * Create dynamic physics objects (cubes, spheres)
   */
  private createDynamicObjects(): void {
    // Create a few cubes
    this.createCube(new THREE.Vector3(-2, 5, 0), new THREE.Vector3(0.5, 0.5, 0.5), 0xFF5733);
    this.createCube(new THREE.Vector3(0, 7, 2), new THREE.Vector3(0.7, 0.7, 0.7), 0x33FF57);
    this.createCube(new THREE.Vector3(2, 9, -1), new THREE.Vector3(0.4, 0.4, 0.4), 0x3357FF);
    
    // Create a few spheres
    this.createSphere(new THREE.Vector3(-3, 6, -2), 0.6, 0xFFD700);
    this.createSphere(new THREE.Vector3(3, 8, 2), 0.8, 0xC71585);
  }

  /**
   * Create a cube with physics
   */
  public createCube(
    position: THREE.Vector3, 
    size: THREE.Vector3, 
    color: number
  ): void {
    // Create cube mesh
    const geometry = new THREE.BoxGeometry(size.x * 2, size.y * 2, size.z * 2);
    const material = new THREE.MeshStandardMaterial({ 
      color,
      roughness: 0.5,
      metalness: 0.5,
    });
    
    const cubeMesh = new THREE.Mesh(geometry, material);
    cubeMesh.position.copy(position);
    cubeMesh.castShadow = true;
    cubeMesh.receiveShadow = true;
    this.scene.add(cubeMesh);
    this.meshes.push(cubeMesh);
    
    // Create cube physics as dynamic body
    const cubeBody = createDynamicBody(
      this.world, 
      position,
      {
        type: 'cube',
        mesh: cubeMesh
      } as PhysicsObjectData
    );
    
    // Add collider
    addBoxCollider(this.world, cubeBody, { x: size.x, y: size.y, z: size.z });
    this.physicsObjects.push(cubeBody);
  }

  /**
   * Create a sphere with physics
   */
  public createSphere(
    position: THREE.Vector3, 
    radius: number, 
    color: number
  ): void {
    // Create sphere mesh
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({ 
      color,
      roughness: 0.3,
      metalness: 0.7,
    });
    
    const sphereMesh = new THREE.Mesh(geometry, material);
    sphereMesh.position.copy(position);
    sphereMesh.castShadow = true;
    sphereMesh.receiveShadow = true;
    this.scene.add(sphereMesh);
    this.meshes.push(sphereMesh);
    
    // Create sphere physics as dynamic body
    const sphereBody = createDynamicBody(
      this.world, 
      position,
      {
        type: 'sphere',
        mesh: sphereMesh
      } as PhysicsObjectData
    );
    
    // Add collider
    addSphereCollider(this.world, sphereBody, radius);
    this.physicsObjects.push(sphereBody);
  }

  /**
   * Update the physics objects
   */
  update(): void {
    // Update all physical objects
    for (const body of this.physicsObjects) {
      const userData = body.userData as PhysicsObjectData;
      if (userData?.mesh) {
        const position = body.translation();
        userData.mesh.position.set(position.x, position.y, position.z);
        
        // Update rotation
        const rotation = body.rotation();
        userData.mesh.quaternion.set(
          rotation.x,
          rotation.y,
          rotation.z,
          rotation.w
        );
      }
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Remove all meshes from the scene
    for (const mesh of this.meshes) {
      this.scene.remove(mesh);
      if (mesh instanceof THREE.Mesh) {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(material => material.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    }
    
    // Clear arrays
    this.meshes = [];
    this.physicsObjects = [];
  }
} 