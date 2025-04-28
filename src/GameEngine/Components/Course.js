// src/GameEngine/Components/Course.js

/**
 * Course component for course-related data
 */
class Course {
    /**
     * Create a new course component
     * @param {Object} options - Component options
     */
    constructor(options = {}) {
      // Course properties
      this.courseNumber = options.courseNumber || 1;
      this.totalHoles = options.totalHoles || 9;
      this.currentHole = options.currentHole || 1;
      this.difficulty = options.difficulty || 1;
      this.seed = options.seed || Date.now();
      this.dailyModifier = options.dailyModifier || null;
      
      // Course elements
      this.terrain = options.terrain || null;
      this.walls = options.walls || [];
      this.obstacles = options.obstacles || [];
      this.powerUps = options.powerUps || [];
      this.holePosition = options.holePosition || { x: 0, z: 0 };
      this.startPosition = options.startPosition || { x: 0, y: 1, z: 0 };
      this.par = options.par || 3;
      
      // Course state
      this.holeCompleted = options.holeCompleted || false;
      this.gameCompleted = options.gameCompleted || false;
      this.strokes = options.strokes || 0;
      this.totalStrokes = options.totalStrokes || 0;
      
      // Custom properties
      this.properties = options.properties || {};
      
      // Environment settings
      this.skyColor = options.skyColor || 0x87CEEB;
      this.fogEnabled = options.fogEnabled || false;
      this.fogColor = options.fogColor || 0xCCCCFF;
      this.fogDensity = options.fogDensity || 0.01;
      this.ambientLightColor = options.ambientLightColor || 0xFFFFFF;
      this.ambientLightIntensity = options.ambientLightIntensity || 0.5;
      this.directionalLightColor = options.directionalLightColor || 0xFFFFFF;
      this.directionalLightIntensity = options.directionalLightIntensity || 0.8;
      this.shadowsEnabled = options.shadowsEnabled !== undefined ? options.shadowsEnabled : true;
      
      // Callbacks
      this.onHoleCompleted = options.onHoleCompleted || null;
      this.onGameCompleted = options.onGameCompleted || null;
      this.onStrokeAdded = options.onStrokeAdded || null;
    }
    
    /**
     * Add a stroke to the counter
     * @returns {number} New stroke count
     */
    addStroke() {
      this.strokes++;
      this.totalStrokes++;
      
      // Call stroke added callback
      if (this.onStrokeAdded) {
        this.onStrokeAdded(this.strokes, this.totalStrokes);
      }
      
      return this.strokes;
    }
    
    /**
     * Complete the current hole
     * @returns {boolean} Whether the hole was completed
     */
    completeHole() {
      if (this.holeCompleted) {
        return false;
      }
      
      this.holeCompleted = true;
      
      // Call hole completed callback
      if (this.onHoleCompleted) {
        this.onHoleCompleted(this.currentHole, this.strokes, this.totalStrokes);
      }
      
      return true;
    }
    
    /**
     * Move to the next hole
     * @returns {boolean} Whether the next hole was set
     */
    nextHole() {
      if (!this.holeCompleted || this.gameCompleted) {
        return false;
      }
      
      this.currentHole++;
      this.holeCompleted = false;
      this.strokes = 0;
      
      // Check if game is completed
      if (this.currentHole > this.totalHoles) {
        this.gameCompleted = true;
        
        // Call game completed callback
        if (this.onGameCompleted) {
          this.onGameCompleted(this.totalHoles, this.totalStrokes);
        }
        
        return false;
      }
      
      // Update difficulty
      this.difficulty = Math.min(1 + (this.currentHole - 1) * 0.2, 5);
      
      // Update par based on difficulty
      this.par = Math.floor(3 + this.difficulty);
      
      // Update seed for consistency
      this.seed = this.seed + this.currentHole;
      
      return true;
    }
    
    /**
     * Reset the course
     */
    reset() {
      this.currentHole = 1;
      this.holeCompleted = false;
      this.gameCompleted = false;
      this.strokes = 0;
      this.totalStrokes = 0;
      this.difficulty = 1;
      this.par = 3;
      this.seed = Date.now();
    }
    
    /**
     * Get the current hole information
     * @returns {Object} Hole information
     */
    getCurrentHoleInfo() {
      return {
        holeNumber: this.currentHole,
        totalHoles: this.totalHoles,
        strokes: this.strokes,
        par: this.par,
        difficulty: this.difficulty,
        dailyModifier: this.dailyModifier,
        holePosition: this.holePosition,
        startPosition: this.startPosition,
        holeCompleted: this.holeCompleted
      };
    }
    
    /**
     * Get environment settings
     * @returns {Object} Environment settings
     */
    getEnvironmentSettings() {
      return {
        skyColor: this.skyColor,
        fogEnabled: this.fogEnabled,
        fogColor: this.fogColor,
        fogDensity: this.fogDensity,
        ambientLightColor: this.ambientLightColor,
        ambientLightIntensity: this.ambientLightIntensity,
        directionalLightColor: this.directionalLightColor,
        directionalLightIntensity: this.directionalLightIntensity,
        shadowsEnabled: this.shadowsEnabled
      };
    }
    
    /**
     * Apply daily modifier effects
     * This method would be called by the course generation system
     */
    applyDailyModifier() {
      if (!this.dailyModifier) return;
      
      switch (this.dailyModifier) {
        case 'zeroG':
          // Set reduced gravity in physics system
          this.properties.gravity = { x: 0, y: -2, z: 0 };
          break;
          
        case 'bouncy':
          // Increase bounce factor
          this.properties.globalRestitution = 1.5;
          break;
          
        case 'foggy':
          // Enable fog
          this.fogEnabled = true;
          this.fogDensity = 0.05;
          break;
          
        case 'nightMode':
          // Darken scene
          this.skyColor = 0x000022;
          this.ambientLightIntensity = 0.3;
          this.properties.addPointLights = true;
          break;
          
        case 'windyCourse':
          // Add wind effect
          this.properties.windDirection = { x: 1, y: 0, z: 0 };
          this.properties.windStrength = 2.0;
          break;
          
        case 'mirrorMode':
          // Mirror the course layout
          this.properties.mirrorX = true;
          break;
      }
    }
    
    /**
     * Get daily modifier name
     * @returns {string} Friendly name of the modifier
     */
    getDailyModifierName() {
      if (!this.dailyModifier) return 'None';
      
      switch (this.dailyModifier) {
        case 'zeroG':
          return 'Zero Gravity';
        case 'bouncy':
          return 'Extra Bouncy';
        case 'foggy':
          return 'Foggy Course';
        case 'nightMode':
          return 'Night Mode';
        case 'windyCourse':
          return 'Windy Course';
        case 'mirrorMode':
          return 'Mirror Mode';
        default:
          return this.dailyModifier;
      }
    }
    
    /**
     * Get daily modifier description
     * @returns {string} Description of the modifier
     */
    getDailyModifierDescription() {
      if (!this.dailyModifier) return 'No special modifiers.';
      
      switch (this.dailyModifier) {
        case 'zeroG':
          return 'Reduced gravity makes shots travel further.';
        case 'bouncy':
          return 'All surfaces are extra bouncy.';
        case 'foggy':
          return 'Limited visibility makes aiming more challenging.';
        case 'nightMode':
          return 'It\'s dark! Look for lit obstacles to find your way.';
        case 'windyCourse':
          return 'A constant wind affects your shots.';
        case 'mirrorMode':
          return 'Course layout is mirrored horizontally.';
        default:
          return 'Unknown modifier type.';
      }
    }
    
    /**
     * Generate a daily modifier based on the current date
     * @returns {string} Daily modifier
     */
    static generateDailyModifier() {
      // Get current date in YYYY-MM-DD format
      const now = new Date();
      const dateString = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
      
      // Create simple hash from date string
      let hash = 0;
      for (let i = 0; i < dateString.length; i++) {
        hash = ((hash << 5) - hash) + dateString.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
      }
      
      // List of possible modifiers
      const modifiers = [
        'zeroG',
        'bouncy',
        'foggy',
        'nightMode',
        'windyCourse',
        'mirrorMode'
      ];
      
      // Select modifier based on hash
      const index = Math.abs(hash) % modifiers.length;
      return modifiers[index];
    }
  }
  
  export default Course;