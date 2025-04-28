// src/GameEngine/Components/VisualStyle.js
import * as THREE from 'three';

/**
 * VisualStyle component for applying different rendering styles
 */
class VisualStyle {
  /**
   * Create a new visual style component
   * @param {Object} options - Component options
   */
  constructor(options = {}) {
    // Visual style settings
    this.style = options.style || 'standard'; // 'standard', 'moebius', etc.
    this.colorPalette = options.colorPalette || 'default';
    this.postProcessing = options.postProcessing !== undefined ? options.postProcessing : true;
    this.outlineStrength = options.outlineStrength || 1.0;
    this.toonShading = options.toonShading !== undefined ? options.toonShading : true;
    this.celShading = options.celShading !== undefined ? options.celShading : false;
    
    // Material overrides
    this.materialOverrides = options.materialOverrides || {};
    
    // Original materials for restoration
    this.originalMaterials = new Map();
    
    // Common material properties based on style
    this.materialProps = this.getMaterialProps();
    
    // Callback when style is applied or changed
    this.onStyleApplied = options.onStyleApplied || null;
    this.onStyleChanged = options.onStyleChanged || null;
  }
  
  /**
   * Get default material properties based on style
   * @returns {Object} Material properties
   */
  getMaterialProps() {
    switch (this.style) {
      case 'moebius':
        return {
          // Moebius-inspired comic book style
          roughness: 0.7,
          metalness: 0.0,
          flatShading: true,
          emissiveIntensity: 0.2,
          wireframe: false
        };
        
      case 'lowPoly':
        return {
          // Low-poly style
          roughness: 0.8,
          metalness: 0.0,
          flatShading: true,
          emissiveIntensity: 0.0,
          wireframe: false
        };
        
      case 'wireframe':
        return {
          // Wireframe style
          roughness: 0.5,
          metalness: 0.2,
          flatShading: false,
          emissiveIntensity: 0.0,
          wireframe: true
        };
        
      case 'neon':
        return {
          // Neon glow style
          roughness: 0.3,
          metalness: 0.5,
          flatShading: false,
          emissiveIntensity: 0.8,
          wireframe: false
        };
        
      case 'standard':
      default:
        return {
          // Standard PBR style
          roughness: 0.5,
          metalness: 0.3,
          flatShading: false,
          emissiveIntensity: 0.3,
          wireframe: false
        };
    }
  }
  
  /**
   * Apply visual style to a Three.js object
   * @param {THREE.Object3D} object - Object to apply style to
   */
  applyTo(object) {
    if (!object) return;
    
    // Store original materials
    this.storeOriginalMaterials(object);
    
    // Apply style to object and its children
    this.applyStyleToObject(object);
    
    // Call style applied callback
    if (this.onStyleApplied) {
      this.onStyleApplied(object, this.style);
    }
  }
  
  /**
   * Store original materials for later restoration
   * @param {THREE.Object3D} object - Object to store materials for
   */
  storeOriginalMaterials(object) {
    if (!object) return;
    
    // Check if object is a mesh with material
    if (object.isMesh && object.material) {
      // Store original material if not already stored
      if (!this.originalMaterials.has(object.uuid)) {
        // Handle array of materials
        if (Array.isArray(object.material)) {
          this.originalMaterials.set(
            object.uuid, 
            object.material.map(mat => mat.clone())
          );
        } else {
          this.originalMaterials.set(object.uuid, object.material.clone());
        }
      }
    }
    
    // Process children recursively
    if (object.children) {
      object.children.forEach(child => this.storeOriginalMaterials(child));
    }
  }
  
  /**
   * Apply style to an object and its children
   * @param {THREE.Object3D} object - Object to apply style to
   */
  applyStyleToObject(object) {
    if (!object) return;
    
    // Apply style to mesh
    if (object.isMesh && object.material) {
      this.applyStyleToMaterial(object);
    }
    
    // Process children recursively
    if (object.children) {
      object.children.forEach(child => this.applyStyleToObject(child));
    }
  }
  
  /**
   * Apply style to a mesh's material
   * @param {THREE.Mesh} mesh - Mesh to apply style to
   */
  applyStyleToMaterial(mesh) {
    // Skip if mesh has no material
    if (!mesh.material) return;
    
    // Get material properties based on style
    const props = { ...this.materialProps };
    
    // Apply material overrides for specific objects
    if (this.materialOverrides[mesh.name]) {
      Object.assign(props, this.materialOverrides[mesh.name]);
    }
    
    // Handle array of materials
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(material => 
        this.createStyledMaterial(material, props)
      );
    } else {
      // Single material
      mesh.material = this.createStyledMaterial(mesh.material, props);
    }
  }
  
  /**
   * Create a styled material based on the original material
   * @param {THREE.Material} originalMaterial - Original material
   * @param {Object} props - Material properties
   * @returns {THREE.Material} Styled material
   */
  createStyledMaterial(originalMaterial, props) {
    let material;
    
    // Create appropriate material based on style
    switch (this.style) {
      case 'moebius':
        // For Moebius comic style, use toon material
        material = new THREE.MeshToonMaterial({
          color: originalMaterial.color || 0xffffff,
          emissive: originalMaterial.emissive || 0x000000,
          map: originalMaterial.map || null,
          transparent: originalMaterial.transparent || false,
          opacity: originalMaterial.opacity || 1.0,
          side: originalMaterial.side || THREE.FrontSide
        });
        break;
        
      case 'wireframe':
        // Use the original material but enable wireframe
        material = originalMaterial.clone();
        material.wireframe = true;
        
        // Add emissive for better visibility
        if (material.emissive) {
          material.emissive.set(0x222222);
          material.emissiveIntensity = 0.5;
        }
        break;
        
      case 'neon':
        // Enhanced emissive material for neon look
        material = new THREE.MeshStandardMaterial({
          color: originalMaterial.color || 0xffffff,
          emissive: originalMaterial.color || 0xffffff, // Same as color for glow
          emissiveIntensity: props.emissiveIntensity,
          metalness: props.metalness,
          roughness: props.roughness,
          map: originalMaterial.map || null,
          transparent: true,
          opacity: 0.9
        });
        break;
        
      case 'lowPoly':
        // Low-poly style with flat shading
        material = new THREE.MeshStandardMaterial({
          color: originalMaterial.color || 0xffffff,
          emissive: originalMaterial.emissive || 0x000000,
          emissiveIntensity: props.emissiveIntensity,
          metalness: props.metalness,
          roughness: props.roughness,
          map: originalMaterial.map || null,
          transparent: originalMaterial.transparent || false,
          opacity: originalMaterial.opacity || 1.0,
          flatShading: true,
          side: originalMaterial.side || THREE.FrontSide
        });
        break;
        
      case 'standard':
      default:
        // Clone original material and modify properties
        material = originalMaterial.clone();
        
        // Update material properties
        if (material.metalness !== undefined) material.metalness = props.metalness;
        if (material.roughness !== undefined) material.roughness = props.roughness;
        if (material.flatShading !== undefined) material.flatShading = props.flatShading;
        if (material.emissiveIntensity !== undefined) material.emissiveIntensity = props.emissiveIntensity;
        if (material.wireframe !== undefined) material.wireframe = props.wireframe;
        break;
    }
    
    // Ensure the material needs update
    material.needsUpdate = true;
    
    return material;
  }
  
  /**
   * Set the visual style
   * @param {string} style - Style name ('standard', 'moebius', etc.)
   * @returns {boolean} Whether the style was changed
   */
  setStyle(style) {
    if (this.style === style) return false;
    
    // Save previous style
    const previousStyle = this.style;
    
    // Update style
    this.style = style;
    
    // Update material properties
    this.materialProps = this.getMaterialProps();
    
    // Call style changed callback
    if (this.onStyleChanged) {
      this.onStyleChanged(this.style, previousStyle);
    }
    
    return true;
  }
  
  /**
   * Restore original materials
   * @param {THREE.Object3D} object - Object to restore materials for
   */
  restoreOriginalMaterials(object) {
    if (!object) return;
    
    // Check if object is a mesh with material
    if (object.isMesh && object.material) {
      // Restore original material if stored
      const originalMaterial = this.originalMaterials.get(object.uuid);
      if (originalMaterial) {
        object.material = originalMaterial.clone();
      }
    }
    
    // Process children recursively
    if (object.children) {
      object.children.forEach(child => this.restoreOriginalMaterials(child));
    }
  }
  
  /**
   * Set color palette
   * @param {string} palette - Color palette name
   */
  setPalette(palette) {
    this.colorPalette = palette;
    
    // Material properties could be updated based on palette
    // This would be implemented in a real game
  }
  
  /**
   * Set post-processing effects
   * @param {boolean} enabled - Whether post-processing is enabled
   */
  setPostProcessing(enabled) {
    this.postProcessing = enabled;
  }
  
  /**
   * Set outline strength
   * @param {number} strength - Outline strength (0-1)
   */
  setOutlineStrength(strength) {
    this.outlineStrength = Math.max(0, Math.min(1, strength));
  }
  
  /**
   * Set toon shading
   * @param {boolean} enabled - Whether toon shading is enabled
   */
  setToonShading(enabled) {
    this.toonShading = enabled;
  }
  
  /**
   * Set cel shading
   * @param {boolean} enabled - Whether cel shading is enabled
   */
  setCelShading(enabled) {
    this.celShading = enabled;
  }
  
  /**
   * Add a material override for a specific object
   * @param {string} objectName - Object name
   * @param {Object} materialProps - Material properties
   */
  addMaterialOverride(objectName, materialProps) {
    this.materialOverrides[objectName] = materialProps;
  }
  
  /**
   * Clear material overrides
   */
  clearMaterialOverrides() {
    this.materialOverrides = {};
  }
  
  /**
   * Dispose resources
   */
  dispose() {
    // Clear original materials
    this.originalMaterials.clear();
  }
}

export default VisualStyle;