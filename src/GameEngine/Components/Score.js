// src/GameEngine/Components/Score.js

/**
 * Score component for keeping track of stroke count and points
 */
class Score {
    /**
     * Create a new score component
     * @param {Object} options - Component options
     */
    constructor(options = {}) {
      // Scoring properties
      this.strokes = options.strokes || 0;
      this.totalStrokes = options.totalStrokes || 0;
      this.par = options.par || 3;
      this.score = 0; // Net score relative to par
      this.holesCompleted = options.holesCompleted || 0;
      this.totalHoles = options.totalHoles || 9;
      
      // Score breakdown
      this.eagles = options.eagles || 0;     // -2 under par
      this.birdies = options.birdies || 0;   // -1 under par
      this.pars = options.pars || 0;         // Equal to par
      this.bogeys = options.bogeys || 0;     // +1 over par
      this.doubleBogeys = options.doubleBogeys || 0; // +2 over par
      this.others = options.others || 0;     // Worse than double bogey
      
      // Callback functions
      this.onStrokeAdded = options.onStrokeAdded || null;
      this.onHoleCompleted = options.onHoleCompleted || null;
      this.onCourseCompleted = options.onCourseCompleted || null;
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
     * @param {number} par - Par for the hole (optional)
     * @returns {Object} Hole score data
     */
    completeHole(par = null) {
      // Set par if provided
      if (par !== null) {
        this.par = par;
      }
      
      // Calculate score relative to par
      const holeScore = this.strokes - this.par;
      this.score += holeScore;
      
      // Update score breakdown
      if (holeScore <= -2) {
        this.eagles++;
      } else if (holeScore === -1) {
        this.birdies++;
      } else if (holeScore === 0) {
        this.pars++;
      } else if (holeScore === 1) {
        this.bogeys++;
      } else if (holeScore === 2) {
        this.doubleBogeys++;
      } else {
        this.others++;
      }
      
      // Increment completed holes
      this.holesCompleted++;
      
      // Prepare result object
      const holeResult = {
        hole: this.holesCompleted,
        par: this.par,
        strokes: this.strokes,
        holeScore,
        totalScore: this.score,
        totalStrokes: this.totalStrokes,
        scoreName: this.getScoreName(holeScore)
      };
      
      // Check if course is completed
      const courseCompleted = this.holesCompleted >= this.totalHoles;
      
      // Call hole completed callback
      if (this.onHoleCompleted) {
        this.onHoleCompleted(holeResult, courseCompleted);
      }
      
      // Call course completed callback if all holes completed
      if (courseCompleted && this.onCourseCompleted) {
        this.onCourseCompleted({
          holes: this.totalHoles,
          totalStrokes: this.totalStrokes,
          totalScore: this.score,
          eagles: this.eagles,
          birdies: this.birdies,
          pars: this.pars,
          bogeys: this.bogeys,
          doubleBogeys: this.doubleBogeys,
          others: this.others
        });
      }
      
      // Reset strokes for next hole
      this.strokes = 0;
      
      return holeResult;
    }
    
    /**
     * Reset score for a new game
     */
    reset() {
      this.strokes = 0;
      this.totalStrokes = 0;
      this.score = 0;
      this.holesCompleted = 0;
      this.eagles = 0;
      this.birdies = 0;
      this.pars = 0;
      this.bogeys = 0;
      this.doubleBogeys = 0;
      this.others = 0;
    }
    
    /**
     * Get the name of the score relative to par
     * @param {number} relativeToPar - Score relative to par
     * @returns {string} Score name
     */
    getScoreName(relativeToPar) {
      if (relativeToPar <= -3) return 'Albatross';
      if (relativeToPar === -2) return 'Eagle';
      if (relativeToPar === -1) return 'Birdie';
      if (relativeToPar === 0) return 'Par';
      if (relativeToPar === 1) return 'Bogey';
      if (relativeToPar === 2) return 'Double Bogey';
      if (relativeToPar === 3) return 'Triple Bogey';
      return 'Other';
    }
    
    /**
     * Get current statistics
     * @returns {Object} Score statistics
     */
    getStats() {
      return {
        currentHole: this.holesCompleted + 1,
        holesCompleted: this.holesCompleted,
        totalHoles: this.totalHoles,
        currentStrokes: this.strokes,
        totalStrokes: this.totalStrokes,
        totalScore: this.score,
        eagles: this.eagles,
        birdies: this.birdies,
        pars: this.pars,
        bogeys: this.bogeys,
        doubleBogeys: this.doubleBogeys,
        others: this.others,
        
        // Calculate average
        averagePerHole: this.holesCompleted > 0 
          ? (this.totalStrokes / this.holesCompleted).toFixed(1) 
          : 0,
        
        // Calculate if under, over, or at par
        underPar: this.score < 0,
        overPar: this.score > 0,
        atPar: this.score === 0,
        
        // Format score string
        scoreString: this.formatScoreString(this.score)
      };
    }
    
    /**
     * Format score as a string (e.g., "+2" or "-3")
     * @param {number} score - Score relative to par
     * @returns {string} Formatted score string
     */
    formatScoreString(score) {
      if (score === 0) return 'E';
      return score > 0 ? `+${score}` : `${score}`;
    }
  }
  
  export default Score;