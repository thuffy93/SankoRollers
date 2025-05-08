# Active Context: Cosmic Rollers

## Current Focus: Fixing Critical Gameplay Issues and Enhancing Visual Feedback

After completing the major refactoring of the shot system, we've identified several critical issues that need immediate attention before proceeding with further feature development:

### Critical Issues to Address

1. **Ball Not Moving After Charging State**
   - **Issue**: The ball is not shooting after the CHARGING state, possibly jumping straight from CHARGING to ROLLING to IDLE without applying forces
   - **Suspected Causes**:
     - Missing or incorrect physics application in ShotPhysics.executeShot()
     - State transition issue where the SHOT_EXECUTE event isn't properly triggering physics
     - Potential ball rigidbody sleeping state not being awakened
   - **Fix Approach**:
     - Add debugging to ShotController.handleShotExecute() to verify execution
     - Ensure ShotPhysics.executeShot() is applying sufficient force to move the ball
     - Verify the ball's rigidbody is being properly awakened with setLinvel()
     - Implement better error handling and return values from shot execution methods

2. **Trajectory Visualization Issues**
   - **Issue**: The trajectory visualizer should not change length during CHARGING phase, but should update to show trajectory based on other parameters
   - **Fix Approach**:
     - Modify ShotController.updateTrajectoryVisualization() to maintain the chosen guide length in CHARGING state
     - Ensure PowerController does not modify guide length during charging
     - Update TrajectorySystem to apply guide length limitation consistently in both SHOT_PANEL and CHARGING states

### Implementation Plan

#### Ball Movement Fix

```typescript
// In ShotPhysics.executeShot()
public executeShot(): boolean {
  // Calculate shot vector
  const shotVector = this.parameterManager.calculateShotVector();
  
  // Ensure vector has meaningful magnitude
  if (shotVector.length() < 0.1) {
    console.error("Shot vector too small:", shotVector);
    return false;
  }
  
  // Apply impulse to ball - ensure this is actually moving the ball
  this.ballBody.applyImpulse(
    { x: shotVector.x, y: shotVector.y, z: shotVector.z }, 
    true // Wake the body
  );
  
  // Apply additional impulse to ensure it wakes up
  if (this.ballBody.isSleeping()) {
    console.log("Ball was sleeping, applying wake-up force");
    this.ballBody.setLinvel({x: 0.01, y: 0.01, z: 0.01}, true);
  }
  
  console.log("Applied shot impulse:", shotVector);
  return true;
}

// In ShotController.handleShotExecute()
private handleShotExecute(): void {
  // Only execute shot in charging state (Phase 3)
  if (!this.gameStateManager.isState(GameState.CHARGING)) {
    console.log("Shot execute ignored - not in CHARGING state");
    return;
  }
  
  console.log("Executing shot with power:", this.parameterManager.power);
  
  // Hide trajectory
  this.trajectorySystem.hideTrajectory();
  
  // Execute the shot physics with error handling
  const success = this.shotPhysics.executeShot();
  
  if (!success) {
    console.error("Failed to execute shot!");
    return;
  }
  
  // Super shot effect
  if (this.parameterManager.isSuperShot) {
    this.showSuperShotEffect();
  }
  
  // Change to ROLLING state to track ball movement
  this.gameStateManager.setState(GameState.ROLLING);
}
```

#### Trajectory Visualization Fix

```typescript
// In ShotController.updateTrajectoryVisualization()
private updateTrajectoryVisualization(): void {
  // Only show trajectory in specific states
  if (!(this.gameStateManager.isState(GameState.AIMING) || 
        this.gameStateManager.isState(GameState.SHOT_PANEL) ||
        this.gameStateManager.isState(GameState.CHARGING))) {
    this.trajectorySystem.hideTrajectory();
    return;
  }
  
  // Get ball position
  const ballPosition = this.ball.getPosition();
  
  // Update trajectory based on current parameters
  this.trajectorySystem.predictTrajectory(
    ballPosition,
    this.parameterManager.getShotDirection(),
    this.parameterManager.power,
    this.parameterManager.shotType,
    this.parameterManager.spinType,
    this.parameterManager.spinIntensity
  );
  
  // If in SHOT_PANEL or CHARGING state, limit trajectory length based on guide
  if (this.gameStateManager.isState(GameState.SHOT_PANEL) || 
      this.gameStateManager.isState(GameState.CHARGING)) {
    this.trajectorySystem.limitTrajectoryLength(
      this.parameterManager.currentGuideDistance
    );
  }
}
```

### Architecture Exploration: Hybrid ECS

Additionally, we're exploring a targeted, hybrid approach to Entity Component System (ECS) architecture for specific performance-critical subsystems:

- **Focus Areas**: Particle systems, terrain systems, and collectibles
- **Approach**: Implement data-oriented design principles selectively rather than a full ECS framework
- **Benefits**: Performance optimization for high-entity-count systems without complete architecture redesign
- **Documentation**: Created a detailed reference document at `memory-bank/design_references/HybridECS.md`

### Testing and Validation Approach

1. **Debugging Instrumentation**:
   - Add comprehensive logging to track state transitions and physics application
   - Implement visual indicators showing ball forces and awakened status

2. **Systematic Testing**:
   - Test different shot powers and angles to ensure consistent behavior
   - Verify trajectory visualization maintains correct guide length in all phases
   - Ensure state transitions occur in the expected sequence

3. **Performance Monitoring**:
   - Track frame times during shot execution to identify any performance issues
   - Monitor memory usage during extended play sessions

## Key Decisions Completed

### Architecture Decisions
- ✅ Restructured shot controller into specialized component classes
- ✅ Implemented centralized parameter management with ShotParameterManager
- ✅ Separated trajectory simulation from visualization
- ✅ Created clear interfaces between components
- ✅ Used facade pattern to simplify coordination between components
- ✅ Improved event handling to prevent recursion and memory leaks

### Implementation Priorities
- ✅ Refactored four-phase shot system into specialized controllers
- ✅ Created dedicated physics behavior classes
- ✅ Implemented proper parameter management
- ✅ Redesigned trajectory system with better separation of concerns
- ✅ Fixed critical bugs in event handling and state management

## Next Steps

### Immediate Tasks

1. **Testing Infrastructure**:
   - Create unit tests for each component
   - Implement integration tests for component interactions
   - Add visual regression tests for UI components
   
2. **Visual Enhancement**:
   - Add particle effects for shots and collisions
   - Improve visual feedback for boost opportunities
   - Enhance trajectory visualization with better indicators
   
3. **Game Flow Implementation**:
   - Create hole completion logic
   - Implement scoring system
   - Add level transitions and progression
   
4. **Sound Effects**:
   - Add sound feedback for shots, bounces, and boosts
   - Implement ambient background music
   - Create audio manager for sound coordination

5. **Terrain Enhancement**:
   - Create different terrain types with unique properties
   - Add obstacles and hazards
   - Implement special zones with effects

### Short-term Goals
- Enhance visual and audio feedback for better player experience
- Create comprehensive test suite for all components
- Implement scoring and progression systems
- Add more terrain variety and obstacles

### Medium-term Goals
- Create level editor for custom course creation
- Implement multiplayer functionality
- Add special abilities and power-ups
- Create procedural course generation

## Open Questions and Challenges

### Technical Challenges
- Optimizing performance with the component-based architecture
- Creating smooth transitions between levels
- Implementing multiplayer synchronization
- Balancing physics parameters for optimal gameplay feel

### Recent Insights
- The component-based architecture has significantly improved maintainability
- Centralizing parameter management prevents data synchronization issues
- Facade pattern works well for coordinating complex systems
- Pre-binding event handlers and storing references prevents memory leaks
- Careful state management is essential for preventing race conditions

## Implementation Notes

### Bug Fix: Ball Movement Event Recursion
- Problem: Infinite recursion occurring when handling ball stopped events
- Root cause: BallEntity.setMoving() was emitting events that would trigger itself recursively
- Solution:
  1. Removed event emission from BallEntity.setMoving()
  2. Used pre-bound event handlers in Game.ts to prevent creating new bindings
  3. Stored handler references for proper cleanup
  4. Modified the update method to correctly handle ball state changes
  5. Added proper state tracking in BallEntity

### Component Architecture Benefits
- Each controller now has a single responsibility
- Parameter changes are centralized and propagated through events
- Physics calculations are isolated from visualization logic
- Clear interfaces between components simplify testing and extension
- Facade pattern reduces coupling between subsystems

### Event System Improvements
- Pre-binding event handlers prevents memory leaks
- Storing handler references enables proper cleanup
- Clear event flow documentation prevents unexpected interactions
- Careful attention to event propagation prevents infinite loops

## Collaboration Notes
- Focus on adding visual and audio feedback for better player experience
- Add comprehensive tests for all components
- Document component interactions for future developers
- Consider performance optimization for complex physics calculations
- Plan for future features while maintaining the clean architecture
