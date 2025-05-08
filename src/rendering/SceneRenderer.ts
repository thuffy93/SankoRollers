import * as THREE from 'three';

/**
 * SceneRenderer - Handles rendering of the game scene
 */
export class SceneRenderer {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private width: number;
  private height: number;
  
  // Rendering options
  private shadows: boolean = true;
  private antialias: boolean = true;
  private pixelRatio: number = window.devicePixelRatio;
  private clearColor: THREE.Color = new THREE.Color(0x87ceeb); // Sky blue
  
  /**
   * Constructor
   */
  constructor(
    scene: THREE.Scene, 
    camera: THREE.Camera, 
    renderer: THREE.WebGLRenderer
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // Get initial size
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    // Configure renderer
    this.configureRenderer();
    
    // Set up window resize handling
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }
  
  /**
   * Configure the renderer
   */
  private configureRenderer(): void {
    // Set clear color
    this.renderer.setClearColor(this.clearColor);
    
    // Set size
    this.renderer.setSize(this.width, this.height);
    
    // Set pixel ratio
    this.renderer.setPixelRatio(this.pixelRatio);
    
    // Configure shadows
    if (this.shadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    // Set tone mapping
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    
    // Set output color space (updated from outputEncoding in newer THREE.js)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  
  /**
   * Handle window resize
   */
  private onWindowResize(): void {
    // Update dimensions
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    // Update renderer
    this.renderer.setSize(this.width, this.height);
    
    // Update camera aspect ratio if it's a perspective camera
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
    }
  }
  
  /**
   * Render the scene
   */
  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }
  
  /**
   * Set shadow quality
   */
  public setShadowQuality(quality: 'off' | 'low' | 'medium' | 'high'): void {
    switch (quality) {
      case 'off':
        this.renderer.shadowMap.enabled = false;
        break;
        
      case 'low':
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        break;
        
      case 'medium':
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        break;
        
      case 'high':
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        break;
    }
  }
  
  /**
   * Set clear color
   */
  public setClearColor(color: THREE.Color | number): void {
    this.clearColor = color instanceof THREE.Color ? color : new THREE.Color(color);
    this.renderer.setClearColor(this.clearColor);
  }
  
  /**
   * Get renderer
   */
  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }
  
  /**
   * Get scene
   */
  public getScene(): THREE.Scene {
    return this.scene;
  }
  
  /**
   * Get camera
   */
  public getCamera(): THREE.Camera {
    return this.camera;
  }
  
  /**
   * Get dimensions
   */
  public getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    // Remove event listeners
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    
    // Renderer cleanup handled by Game class
  }
} 