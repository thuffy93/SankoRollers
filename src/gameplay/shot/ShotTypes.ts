/**
 * Enum for different shot types
 */
export enum ShotType {
  GROUNDER = 'GROUNDER', // Ball rolls along the ground (like Kirby's Dream Course)
  FLY = 'FLY'            // Ball follows an arc trajectory (like Kirby's Dream Course)
}

/**
 * Enum for different spin types
 */
export enum SpinType {
  NONE = 'NONE',   // No spin
  LEFT = 'LEFT',   // Left spin - ball curves left
  RIGHT = 'RIGHT', // Right spin - ball curves right
  TOP = 'TOP',     // Top spin - increases distance, steeper descent
  BACK = 'BACK'    // Back spin - decreases distance, can reverse on bounce
}

/**
 * Enum for guide lengths in shot panel (Phase 2)
 */
export enum GuideLength {
  SHORT = 'SHORT', // Short guide for close shots
  LONG = 'LONG'    // Long guide for distant shots
} 