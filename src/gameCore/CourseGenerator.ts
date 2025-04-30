// src/gameCore/CourseGenerator.ts
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { SurfaceType, setSurfaceProperties } from './physics';

// Course element types
export enum CourseElementType {
  TERRAIN = 'TERRAIN',
  WALL = 'WALL',
  TARGET = 'TARGET',
  HOLE = 'HOLE',
  BUMPER = 'BUMPER',
  BOOST_PAD = 'BOOST_PAD',
  SAND_TRAP = 'SAND_TRAP'
}

// Interface for course elements
interface CourseElement {
  type: CourseElementType;
  position: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
  properties?: any;
}

// Course template interface
interface CourseTemplate {
  name: string;
  terrain: {
    width: number;
    height: number;
    heightMap?: number[][];
  };
  elements: CourseElement[];
  startPosition: THREE.Vector3;
  par: number;
}

/**
 * Course Generator class for creating golf courses
 */
export class CourseGenerator {
  private scene: THREE.Scene;
  private world: RAPIER.World;
  private courseElements: Map<string, { mesh: THREE.Object3D, body: RAPIER.RigidBody, collider?: RAPIER.Collider }> = new Map();
  private targets: Map<string, { mesh: THREE.Object3D, body: RAPIER.RigidBody, hit: boolean }> = new Map();
  private hole: { mesh: THREE.Object3D, body: RAPIER.RigidBody } | null = null;
  private startPosition: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
  private coursePar: number = 3;
  
  constructor(scene: THREE.Scene, world: RAPIER.World) {
    this.scene = scene;
    this.world = world;
  }
  
  /**
   * Create a course from a template
   */
  public createCourse(template: CourseTemplate): void {
    // Clear existing course elements
    this.clearCourse();
    
    // Set course metadata
    this.startPosition = template.startPosition.clone();
    this.coursePar = template.par;
    
    // Create terrain
    this.createTerrain(
      template.terrain.width, 
      template.terrain.height,
      template.terrain.heightMap
    );
    
    // Create course elements
    template.elements.forEach((element, index) => {
      switch (element.type) {
        case CourseElementType.WALL:
          this.createWall(
            `wall_${index}`,
            element.position,
            element.rotation,
            element.scale
          );
          break;
          
        case CourseElementType.TARGET:
          this.createTarget(
            `target_${index}`,
            element.position,
            element.properties?.radius || 0.5
          );
          break;
          
        case CourseElementType.HOLE:
          this.createHole(element.position);
          break;
          
        case CourseElementType.BUMPER:
          this.createBumper(
            `bumper_${index}`,
            element.position,
            element.properties?.radius || 0.5
          );
          break;
          
        case CourseElementType.BOOST_PAD:
          this.createBoostPad(
            `boost_${index}`,
            element.position,
            element.rotation,
            element.scale
          );
          break;
          
        case CourseElementType.SAND_TRAP:
          this.createSandTrap(
            `sand_${index}`,
            element.position,
            element.scale
          );
          break;
      }
    });
  }
  
  /**
   * Create a basic terrain
   */
  private createTerrain(
    width: number, 
    height: number,
    heightMap?: number[][]
  ): void {
    // Create flat terrain if no heightmap is provided
    if (!heightMap) {
      const geometry = new THREE.BoxGeometry(width, 2, height);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x67c240,
        roughness: 0.8,
        metalness: 0.2
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(0, -1, 0); // Set half below the origin
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      
      // Create Rapier rigid body (static)
      const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -1, 0);
      const body = this.world.createRigidBody(bodyDesc);
      
      // Create collider
      const colliderDesc = RAPIER.ColliderDesc.cuboid(
        width / 2,
        1, // Half-height
        height / 2
      );
      const collider = this.world.createCollider(colliderDesc, body);
      
      // Store terrain
      this.courseElements.set('terrain', { mesh, body, collider });
      return;
    }
    
    // TODO: Implement heightmap-based terrain
    // For now just use flat terrain
    this.createTerrain(width, height);
  }
  
  /**
   * Create a wall
   */
  private createWall(
    id: string,
    position: THREE.Vector3,
    rotation?: THREE.Euler,
    scale?: THREE.Vector3
  ): void {
    // Default scale if not provided
    const wallScale = scale || new THREE.Vector3(5, 2, 0.5);
    
    // Create wall geometry
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8888ff, // Blue-ish for walls
      roughness: 0.6,
      metalness: 0.1
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    if (rotation) mesh.rotation.copy(rotation);
    mesh.scale.copy(wallScale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    
    // Create Rapier rigid body (static)
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      position.x, position.y, position.z
    );
    
    if (rotation) {
      const quat = new THREE.Quaternion().setFromEuler(rotation);
      bodyDesc.setRotation({
        x: quat.x,
        y: quat.y,
        z: quat.z,
        w: quat.w
      });
    }
    
    const body = this.world.createRigidBody(bodyDesc);
    
    // Create collider with wall properties
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      wallScale.x / 2,
      wallScale.y / 2,
      wallScale.z / 2
    );
    const collider = this.world.createCollider(colliderDesc, body);
    
    // Set as wall type for cling physics
    setSurfaceProperties(collider, SurfaceType.WALL);
    
    // Store wall
    this.courseElements.set(id, { mesh, body, collider });
  }
  
  /**
   * Create a hittable target
   */
  private createTarget(
    id: string,
    position: THREE.Vector3,
    radius: number = 0.5
  ): void {
    // Create target geometry
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff4500, // Orange-red for targets
      roughness: 0.3,
      metalness: 0.5
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.castShadow = true;
    this.scene.add(mesh);
    
    // Create Rapier rigid body (kinematic)
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      position.x, position.y, position.z
    );
    const body = this.world.createRigidBody(bodyDesc);
    
    // Create collider as sensor (to detect hits without solid collision)
    const colliderDesc = RAPIER.ColliderDesc.ball(radius).setSensor(true);
    this.world.createCollider(colliderDesc, body);
    
    // Store target
    this.targets.set(id, { mesh, body, hit: false });
  }
  
  /**
   * Create the goal hole
   */
  private createHole(position: THREE.Vector3): void {
    // Create hole geometry (cylinder)
    const geometry = new THREE.CylinderGeometry(0.7, 0.7, 0.1, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0x000000, // Black hole
      roughness: 0.1,
      metalness: 0.5
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    // Adjust to be slightly above the ground
    mesh.position.y = 0.05;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    
    // Create Rapier rigid body (fixed)
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      position.x, position.y, position.z
    );
    const body = this.world.createRigidBody(bodyDesc);
    
    // Create collider as sensor
    const colliderDesc = RAPIER.ColliderDesc.cylinder(0.05, 0.7).setSensor(true);
    this.world.createCollider(colliderDesc, body);
    
    // Store hole
    this.hole = { mesh, body };
  }
  
  /**
   * Create a bumper (bounces the player)
   */
  private createBumper(
    id: string,
    position: THREE.Vector3,
    radius: number = 0.5
  ): void {
    // Create bumper geometry
    const geometry = new THREE.CylinderGeometry(radius, radius, 1, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffcc00, // Yellow for bumpers
      roughness: 0.3,
      metalness: 0.5
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.castShadow = true;
    this.scene.add(mesh);
    
    // Create Rapier rigid body (fixed)
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      position.x, position.y, position.z
    );
    const body = this.world.createRigidBody(bodyDesc);
    
    // Create collider with high restitution (bouncy)
    const colliderDesc = RAPIER.ColliderDesc.cylinder(0.5, radius)
      .setRestitution(1.5); // Very bouncy
    const collider = this.world.createCollider(colliderDesc, body);
    
    // Set as bounce pad type
    setSurfaceProperties(collider, SurfaceType.BOUNCE_PAD);
    
    // Store bumper
    this.courseElements.set(id, { mesh, body, collider });
  }
  
  /**
   * Create a boost pad (speeds up the player)
   */
  private createBoostPad(
    id: string,
    position: THREE.Vector3,
    rotation?: THREE.Euler,
    scale?: THREE.Vector3
  ): void {
    // Default scale if not provided
    const padScale = scale || new THREE.Vector3(2, 0.1, 2);
    
    // Create boost pad geometry
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ffff, // Cyan for boost pads
      roughness: 0.3,
      metalness: 0.7,
      transparent: true,
      opacity: 0.7
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    if (rotation) mesh.rotation.copy(rotation);
    mesh.scale.copy(padScale);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    
    // Create Rapier rigid body (fixed)
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      position.x, position.y, position.z
    );
    
    if (rotation) {
      const quat = new THREE.Quaternion().setFromEuler(rotation);
      bodyDesc.setRotation({
        x: quat.x,
        y: quat.y,
        z: quat.z,
        w: quat.w
      });
    }
    
    const body = this.world.createRigidBody(bodyDesc);
    
    // Create collider as sensor
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      padScale.x / 2,
      padScale.y / 2,
      padScale.z / 2
    ).setSensor(true);
    this.world.createCollider(colliderDesc, body);
    
    // Store boost pad
    this.courseElements.set(id, { mesh, body });
  }
  
  /**
   * Create a sand trap (slows the player)
   */
  private createSandTrap(
    id: string,
    position: THREE.Vector3,
    scale?: THREE.Vector3
  ): void {
    // Default scale if not provided
    const trapScale = scale || new THREE.Vector3(3, 0.1, 3);
    
    // Create sand trap geometry
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0xd2b48c, // Sand color
      roughness: 0.9,
      metalness: 0.1
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.scale.copy(trapScale);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    
    // Create Rapier rigid body (fixed)
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      position.x, position.y, position.z
    );
    const body = this.world.createRigidBody(bodyDesc);
    
    // Create collider with high friction
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      trapScale.x / 2,
      trapScale.y / 2,
      trapScale.z / 2
    );
    const collider = this.world.createCollider(colliderDesc, body);
    
    // Set as sand type for high friction
    setSurfaceProperties(collider, SurfaceType.SAND);
    
    // Store sand trap
    this.courseElements.set(id, { mesh, body, collider });
  }
  
  /**
   * Clear the current course
   */
  public clearCourse(): void {
    // Remove all course elements
    this.courseElements.forEach(element => {
      this.scene.remove(element.mesh);
      if (element.body) {
        this.world.removeRigidBody(element.body);
      }
    });
    
    // Clear course elements
    this.courseElements.clear();
    
    // Remove all targets
    this.targets.forEach(target => {
      this.scene.remove(target.mesh);
      if (target.body) {
        this.world.removeRigidBody(target.body);
      }
    });
    
    // Clear targets
    this.targets.clear();
    
    // Remove hole
    if (this.hole) {
      this.scene.remove(this.hole.mesh);
      if (this.hole.body) {
        this.world.removeRigidBody(this.hole.body);
      }
      this.hole = null;
    }
  }
  
  /**
   * Check if a target is hit
   * @param targetBody The target body to check
   * @returns True if target is newly hit, false otherwise
   */
  public hitTarget(targetBody: RAPIER.RigidBody): boolean {
    // Find target by body
    for (const [id, target] of this.targets.entries()) {
      if (target.body === targetBody) {
        // Check if already hit
        if (target.hit) return false;
        
        // Mark as hit
        target.hit = true;
        
        // Change appearance to indicate hit
        const material = (target.mesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
        material.color.set(0x00ff00); // Green when hit
        material.emissive.set(0x003300); // Slight glow
        
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if all targets are hit
   */
  public areAllTargetsHit(): boolean {
    for (const target of this.targets.values()) {
      if (!target.hit) return false;
    }
    
    return true;
  }
  
  /**
   * Check if the ball is in the hole
   */
  public isInHole(ballPosition: THREE.Vector3): boolean {
    if (!this.hole) return false;
    
    const holePos = this.hole.body.translation();
    const distance = Math.sqrt(
      Math.pow(ballPosition.x - holePos.x, 2) +
      Math.pow(ballPosition.z - holePos.z, 2)
    );
    
    // Ball is in hole if within radius and close to y position
    return distance < 0.7 && Math.abs(ballPosition.y - holePos.y) < 0.5;
  }
  
  /**
   * Get the start position for the player
   */
  public getStartPosition(): THREE.Vector3 {
    return this.startPosition.clone();
  }
  
  /**
   * Get the par for the course
   */
  public getPar(): number {
    return this.coursePar;
  }
  
  /**
   * Get all targets
   */
  public getTargets(): Map<string, { mesh: THREE.Object3D, body: RAPIER.RigidBody, hit: boolean }> {
    return this.targets;
  }
  
  /**
   * Get the hole
   */
  public getHole(): { mesh: THREE.Object3D, body: RAPIER.RigidBody } | null {
    return this.hole;
  }
}

/**
 * Create a sample course for testing
 */
export function createSampleCourse(): CourseTemplate {
  return {
    name: "Sample Course",
    terrain: {
      width: 30,
      height: 30
    },
    startPosition: new THREE.Vector3(0, 1, 0),
    par: 3,
    elements: [
      // Walls to enclose the course
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(0, 1, 15),
        scale: new THREE.Vector3(30, 2, 1)
      },
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(0, 1, -15),
        scale: new THREE.Vector3(30, 2, 1)
      },
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(15, 1, 0),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
        scale: new THREE.Vector3(30, 2, 1)
      },
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(-15, 1, 0),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
        scale: new THREE.Vector3(30, 2, 1)
      },
      
      // Obstacles
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(5, 1, 5),
        rotation: new THREE.Euler(0, Math.PI / 4, 0),
        scale: new THREE.Vector3(8, 2, 1)
      },
      {
        type: CourseElementType.WALL,
        position: new THREE.Vector3(-5, 1, -5),
        rotation: new THREE.Euler(0, Math.PI / 4, 0),
        scale: new THREE.Vector3(8, 2, 1)
      },
      
      // Bumper
      {
        type: CourseElementType.BUMPER,
        position: new THREE.Vector3(8, 1, -8),
        properties: { radius: 1 }
      },
      
      // Sand trap
      {
        type: CourseElementType.SAND_TRAP,
        position: new THREE.Vector3(-8, 0.05, 8),
        scale: new THREE.Vector3(5, 0.1, 5)
      },
      
      // Boost pad
      {
        type: CourseElementType.BOOST_PAD,
        position: new THREE.Vector3(-10, 0.05, -10),
        scale: new THREE.Vector3(3, 0.1, 3)
      },
      
      // Targets
      {
        type: CourseElementType.TARGET,
        position: new THREE.Vector3(10, 1, 0),
        properties: { radius: 0.6 }
      },
      {
        type: CourseElementType.TARGET,
        position: new THREE.Vector3(-10, 1, 0),
        properties: { radius: 0.6 }
      },
      {
        type: CourseElementType.TARGET,
        position: new THREE.Vector3(0, 1, 10),
        properties: { radius: 0.6 }
      },
      
      // Hole (only appears when all targets are hit)
      {
        type: CourseElementType.HOLE,
        position: new THREE.Vector3(0, 0, -10)
      }
    ]
  };
}