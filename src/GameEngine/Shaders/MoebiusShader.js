// src/GameEngine/Shaders/MoebiusShader.js
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

/**
 * MoebiusShader - A Three.js post-processing system to achieve a Moebius-inspired comic book style
 * Features:
 * - Thin black outlines using a Sobel filter on depth and normal maps
 * - Flat colors with minimal shading
 * - Cross-hatching for shading
 * - Hand-drawn wiggle effect for outlines
 * - Grain effect to simulate paper texture
 */
class MoebiusShader {
  constructor(renderer, scene, camera, options = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    
    // Default options
    this.options = {
      outlineThickness: options.outlineThickness || 1.0,
      outlineColor: options.outlineColor || new THREE.Color(0x000000),
      crossHatchingEnabled: options.crossHatchingEnabled !== undefined ? options.crossHatchingEnabled : true,
      crossHatchingIntensity: options.crossHatchingIntensity || 0.5,
      wiggleEnabled: options.wiggleEnabled !== undefined ? options.wiggleEnabled : true,
      wiggleIntensity: options.wiggleIntensity || 0.005,
      wiggleSpeed: options.wiggleSpeed || 0.5,
      grainEnabled: options.grainEnabled !== undefined ? options.grainEnabled : true,
      grainIntensity: options.grainIntensity || 0.1,
      colorAdjustment: options.colorAdjustment !== undefined ? options.colorAdjustment : true,
      saturation: options.saturation || 1.2,
      contrast: options.contrast || 1.1,
      ...options
    };
    
    // Timer for animations
    this.time = 0;
    
    // Initialize render targets for depth and normal maps
    this.initRenderTargets();
    
    // Create material overrides for the scene
    this.initMaterials();
    
    // Initialize the post-processing pipeline
    this.initPostProcessing();
    
    // Load textures for cross-hatching and grain
    this.loadTextures();
  }
  
  /**
   * Initialize render targets for depth and normal maps
   */
  initRenderTargets() {
    const width = this.renderer.domElement.width;
    const height = this.renderer.domElement.height;
    
    // Render target for depth map
    this.depthTarget = new THREE.WebGLRenderTarget(width, height);
    this.depthTarget.texture.format = THREE.RGBAFormat;
    this.depthTarget.texture.minFilter = THREE.NearestFilter;
    this.depthTarget.texture.magFilter = THREE.NearestFilter;
    this.depthTarget.texture.generateMipmaps = false;
    this.depthTarget.stencilBuffer = false;
    this.depthTarget.depthBuffer = true;
    
    // Render target for normal map
    this.normalTarget = new THREE.WebGLRenderTarget(width, height);
    this.normalTarget.texture.format = THREE.RGBAFormat;
    this.normalTarget.texture.minFilter = THREE.NearestFilter;
    this.normalTarget.texture.magFilter = THREE.NearestFilter;
    this.normalTarget.texture.generateMipmaps = false;
    this.normalTarget.stencilBuffer = false;
    this.normalTarget.depthBuffer = true;
    
    // Create materials for rendering to targets
    this.depthMaterial = new THREE.MeshDepthMaterial();
    this.depthMaterial.depthPacking = THREE.RGBADepthPacking;
    this.depthMaterial.blending = THREE.NoBlending;
    
    this.normalMaterial = new THREE.MeshNormalMaterial();
  }
  
  /**
   * Initialize materials for flat coloring
   */
  initMaterials() {
    // Store original materials to restore later
    this.originalMaterials = new Map();
    
    // Override materials with flat colors if needed
    if (this.options.overrideMaterials) {
      this.scene.traverse(object => {
        if (object.isMesh && object.material) {
          // Store original material
          this.originalMaterials.set(object, object.material);
          
          // Create a flat-colored material based on original
          if (Array.isArray(object.material)) {
            // Handle multi-material objects
            const materials = object.material.map(mat => {
              return new THREE.MeshBasicMaterial({
                color: mat.color || new THREE.Color(0xffffff),
                map: mat.map,
                transparent: mat.transparent,
                opacity: mat.opacity
              });
            });
            object.material = materials;
          } else {
            // Single material
            object.material = new THREE.MeshBasicMaterial({
              color: object.material.color || new THREE.Color(0xffffff),
              map: object.material.map,
              transparent: object.material.transparent,
              opacity: object.material.opacity
            });
          }
        }
      });
    }
  }
  
  /**
   * Initialize post-processing pipeline
   */
  initPostProcessing() {
    // Create effect composer
    this.composer = new EffectComposer(this.renderer);
    
    // Add initial render pass
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    
    // Add Sobel outline pass
    this.outlinePass = new ShaderPass(this.createSobelShader());
    this.outlinePass.uniforms.resolution.value.set(
      this.renderer.domElement.width, 
      this.renderer.domElement.height
    );
    this.composer.addPass(this.outlinePass);
    
    // Add cross-hatching pass
    if (this.options.crossHatchingEnabled) {
      this.crossHatchPass = new ShaderPass(this.createCrossHatchShader());
      this.composer.addPass(this.crossHatchPass);
    }
    
    // Add grain pass
    if (this.options.grainEnabled) {
      this.grainPass = new ShaderPass(this.createGrainShader());
      this.composer.addPass(this.grainPass);
    }
    
    // Add color adjustment pass
    if (this.options.colorAdjustment) {
      this.colorPass = new ShaderPass(this.createColorAdjustmentShader());
      this.colorPass.uniforms.saturation.value = this.options.saturation;
      this.colorPass.uniforms.contrast.value = this.options.contrast;
      this.composer.addPass(this.colorPass);
    }
  }
  
  /**
   * Load required textures
   */
  loadTextures() {
    const textureLoader = new THREE.TextureLoader();
    
    // Load cross-hatching texture
    if (this.options.crossHatchingEnabled) {
      // Create a temporary canvas to generate the cross-hatch texture
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      
      // Clear canvas
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw horizontal lines (red channel)
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.height; i += 8) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }
      
      // Draw vertical lines (green channel)
      ctx.strokeStyle = 'green';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      
      // Draw diagonal lines (blue channel)
      ctx.strokeStyle = 'blue';
      ctx.lineWidth = 1;
      for (let i = -canvas.height; i < canvas.width * 2; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + canvas.height, canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(i, canvas.height);
        ctx.lineTo(i + canvas.height, 0);
        ctx.stroke();
      }
      
      // Create texture from canvas
      this.crossHatchTexture = new THREE.CanvasTexture(canvas);
      this.crossHatchTexture.wrapS = THREE.RepeatWrapping;
      this.crossHatchTexture.wrapT = THREE.RepeatWrapping;
      
      if (this.crossHatchPass) {
        this.crossHatchPass.uniforms.hatchTexture.value = this.crossHatchTexture;
      }
    }
    
    // Using noise in shader instead of a fixed texture for grain effect
  }
  
  /**
   * Create Sobel outline shader
   */
  createSobelShader() {
    return {
      uniforms: {
        tDiffuse: { value: null },
        depthMap: { value: null },
        normalMap: { value: null },
        resolution: { value: new THREE.Vector2() },
        outlineThickness: { value: this.options.outlineThickness },
        outlineColor: { value: this.options.outlineColor },
        time: { value: 0.0 },
        wiggleEnabled: { value: this.options.wiggleEnabled },
        wiggleIntensity: { value: this.options.wiggleIntensity }
      },
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D depthMap;
        uniform sampler2D normalMap;
        uniform vec2 resolution;
        uniform float outlineThickness;
        uniform vec3 outlineColor;
        uniform float time;
        uniform bool wiggleEnabled;
        uniform float wiggleIntensity;
        
        varying vec2 vUv;
        
        // Noise function for hand-drawn wiggle effect
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }
        
        float noise(vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          
          // Four corners in 2D of a tile
          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));
          
          // Smooth interpolation
          vec2 u = f * f * (3.0 - 2.0 * f);
          
          return mix(a, b, u.x) +
                (c - a) * u.y * (1.0 - u.x) +
                (d - b) * u.x * u.y;
        }
        
        // Sobel filter
        float sobel(sampler2D map, vec2 uv) {
          vec2 texel = 1.0 / resolution;
          
          // Sample neighboring pixels
          float tl = texture2D(map, uv + texel * vec2(-1, -1)).r;
          float tc = texture2D(map, uv + texel * vec2(0, -1)).r;
          float tr = texture2D(map, uv + texel * vec2(1, -1)).r;
          float ml = texture2D(map, uv + texel * vec2(-1, 0)).r;
          float mc = texture2D(map, uv).r;
          float mr = texture2D(map, uv + texel * vec2(1, 0)).r;
          float bl = texture2D(map, uv + texel * vec2(-1, 1)).r;
          float bc = texture2D(map, uv + texel * vec2(0, 1)).r;
          float br = texture2D(map, uv + texel * vec2(1, 1)).r;
          
          // Sobel horizontal
          float h = tl * -1.0 + tc * -2.0 + tr * -1.0 + ml * 0.0 + mc * 0.0 + mr * 0.0 + bl * 1.0 + bc * 2.0 + br * 1.0;
          // Sobel vertical
          float v = tl * -1.0 + tc * 0.0 + tr * 1.0 + ml * -2.0 + mc * 0.0 + mr * 2.0 + bl * -1.0 + bc * 0.0 + br * 1.0;
          
          return sqrt(h * h + v * v);
        }
        
        void main() {
          // Apply wiggle effect to UVs
          vec2 uv = vUv;
          if (wiggleEnabled) {
            float noiseValue = noise(uv * 10.0 + time * 0.1) * wiggleIntensity;
            uv = uv + vec2(noiseValue, noiseValue);
          }
          
          // Original color
          vec4 color = texture2D(tDiffuse, uv);
          
          // Detect edges using Sobel filter
          float depthEdge = sobel(depthMap, uv) * 10.0 * outlineThickness;
          vec4 normalSample = texture2D(normalMap, uv);
          float normalEdge = sobel(normalMap, uv) * outlineThickness;
          
          // Combine edges
          float edge = max(depthEdge, normalEdge);
          
          // Apply outline
          vec3 finalColor = mix(color.rgb, outlineColor, smoothstep(0.2, 0.3, edge));
          
          gl_FragColor = vec4(finalColor, color.a);
        }
      `
    };
  }
  
  /**
   * Create cross-hatch shader
   */
  createCrossHatchShader() {
    return {
      uniforms: {
        tDiffuse: { value: null },
        hatchTexture: { value: null },
        intensity: { value: this.options.crossHatchingIntensity }
      },
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D hatchTexture;
        uniform float intensity;
        
        varying vec2 vUv;
        
        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          
          // Calculate brightness
          float brightness = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          
          // Sample hatching texture (RGB channels represent different hatch patterns)
          vec3 hatch = texture2D(hatchTexture, vUv * 10.0).rgb;
          
          // Select hatching based on brightness
          vec3 hatching = vec3(1.0);
          if (brightness < 0.25) hatching = vec3(hatch.r * hatch.g * hatch.b);
          else if (brightness < 0.5) hatching = vec3(hatch.r * hatch.g);
          else if (brightness < 0.75) hatching = vec3(hatch.r);
          
          // Blend with original color
          vec3 finalColor = mix(color.rgb, hatching, intensity * (1.0 - brightness));
          
          gl_FragColor = vec4(finalColor, color.a);
        }
      `
    };
  }
  
  /**
   * Create grain shader
   */
  createGrainShader() {
    return {
      uniforms: {
        tDiffuse: { value: null },
        time: { value: 0.0 },
        intensity: { value: this.options.grainIntensity }
      },
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform float intensity;
        
        varying vec2 vUv;
        
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }
        
        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          
          // Generate grain
          vec2 seed = vUv + time;
          float grain = random(seed) * 2.0 - 1.0;
          
          // Apply grain
          vec3 finalColor = color.rgb + vec3(grain) * intensity;
          
          gl_FragColor = vec4(finalColor, color.a);
        }
      `
    };
  }
  
  /**
   * Create color adjustment shader
   */
  createColorAdjustmentShader() {
    return {
      uniforms: {
        tDiffuse: { value: null },
        saturation: { value: this.options.saturation },
        contrast: { value: this.options.contrast }
      },
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float saturation;
        uniform float contrast;
        
        varying vec2 vUv;
        
        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          
          // Saturation adjustment
          float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          vec3 saturatedColor = mix(vec3(luminance), color.rgb, saturation);
          
          // Contrast adjustment
          vec3 contrastedColor = (saturatedColor - 0.5) * contrast + 0.5;
          
          gl_FragColor = vec4(contrastedColor, color.a);
        }
      `
    };
  }
  
  /**
   * Resize render targets when window size changes
   */
  resize() {
    const width = this.renderer.domElement.width;
    const height = this.renderer.domElement.height;
    
    this.depthTarget.setSize(width, height);
    this.normalTarget.setSize(width, height);
    this.composer.setSize(width, height);
    
    this.outlinePass.uniforms.resolution.value.set(width, height);
  }
  
  /**
   * Update shader uniforms for animations
   */
  update(deltaTime) {
    this.time += deltaTime;
    
    // Update time-based uniforms
    if (this.outlinePass) {
      this.outlinePass.uniforms.time.value = this.time * this.options.wiggleSpeed;
    }
    
    if (this.grainPass) {
      this.grainPass.uniforms.time.value = this.time * 0.1;
    }
  }
  
  /**
   * Render the scene with the Moebius shader effect
   */
  render() {
    // Step 1: Render depth and normal maps
    const currentRenderTarget = this.renderer.getRenderTarget();
    const currentAutoClear = this.renderer.autoClear;
    
    // Save current scene states
    const originalOverrideMaterial = this.scene.overrideMaterial;
    
    // Render depth map
    this.scene.overrideMaterial = this.depthMaterial;
    this.renderer.setRenderTarget(this.depthTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    
    // Render normal map
    this.scene.overrideMaterial = this.normalMaterial;
    this.renderer.setRenderTarget(this.normalTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    
    // Restore scene state
    this.scene.overrideMaterial = originalOverrideMaterial;
    
    // Restore renderer state
    this.renderer.setRenderTarget(currentRenderTarget);
    this.renderer.autoClear = currentAutoClear;
    
    // Pass texture to outline shader
    this.outlinePass.uniforms.depthMap.value = this.depthTarget.texture;
    this.outlinePass.uniforms.normalMap.value = this.normalTarget.texture;
    
    // Step 2: Render final composite with post-processing
    this.composer.render();
  }
  
  /**
   * Dispose resources
   */
  dispose() {
    // Dispose render targets
    this.depthTarget.dispose();
    this.normalTarget.dispose();
    
    // Dispose textures
    if (this.crossHatchTexture) {
      this.crossHatchTexture.dispose();
    }
    
    // Dispose materials
    this.depthMaterial.dispose();
    this.normalMaterial.dispose();
    
    // Restore original materials
    this.originalMaterials.forEach((material, object) => {
      if (object.isMesh) {
        object.material = material;
      }
    });
    
    // Dispose composer
    this.composer.dispose();
  }
}

export default MoebiusShader;