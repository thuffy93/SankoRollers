import { HTMLUIComponent } from './HTMLUIComponent';
import { ShotState } from '../ShotSystem';
import { GameState } from '../GameSystem';
import { UIState } from '../UIManager';
import * as THREE from 'three';

/**
 * HTML-based angle indicator UI component
 */
export class AngleIndicatorUI extends HTMLUIComponent {
  // HTML elements for angle indicator UI
  private indicatorContainer!: HTMLElement;
  private angleValue!: HTMLElement;
  private angleArrow!: HTMLElement;
  private trajectoryPreview!: HTMLCanvasElement;
  
  // Current angle value (in degrees)
  private angle: number = 0;
  
  // Power value (for trajectory prediction)
  private power: number = 0;
  
  // Visualization options
  private showTrajectory: boolean = true;
  
  /**
   * Create a new AngleIndicatorUI component
   * @param container Parent container element
   */
  constructor(container: HTMLElement) {
    super(container, 'angle-indicator-ui');
    this.initialize();
  }
  
  /**
   * Initialize the component
   */
  protected initialize(): void {
    // Create indicator container
    this.indicatorContainer = this.createElement('div', 'angle-indicator-container');
    
    // Create value display
    this.angleValue = this.createElement('div', 'angle-value', '0°');
    this.indicatorContainer.appendChild(this.angleValue);
    
    // Create arrow element
    this.angleArrow = this.createElement('div', 'angle-arrow');
    // Create an arrow using unicode character
    this.angleArrow.innerHTML = '↑';
    this.angleArrow.style.display = 'inline-block';
    this.angleArrow.style.marginLeft = '10px';
    this.angleArrow.style.fontSize = '20px';
    this.indicatorContainer.appendChild(this.angleArrow);
    
    // Create trajectory preview canvas (shows potential path)
    this.trajectoryPreview = document.createElement('canvas');
    this.trajectoryPreview.className = 'trajectory-preview';
    this.trajectoryPreview.width = 100;
    this.trajectoryPreview.height = 100;
    this.indicatorContainer.appendChild(this.trajectoryPreview);
    
    // Style the trajectory preview
    this.trajectoryPreview.style.display = 'block';
    this.trajectoryPreview.style.marginTop = '10px';
    this.trajectoryPreview.style.border = '1px solid rgba(255,255,255,0.3)';
    this.trajectoryPreview.style.borderRadius = '50%';
    
    // Set initial angle
    this.setAngle(0);
    
    // Initialize trajectory preview
    this.updateTrajectoryPreview();
  }
  
  /**
   * Set the angle value
   * @param angleDegrees Angle in degrees (0-360)
   */
  public setAngle(angleDegrees: number): void {
    // Normalize angle to 0-360 range
    this.angle = (angleDegrees % 360 + 360) % 360;
    
    // Update the text value
    this.angleValue.textContent = `${Math.round(this.angle)}°`;
    
    // Update the arrow rotation
    this.angleArrow.style.transform = `rotate(${this.angle}deg)`;
    
    // Update trajectory preview
    this.updateTrajectoryPreview();
  }
  
  /**
   * Set the angle value from radians
   * @param angleRadians Angle in radians
   */
  public setAngleFromRadians(angleRadians: number): void {
    const angleDegrees = (angleRadians * 180 / Math.PI);
    this.setAngle(angleDegrees);
  }
  
  /**
   * Set the power value for trajectory prediction
   * @param power Power value (0-1)
   */
  public setPower(power: number): void {
    this.power = Math.max(0, Math.min(1, power));
    this.updateTrajectoryPreview();
  }
  
  /**
   * Toggle trajectory preview visibility
   * @param show Whether to show the trajectory preview
   */
  public toggleTrajectoryPreview(show: boolean): void {
    this.showTrajectory = show;
    this.trajectoryPreview.style.display = show ? 'block' : 'none';
  }
  
  /**
   * Draw a simple trajectory prediction based on angle and power
   */
  private updateTrajectoryPreview(): void {
    if (!this.showTrajectory) return;
    
    const canvas = this.trajectoryPreview as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Center and radius
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 5;
    
    // Draw background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();
    
    // Calculate angle in radians (accounting for canvas coordinate system)
    const angleRad = (this.angle - 90) * Math.PI / 180;
    
    // Calculate trajectory endpoint based on power
    const distance = radius * (0.3 + this.power * 0.7); // Scale with power
    const endX = centerX + Math.cos(angleRad) * distance;
    const endY = centerY + Math.sin(angleRad) * distance;
    
    // Draw trajectory line
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = this.getColorForPower(this.power);
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw arrow at end of trajectory
    this.drawArrow(ctx, centerX, centerY, endX, endY, 5);
    
    // Draw small dot at starting point
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
  }
  
  /**
   * Draw an arrow head at the end of a line
   */
  private drawArrow(
    ctx: CanvasRenderingContext2D, 
    fromX: number, 
    fromY: number, 
    toX: number, 
    toY: number, 
    headLength: number
  ): void {
    // Calculate angle of the line
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    // Draw the arrow head
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = this.getColorForPower(this.power);
    ctx.fill();
  }
  
  /**
   * Get color based on power level
   * @param power Power value (0-1)
   * @returns CSS color string
   */
  private getColorForPower(power: number): string {
    if (power < 0.3) {
      return '#00ff00'; // Green for low power
    } else if (power < 0.7) {
      return '#ffff00'; // Yellow for medium power
    } else {
      return '#ff0000'; // Red for high power
    }
  }
  
  /**
   * Get the current angle value in degrees
   * @returns Angle in degrees (0-360)
   */
  public getAngle(): number {
    return this.angle;
  }
  
  /**
   * Get the current angle value in radians
   * @returns Angle in radians (0-2π)
   */
  public getAngleRadians(): number {
    return this.angle * Math.PI / 180;
  }
  
  /**
   * Handle shot state changes
   * @param shotState New shot state
   */
  public onShotStateChanged(shotState: ShotState): void {
    switch (shotState) {
      case ShotState.AIMING:
        // Show when entering aiming
        this.show();
        // Reset power for trajectory preview
        this.setPower(0.5);
        break;
      
      case ShotState.POWER:
        // Keep visible during power selection
        // Power will be updated externally via setPower method
        break;
      
      case ShotState.SPIN:
      case ShotState.EXECUTING:
        // Keep visible during shot process
        // The angle is locked after aiming, but we still show it
        break;
      
      default:
        // Hide for other states
        this.hide();
        break;
    }
  }
  
  /**
   * Handle game state changes
   * @param gameState New game state
   */
  public onGameStateChanged(gameState: GameState): void {
    // Hide angle indicator when not in active gameplay states
    if (gameState !== GameState.AIMING && 
        gameState !== GameState.SHOT_IN_PROGRESS && 
        gameState !== GameState.BALL_AT_REST) {
      this.hide();
    }
  }
  
  /**
   * Handle UI state changes
   * @param prevState Previous UI state
   * @param newState New UI state
   */
  public onStateChanged(prevState: UIState, newState: UIState): void {
    // Only show in game UI
    if (newState === UIState.IN_GAME) {
      // Don't show immediately, wait for appropriate shot state
    } else {
      this.hide();
    }
  }
  
  /**
   * Helper method to create a vector from angle
   * @returns Direction vector
   */
  public getDirectionVector(): THREE.Vector2 {
    const angleRad = this.getAngleRadians();
    return new THREE.Vector2(
      Math.cos(angleRad),
      Math.sin(angleRad)
    );
  }
} 