// src/Utils/rng.js

/**
 * RNG (Random Number Generator) utilities
 * Provides deterministic random number generation with seed support
 */
class RNG {
    /**
     * Create a new RNG instance
     * @param {number} seed - Seed value for the RNG
     */
    constructor(seed) {
      this.setSeed(seed || Math.floor(Math.random() * 1000000));
    }
  
    /**
     * Set the RNG seed
     * @param {number} seed - Seed value
     */
    setSeed(seed) {
      this.seed = seed;
      this.currentSeed = seed;
    }
  
    /**
     * Get the current seed value
     * @returns {number} Current seed
     */
    getSeed() {
      return this.seed;
    }
  
    /**
     * Generate a random number between 0 and 1
     * Uses a linear congruential generator algorithm
     * @returns {number} Random number between 0 and 1
     */
    random() {
      this.currentSeed = (this.currentSeed * 9301 + 49297) % 233280;
      return this.currentSeed / 233280;
    }
  
    /**
     * Generate a random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer between min and max
     */
    randomInt(min, max) {
      return Math.floor(this.random() * (max - min + 1)) + min;
    }
  
    /**
     * Generate a random float between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random float between min and max
     */
    randomFloat(min, max) {
      return this.random() * (max - min) + min;
    }
  
    /**
     * Generate a random boolean with specified probability
     * @param {number} probability - Probability of true (0-1)
     * @returns {boolean} Random boolean
     */
    randomBool(probability = 0.5) {
      return this.random() < probability;
    }
  
    /**
     * Select a random item from an array
     * @param {Array} array - Array to select from
     * @returns {*} Random item from the array
     */
    randomItem(array) {
      if (!array || array.length === 0) return null;
      return array[this.randomInt(0, array.length - 1)];
    }
  
    /**
     * Generate a random color
     * @param {boolean} includeAlpha - Whether to include alpha
     * @returns {number} Random color as hex
     */
    randomColor(includeAlpha = false) {
      const r = this.randomInt(0, 255);
      const g = this.randomInt(0, 255);
      const b = this.randomInt(0, 255);
      const a = includeAlpha ? this.random() : 1;
      
      // Convert to hex
      return (r << 16) + (g << 8) + b;
    }
  
    /**
     * Shuffle an array
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array
     */
    shuffle(array) {
      const result = [...array];
      for (let i = result.length - 1; i > 0; i--) {
        const j = this.randomInt(0, i);
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }
  
    /**
     * Generate perlin noise value at x,y coordinates
     * This is a simplified implementation - a real game would use a library
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {number} Noise value (-1 to 1)
     */
    perlinNoise(x, y) {
      // Simple implementation that uses the seed
      const noiseX = Math.sin(x * 12.9898 + this.seed);
      const noiseY = Math.sin(y * 78.233 + this.seed);
      return Math.sin(noiseX * noiseY * 43758.5453) * 2 - 1;
    }
  }
  
  // Create singleton instance
  const rng = new RNG();
  
  export default rng;
  
  // Named exports for specific functionality
  export const {
    setSeed,
    getSeed,
    random,
    randomInt,
    randomFloat,
    randomBool,
    randomItem,
    randomColor,
    shuffle,
    perlinNoise
  } = rng;