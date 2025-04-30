import * as THREE from 'three';
import { UIComponent, UIState } from '../UIManager';
import { ShotState } from '../ShotSystem';
import { GameState } from '../GameSystem';
import { InputDeviceType } from '../InputManager';

/**
 * Abstract base class for Three.js based UI components
 */
export abstract class ThreeUIComponent implements UIComponent {
  // Scene reference
  protected scene: THREE.Scene;
  
  // Container for all component elements
  protected container: THREE.Group;
  
  // Visibility state
  protected isVisible: boolean = false;
  
  // Position and scale
  protected position: THREE.Vector3 = new THREE.Vector3();
  protected scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  
  // Animation properties
  protected animationDuration: number = 0.3; // seconds
  protected currentAnimationTime: number = 0;
  protected targetOpacity: number = 1;
  protected currentOpacity: number = 0;
  
  /**
   * Create a new Three.js UI component
   * @param scene The THREE.js scene
   * @param position Initial position for the component
   */
  constructor(scene: THREE.Scene, position?: THREE.Vector3) {
    this.scene = scene;
    
    // Create container for all elements
    this.container = new THREE.Group();
    this.container.visible = false;
    
    // Set initial position if provided
    if (position) {
      this.position.copy(position);
      this.container.position.copy(position);
    }
    
    // Add container to scene
    this.scene.add(this.container);
  }
  
  /**
   * Initialize the component (to be implemented by subclasses)
   */
  protected abstract initialize(): void;
  
  /**
   * Set the position of the component
   * @param position New position vector
   */
  public setPosition(position: THREE.Vector3): void {
    this.position.copy(position);
    this.container.position.copy(position);
  }
  
  /**
   * Set the scale of the component
   * @param scale New scale vector
   */
  public setScale(scale: THREE.Vector3): void {
    this.scale.copy(scale);
    this.container.scale.copy(scale);
  }
  
  /**
   * Show the component
   */
  public show(): void {
    this.isVisible = true;
    this.container.visible = true;
    this.targetOpacity = 1;
    this.currentAnimationTime = 0;
  }
  
  /**
   * Hide the component
   */
  public hide(): void {
    this.isVisible = false;
    this.targetOpacity = 0;
    this.currentAnimationTime = 0;
    
    // If no animation, hide immediately
    if (this.animationDuration <= 0) {
      this.container.visible = false;
    }
  }
  
  /**
   * Set the opacity of all materials in the component
   * @param opacity Opacity value (0-1)
   */
  protected setOpacity(opacity: number): void {
    this.currentOpacity = opacity;
    
    // Apply opacity to all materials
    this.container.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
        if (object.material instanceof THREE.Material) {
          // Handle single material
          this.setMaterialOpacity(object.material, opacity);
        } else if (Array.isArray(object.material)) {
          // Handle material array
          object.material.forEach(material => {
            this.setMaterialOpacity(material, opacity);
          });
        }
      }
    });
  }
  
  /**
   * Set the opacity of a single material
   * @param material The material to modify
   * @param opacity Opacity value (0-1)
   */
  private setMaterialOpacity(material: THREE.Material, opacity: number): void {
    if (material.transparent || opacity < 1) {
      material.transparent = true;
      material.opacity = opacity;
      material.needsUpdate = true;
    }
  }
  
  /**
   * Update the component animation
   * @param deltaTime Time since last frame in seconds
   */
  protected updateAnimation(deltaTime: number): void {
    if (this.animationDuration <= 0) return;
    
    // Update animation time
    this.currentAnimationTime += deltaTime;
    
    // Calculate progress (0-1)
    const progress = Math.min(this.currentAnimationTime / this.animationDuration, 1);
    
    // Calculate current opacity based on target
    const startOpacity = this.isVisible ? 0 : 1;
    const endOpacity = this.isVisible ? 1 : 0;
    const newOpacity = startOpacity + (endOpacity - startOpacity) * progress;
    
    // Apply new opacity
    this.setOpacity(newOpacity);
    
    // Hide container when fade out animation completes
    if (!this.isVisible && progress >= 1) {
      this.container.visible = false;
    }
  }
  
  /**
   * Update the component
   * @param deltaTime Time since last frame in seconds
   */
  public update(deltaTime: number): void {
    // Update animation
    this.updateAnimation(deltaTime);
  }
  
  /**
   * Called when UI state changes (optional implementation)
   */
  public onStateChanged?(prevState: UIState, newState: UIState): void {
    // Default implementation does nothing
  }
  
  /**
   * Called when shot state changes (optional implementation)
   */
  public onShotStateChanged?(shotState: ShotState): void {
    // Default implementation does nothing
  }
  
  /**
   * Called when game state changes (optional implementation)
   */
  public onGameStateChanged?(gameState: GameState): void {
    // Default implementation does nothing
  }
  
  /**
   * Called when input device changes (optional implementation)
   */
  public onInputDeviceChanged?(device: InputDeviceType): void {
    // Default implementation does nothing
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    // Remove from scene
    this.scene.remove(this.container);
    
    // Dispose geometries and materials
    this.container.traverse(object => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        
        if (object.material instanceof THREE.Material) {
          this.disposeMaterial(object.material);
        } else if (Array.isArray(object.material)) {
          object.material.forEach(this.disposeMaterial);
        }
      } else if (object instanceof THREE.Sprite && object.material) {
        this.disposeMaterial(object.material);
      }
    });
  }
  
  /**
   * Dispose a single material and its textures
   */
  protected disposeMaterial(material: THREE.Material): void {
    // Dispose textures
    for (const propertyName in material) {
      const value = (material as any)[propertyName];
      if (value instanceof THREE.Texture) {
        value.dispose();
      }
    }
    
    material.dispose();
  }
} 