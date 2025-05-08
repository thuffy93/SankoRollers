import * as THREE from 'three';
import { ShotType, SpinType, GuideLength } from './ShotTypes';
import { EventSystem, GameEvents } from '../../utils/EventSystem';

/**
 * Interface for shot options
 */
export interface ShotOptions {
  power?: number;
  angle?: number;
  shotType?: ShotType;
  spinType?: SpinType;
  spinIntensity?: number;
  guideLength?: GuideLength;
}

/**
 * ShotParameterManager - Manages and validates all shot parameters
 * 
 * Extracts parameter management from ShotController for better separation of concerns.
 * Acts as a single source of truth for shot parameters.
 */
export class ShotParameterManager {
  // Shot parameters
  private _shotType: ShotType = ShotType.GROUNDER;
  private _spinType: SpinType = SpinType.NONE;
  private _spinIntensity: number = 0;
  private _angle: number = 0;
  private _power: number = 0;
  private _guideLength: GuideLength = GuideLength.SHORT;
  
  // Parameter constraints
  private shortGuideLength: number = 5;
  private longGuideLength: number = 15;
  private maxPower: number = 30;
  private minPower: number = 5;
  private superShotThreshold: number = 0.95;
  private groundShotHeight: number = 0.1;
  private flyShotHeight: number = 6.0;
  
  // Event system for parameter change notifications
  private eventSystem: EventSystem;
  
  constructor() {
    this.eventSystem = EventSystem.getInstance();
  }
  
  // Getters for shot parameters with validation
  
  get shotType(): ShotType {
    return this._shotType;
  }
  
  get spinType(): SpinType {
    return this._spinType;
  }
  
  get spinIntensity(): number {
    return this._spinIntensity;
  }
  
  get angle(): number {
    return this._angle;
  }
  
  get power(): number {
    return this._power;
  }
  
  get guideLength(): GuideLength {
    return this._guideLength;
  }
  
  get currentGuideDistance(): number {
    return this._guideLength === GuideLength.SHORT ? this.shortGuideLength : this.longGuideLength;
  }
  
  get isSuperShot(): boolean {
    return this._power >= this.superShotThreshold;
  }
  
  // Calculated shot parameters
  
  /**
   * Calculate actual shot power value based on power percentage
   */
  getActualShotPower(): number {
    return this.minPower + (this.maxPower - this.minPower) * this._power;
  }
  
  /**
   * Get shot height based on shot type and power
   */
  getShotHeight(): number {
    if (this._shotType === ShotType.GROUNDER) {
      return this.groundShotHeight;
    } else {
      return this.flyShotHeight;
    }
  }
  
  /**
   * Get shot direction as a vector
   */
  getShotDirection(): THREE.Vector3 {
    return new THREE.Vector3(
      Math.cos(this._angle),
      0,
      Math.sin(this._angle)
    ).normalize();
  }
  
  /**
   * Calculate shot vector combining direction, power, and height
   */
  calculateShotVector(): THREE.Vector3 {
    const direction = this.getShotDirection();
    const shotPower = this.getActualShotPower();
    const shotHeight = this.getShotHeight();
    
    return new THREE.Vector3(
      direction.x * shotPower,
      shotHeight * this._power, // Scale height with power
      direction.z * shotPower
    );
  }
  
  // Setters with validation and change notification
  
  /**
   * Set shot type and notify listeners
   */
  setShotType(type: ShotType): void {
    if (this._shotType !== type) {
      this._shotType = type;
      this.notifyParameterChanged();
    }
  }
  
  /**
   * Set spin type and intensity
   */
  setSpinType(type: SpinType, intensity: number = 0.5): void {
    const validatedIntensity = Math.max(0, Math.min(1, intensity));
    
    if (this._spinType !== type || this._spinIntensity !== validatedIntensity) {
      this._spinType = type;
      this._spinIntensity = validatedIntensity;
      this.notifyParameterChanged();
    }
  }
  
  /**
   * Set aim angle in radians
   */
  setAngle(angle: number): void {
    // Normalize angle to 0-2π range
    const normalizedAngle = (angle + Math.PI * 2) % (Math.PI * 2);
    
    if (this._angle !== normalizedAngle) {
      this._angle = normalizedAngle;
      this.notifyParameterChanged();
    }
  }
  
  /**
   * Increment angle by a delta value
   */
  incrementAngle(delta: number): void {
    this.setAngle(this._angle + delta);
  }
  
  /**
   * Set shot power (0-1 range)
   */
  setPower(power: number): void {
    // Clamp power between 0 and 1
    const clampedPower = Math.max(0, Math.min(1, power));
    
    if (this._power !== clampedPower) {
      this._power = clampedPower;
      this.notifyParameterChanged();
    }
  }
  
  /**
   * Toggle between shot guide lengths
   */
  toggleGuideLength(): void {
    this._guideLength = this._guideLength === GuideLength.SHORT ? 
      GuideLength.LONG : GuideLength.SHORT;
    
    this.notifyParameterChanged();
  }
  
  /**
   * Set guide length directly
   */
  setGuideLength(length: GuideLength): void {
    if (this._guideLength !== length) {
      this._guideLength = length;
      this.notifyParameterChanged();
    }
  }
  
  /**
   * Reset shot parameters to default values
   */
  resetParameters(preservePower: boolean = false): void {
    this._shotType = ShotType.GROUNDER;
    this._spinType = SpinType.NONE;
    this._spinIntensity = 0;
    
    if (!preservePower) {
      this._power = 0;
    }
    
    this.notifyParameterChanged();
  }
  
  /**
   * Apply multiple parameters at once
   */
  applyOptions(options: ShotOptions): void {
    let changed = false;
    
    if (options.angle !== undefined) {
      this._angle = (options.angle + Math.PI * 2) % (Math.PI * 2);
      changed = true;
    }
    
    if (options.power !== undefined) {
      this._power = Math.max(0, Math.min(1, options.power));
      changed = true;
    }
    
    if (options.shotType !== undefined) {
      this._shotType = options.shotType;
      changed = true;
    }
    
    if (options.spinType !== undefined) {
      this._spinType = options.spinType;
      if (options.spinIntensity !== undefined) {
        this._spinIntensity = Math.max(0, Math.min(1, options.spinIntensity));
      }
      changed = true;
    }
    
    if (options.guideLength !== undefined) {
      this._guideLength = options.guideLength;
      changed = true;
    }
    
    if (changed) {
      this.notifyParameterChanged();
    }
  }
  
  /**
   * Notify listeners that parameters have changed
   */
  private notifyParameterChanged(): void {
    this.eventSystem.emit(GameEvents.SHOT_PARAMS_CHANGED, {
      shotType: this._shotType,
      spinType: this._spinType,
      spinIntensity: this._spinIntensity,
      angle: this._angle,
      power: this._power,
      guideLength: this._guideLength
    });
  }
} 