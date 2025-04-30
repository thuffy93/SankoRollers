import * as THREE from 'three';
import { ShotState, ShotStateMachine } from './ShotSystem';

/**
 * Enum for spin control visualization modes
 */
export enum SpinControlMode {
  BALL = 'ball',     // Use a 3D ball visualization for spin
  GRID = 'grid'      // Use a 2D grid visualization for spin
}

/**
 * System to handle spin selection and visualization for shots
 */
export class SpinControlSystem {
  // Reference to the scene for adding visual elements
  private scene: THREE.Scene;
  
  // Reference to the shot system
  private shotSystem: ShotStateMachine;
  
  // Container for all spin control visuals
  private container: THREE.Group;
  
  // Current spin value (x = horizontal, y = top/back, z = side)
  private spinVector: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  
  // Maximum spin amounts in each direction
  private readonly MAX_HORIZONTAL_SPIN: number = 0.5;  // Left/right spin
  private readonly MAX_VERTICAL_SPIN: number = 0.7;    // Top/back spin
  private readonly MAX_SIDE_SPIN: number = 0.5;        // Side spin
  
  // Visualization mode (3D ball or 2D grid)
  private visualizationMode: SpinControlMode = SpinControlMode.BALL;
  
  // Visual elements for the ball visualization
  private ballMesh?: THREE.Mesh;
  private spinArrow?: THREE.ArrowHelper;
  private spinHighlightMesh?: THREE.Mesh;
  
  // Visual elements for the grid visualization
  private gridMesh?: THREE.Mesh;
  private gridMarker?: THREE.Mesh;
  
  // Input state tracking
  private isDragging: boolean = false;
  private lastMousePosition: THREE.Vector2 = new THREE.Vector2();
  
  // Size and appearance settings
  private readonly BALL_RADIUS: number = 1.0;
  private readonly GRID_SIZE: number = 2.0;
  private readonly HIGHLIGHT_COLOR: number = 0xffa500;  // Orange
  private readonly GRID_COLOR: number = 0xcccccc;
  private readonly MARKER_COLOR: number = 0xff4400;
  private readonly ARROW_COLOR: number = 0xffff00;
  
  // Flag to track if the system is active
  private isActive: boolean = false;
  
  /**
   * Create a new SpinControlSystem
   * @param scene The THREE.js scene
   * @param shotSystem The shot state machine
   * @param visualizationMode Optional mode for spin visualization
   */
  constructor(
    scene: THREE.Scene, 
    shotSystem: ShotStateMachine,
    visualizationMode: SpinControlMode = SpinControlMode.BALL
  ) {
    this.scene = scene;
    this.shotSystem = shotSystem;
    this.visualizationMode = visualizationMode;
    
    // Create container for all visuals
    this.container = new THREE.Group();
    this.container.visible = false;
    this.scene.add(this.container);
    
    // Register a listener for shot state changes
    this.shotSystem.addStateChangeListener(this.handleShotStateChange.bind(this));
    
    // Create appropriate visualization based on mode
    this.createVisualization();
    
    // Set up event listeners for input
    this.setupEventListeners();
  }
  
  /**
   * Create the appropriate visualization based on the selected mode
   */
  private createVisualization(): void {
    if (this.visualizationMode === SpinControlMode.BALL) {
      this.createBallVisualization();
    } else {
      this.createGridVisualization();
    }
  }
  
  /**
   * Create a 3D ball visualization for spin selection
   */
  private createBallVisualization(): void {
    // Create ball geometry with wireframe to show spin
    const ballGeometry = new THREE.SphereGeometry(this.BALL_RADIUS, 16, 16);
    const ballMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.7
    });
    this.ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
    this.container.add(this.ballMesh);
    
    // Create arrow to indicate spin direction
    const arrowDirection = new THREE.Vector3(0, 1, 0).normalize();
    const arrowLength = this.BALL_RADIUS * 1.5;
    this.spinArrow = new THREE.ArrowHelper(
      arrowDirection,
      new THREE.Vector3(0, 0, 0),
      arrowLength,
      this.ARROW_COLOR,
      0.2, // Head length
      0.15 // Head width
    );
    this.spinArrow.visible = false; // Start with no arrow until spin is applied
    this.container.add(this.spinArrow);
    
    // Create highlight to indicate where the spin is being applied
    const highlightGeometry = new THREE.SphereGeometry(this.BALL_RADIUS * 0.2, 8, 8);
    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: this.HIGHLIGHT_COLOR,
      transparent: true,
      opacity: 0.7
    });
    this.spinHighlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
    this.spinHighlightMesh.visible = false; // Start with no highlight
    this.container.add(this.spinHighlightMesh);
  }
  
  /**
   * Create a 2D grid visualization for spin selection
   */
  private createGridVisualization(): void {
    // Create grid plane
    const gridGeometry = new THREE.PlaneGeometry(this.GRID_SIZE, this.GRID_SIZE);
    const gridTexture = this.createGridTexture();
    
    const gridMaterial = new THREE.MeshBasicMaterial({
      map: gridTexture,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    
    this.gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
    this.container.add(this.gridMesh);
    
    // Create marker to show current position on the grid
    const markerGeometry = new THREE.CircleGeometry(this.GRID_SIZE * 0.05, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: this.MARKER_COLOR,
      transparent: true,
      opacity: 0.9
    });
    
    this.gridMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    this.gridMarker.position.z = 0.01; // Slightly in front of the grid
    this.container.add(this.gridMarker);
    
    // Position the marker at the center (no spin)
    this.updateGridMarkerPosition(new THREE.Vector2(0, 0));
  }
  
  /**
   * Create a texture for the grid
   * @returns A new grid texture
   */
  private createGridTexture(): THREE.Texture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('Could not get canvas context');
      return new THREE.Texture();
    }
    
    // Fill background
    context.fillStyle = 'rgba(40, 40, 40, 0.5)';
    context.fillRect(0, 0, size, size);
    
    // Draw grid lines
    context.strokeStyle = `rgb(${this.GRID_COLOR >> 16 & 255}, ${this.GRID_COLOR >> 8 & 255}, ${this.GRID_COLOR & 255})`;
    context.lineWidth = 2;
    
    // Draw grid sections (3x3 grid)
    const cellSize = size / 3;
    
    // Draw horizontal lines
    for (let i = 1; i < 3; i++) {
      context.beginPath();
      context.moveTo(0, i * cellSize);
      context.lineTo(size, i * cellSize);
      context.stroke();
    }
    
    // Draw vertical lines
    for (let i = 1; i < 3; i++) {
      context.beginPath();
      context.moveTo(i * cellSize, 0);
      context.lineTo(i * cellSize, size);
      context.stroke();
    }
    
    // Draw labels
    context.fillStyle = 'white';
    context.font = 'bold 20px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Top spin label
    context.fillText('Top', size / 2, cellSize / 2 - 40);
    
    // Back spin label
    context.fillText('Back', size / 2, size - cellSize / 2 + 40);
    
    // Left spin label
    context.fillText('Left', cellSize / 2 - 40, size / 2);
    
    // Right spin label
    context.fillText('Right', size - cellSize / 2 + 40, size / 2);
    
    // Create center marker
    context.fillStyle = 'rgba(255, 255, 255, 0.7)';
    context.beginPath();
    context.arc(size / 2, size / 2, 5, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
  }
  
  /**
   * Set up event listeners for user input
   */
  private setupEventListeners(): void {
    // Mouse events for spin selection
    window.addEventListener('mousedown', this.handleMouseDown.bind(this));
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    window.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Touch events for mobile devices
    window.addEventListener('touchstart', this.handleTouchStart.bind(this));
    window.addEventListener('touchmove', this.handleTouchMove.bind(this));
    window.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Keyboard events for arrows/wasd controls
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    // Reset event for clearing spin
    window.addEventListener('keydown', this.handleResetKey.bind(this));
  }
  
  /**
   * Handle shot state changes to show/hide spin controls
   */
  private handleShotStateChange(prevState: ShotState, newState: ShotState): void {
    if (newState === ShotState.SPIN) {
      this.activate();
    } else if (prevState === ShotState.SPIN) {
      this.deactivate();
    }
  }
  
  /**
   * Activate the spin control system
   */
  public activate(): void {
    this.isActive = true;
    this.container.visible = true;
    
    // Reset spin to zero
    this.spinVector.set(0, 0, 0);
    this.updateSpinVisualization();
    
    console.log('Spin control activated');
  }
  
  /**
   * Deactivate the spin control system
   */
  public deactivate(): void {
    this.isActive = false;
    this.container.visible = false;
    
    // Reset drag state
    this.isDragging = false;
    
    console.log('Spin control deactivated');
  }
  
  /**
   * Position the spin control interface
   * @param position Position in 3D space
   * @param lookAt Optional camera or position to face
   */
  public positionControls(position: THREE.Vector3, lookAt?: THREE.Vector3 | THREE.Object3D): void {
    this.container.position.copy(position);
    
    if (lookAt) {
      if (lookAt instanceof THREE.Vector3) {
        this.container.lookAt(lookAt);
      } else {
        this.container.lookAt(lookAt.position);
      }
    }
  }
  
  /**
   * Get the current spin vector
   * @returns The spin vector
   */
  public getSpin(): THREE.Vector3 {
    return this.spinVector.clone();
  }
  
  /**
   * Set the spin value directly
   * @param spin The spin vector
   */
  public setSpin(spin: THREE.Vector3): void {
    this.spinVector.copy(spin);
    
    // Clamp values to maximum allowed spin
    this.spinVector.x = THREE.MathUtils.clamp(
      this.spinVector.x,
      -this.MAX_HORIZONTAL_SPIN,
      this.MAX_HORIZONTAL_SPIN
    );
    
    this.spinVector.y = THREE.MathUtils.clamp(
      this.spinVector.y,
      -this.MAX_VERTICAL_SPIN,
      this.MAX_VERTICAL_SPIN
    );
    
    this.spinVector.z = THREE.MathUtils.clamp(
      this.spinVector.z,
      -this.MAX_SIDE_SPIN,
      this.MAX_SIDE_SPIN
    );
    
    this.updateSpinVisualization();
  }
  
  /**
   * Add spin to the current value
   * @param spin The spin vector to add
   */
  public addSpin(spin: THREE.Vector3): void {
    this.spinVector.add(spin);
    
    // Clamp values to maximum allowed spin
    this.spinVector.x = THREE.MathUtils.clamp(
      this.spinVector.x,
      -this.MAX_HORIZONTAL_SPIN,
      this.MAX_HORIZONTAL_SPIN
    );
    
    this.spinVector.y = THREE.MathUtils.clamp(
      this.spinVector.y,
      -this.MAX_VERTICAL_SPIN,
      this.MAX_VERTICAL_SPIN
    );
    
    this.spinVector.z = THREE.MathUtils.clamp(
      this.spinVector.z,
      -this.MAX_SIDE_SPIN,
      this.MAX_SIDE_SPIN
    );
    
    this.updateSpinVisualization();
  }
  
  /**
   * Reset spin to zero
   */
  public resetSpin(): void {
    this.spinVector.set(0, 0, 0);
    this.updateSpinVisualization();
  }
  
  /**
   * Update the visualization based on current spin value
   */
  private updateSpinVisualization(): void {
    if (this.visualizationMode === SpinControlMode.BALL) {
      this.updateBallVisualization();
    } else {
      this.updateGridVisualization();
    }
  }
  
  /**
   * Update the ball visualization based on current spin
   */
  private updateBallVisualization(): void {
    // Only update if elements exist
    if (!this.spinArrow || !this.spinHighlightMesh || !this.ballMesh) return;
    
    // Determine if there's any significant spin
    const spinMagnitude = this.spinVector.length();
    const hasSignificantSpin = spinMagnitude > 0.05;
    
    // Show/hide arrow based on spin magnitude
    this.spinArrow.visible = hasSignificantSpin;
    this.spinHighlightMesh.visible = hasSignificantSpin;
    
    if (hasSignificantSpin) {
      // Update arrow direction to match spin vector
      const normalizedSpin = this.spinVector.clone().normalize();
      this.spinArrow.setDirection(normalizedSpin);
      
      // Scale arrow length based on spin magnitude
      const maxLength = this.BALL_RADIUS * 1.5;
      const arrowLength = THREE.MathUtils.lerp(
        this.BALL_RADIUS * 0.5,
        maxLength,
        spinMagnitude / Math.max(this.MAX_HORIZONTAL_SPIN, this.MAX_VERTICAL_SPIN)
      );
      this.spinArrow.setLength(arrowLength, arrowLength * 0.2, arrowLength * 0.15);
      
      // Position highlight on the ball surface in the direction of spin
      const highlightPosition = normalizedSpin.clone().multiplyScalar(this.BALL_RADIUS);
      this.spinHighlightMesh.position.copy(highlightPosition);
      
      // Scale highlight based on spin magnitude
      const scale = THREE.MathUtils.lerp(
        0.15,
        0.25,
        spinMagnitude / Math.max(this.MAX_HORIZONTAL_SPIN, this.MAX_VERTICAL_SPIN)
      );
      this.spinHighlightMesh.scale.set(scale, scale, scale);
    }
    
    // Optional: Rotate ball slightly to indicate spin
    if (this.ballMesh) {
      this.ballMesh.rotation.x = -this.spinVector.y * 0.2; // Tilt for top/back spin
      this.ballMesh.rotation.y = this.spinVector.x * 0.2;  // Tilt for left/right spin
      this.ballMesh.rotation.z = this.spinVector.z * 0.2;  // Tilt for side spin
    }
  }
  
  /**
   * Update the grid visualization based on current spin
   */
  private updateGridVisualization(): void {
    if (!this.gridMarker) return;
    
    // Map spin x and y to 2D grid coordinates
    // For the grid, we only use x (horizontal) and y (vertical) spin
    // x-axis: Left/Right spin, y-axis: Top/Back spin
    const gridX = this.spinVector.x / this.MAX_HORIZONTAL_SPIN;
    const gridY = -this.spinVector.y / this.MAX_VERTICAL_SPIN; // Negative to match grid orientation
    
    this.updateGridMarkerPosition(new THREE.Vector2(gridX, gridY));
  }
  
  /**
   * Update the position of the marker on the grid
   * @param normalizedPosition Position in normalized coordinates (-1 to 1)
   */
  private updateGridMarkerPosition(normalizedPosition: THREE.Vector2): void {
    if (!this.gridMarker || !this.gridMesh) return;
    
    // Clamp position to the grid bounds
    const clampedX = THREE.MathUtils.clamp(normalizedPosition.x, -1, 1);
    const clampedY = THREE.MathUtils.clamp(normalizedPosition.y, -1, 1);
    
    // Map from -1 to 1 range to grid coordinates
    const halfSize = this.GRID_SIZE / 2;
    this.gridMarker.position.x = clampedX * halfSize;
    this.gridMarker.position.y = clampedY * halfSize;
    
    // Update marker appearance based on distance from center
    const distanceFromCenter = Math.sqrt(clampedX * clampedX + clampedY * clampedY);
    
    // Update marker size and opacity based on distance
    const baseScale = 0.05;
    const scale = baseScale + (distanceFromCenter * baseScale);
    this.gridMarker.scale.set(scale, scale, 1);
    
    // Update marker color (optional)
    if (this.gridMarker.material instanceof THREE.MeshBasicMaterial) {
      // Interpolate color based on distance from center
      if (distanceFromCenter < 0.1) {
        // Near center - use white
        this.gridMarker.material.color.setHex(0xffffff);
      } else {
        // Away from center - use marker color with intensity based on distance
        this.gridMarker.material.color.setHex(this.MARKER_COLOR);
      }
      
      // Update opacity
      this.gridMarker.material.opacity = 0.5 + distanceFromCenter * 0.5;
    }
  }
  
  /**
   * Convert screen coordinates to normalized grid coordinates
   * @param screenX X position in screen coordinates
   * @param screenY Y position in screen coordinates
   * @returns Normalized coordinates (-1 to 1)
   */
  private screenToGridCoordinates(screenX: number, screenY: number): THREE.Vector2 {
    // Get window dimensions
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Normalize to -1 to 1 range from screen center
    const normalizedX = (screenX / windowWidth) * 2 - 1;
    const normalizedY = -((screenY / windowHeight) * 2 - 1); // Y is inverted in screen coords
    
    return new THREE.Vector2(normalizedX, normalizedY);
  }
  
  /**
   * Handle mouse down events
   */
  private handleMouseDown(event: MouseEvent): void {
    if (!this.isActive) return;
    
    this.isDragging = true;
    this.lastMousePosition.set(event.clientX, event.clientY);
    
    // If using grid mode, directly set position
    if (this.visualizationMode === SpinControlMode.GRID) {
      const gridCoords = this.screenToGridCoordinates(event.clientX, event.clientY);
      this.setSpin(new THREE.Vector3(
        gridCoords.x * this.MAX_HORIZONTAL_SPIN,
        -gridCoords.y * this.MAX_VERTICAL_SPIN, // Invert Y for spin (positive is top spin)
        0 // No side spin from grid for simplicity
      ));
    }
  }
  
  /**
   * Handle mouse move events
   */
  private handleMouseMove(event: MouseEvent): void {
    if (!this.isActive || !this.isDragging) return;
    
    if (this.visualizationMode === SpinControlMode.BALL) {
      // For ball mode, use delta movement to adjust spin
      const deltaX = event.clientX - this.lastMousePosition.x;
      const deltaY = event.clientY - this.lastMousePosition.y;
      
      // Scale deltas to reasonable spin amounts
      const sensitivityFactor = 0.01;
      const spinDeltaX = deltaX * sensitivityFactor;
      const spinDeltaY = deltaY * sensitivityFactor;
      
      // Adjust spin values (note: positive Y means less Y in THREE.js)
      this.addSpin(new THREE.Vector3(spinDeltaX, -spinDeltaY, 0));
    } else {
      // For grid mode, directly set position
      const gridCoords = this.screenToGridCoordinates(event.clientX, event.clientY);
      this.setSpin(new THREE.Vector3(
        gridCoords.x * this.MAX_HORIZONTAL_SPIN,
        -gridCoords.y * this.MAX_VERTICAL_SPIN, // Invert Y for spin (positive is top spin)
        0 // No side spin from grid for simplicity
      ));
    }
    
    this.lastMousePosition.set(event.clientX, event.clientY);
  }
  
  /**
   * Handle mouse up events
   */
  private handleMouseUp(): void {
    this.isDragging = false;
  }
  
  /**
   * Handle touch start events
   */
  private handleTouchStart(event: TouchEvent): void {
    if (!this.isActive || event.touches.length === 0) return;
    
    this.isDragging = true;
    const touch = event.touches[0];
    this.lastMousePosition.set(touch.clientX, touch.clientY);
    
    // If using grid mode, directly set position
    if (this.visualizationMode === SpinControlMode.GRID) {
      const gridCoords = this.screenToGridCoordinates(touch.clientX, touch.clientY);
      this.setSpin(new THREE.Vector3(
        gridCoords.x * this.MAX_HORIZONTAL_SPIN,
        -gridCoords.y * this.MAX_VERTICAL_SPIN, // Invert Y for spin (positive is top spin)
        0 // No side spin from grid for simplicity
      ));
    }
  }
  
  /**
   * Handle touch move events
   */
  private handleTouchMove(event: TouchEvent): void {
    if (!this.isActive || !this.isDragging || event.touches.length === 0) return;
    
    const touch = event.touches[0];
    
    if (this.visualizationMode === SpinControlMode.BALL) {
      // For ball mode, use delta movement to adjust spin
      const deltaX = touch.clientX - this.lastMousePosition.x;
      const deltaY = touch.clientY - this.lastMousePosition.y;
      
      // Scale deltas to reasonable spin amounts
      const sensitivityFactor = 0.01;
      const spinDeltaX = deltaX * sensitivityFactor;
      const spinDeltaY = deltaY * sensitivityFactor;
      
      // Adjust spin values (note: positive Y means less Y in THREE.js)
      this.addSpin(new THREE.Vector3(spinDeltaX, -spinDeltaY, 0));
    } else {
      // For grid mode, directly set position
      const gridCoords = this.screenToGridCoordinates(touch.clientX, touch.clientY);
      this.setSpin(new THREE.Vector3(
        gridCoords.x * this.MAX_HORIZONTAL_SPIN,
        -gridCoords.y * this.MAX_VERTICAL_SPIN, // Invert Y for spin (positive is top spin)
        0 // No side spin from grid for simplicity
      ));
    }
    
    this.lastMousePosition.set(touch.clientX, touch.clientY);
  }
  
  /**
   * Handle touch end events
   */
  private handleTouchEnd(): void {
    this.isDragging = false;
  }
  
  /**
   * Handle keyboard events for spin control
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isActive) return;
    
    // Keys for basic spin control
    // W/S for top/back spin
    // A/D for left/right spin
    // Q/E for side spin (clockwise/counterclockwise)
    
    const spinDelta = 0.05; // Amount to adjust per keypress
    
    switch (event.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        // Add top spin (increase Y)
        this.addSpin(new THREE.Vector3(0, spinDelta, 0));
        break;
        
      case 's':
      case 'arrowdown':
        // Add back spin (decrease Y)
        this.addSpin(new THREE.Vector3(0, -spinDelta, 0));
        break;
        
      case 'a':
      case 'arrowleft':
        // Add left spin (decrease X)
        this.addSpin(new THREE.Vector3(-spinDelta, 0, 0));
        break;
        
      case 'd':
      case 'arrowright':
        // Add right spin (increase X)
        this.addSpin(new THREE.Vector3(spinDelta, 0, 0));
        break;
        
      case 'q':
        // Add counterclockwise side spin (increase Z)
        this.addSpin(new THREE.Vector3(0, 0, spinDelta));
        break;
        
      case 'e':
        // Add clockwise side spin (decrease Z)
        this.addSpin(new THREE.Vector3(0, 0, -spinDelta));
        break;
        
      case 'enter':
        // Confirm spin and execute shot
        this.confirmSpin();
        break;
    }
  }
  
  /**
   * Handle reset key (space) to clear spin
   */
  private handleResetKey(event: KeyboardEvent): void {
    if (!this.isActive) return;
    
    // Space resets spin to zero
    if (event.key === ' ') {
      this.resetSpin();
    }
  }
  
  /**
   * Confirm the current spin and continue the shot process
   */
  public confirmSpin(): void {
    if (!this.isActive) return;
    
    // Pass the current spin to the shot system
    this.shotSystem.setSpinAndExecute(this.spinVector);
    
    console.log('Spin confirmed:', this.spinVector);
  }
  
  /**
   * Update method to be called every frame
   * @param deltaTime Time since last frame in seconds
   * @param cameraPosition Optional camera position to face the control towards
   */
  public update(deltaTime: number, cameraPosition?: THREE.Vector3): void {
    if (!this.isActive || !this.container.visible) return;
    
    // Ensure controls face the camera if provided
    if (cameraPosition) {
      this.container.lookAt(cameraPosition);
    }
    
    // Additional animations or updates could be added here
  }
  
  /**
   * Clean up resources when no longer needed
   */
  public dispose(): void {
    // Remove event listeners
    window.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    window.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    window.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    
    window.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    window.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    window.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keydown', this.handleResetKey.bind(this));
    
    // Remove from scene
    this.scene.remove(this.container);
    
    // Clean up geometries and materials for ball visualization
    if (this.ballMesh) {
      this.ballMesh.geometry.dispose();
      if (this.ballMesh.material instanceof THREE.Material) {
        this.ballMesh.material.dispose();
      }
    }
    
    if (this.spinHighlightMesh) {
      this.spinHighlightMesh.geometry.dispose();
      if (this.spinHighlightMesh.material instanceof THREE.Material) {
        this.spinHighlightMesh.material.dispose();
      }
    }
    
    // Clean up geometries and materials for grid visualization
    if (this.gridMesh) {
      this.gridMesh.geometry.dispose();
      if (this.gridMesh.material instanceof THREE.MeshBasicMaterial) {
        if (this.gridMesh.material.map) {
          this.gridMesh.material.map.dispose();
        }
        this.gridMesh.material.dispose();
      }
    }
    
    if (this.gridMarker) {
      this.gridMarker.geometry.dispose();
      if (this.gridMarker.material instanceof THREE.Material) {
        this.gridMarker.material.dispose();
      }
    }
    
    // Remove shot system listener
    this.shotSystem.removeStateChangeListener(this.handleShotStateChange.bind(this));
  }
} 