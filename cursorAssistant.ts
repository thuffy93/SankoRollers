// ECSYThreeRoot.jsx - A React component to initialize the ECSY-Three world
import React, { useEffect, useRef, useState } from 'react';
import { 
  ECSYThreeWorld, 
  initialize, 
  WebGLRendererComponent 
} from 'ecsy-three';
import { CursorSystem, CursorComponent, CursorProvider } from './CursorSystem';

// Create a context to provide ECSY-Three world to components
const ECSYThreeContext = React.createContext(null);

export const useECSYThree = () => {
  const context = React.useContext(ECSYThreeContext);
  if (!context) {
    throw new Error('useECSYThree must be used within an ECSYThreeProvider');
  }
  return context;
};

export const ECSYThreeProvider = ({ children }) => {
  const containerRef = useRef(null);
  const [ecsyThree, setEcsyThree] = useState(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create ECSY-Three world
    const world = new ECSYThreeWorld();
    
    // Register cursor system and component
    world.registerComponent(CursorComponent);
    world.registerSystem(CursorSystem);
    
    // Initialize the Three.js scene
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    
    // Resize canvas to fit container
    const resizeCanvas = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        renderer.setSize(width, height, false);
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Initialize ECSY-Three environment
    const ecsy = initialize(world, { renderer });
    
    // Set up animation loop
    const clock = new THREE.Clock();
    
    const animate = () => {
      const delta = clock.getDelta();
      const elapsedTime = clock.elapsedTime;
      
      // Execute ECSY systems
      world.execute(delta, elapsedTime);
      
      requestAnimationFrame(animate);
    };
    
    // Start animation loop
    animate();
    
    // Store ECSY-Three data
    setEcsyThree({
      world,
      scene: ecsy.scene,
      camera: ecsy.camera,
      renderer: ecsy.renderer,
      sceneEntity: ecsy.sceneEntity,
      cameraEntity: ecsy.cameraEntity,
      rendererEntity: ecsy.rendererEntity
    });
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      world.stop();
    };
  }, []);
  
  return (
    <ECSYThreeContext.Provider value={ecsyThree}>
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100%', 
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'hidden'
        }}
      >
        {ecsyThree && children}
      </div>
    </ECSYThreeContext.Provider>
  );
};

// RapierPhysicsSystem.js - Integrate Rapier physics with ECSY
import { System } from 'ecsy';
import { World, RigidBodyDesc, ColliderDesc } from '@dimforge/rapier3d-compat';
import { Object3DComponent } from 'ecsy-three';

// Component to store Rapier physics data
export class RapierComponent extends Component {}

RapierComponent.schema = {
  rigidBody: { type: Types.Ref },
  collider: { type: Types.Ref },
  type: { type: Types.String, default: 'dynamic' }, // dynamic, static, kinematic
  colliderType: { type: Types.String, default: 'cuboid' }, // cuboid, ball, etc.
  mass: { type: Types.Number, default: 1 },
  restitution: { type: Types.Number, default: 0.2 },
  friction: { type: Types.Number, default: 0.5 },
  linearDamping: { type: Types.Number, default: 0.1 },
  angularDamping: { type: Types.Number, default: 0.1 },
  isSensor: { type: Types.Boolean, default: false }
};

// System to manage Rapier physics
export class RapierPhysicsSystem extends System {
  init() {
    // Initialize Rapier physics world
    this.physicsWorld = new World({ x: 0.0, y: -9.81, z: 0.0 });
    
    // Map to store entity mapping
    this.entityMap = new Map();
  }
  
  execute(delta) {
    // Step physics simulation
    this.physicsWorld.step();
    
    // Update Three.js object transforms from physics
    const entities = this.queries.physics.results;
    
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const rapierComponent = entity.getComponent(RapierComponent);
      const object3D = entity.getObject3D();
      
      if (rapierComponent.rigidBody && object3D) {
        // Get the position and rotation from Rapier
        const position = rapierComponent.rigidBody.translation();
        const rotation = rapierComponent.rigidBody.rotation();
        
        // Update the Three.js object
        object3D.position.set(position.x, position.y, position.z);
        object3D.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      }
    }
    
    // Process entities that were just added
    const added = this.queries.physics.added;
    for (let i = 0; i < added.length; i++) {
      this.initializePhysics(added[i]);
    }
    
    // Handle removed entities
    const removed = this.queries.physics.removed;
    for (let i = 0; i < removed.length; i++) {
      this.removePhysics(removed[i]);
    }
  }
  
  initializePhysics(entity) {
    const rapierComponent = entity.getComponent(RapierComponent);
    const object3D = entity.getObject3D();
    
    if (!object3D) return;
    
    // Create rigid body
    let rigidBodyDesc;
    
    switch (rapierComponent.type) {
      case 'static':
        rigidBodyDesc = RigidBodyDesc.fixed();
        break;
      case 'kinematic':
        rigidBodyDesc = RigidBodyDesc.kinematicPositionBased();
        break;
      case 'dynamic':
      default:
        rigidBodyDesc = RigidBodyDesc.dynamic();
        break;
    }
    
    const position = object3D.position;
    const quaternion = object3D.quaternion;
    
    rigidBodyDesc.setTranslation(position.x, position.y, position.z);
    rigidBodyDesc.setRotation(quaternion);
    
    // Set additional properties
    rigidBodyDesc.setLinearDamping(rapierComponent.linearDamping);
    rigidBodyDesc.setAngularDamping(rapierComponent.angularDamping);
    
    const rigidBody = this.physicsWorld.createRigidBody(rigidBodyDesc);
    
    // Create collider
    let colliderDesc;
    
    // Get size from object3D (for basic shapes)
    const size = new THREE.Vector3();
    new THREE.Box3().setFromObject(object3D).getSize(size);
    
    switch (rapierComponent.colliderType) {
      case 'ball':
        // Use the smallest dimension for the radius
        const radius = Math.min(size.x, size.y, size.z) / 2;
        colliderDesc = ColliderDesc.ball(radius);
        break;
      case 'capsule':
        const halfHeight = size.y / 2 - size.x / 2;
        colliderDesc = ColliderDesc.capsule(halfHeight, size.x / 2);
        break;
      case 'cuboid':
      default:
        colliderDesc = ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);
        break;
    }
    
    // Set collider properties
    colliderDesc.setDensity(rapierComponent.mass);
    colliderDesc.setRestitution(rapierComponent.restitution);
    colliderDesc.setFriction(rapierComponent.friction);
    
    if (rapierComponent.isSensor) {
      colliderDesc.setSensor(true);
    }
    
    const collider = this.physicsWorld.createCollider(colliderDesc, rigidBody);
    
    // Store references
    rapierComponent.rigidBody = rigidBody;
    rapierComponent.collider = collider;
    
    // Map the entity
    this.entityMap.set(rigidBody.handle, entity);
  }
  
  removePhysics(entity) {
    const rapierComponent = entity.getRemovedComponent(RapierComponent);
    
    if (rapierComponent.rigidBody) {
      // Remove from map
      this.entityMap.delete(rapierComponent.rigidBody.handle);
      
      // Remove from physics world
      this.physicsWorld.removeRigidBody(rapierComponent.rigidBody);
    }
  }
  
  getEntityFromRigidBody(rigidBody) {
    return this.entityMap.get(rigidBody.handle);
  }
}

RapierPhysicsSystem.queries = {
  physics: {
    components: [RapierComponent, Object3DComponent],
    listen: {
      added: true,
      removed: true
    }
  }
};

// RapierPhysicsProvider.jsx - React component to initialize Rapier physics
import React, { useEffect } from 'react';
import { useECSYThree } from './ECSYThreeRoot';
import { RapierComponent, RapierPhysicsSystem } from './RapierPhysicsSystem';

export const RapierPhysicsProvider = ({ children }) => {
  const { world } = useECSYThree();
  
  useEffect(() => {
    if (!world) return;
    
    // Register physics components and systems
    world.registerComponent(RapierComponent);
    world.registerSystem(RapierPhysicsSystem);
    
    return () => {
      // Cleanup if needed
    };
  }, [world]);
  
  return <>{children}</>;
};

// Example usage - Putting it all together
import React from 'react';
import { ECSYThreeProvider, useECSYThree } from './ECSYThreeRoot';
import { CursorProvider, useCursor } from './CursorSystem';
import { RapierPhysicsProvider } from './RapierPhysicsProvider';

// A hook to create physical objects
export const usePhysicalObject = () => {
  const { world, sceneEntity } = useECSYThree();
  
  // Create a cube with physics
  const createPhysicalCube = (position = [0, 0, 0], size = 1, options = {}) => {
    if (!world || !sceneEntity) return null;
    
    // Create Three.js object
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshStandardMaterial({ color: options.color || 0xff0000 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    
    // Create entity with physics
    const entity = world.createEntity()
      .addObject3DComponent(mesh, sceneEntity)
      .addComponent(RapierComponent, {
        type: options.type || 'dynamic',
        colliderType: options.colliderType || 'cuboid',
        mass: options.mass || 1,
        restitution: options.restitution || 0.5,
        friction: options.friction || 0.5,
        isSensor: options.isSensor || false
      });
      
    return entity;
  };
  
  // Create a sphere with physics
  const createPhysicalSphere = (position = [0, 0, 0], radius = 0.5, options = {}) => {
    if (!world || !sceneEntity) return null;
    
    // Create Three.js object
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: options.color || 0x00ff00 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    
    // Create entity with physics
    const entity = world.createEntity()
      .addObject3DComponent(mesh, sceneEntity)
      .addComponent(RapierComponent, {
        type: options.type || 'dynamic',
        colliderType: 'ball',
        mass: options.mass || 1,
        restitution: options.restitution || 0.7,
        friction: options.friction || 0.3,
        isSensor: options.isSensor || false
      });
      
    return entity;
  };
  
  return {
    createPhysicalCube,
    createPhysicalSphere
  };
};

// Main application component
const App = () => {
  return (
    <ECSYThreeProvider>
      <RapierPhysicsProvider>
        <CursorProvider>
          <Scene />
        </CursorProvider>
      </RapierPhysicsProvider>
    </ECSYThreeProvider>
  );
};

// Scene component
const Scene = () => {
  const { sceneEntity } = useECSYThree();
  const { createPhysicalCube, createPhysicalSphere } = usePhysicalObject();
  const { setCursorMode } = useCursor();
  
  useEffect(() => {
    if (!sceneEntity) return;
    
    // Add lights
    const scene = sceneEntity.getObject3D();
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Create a ground plane
    createPhysicalCube([0, -2, 0], 20, { 
      type: 'static', 
      color: 0x999999,
      restitution: 0.3,
      friction: 0.8
    });
    
    // Create some physics objects
    createPhysicalCube([0, 5, 0], 1, { color: 0xff0000 });
    createPhysicalCube([1, 7, 0], 1, { color: 0xff7700 });
    createPhysicalCube([-1, 9, 0], 1, { color: 0xffaa00 });
    
    createPhysicalSphere([0, 3, 3], 0.7, { color: 0x00ff00 });
    createPhysicalSphere([1, 6, 2], 0.5, { color: 0x00ffaa });
    
    // Set cursor to grab mode when interacting with objects
    setCursorMode('pointer');
    
    // Cleanup
    return () => {
      // Cleanup code if needed
    };
  }, [sceneEntity, createPhysicalCube, createPhysicalSphere, setCursorMode]);
  
  return null; // Scene is managed by ECSY
};

// Example of a component to interact with physics objects
const PhysicsController = () => {
  const { world } = useECSYThree();
  const { setCursorMode } = useCursor();
  const [interactionMode, setInteractionMode] = useState('grab');
  
  const toggleInteractionMode = () => {
    const newMode = interactionMode === 'grab' ? 'push' : 'grab';
    setInteractionMode(newMode);
    setCursorMode(newMode);
  };
  
  return (
    <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 100 }}>
      <button onClick={toggleInteractionMode}>
        Mode: {interactionMode === 'grab' ? 'Grab Objects' : 'Push Objects'}
      </button>
    </div>
  );
};

// Implement a custom hook to manage camera
const useCamera = () => {
  const { cameraEntity } = useECSYThree();
  
  useEffect(() => {
    if (!cameraEntity) return;
    
    const camera = cameraEntity.getObject3D();
    
    // Position camera
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    
    // Add orbit controls
    const controls = new THREE.OrbitControls(camera, document.querySelector('canvas'));
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    
    return () => {
      controls.dispose();
    };
  }, [cameraEntity]);
  
  const moveCamera = (position, lookAt) => {
    if (!cameraEntity) return;
    
    const camera = cameraEntity.getObject3D();
    
    // Animate camera movement
    gsap.to(camera.position, {
      x: position[0],
      y: position[1],
      z: position[2],
      duration: 1,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (lookAt) {
          camera.lookAt(...lookAt);
        }
      }
    });
  };
  
  return { moveCamera };
};

// Full application with UI components
const FullApplication = () => {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <ECSYThreeProvider>
        <RapierPhysicsProvider>
          <CursorProvider>
            <Scene />
            <PhysicsController />
            <UI />
          </CursorProvider>
        </RapierPhysicsProvider>
      </ECSYThreeProvider>
    </div>
  );
};

// UI component
const UI = () => {
  const { setCursorSize, setCursorVisibility } = useCursor();
  const { moveCamera } = useCamera();
  
  const handleCursorSizeChange = (e) => {
    setCursorSize(parseFloat(e.target.value));
  };
  
  const handleViewChange = (view) => {
    switch (view) {
      case 'top':
        moveCamera([0, 15, 0], [0, 0, 0]);
        break;
      case 'side':
        moveCamera([15, 5, 0], [0, 0, 0]);
        break;
      case 'front':
        moveCamera([0, 5, 15], [0, 0, 0]);
        break;
      case 'default':
      default:
        moveCamera([0, 5, 10], [0, 0, 0]);
        break;
    }
  };
  
  return (
    <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 100 }}>
      <div style={{ background: 'rgba(255,255,255,0.7)', padding: 15, borderRadius: 5 }}>
        <h3>Controls</h3>
        
        <div>
          <label>
            Cursor Size:
            <input 
              type="range" 
              min="0.05" 
              max="0.5" 
              step="0.05" 
              defaultValue="0.1" 
              onChange={handleCursorSizeChange}
            />
          </label>
        </div>
        
        <div>
          <label>
            <input 
              type="checkbox" 
              defaultChecked 
              onChange={(e) => setCursorVisibility(e.target.checked)} 
            />
            Show Cursor
          </label>
        </div>
        
        <div style={{ marginTop: 10 }}>
          <p>Camera Views:</p>
          <button onClick={() => handleViewChange('default')}>Default</button>
          <button onClick={() => handleViewChange('top')}>Top</button>
          <button onClick={() => handleViewChange('side')}>Side</button>
          <button onClick={() => handleViewChange('front')}>Front</button>
        </div>
      </div>
    </div>
  );
};

export default FullApplication;

// AdvancedInteractionSystem.js - Extending cursor functionality with physics interactions
import { ECSYThreeSystem } from "ecsy-three";
import { CursorComponent } from "./CursorSystem";
import { RapierComponent } from "./RapierPhysicsSystem";
import { Vector3 } from "three";
import { Object3DComponent } from "ecsy-three";

// Component to store interaction data
export class InteractionComponent extends Component {}

InteractionComponent.schema = {
  // Is the entity being dragged?
  isDragging: { type: Types.Boolean, default: false },
  // The entity that is dragging this entity
  dragger: { type: Types.Ref, default: null },
  // Joint used for physics dragging
  joint: { type: Types.Ref, default: null },
  // Interaction mode
  mode: { type: Types.String, default: "grab" }, // grab, push, rotate
  // Allowed interactions
  allowDrag: { type: Types.Boolean, default: true },
  allowRotate: { type: Types.Boolean, default: true },
  allowPush: { type: Types.Boolean, default: true },
  // Stored original properties
  originalMass: { type: Types.Number, default: 1 },
  // Distance from camera when grabbed
  grabDistance: { type: Types.Number, default: 5 },
  // Spring strength for physics joints
  springStrength: { type: Types.Number, default: 100 },
  // Damping for physics joints
  springDamping: { type: Types.Number, default: 10 },
  // Highlight color when interacting
  highlightColor: { type: ThreeTypes.Color, default: new Vector3(1.0, 0.8, 0.2) },
  // Original color
  originalColor: { type: ThreeTypes.Color, default: new Vector3(1.0, 1.0, 1.0) }
};

// System to handle advanced physics interactions
export class AdvancedInteractionSystem extends ECSYThreeSystem {
  init() {
    this.tempVec1 = new Vector3();
    this.tempVec2 = new Vector3();
    this.raycaster = new THREE.Raycaster();
    
    // Store reference to physics world
    this.physicsWorld = this.world.getSystem(RapierPhysicsSystem).physicsWorld;
    
    // Create a joint builder for physics dragging
    this.prevDragPos = new Vector3();
    this.dragOffset = new Vector3();
    this.dragVelocity = new Vector3();
    this.lastTime = performance.now();
  }
  
  execute(delta) {
    const cursors = this.queries.cursors.results;
    const interactables = this.queries.interactables.results;
    const currentTime = performance.now();
    const timeDelta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    // Skip if delta is too large (tab was inactive)
    if (delta > 0.1) return;
    
    // Process cursor interactions
    for (let i = 0; i < cursors.length; i++) {
      const cursor = cursors[i];
      const cursorComponent = cursor.getComponent(CursorComponent);
      
      // Handle dragging
      if (cursorComponent.state === "active" && cursorComponent.mode === "grab") {
        // Find if we're already dragging something
        let draggingEntity = null;
        
        for (let j = 0; j < interactables.length; j++) {
          const entity = interactables[j];
          const interaction = entity.getComponent(InteractionComponent);
          
          if (interaction.isDragging && interaction.dragger === cursor) {
            draggingEntity = entity;
            break;
          }
        }
        
        // Start dragging if needed
        if (!draggingEntity && cursorComponent.targetEntity) {
          const targetEntity = cursorComponent.targetEntity;
          
          // Check if target is interactable
          if (targetEntity.hasComponent(InteractionComponent) && 
              targetEntity.hasComponent(RapierComponent)) {
            this.startDragging(cursor, targetEntity);
            draggingEntity = targetEntity;
          }
        }
        
        // Update dragging if we have an entity
        if (draggingEntity) {
          this.updateDragging(cursor, draggingEntity, delta);
        }
      } else {
        // Release anything we're dragging
        for (let j = 0; j < interactables.length; j++) {
          const entity = interactables[j];
          const interaction = entity.getMutableComponent(InteractionComponent);
          
          if (interaction.isDragging && interaction.dragger === cursor) {
            this.stopDragging(entity);
          }
        }
      }
      
      // Handle pushing mode
      if (cursorComponent.state === "active" && cursorComponent.mode === "push") {
        if (cursorComponent.targetEntity && 
            cursorComponent.targetEntity.hasComponent(InteractionComponent) &&
            cursorComponent.targetEntity.hasComponent(RapierComponent)) {
          
          const targetEntity = cursorComponent.targetEntity;
          const interaction = targetEntity.getComponent(InteractionComponent);
          
          if (interaction.allowPush) {
            this.applyPushForce(cursor, targetEntity);
          }
        }
      }
      
      // Update highlighting for hovering
      for (let j = 0; j < interactables.length; j++) {
        const entity = interactables[j];
        const interaction = entity.getMutableComponent(InteractionComponent);
        
        // Skip if being dragged
        if (interaction.isDragging) continue;
        
        // Check if this entity is the cursor target
        const isTarget = cursorComponent.targetEntity === entity;
        
        // Update visual highlighting
        this.updateEntityHighlight(entity, isTarget);
      }
    }
  }
  
  startDragging(cursor, entity) {
    const interaction = entity.getMutableComponent(InteractionComponent);
    const rapier = entity.getMutableComponent(RapierComponent);
    
    if (!interaction.allowDrag || !rapier.rigidBody) return;
    
    // Flag as dragging
    interaction.isDragging = true;
    interaction.dragger = cursor;
    
    // Store original mass for restoration
    interaction.originalMass = rapier.mass;
    
    // Get current position
    const obj = entity.getObject3D();
    if (!obj) return;
    
    // Get cursor position
    const cursorComponent = cursor.getComponent(CursorComponent);
    const cursorPos = new Vector3().copy(cursorComponent.position);
    
    // Calculate offset from cursor to object
    this.dragOffset.copy(obj.position).sub(cursorPos);
    this.prevDragPos.copy(cursorPos);
    
    // Create a physics joint based on interaction mode
    const rigidBody = rapier.rigidBody;
    
    // Store the current position to calculate velocity
    interaction.lastPosition = new Vector3().copy(obj.position);
    
    // Add joint based on interaction mode
    if (interaction.mode === "grab") {
      // We'll use a spring joint to drag the object
      const anchor1 = { x: 0, y: 0, z: 0 }; // Relative to cursor
      const anchor2 = { // Relative to target
        x: this.dragOffset.x, 
        y: this.dragOffset.y, 
        z: this.dragOffset.z
      };
      
      const jointDesc = this.physicsWorld.createJointDesc('spring');
      jointDesc.setStiffness(interaction.springStrength);
      jointDesc.setDamping(interaction.springDamping);
      
      // We'll update the joint position each frame as the cursor moves
      interaction.joint = jointDesc;
    }
    
    // Apply highlight
    this.updateEntityHighlight(entity, true, true);
  }
  
  updateDragging(cursor, entity, delta) {
    const interaction = entity.getMutableComponent(InteractionComponent);
    const rapier = entity.getComponent(RapierComponent);
    const cursorComponent = cursor.getComponent(CursorComponent);
    
    if (!interaction.isDragging || !rapier.rigidBody) return;
    
    // Get cursor position
    const cursorPos = new Vector3().copy(cursorComponent.position);
    
    // Calculate target position with offset
    const targetPos = new Vector3().copy(cursorPos).add(this.dragOffset);
    
    // Calculate velocity for dampened movement
    this.dragVelocity.subVectors(cursorPos, this.prevDragPos).divideScalar(delta);
    this.prevDragPos.copy(cursorPos);
    
    // Apply to physics with different strategies based on mode
    if (interaction.mode === "grab") {
      // Update joint position
      rapier.rigidBody.applyImpulse({
        x: (targetPos.x - rapier.rigidBody.translation().x) * 5,
        y: (targetPos.y - rapier.rigidBody.translation().y) * 5,
        z: (targetPos.z - rapier.rigidBody.translation().z) * 5
      }, true);
    }
  }
  
  stopDragging(entity) {
    const interaction = entity.getMutableComponent(InteractionComponent);
    const rapier = entity.getMutableComponent(RapierComponent);
    
    if (!interaction.isDragging) return;
    
    // Clear dragging state
    interaction.isDragging = false;
    
    // Apply velocity on release for more natural movement
    if (rapier.rigidBody) {
      rapier.rigidBody.setLinvel({
        x: this.dragVelocity.x * 2,
        y: this.dragVelocity.y * 2,
        z: this.dragVelocity.z * 2
      }, true);
    }
    
    // Remove joint if exists
    if (interaction.joint) {
      // Clean up joint
      interaction.joint = null;
    }
    
    // Reset highlight
    this.updateEntityHighlight(entity, false);
  }
  
  applyPushForce(cursor, entity) {
    const rapier = entity.getComponent(RapierComponent);
    const cursorComponent = cursor.getComponent(CursorComponent);
    
    if (!rapier.rigidBody) return;
    
    // Get direction from camera to cursor
    const camera = this.getCamera();
    if (!camera) return;
    
    // Create direction vector
    const direction = new Vector3()
      .subVectors(cursorComponent.position, camera.position)
      .normalize();
    
    // Apply push force in that direction
    rapier.rigidBody.applyImpulse({
      x: direction.x * 10,
      y: direction.y * 10,
      z: direction.z * 10
    }, true);
    
    // Apply highlight during push
    this.updateEntityHighlight(entity, true, true);
  }
  
  updateEntityHighlight(entity, isHighlighted, isActive = false) {
    const obj = entity.getObject3D();
    const interaction = entity.getComponent(InteractionComponent);
    
    if (!obj) return;
    
    // Update materials
    obj.traverse(child => {
      if (child.isMesh && child.material) {
        if (isHighlighted) {
          // Store original color if not already stored
          if (!child.userData.originalColor) {
            child.userData.originalColor = child.material.color.clone();
          }
          
          // Apply highlight color
          const intensity = isActive ? 1.0 : 0.7;
          const highlightColor = interaction.highlightColor;
          child.material.color.setRGB(
            highlightColor.x * intensity,
            highlightColor.y * intensity,
            highlightColor.z * intensity
          );
        } else if (child.userData.originalColor) {
          // Restore original color
          child.material.color.copy(child.userData.originalColor);
        }
      }
    });
  }
  
  getCamera() {
    // Get camera from renderer entity
    const rendererEntities = this.queries.renderers.results;
    if (rendererEntities.length === 0) return null;
    
    const rendererComponent = rendererEntities[0].getComponent(WebGLRendererComponent);
    return rendererComponent.camera.getObject3D();
  }
}

// Define system queries
AdvancedInteractionSystem.queries = {
  cursors: { components: [CursorComponent] },
  interactables: { components: [InteractionComponent, RapierComponent, Object3DComponent] },
  renderers: { components: [WebGLRendererComponent] }
};

// React hook for interactable objects
export const useInteractable = () => {
  const { world, sceneEntity } = useECSYThree();
  
  // Create an interactable object
  const createInteractable = (position = [0, 0, 0], options = {}) => {
    if (!world || !sceneEntity) return null;
    
    // Create geometry based on shape
    let geometry;
    let colliderType;
    
    switch (options.shape || 'box') {
      case 'sphere':
        geometry = new THREE.SphereGeometry(options.size || 1, 32, 32);
        colliderType = 'ball';
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(
          options.size || 1, 
          options.size || 1, 
          options.height || 2, 
          32
        );
        colliderType = 'cylinder';
        break;
      case 'box':
      default:
        geometry = new THREE.BoxGeometry(
          options.width || options.size || 1, 
          options.height || options.size || 1, 
          options.depth || options.size || 1
        );
        colliderType = 'cuboid';
        break;
    }
    
    // Create material
    const material = new THREE.MeshStandardMaterial({ 
      color: options.color || 0x3399ff,
      roughness: options.roughness || 0.4,
      metalness: options.metalness || 0.2
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Add physics and interaction components
    const entity = world.createEntity()
      .addObject3DComponent(mesh, sceneEntity)
      .addComponent(RapierComponent, {
        type: options.physicsType || 'dynamic',
        colliderType: colliderType,
        mass: options.mass || 1,
        restitution: options.restitution || 0.3,
        friction: options.friction || 0.6
      })
      .addComponent(InteractionComponent, {
        mode: options.interactionMode || 'grab',
        allowDrag: options.allowDrag !== false,
        allowRotate: options.allowRotate !== false,
        allowPush: options.allowPush !== false,
        springStrength: options.springStrength || 100,
        springDamping: options.springDamping || 10,
        highlightColor: options.highlightColor || new Vector3(1.0, 0.8, 0.2)
      });
      
    return entity;
  };
  
  return { createInteractable };
};

// InteractionProvider.jsx - React component to initialize the interaction system
import React, { useEffect } from 'react';
import { useECSYThree } from './ECSYThreeRoot';
import { 
  InteractionComponent, 
  AdvancedInteractionSystem,
  useInteractable 
} from './AdvancedInteractionSystem';

export const InteractionProvider = ({ children }) => {
  const { world } = useECSYThree();
  
  useEffect(() => {
    if (!world) return;
    
    // Register interaction components and systems
    world.registerComponent(InteractionComponent);
    world.registerSystem(AdvancedInteractionSystem);
    
    return () => {
      // Cleanup if needed
    };
  }, [world]);
  
  return <>{children}</>;
};

// Example usage: Creating a physics playground
import React, { useEffect } from 'react';
import { useECSYThree } from './ECSYThreeRoot';
import { useInteractable } from './AdvancedInteractionSystem';
import { useCursor } from './CursorSystem';

const PhysicsPlayground = () => {
  const { sceneEntity } = useECSYThree();
  const { createInteractable } = useInteractable();
  const { setCursorMode } = useCursor();
  
  useEffect(() => {
    if (!sceneEntity) return;
    
    // Set default cursor mode
    setCursorMode('grab');
    
    // Create ground
    createInteractable([0, -2, 0], {
      shape: 'box',
      width: 20,
      height: 0.5,
      depth: 20,
      color: 0xaaaaaa,
      physicsType: 'static',
      allowDrag: false
    });
    
    // Create interactable objects
    // Boxes
    for (let i = 0; i < 5; i++) {
      createInteractable([
        Math.random() * 8 - 4,
        Math.random() * 5 + 1,
        Math.random() * 8 - 4
      ], {
        shape: 'box',
        size: Math.random() * 0.5 + 0.5,
        color: 0x3388ff,
        mass: Math.random() * 2 + 0.5
      });
    }
    
    // Spheres
    for (let i = 0; i < 5; i++) {
      createInteractable([
        Math.random() * 8 - 4,
        Math.random() * 5 + 1,
        Math.random() * 8 - 4
      ], {
        shape: 'sphere',
        size: Math.random() * 0.4 + 0.3,
        color: 0xff3388,
        mass: Math.random() * 2 + 0.5,
        restitution: 0.7
      });
    }
    
    // Cylinders
    for (let i = 0; i < 5; i++) {
      createInteractable([
        Math.random() * 8 - 4,
        Math.random() * 5 + 1,
        Math.random() * 8 - 4
      ], {
        shape: 'cylinder',
        size: Math.random() * 0.4 + 0.3,
        height: Math.random() * 1 + 0.5,
        color: 0x33ff88,
        mass: Math.random() * 2 + 0.5
      });
    }
    
    // Create a heavier object that's harder to move
    createInteractable([0, 1, 0], {
      shape: 'box',
      size: 1.5,
      color: 0xffaa22,
      mass: 10,
      springStrength: 200, // Stronger springs for heavier objects
      highlightColor: new Vector3(1.0, 0.5, 0.0)
    });
    
    // Create a lightweight object that's easy to toss around
    createInteractable([2, 1, 2], {
      shape: 'sphere',
      size: 0.4,
      color: 0x22aaff,
      mass: 0.2,
      restitution: 0.9, // Very bouncy
      springStrength: 50, // Weaker springs for lighter objects
      highlightColor: new Vector3(0.2, 0.7, 1.0)
    });
    
  }, [sceneEntity, createInteractable, setCursorMode]);
  
  return null;
};

export default PhysicsPlayground;