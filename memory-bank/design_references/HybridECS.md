# Hybrid ECS Implementation Strategy

## Overview

This document outlines a targeted, hybrid approach to Entity Component System (ECS) architecture for Cosmic Rollers. Rather than implementing a full ECS framework across the entire codebase, we'll adopt ECS principles selectively for specific subsystems that would benefit most from data-oriented design.

## Core Concept

Traditional object-oriented programming organizes code around objects that combine data and behavior. ECS separates:
- **Entities**: Simple IDs representing game objects
- **Components**: Pure data containers attached to entities
- **Systems**: Logic that processes entities with specific component combinations

Our hybrid approach keeps our component-based architecture for most systems while implementing data-oriented ECS patterns for specific performance-critical subsystems.

## Candidate Subsystems for ECS Implementation

### 1. Particle Systems
Ideal for ECS due to:
- High entity count (hundreds/thousands)
- Homogeneous data and behavior
- Performance-critical visual elements
- Limited interaction with other systems

### 2. Terrain Systems
Good candidate when:
- Many terrain chunks or segments exist
- Physics calculations need optimization
- LOD systems are implemented
- Memory usage needs optimization

### 3. Collectibles/Power-ups
Suitable when:
- Many similar items exist in the world
- Simple interaction patterns
- Need efficient spatial queries

## Implementation Pattern

```typescript
/**
 * Example MiniECS implementation for specific subsystems
 */
class MiniECS {
  // Entity management
  private entities: Set<number> = new Set();
  private nextEntityId: number = 0;
  private freeIds: number[] = [];
  
  // Component storage using TypedArrays for better performance
  private positions: Map<number, Float32Array> = new Map();
  private velocities: Map<number, Float32Array> = new Map();
  private lifetimes: Map<number, number> = new Map();
  private flags: Map<number, number> = new Map(); // Bitflags for boolean properties
  
  // Create a new entity
  createEntity(): number {
    const id = this.freeIds.pop() ?? this.nextEntityId++;
    this.entities.add(id);
    return id;
  }
  
  // Delete an entity and recycle its ID
  deleteEntity(id: number): void {
    if (!this.entities.has(id)) return;
    
    this.entities.delete(id);
    this.positions.delete(id);
    this.velocities.delete(id);
    this.lifetimes.delete(id);
    this.flags.delete(id);
    this.freeIds.push(id);
  }
  
  // Component management
  addPosition(entity: number, x: number, y: number, z: number): void {
    this.positions.set(entity, new Float32Array([x, y, z]));
  }
  
  addVelocity(entity: number, vx: number, vy: number, vz: number): void {
    this.velocities.set(entity, new Float32Array([vx, vy, vz]));
  }
  
  addLifetime(entity: number, duration: number): void {
    this.lifetimes.set(entity, duration);
  }
  
  // Get a component
  getPosition(entity: number): Float32Array | undefined {
    return this.positions.get(entity);
  }
  
  // Check if entity has components
  hasComponents(entity: number, ...components: string[]): boolean {
    if (!this.entities.has(entity)) return false;
    
    for (const component of components) {
      switch (component) {
        case 'position':
          if (!this.positions.has(entity)) return false;
          break;
        case 'velocity':
          if (!this.velocities.has(entity)) return false;
          break;
        case 'lifetime':
          if (!this.lifetimes.has(entity)) return false;
          break;
      }
    }
    
    return true;
  }
  
  // Example system: Movement
  movementSystem(deltaTime: number): void {
    this.entities.forEach(entity => {
      if (!this.hasComponents(entity, 'position', 'velocity')) return;
      
      const position = this.positions.get(entity)!;
      const velocity = this.velocities.get(entity)!;
      
      position[0] += velocity[0] * deltaTime;
      position[1] += velocity[1] * deltaTime;
      position[2] += velocity[2] * deltaTime;
    });
  }
  
  // Example system: Lifetime
  lifetimeSystem(deltaTime: number): Set<number> {
    const expired = new Set<number>();
    
    this.entities.forEach(entity => {
      if (!this.lifetimes.has(entity)) return;
      
      const lifetime = this.lifetimes.get(entity)! - deltaTime;
      
      if (lifetime <= 0) {
        expired.add(entity);
      } else {
        this.lifetimes.set(entity, lifetime);
      }
    });
    
    return expired;
  }
  
  // Process all systems
  update(deltaTime: number): void {
    // Process movement
    this.movementSystem(deltaTime);
    
    // Process lifetimes and remove expired entities
    const expired = this.lifetimeSystem(deltaTime);
    expired.forEach(entity => this.deleteEntity(entity));
  }
}
```

## Integration with Existing Architecture

### Facade Pattern for System Communication
```typescript
class ParticleSystemFacade {
  private miniECS: MiniECS;
  private renderer: ParticleRenderer;
  
  constructor(scene: THREE.Scene) {
    this.miniECS = new MiniECS();
    this.renderer = new ParticleRenderer(scene);
  }
  
  // Public API that matches existing architecture patterns
  createExplosion(position: THREE.Vector3, count: number, color: THREE.Color): void {
    for (let i = 0; i < count; i++) {
      const entity = this.miniECS.createEntity();
      
      // Add components with randomized values for the explosion
      this.miniECS.addPosition(entity, position.x, position.y, position.z);
      this.miniECS.addVelocity(
        entity,
        (Math.random() - 0.5) * 5,
        Math.random() * 5,
        (Math.random() - 0.5) * 5
      );
      this.miniECS.addLifetime(entity, 1 + Math.random());
      
      // Store additional render data
      this.renderer.setParticleColor(entity, color);
      this.renderer.setParticleSize(entity, 0.1 + Math.random() * 0.2);
    }
  }
  
  // Standard lifecycle methods matching our component interface
  update(deltaTime: number): void {
    this.miniECS.update(deltaTime);
    this.renderer.update(this.miniECS);
  }
  
  dispose(): void {
    this.renderer.dispose();
  }
}
```

## Performance Optimization

For maximum performance in critical systems:

1. **Object Pooling**: Pre-allocate and reuse TypedArrays to minimize garbage collection
   ```typescript
   class ComponentPool<T> {
     private pool: T[] = [];
     private size: number;
     
     constructor(initialSize: number, factory: () => T) {
       this.size = initialSize;
       for (let i = 0; i < initialSize; i++) {
         this.pool.push(factory());
       }
     }
     
     get(): T {
       return this.pool.pop() || this.expandPool();
     }
     
     recycle(item: T): void {
       this.pool.push(item);
     }
     
     private expandPool(): T {
       // Expand by 50% when empty
       const newSize = Math.ceil(this.size * 0.5);
       console.log(`Expanding pool by ${newSize} items`);
       // Implementation details...
     }
   }
   ```

2. **Archetype-based Storage**: Group entities with same component types for better cache locality
   ```typescript
   // Entities with Position+Velocity stored together
   class PositionVelocityArchetype {
     ids: number[] = [];
     positions: Float32Array;
     velocities: Float32Array;
     count: number = 0;
     
     constructor(capacity: number) {
       this.positions = new Float32Array(capacity * 3);
       this.velocities = new Float32Array(capacity * 3);
     }
     
     // Add entity to this archetype
     add(id: number, position: Float32Array, velocity: Float32Array): void {
       const index = this.count++;
       this.ids[index] = id;
       
       // Copy component data
       const posOffset = index * 3;
       const velOffset = index * 3;
       
       this.positions[posOffset] = position[0];
       this.positions[posOffset + 1] = position[1];
       this.positions[posOffset + 2] = position[2];
       
       this.velocities[velOffset] = velocity[0];
       this.velocities[velOffset + 1] = velocity[1];
       this.velocities[velOffset + 2] = velocity[2];
     }
   }
   ```

## When to Use Hybrid ECS

- **High Entity Count**: Systems with 100+ similar entities
- **Performance Bottlenecks**: Areas identified through profiling
- **Memory Concerns**: When memory usage needs optimization
- **Batch Processing**: Systems that would benefit from parallelization

## When Not to Use

- **Complex Entity Relationships**: Systems with deep hierarchical relationships
- **Heavily Stateful Behavior**: Entities with complex internal state machines
- **UI Components**: User interface elements with complex interaction patterns
- **Singleton Managers**: Global systems that don't have multiple instances

## Implementation Steps

1. **Identify Target Subsystem**: Choose one performance-critical system with many similar entities
2. **Create Mini-ECS**: Implement a minimal ECS framework for just that subsystem
3. **Refactor Gradually**: Convert the subsystem while maintaining functionality
4. **Benchmark**: Test performance before and after to validate approach
5. **Expand When Needed**: Apply to other subsystems only when clear benefits exist

## Integration Examples

### Particle Effects System
```typescript
// Example usage with Three.js
class ParticleSystemManager {
  private miniECS: MiniECS;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private positionBuffer: THREE.Float32BufferAttribute;
  private colorBuffer: THREE.Float32BufferAttribute;
  private sizeBuffer: THREE.Float32BufferAttribute;
  
  constructor(scene: THREE.Scene, maxParticles: number = 10000) {
    this.miniECS = new MiniECS();
    
    // Set up Three.js instanced rendering
    this.geometry = new THREE.BufferGeometry();
    this.positionBuffer = new THREE.Float32BufferAttribute(new Float32Array(maxParticles * 3), 3);
    this.colorBuffer = new THREE.Float32BufferAttribute(new Float32Array(maxParticles * 3), 3);
    this.sizeBuffer = new THREE.Float32BufferAttribute(new Float32Array(maxParticles), 1);
    
    this.geometry.setAttribute('position', this.positionBuffer);
    this.geometry.setAttribute('color', this.colorBuffer);
    this.geometry.setAttribute('size', this.sizeBuffer);
    
    this.material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    
    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);
  }
  
  update(deltaTime: number): void {
    // Update ECS
    this.miniECS.update(deltaTime);
    
    // Sync with Three.js buffers
    // Implementation details...
  }
}
```

## Future Considerations

As the project evolves, we can evaluate:
1. Expanding to more subsystems if performance benefits are demonstrated
2. Adding more sophisticated features like parallel system execution
3. Potentially adopting a full ECS framework if the hybrid approach proves successful
4. Considering WebAssembly-based ECS for even greater performance 