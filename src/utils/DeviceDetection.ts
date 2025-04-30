/**
 * Utility class for device detection and feature detection
 */
export class DeviceDetection {
  // Device type classification
  private static _isMobile: boolean | null = null;
  private static _isTablet: boolean | null = null;
  private static _isDesktop: boolean | null = null;

  // Feature detection
  private static _hasTouch: boolean | null = null;
  private static _hasWebGL: boolean | null = null;
  private static _hasOrientation: boolean | null = null;
  private static _hasGamepad: boolean | null = null;

  // Screen orientation
  private static _isPortrait: boolean | null = null;
  private static _isLandscape: boolean | null = null;

  // Device capabilities
  private static _isLowEndDevice: boolean | null = null;
  private static _isHighEndDevice: boolean | null = null;

  // Is initialized flag
  private static _initialized = false;

  /**
   * Initialize the device detection system
   */
  public static initialize(): void {
    if (this._initialized) return;

    // Run initial detection
    this.detectDeviceType();
    this.detectFeatures();
    this.detectOrientation();
    this.detectDeviceCapabilities();

    // Set up listeners
    this.setupOrientationListener();
    
    // Set initialized flag
    this._initialized = true;
  }

  /**
   * Listen for orientation changes
   */
  private static setupOrientationListener(): void {
    const handleOrientationChange = () => {
      const prevIsPortrait = this._isPortrait;
      
      // Update orientation state
      this.detectOrientation();
      
      // Dispatch event if orientation changed
      if (prevIsPortrait !== this._isPortrait) {
        const orientationEvent = new CustomEvent('orientationupdate', {
          detail: {
            isPortrait: this._isPortrait,
            isLandscape: this._isLandscape
          }
        });
        window.dispatchEvent(orientationEvent);
      }
    };

    // Listen for window resize which may indicate orientation change
    window.addEventListener('resize', handleOrientationChange);
    
    // Listen for actual orientation change events
    if (window.matchMedia) {
      const mediaQueryPortrait = window.matchMedia('(orientation: portrait)');
      const mediaQueryHandler = () => handleOrientationChange();
      
      // Use the new API if available, fall back to deprecated one
      if (mediaQueryPortrait.addEventListener) {
        mediaQueryPortrait.addEventListener('change', mediaQueryHandler);
      } else if ('addListener' in mediaQueryPortrait) {
        // @ts-ignore - addListener is deprecated but necessary for old browsers
        mediaQueryPortrait.addListener(mediaQueryHandler);
      }
    }
    
    // Also listen for device orientation change event
    window.addEventListener('orientationchange', handleOrientationChange);
  }

  /**
   * Detect device type based on user agent and screen size
   */
  private static detectDeviceType(): void {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    
    // Check for mobile device using regex
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobileDevice = mobileRegex.test(userAgent);
    
    // Check for tablet device using screen size and user agent
    const isTabletDevice = 
      (isMobileDevice && Math.min(window.screen.width, window.screen.height) > 480) ||
      /iPad|Tablet|Playbook/i.test(userAgent);
    
    this._isMobile = isMobileDevice && !isTabletDevice;
    this._isTablet = isTabletDevice;
    this._isDesktop = !isMobileDevice && !isTabletDevice;
  }

  /**
   * Detect browser features and capabilities
   */
  private static detectFeatures(): void {
    // Touch support
    this._hasTouch = 'ontouchstart' in window || 
      navigator.maxTouchPoints > 0 ||
      ((navigator as any).msMaxTouchPoints > 0);
    
    // WebGL support
    this._hasWebGL = (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(
          window.WebGLRenderingContext && 
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
      } catch (e) {
        return false;
      }
    })();
    
    // Device orientation support
    this._hasOrientation = !!window.DeviceOrientationEvent;
    
    // Gamepad support
    this._hasGamepad = !!navigator.getGamepads || !!('webkitGetGamepads' in navigator);
  }

  /**
   * Detect current orientation (portrait vs landscape)
   */
  private static detectOrientation(): void {
    if (window.matchMedia) {
      this._isPortrait = window.matchMedia('(orientation: portrait)').matches;
      this._isLandscape = !this._isPortrait;
    } else {
      // Fallback to comparing width/height
      this._isPortrait = window.innerHeight > window.innerWidth;
      this._isLandscape = !this._isPortrait;
    }
  }

  /**
   * Detect device capabilities and performance characteristics
   */
  private static detectDeviceCapabilities(): void {
    // Check for device memory (part of the Device Memory API)
    const deviceMemory = (navigator as any).deviceMemory || 4; // Default to 4GB if not available
    
    // Check for logical CPU cores
    const cpuCores = navigator.hardwareConcurrency || 4; // Default to 4 cores if not available
    
    // Define thresholds for low-end and high-end devices
    this._isLowEndDevice = (deviceMemory < 4 || cpuCores <= 4);
    this._isHighEndDevice = (deviceMemory >= 8 && cpuCores >= 8);
  }

  /**
   * Get appropriate UI scaling factor based on device
   */
  public static getUIScalingFactor(): number {
    // Start with standard scaling
    let scaleFactor = 1.0;
    
    // Adjust based on device pixel ratio
    const pixelRatio = window.devicePixelRatio || 1;
    
    // Adjust based on device type
    if (this.isMobile()) {
      // For mobile, calculate based on screen size
      const screenWidth = window.innerWidth;
      if (screenWidth <= 320) {
        scaleFactor = 0.8;
      } else if (screenWidth <= 375) {
        scaleFactor = 0.9;
      } else if (screenWidth >= 768) {
        scaleFactor = 1.1;
      }
    } else if (this.isTablet()) {
      // For tablets, slightly larger UI elements
      scaleFactor = 1.1;
    }
    
    // Adjust for high-res displays
    if (pixelRatio > 2) {
      scaleFactor *= 1.1;
    }
    
    // Constraint to reasonable range
    scaleFactor = Math.max(0.7, Math.min(1.5, scaleFactor));
    
    return scaleFactor;
  }

  // Public getters

  /**
   * Check if the device is a mobile phone
   */
  public static isMobile(): boolean {
    if (this._isMobile === null) this.detectDeviceType();
    return !!this._isMobile;
  }

  /**
   * Check if the device is a tablet
   */
  public static isTablet(): boolean {
    if (this._isTablet === null) this.detectDeviceType();
    return !!this._isTablet;
  }

  /**
   * Check if the device is a desktop computer
   */
  public static isDesktop(): boolean {
    if (this._isDesktop === null) this.detectDeviceType();
    return !!this._isDesktop;
  }

  /**
   * Check if touch input is supported
   */
  public static hasTouch(): boolean {
    if (this._hasTouch === null) this.detectFeatures();
    return !!this._hasTouch;
  }

  /**
   * Check if WebGL is supported
   */
  public static hasWebGL(): boolean {
    if (this._hasWebGL === null) this.detectFeatures();
    return !!this._hasWebGL;
  }

  /**
   * Check if device orientation is supported
   */
  public static hasOrientation(): boolean {
    if (this._hasOrientation === null) this.detectFeatures();
    return !!this._hasOrientation;
  }

  /**
   * Check if gamepad is supported
   */
  public static hasGamepad(): boolean {
    if (this._hasGamepad === null) this.detectFeatures();
    return !!this._hasGamepad;
  }

  /**
   * Check if the device is in portrait orientation
   */
  public static isPortrait(): boolean {
    if (this._isPortrait === null) this.detectOrientation();
    return !!this._isPortrait;
  }

  /**
   * Check if the device is in landscape orientation
   */
  public static isLandscape(): boolean {
    if (this._isLandscape === null) this.detectOrientation();
    return !!this._isLandscape;
  }

  /**
   * Check if the device is considered low-end
   */
  public static isLowEndDevice(): boolean {
    if (this._isLowEndDevice === null) this.detectDeviceCapabilities();
    return !!this._isLowEndDevice;
  }

  /**
   * Check if the device is considered high-end
   */
  public static isHighEndDevice(): boolean {
    if (this._isHighEndDevice === null) this.detectDeviceCapabilities();
    return !!this._isHighEndDevice;
  }
} 