import { HTMLUIComponent } from './HTMLUIComponent';
import { ShotState } from '../ShotSystem';
import { GameState } from '../GameSystem';
import { UIState } from '../UIManager';
import { PowerMeterSystem, PowerMeterState } from '../PowerMeterSystem';

/**
 * HTML-based power meter UI component
 */
export class PowerMeterUI extends HTMLUIComponent {
  // HTML elements for power meter UI
  private meterContainer!: HTMLElement;
  private meterFill!: HTMLElement;
  private meterIndicator!: HTMLElement;
  private meterValue!: HTMLElement;
  private optimalZone!: HTMLElement;
  
  // Reference to the PowerMeterSystem for coordination
  private powerMeterSystem: PowerMeterSystem | null = null;
  
  // Power value (0-100)
  private powerValue: number = 0;
  
  // Animation
  private animating: boolean = false;
  private animationDirection: 'up' | 'down' = 'up';
  private animationSpeed: number = 100; // percent per second
  
  // Optimal zone (matching PowerMeterSystem)
  private readonly OPTIMAL_POWER_MIN: number = 70; // 0-100 scale
  private readonly OPTIMAL_POWER_MAX: number = 90; // 0-100 scale
  
  /**
   * Create a new PowerMeterUI component
   * @param container Parent container element
   * @param powerMeterSystem Optional reference to the PowerMeterSystem
   */
  constructor(container: HTMLElement, powerMeterSystem?: PowerMeterSystem) {
    super(container, 'power-meter-ui');
    
    if (powerMeterSystem) {
      this.setPowerMeterSystem(powerMeterSystem);
    }
    
    this.initialize();
  }
  
  /**
   * Set the PowerMeterSystem reference
   * @param powerMeterSystem The PowerMeterSystem instance
   */
  public setPowerMeterSystem(powerMeterSystem: PowerMeterSystem): void {
    this.powerMeterSystem = powerMeterSystem;
  }
  
  /**
   * Initialize the component
   */
  protected initialize(): void {
    // Create meter container
    this.meterContainer = this.createElement('div', 'power-meter-container');
    
    // Create optimal zone indicator
    this.optimalZone = this.createElement('div', 'power-meter-optimal-zone');
    this.optimalZone.style.position = 'absolute';
    this.optimalZone.style.background = 'rgba(0, 255, 0, 0.3)';
    this.optimalZone.style.width = '100%';
    this.optimalZone.style.left = '0';
    
    // Position optimal zone based on OPTIMAL_POWER_MIN and OPTIMAL_POWER_MAX
    const optimalHeight = this.OPTIMAL_POWER_MAX - this.OPTIMAL_POWER_MIN;
    const optimalBottom = 100 - this.OPTIMAL_POWER_MAX;
    this.optimalZone.style.height = `${optimalHeight}%`;
    this.optimalZone.style.bottom = `${optimalBottom}%`;
    
    this.meterContainer.appendChild(this.optimalZone);
    
    // Create meter fill
    this.meterFill = this.createElement('div', 'power-meter-fill');
    this.meterContainer.appendChild(this.meterFill);
    
    // Create meter indicator (horizontal line showing current power)
    this.meterIndicator = this.createElement('div', 'power-meter-indicator');
    this.meterContainer.appendChild(this.meterIndicator);
    
    // Create meter value display
    this.meterValue = this.createElement('div', 'power-meter-value', '0%');
    this.meterContainer.appendChild(this.meterValue);
    
    // Set initial power
    this.setPower(0);
  }
  
  /**
   * Set the power value
   * @param value Power value (0-100)
   */
  public setPower(value: number): void {
    // Clamp value between 0 and 100
    this.powerValue = Math.max(0, Math.min(100, value));
    
    // Update the fill height
    this.meterFill.style.height = `${this.powerValue}%`;
    
    // Update the indicator position (position from bottom)
    this.meterIndicator.style.bottom = `${this.powerValue}%`;
    
    // Update the value text
    this.meterValue.textContent = `${Math.round(this.powerValue)}%`;
    
    // Update fill color based on power value
    this.updateFillColor(this.powerValue);
  }
  
  /**
   * Update the fill color based on power value
   * @param power Power value (0-100)
   */
  private updateFillColor(power: number): void {
    let color: string;
    
    if (power < this.OPTIMAL_POWER_MIN) {
      // Green to yellow gradient for lower power
      const t = power / this.OPTIMAL_POWER_MIN;
      color = this.lerpColorHex('#00ff00', '#ffff00', t);
    } else if (power <= this.OPTIMAL_POWER_MAX) {
      // Optimal zone - green
      color = '#00ff00';
    } else {
      // Yellow to red gradient for higher power
      const t = (power - this.OPTIMAL_POWER_MAX) / (100 - this.OPTIMAL_POWER_MAX);
      color = this.lerpColorHex('#ffff00', '#ff0000', t);
    }
    
    this.meterFill.style.background = color;
  }
  
  /**
   * Linearly interpolate between two hex colors
   * @param color1 First color in hex format
   * @param color2 Second color in hex format
   * @param t Interpolation value (0-1)
   * @returns Interpolated color in hex format
   */
  private lerpColorHex(color1: string, color2: string, t: number): string {
    // Convert hex to RGB
    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);
    
    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);
    
    // Interpolate RGB components
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    // Convert back to hex
    const rHex = r.toString(16).padStart(2, '0');
    const gHex = g.toString(16).padStart(2, '0');
    const bHex = b.toString(16).padStart(2, '0');
    
    return `#${rHex}${gHex}${bHex}`;
  }
  
  /**
   * Start the power meter animation
   * @param direction Initial direction ('up' or 'down')
   */
  public startAnimation(direction: 'up' | 'down' = 'up'): void {
    this.animating = true;
    this.animationDirection = direction;
    
    // Start from 0 if going up, or 100 if going down
    this.setPower(direction === 'up' ? 0 : 100);
  }
  
  /**
   * Stop the power meter animation
   * @returns The final power value (0-100)
   */
  public stopAnimation(): number {
    this.animating = false;
    return this.powerValue;
  }
  
  /**
   * Set the animation speed
   * @param speed Speed in percent per second
   */
  public setAnimationSpeed(speed: number): void {
    this.animationSpeed = speed;
  }
  
  /**
   * Update method called each frame
   * @param deltaTime Time since last frame in seconds
   */
  public update(deltaTime: number): void {
    super.update(deltaTime);
    
    // If we have a PowerMeterSystem reference, sync with it
    if (this.powerMeterSystem) {
      // In PowerMeterSystem, power is 0-1, so multiply by 100
      const systemPower = this.powerMeterSystem['currentPower'] * 100;
      if (systemPower !== this.powerValue) {
        this.setPower(systemPower);
      }
      return;
    }
    
    // Otherwise, use our own animation
    if (this.animating) {
      // Calculate power change based on speed and direction
      const change = this.animationSpeed * deltaTime * (this.animationDirection === 'up' ? 1 : -1);
      
      // Update power
      this.setPower(this.powerValue + change);
      
      // Reverse direction at limits
      if (this.powerValue >= 100) {
        this.animationDirection = 'down';
      } else if (this.powerValue <= 0) {
        this.animationDirection = 'up';
      }
    }
  }
  
  /**
   * Handle shot state changes
   * @param shotState New shot state
   */
  public onShotStateChanged(shotState: ShotState): void {
    switch (shotState) {
      case ShotState.POWER:
        // Show and start animation when entering power selection
        this.show();
        
        // Only start our own animation if we don't have a PowerMeterSystem
        if (!this.powerMeterSystem) {
          this.startAnimation('up');
        }
        break;
      
      case ShotState.SPIN:
        // Stop animation but keep visible when transitioning to spin
        this.stopAnimation();
        break;
      
      case ShotState.EXECUTING:
        // Keep visible during shot but stop animation
        this.stopAnimation();
        break;
      
      default:
        // Hide for other states
        this.hide();
        this.stopAnimation();
        break;
    }
  }
  
  /**
   * Handle game state changes
   * @param gameState New game state
   */
  public onGameStateChanged(gameState: GameState): void {
    // Hide power meter when not in active gameplay states
    if (gameState !== GameState.AIMING && 
        gameState !== GameState.SHOT_IN_PROGRESS && 
        gameState !== GameState.BALL_AT_REST) {
      this.hide();
      this.stopAnimation();
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
      this.stopAnimation();
    }
  }
  
  /**
   * Get the current power value
   * @returns Power value (0-100)
   */
  public getPower(): number {
    return this.powerValue;
  }
  
  /**
   * Get the normalized power value (0-1)
   * @returns Normalized power value (0-1)
   */
  public getNormalizedPower(): number {
    return this.powerValue / 100;
  }
} 