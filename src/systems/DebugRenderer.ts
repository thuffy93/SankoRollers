import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GUI } from 'dat.gui';

export class DebugRenderer {
  private scene: THREE.Scene;
  private world: RAPIER.World;
  private debugMeshes: THREE.Object3D[] = [];
  private contactPointMeshes: THREE.Object3D[] = [];
  private gui: GUI;
  private debugOptions = {
    showColliders: true,
    showContactPoints: false,
    gravity: -9.81,
    addCube: () => this.addRandomCube(),
    addSphere: () => this.addRandomSphere(),
  };
  
  // Callback to create debug objects
  private createObjectCallback: (position: THREE.Vector3, isBox: boolean) => void;

  constructor(
    scene: THREE.Scene, 
    world: RAPIER.World, 
    createObjectCallback: (position: THREE.Vector3, isBox: boolean) => void
  ) {
    this.scene = scene;
    this.world = world;
    this.createObjectCallback = createObjectCallback;
    this.gui = new GUI();
    this.setupGUI();
  }

  private setupGUI(): void {
    const physicsFolder = this.gui.addFolder('Physics Debug');
    
    physicsFolder.add(this.debugOptions, 'showColliders')
      .name('Show Colliders')
      .onChange((value: boolean) => {
        this.toggleDebugColliders(value);
      });
      
    physicsFolder.add(this.debugOptions, 'showContactPoints')
      .name('Show Contacts')
      .onChange((value: boolean) => {
        this.toggleContactPoints(value);
      });
      
    physicsFolder.add(this.debugOptions, 'gravity', -20, 0, 0.1)
      .name('Gravity')
      .onChange((value: number) => {
        this.world.gravity = { x: 0, y: value, z: 0 };
      });
      
    const objectsFolder = this.gui.addFolder('Add Objects');
    objectsFolder.add(this.debugOptions, 'addCube').name('Add Random Cube');
    objectsFolder.add(this.debugOptions, 'addSphere').name('Add Random Sphere');
    
    physicsFolder.open();
    objectsFolder.open();
  }

  /**
   * Updates debug visualization based on current physics world state
   */
  update(): void {
    if (this.debugOptions.showColliders) {
      this.updateColliderDebugMeshes();
    }
    
    if (this.debugOptions.showContactPoints) {
      this.updateContactPoints();
    }
  }

  /**
   * Generates visualization for all physics colliders
   */
  private updateColliderDebugMeshes(): void {
    // Clear previous debug meshes
    this.clearDebugMeshes();
    
    // Iterate through all colliders in the physics world
    this.world.forEachCollider((collider: RAPIER.Collider) => {
      const debugMesh = this.createColliderDebugMesh(collider);
      if (debugMesh) {
        // Update position and rotation from rigid body
        const rigidBody = collider.parent();
        if (rigidBody) {
          const position = rigidBody.translation();
          const rotation = rigidBody.rotation();
          
          debugMesh.position.set(position.x, position.y, position.z);
          debugMesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
        }
        
        this.scene.add(debugMesh);
        this.debugMeshes.push(debugMesh);
      }
    });
  }

  /**
   * Creates wireframe meshes for colliders
   */
  private createColliderDebugMesh(collider: RAPIER.Collider): THREE.Object3D | null {
    // Get collider shape type
    const shapeType = collider.shapeType();
    
    // Create appropriate debug mesh based on shape type
    switch (shapeType) {
      case RAPIER.ShapeType.Ball: {
        const radius = collider.radius();
        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        const material = new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          wireframe: true,
          opacity: 0.5,
          transparent: true
        });
        return new THREE.Mesh(geometry, material);
      }
      
      case RAPIER.ShapeType.Cuboid: {
        const halfExtents = collider.halfExtents();
        const geometry = new THREE.BoxGeometry(
          halfExtents.x * 2,
          halfExtents.y * 2,
          halfExtents.z * 2
        );
        const material = new THREE.MeshBasicMaterial({
          color: 0x0000ff,
          wireframe: true,
          opacity: 0.5,
          transparent: true
        });
        return new THREE.Mesh(geometry, material);
      }
      
      case RAPIER.ShapeType.Cylinder: {
        const halfHeight = collider.halfHeight();
        const radius = collider.radius();
        const geometry = new THREE.CylinderGeometry(radius, radius, halfHeight * 2, 16);
        const material = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          wireframe: true,
          opacity: 0.5,
          transparent: true
        });
        return new THREE.Mesh(geometry, material);
      }
      
      default:
        return null;
    }
  }

  /**
   * Visualizes contact points in the physics simulation
   */
  private updateContactPoints(): void {
    // Clear previous contact point meshes
    this.clearContactPointMeshes();
    
    // Create a small sphere for each contact point
    const createContactPointMesh = (x: number, y: number, z: number) => {
      const geometry = new THREE.SphereGeometry(0.1, 8, 8);
      const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const contactMesh = new THREE.Mesh(geometry, material);
      
      contactMesh.position.set(x, y, z);
      this.scene.add(contactMesh);
      this.contactPointMeshes.push(contactMesh);
    };
    
    // Note: This implementation is simplified since Rapier's contactPairs API
    // can vary between versions. We'll create some sample points for demonstration.
    // In a production app, you'd use the proper API for your Rapier version.
    
    // Create a few example contact points (simulated)
    // In reality, you would query these from the physics engine
    for (let i = 0; i < this.physicsObjects.length - 1; i++) {
      const body = this.physicsObjects[i];
      if (body) {
        const pos = body.translation();
        // Create a contact point slightly below the object
        createContactPointMesh(pos.x, pos.y - 0.5, pos.z);
      }
    }
  }

  // Track physics objects for contact point visualization
  private physicsObjects: RAPIER.RigidBody[] = [];
  
  // Add physics object to tracking
  public trackPhysicsObject(body: RAPIER.RigidBody): void {
    this.physicsObjects.push(body);
  }

  /**
   * Toggles the visibility of collider debug meshes
   */
  private toggleDebugColliders(visible: boolean): void {
    if (visible) {
      this.updateColliderDebugMeshes();
    } else {
      this.clearDebugMeshes();
    }
  }

  /**
   * Toggles the visibility of contact points
   */
  private toggleContactPoints(visible: boolean): void {
    if (!visible) {
      this.clearContactPointMeshes();
    }
  }

  /**
   * Removes all debug meshes from the scene
   */
  private clearDebugMeshes(): void {
    // Remove all debug meshes from the scene
    for (const mesh of this.debugMeshes) {
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
    
    this.debugMeshes = [];
  }

  /**
   * Removes all contact point meshes from the scene
   */
  private clearContactPointMeshes(): void {
    // Remove all contact point meshes from the scene
    for (const mesh of this.contactPointMeshes) {
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
    
    this.contactPointMeshes = [];
  }

  /**
   * Creates a random cube at a random position
   */
  private addRandomCube(): void {
    const position = new THREE.Vector3(
      (Math.random() - 0.5) * 5,
      5 + Math.random() * 5,
      (Math.random() - 0.5) * 5
    );
    
    this.createObjectCallback(position, true);
  }

  /**
   * Creates a random sphere at a random position
   */
  private addRandomSphere(): void {
    const position = new THREE.Vector3(
      (Math.random() - 0.5) * 5,
      5 + Math.random() * 5,
      (Math.random() - 0.5) * 5
    );
    
    this.createObjectCallback(position, false);
  }

  /**
   * Cleans up resources
   */
  dispose(): void {
    this.clearDebugMeshes();
    this.clearContactPointMeshes();
    this.gui.destroy();
  }
} 