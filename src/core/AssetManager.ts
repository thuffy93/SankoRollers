import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { AudioManager } from './AudioManager';

/**
 * Interface for asset loading progress
 */
interface LoadingProgress {
  itemsLoaded: number;
  itemsTotal: number;
  progress: number;
}

/**
 * Types of assets that can be loaded
 */
type AssetType = 'texture' | 'model' | 'audio' | 'json';

/**
 * AssetManager - Handles loading and caching of game assets
 */
export class AssetManager {
  // Asset caches by type
  private textures: Map<string, THREE.Texture> = new Map();
  private models: Map<string, THREE.Group> = new Map();
  private audioManager: AudioManager;
  private jsonData: Map<string, any> = new Map();
  
  // Loaders
  private textureLoader: THREE.TextureLoader;
  private modelLoader: GLTFLoader;
  
  // Loading state
  private isLoading: boolean = false;
  private loadingProgress: LoadingProgress = {
    itemsLoaded: 0,
    itemsTotal: 0,
    progress: 0
  };
  
  // Callbacks
  private onProgressCallback: ((progress: LoadingProgress) => void) | null = null;
  private onCompleteCallback: (() => void) | null = null;
  
  /**
   * Constructor
   */
  constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.modelLoader = new GLTFLoader();
    this.audioManager = new AudioManager();
    
    // Configure loaders
    this.configureLoaders();
  }
  
  /**
   * Configure the asset loaders
   */
  private configureLoaders(): void {
    // Set up texture loader
    this.textureLoader.setCrossOrigin('anonymous');
    
    // Set up GLTF loader
    // (Additional configuration if needed)
  }
  
  /**
   * Preload a batch of assets
   */
  public preload(
    assets: { type: AssetType; key: string; url: string }[],
    onProgress?: (progress: LoadingProgress) => void,
    onComplete?: () => void
  ): void {
    if (this.isLoading) {
      console.warn('AssetManager: Already loading assets, ignoring new preload request');
      return;
    }
    
    // Set loading state
    this.isLoading = true;
    this.loadingProgress = {
      itemsLoaded: 0,
      itemsTotal: assets.length,
      progress: 0
    };
    
    // Set callbacks
    this.onProgressCallback = onProgress || null;
    this.onCompleteCallback = onComplete || null;
    
    // Nothing to load
    if (assets.length === 0) {
      this.completeLoading();
      return;
    }
    
    // Load each asset
    assets.forEach(asset => {
      this.loadAsset(asset.type, asset.key, asset.url);
    });
  }
  
  /**
   * Load a single asset
   */
  private loadAsset(type: AssetType, key: string, url: string): void {
    switch (type) {
      case 'texture':
        this.loadTexture(key, url);
        break;
      case 'model':
        this.loadModel(key, url);
        break;
      case 'audio':
        this.loadAudio(key, url);
        break;
      case 'json':
        this.loadJson(key, url);
        break;
      default:
        console.warn(`AssetManager: Unknown asset type '${type}'`);
        this.incrementLoaded();
        break;
    }
  }
  
  /**
   * Load a texture
   */
  private loadTexture(key: string, url: string): void {
    this.textureLoader.load(
      url,
      (texture) => {
        this.textures.set(key, texture);
        this.incrementLoaded();
      },
      undefined,
      (error) => {
        console.error(`AssetManager: Failed to load texture '${key}' from '${url}'`, error);
        this.incrementLoaded();
      }
    );
  }
  
  /**
   * Load a 3D model
   */
  private loadModel(key: string, url: string): void {
    this.modelLoader.load(
      url,
      (gltf) => {
        this.models.set(key, gltf.scene);
        this.incrementLoaded();
      },
      undefined,
      (error) => {
        console.error(`AssetManager: Failed to load model '${key}' from '${url}'`, error);
        this.incrementLoaded();
      }
    );
  }
  
  /**
   * Load an audio file
   */
  private loadAudio(key: string, url: string): void {
    this.audioManager.loadSound(key, url, () => {
      this.incrementLoaded();
    }, (error) => {
      console.error(`AssetManager: Failed to load audio '${key}' from '${url}'`, error);
      this.incrementLoaded();
    });
  }
  
  /**
   * Load a JSON file
   */
  private loadJson(key: string, url: string): void {
    fetch(url)
      .then(response => response.json())
      .then(data => {
        this.jsonData.set(key, data);
        this.incrementLoaded();
      })
      .catch(error => {
        console.error(`AssetManager: Failed to load JSON '${key}' from '${url}'`, error);
        this.incrementLoaded();
      });
  }
  
  /**
   * Increment the loaded assets counter
   */
  private incrementLoaded(): void {
    this.loadingProgress.itemsLoaded++;
    this.loadingProgress.progress = 
      this.loadingProgress.itemsLoaded / this.loadingProgress.itemsTotal;
    
    // Call progress callback
    if (this.onProgressCallback) {
      this.onProgressCallback(this.loadingProgress);
    }
    
    // Check if all assets are loaded
    if (this.loadingProgress.itemsLoaded >= this.loadingProgress.itemsTotal) {
      this.completeLoading();
    }
  }
  
  /**
   * Complete the loading process
   */
  private completeLoading(): void {
    this.isLoading = false;
    
    // Call complete callback
    if (this.onCompleteCallback) {
      this.onCompleteCallback();
    }
    
    console.log(`AssetManager: Loaded ${this.loadingProgress.itemsLoaded} assets`);
  }
  
  /**
   * Get a loaded texture
   */
  public getTexture(key: string): THREE.Texture | null {
    if (!this.textures.has(key)) {
      console.warn(`AssetManager: Texture '${key}' not found`);
      return null;
    }
    
    return this.textures.get(key) || null;
  }
  
  /**
   * Get a loaded model (cloned instance)
   */
  public getModel(key: string): THREE.Group | null {
    if (!this.models.has(key)) {
      console.warn(`AssetManager: Model '${key}' not found`);
      return null;
    }
    
    // Return a clone of the model to avoid modifying the original
    return this.models.get(key)?.clone() || null;
  }
  
  /**
   * Get loaded JSON data
   */
  public getJson(key: string): any | null {
    if (!this.jsonData.has(key)) {
      console.warn(`AssetManager: JSON data '${key}' not found`);
      return null;
    }
    
    return this.jsonData.get(key) || null;
  }
  
  /**
   * Get audio manager
   */
  public getAudioManager(): AudioManager {
    return this.audioManager;
  }
  
  /**
   * Get loading progress
   */
  public getProgress(): LoadingProgress {
    return this.loadingProgress;
  }
  
  /**
   * Check if assets are currently loading
   */
  public isCurrentlyLoading(): boolean {
    return this.isLoading;
  }
} 