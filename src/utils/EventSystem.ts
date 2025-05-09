/**
 * Type definitions for event callbacks
 */
export type EventCallback = (...args: any[]) => void;
export type EventMap = Map<string, EventCallback[]>;

/**
 * EventSystem - Centralized system for game-wide event handling
 * 
 * This class follows the Singleton pattern and provides a central
 * event bus for the game. Components can subscribe to and publish
 * events through this system to communicate without direct coupling.
 */
export class EventSystem {
  private static instance: EventSystem | null = null;
  private events: EventMap = new Map();

  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    console.log('EventSystem initialized');
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): EventSystem {
    if (!EventSystem.instance) {
      EventSystem.instance = new EventSystem();
    }
    
    return EventSystem.instance;
  }

  /**
   * Subscribe to an event
   * @param eventName The name of the event to subscribe to
   * @param callback The function to call when the event is published
   */
  public on(eventName: string, callback: EventCallback): void {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }
    
    this.events.get(eventName)!.push(callback);
  }

  /**
   * Unsubscribe from an event
   * @param eventName The name of the event to unsubscribe from
   * @param callback The function to remove from the event
   */
  public off(eventName: string, callback: EventCallback): void {
    if (!this.events.has(eventName)) return;
    
    const callbacks = this.events.get(eventName)!;
    const index = callbacks.indexOf(callback);
    
    if (index !== -1) {
      callbacks.splice(index, 1);
      
      // Remove the event entirely if no callbacks remain
      if (callbacks.length === 0) {
        this.events.delete(eventName);
      }
    }
  }

  /**
   * Publish an event
   * @param eventName The name of the event to publish
   * @param args Arguments to pass to the event callbacks
   */
  public emit(eventName: string, ...args: any[]): void {
    if (!this.events.has(eventName)) return;
    
    const callbacks = this.events.get(eventName)!;
    callbacks.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in event handler for ${eventName}:`, error);
      }
    });
  }

  /**
   * Check if an event has subscribers
   * @param eventName The name of the event to check
   */
  public hasListeners(eventName: string): boolean {
    return this.events.has(eventName) && this.events.get(eventName)!.length > 0;
  }

  /**
   * Clear all events of a specific type
   * @param eventName The name of the event to clear
   */
  public clearEvent(eventName: string): void {
    this.events.delete(eventName);
  }

  /**
   * Clear all events
   */
  public clearAllEvents(): void {
    this.events.clear();
  }

  /**
   * Reset the EventSystem (for testing or game reset)
   */
  public static resetInstance(): void {
    EventSystem.instance = null;
  }
}

/**
 * Standard game events
 */
export const GameEvents = {
  // Input events
  SHOT_AIM: 'shot:aim',                  // Player is aiming shot direction (Phase 1)
  SHOT_TYPE_TOGGLE: 'shot:type_toggle',  // Player toggles between grounder and fly shot
  SHOT_TYPE_CONFIRM: 'shot:type_confirm', // Player confirms shot type and moves to aiming (Phase 0→1)
  SHOT_DIRECTION_CONFIRM: 'shot:dir_confirm', // Player confirms direction and moves to guide selection (Phase 1→2)
  SHOT_GUIDE_TOGGLE: 'shot:guide_toggle', // Player toggles between short and long guide (Phase 2)
  SHOT_GUIDE_CONFIRM: 'shot:guide_confirm', // Player confirms guide selection and moves to power/spin (Phase 2→3)
  SHOT_POWER_CHANGE: 'shot:power',       // Player is changing shot power (Phase 3)
  SHOT_SPIN_CHANGE: 'shot:spin',         // Player is changing shot spin (Phase 3)
  SHOT_EXECUTE: 'shot:execute',          // Player executes the shot (Phase 3→4)
  SHOT_CANCEL: 'shot:cancel',            // Player cancels the shot (Any Phase→IDLE)
  SHOT_BOOST: 'shot:boost',              // Player activates boost at bounce point (Phase 4)
  SHOT_PARAMS_CHANGED: 'shot:params_changed', // Shot parameters have been updated
  
  // Game state events
  BALL_MOVING: 'ball:moving',            // Ball is moving
  BALL_STOPPED: 'ball:stopped',          // Ball has stopped moving
  BALL_BOUNCE: 'ball:bounce',            // Ball has bounced (potential boost opportunity)
  HOLE_COMPLETE: 'hole:complete',        // Player completed the current hole
  GAME_STARTED: 'game:started',          // Game has started
  GAME_PAUSED: 'game:paused',            // Game has been paused
  GAME_RESUMED: 'game:resumed',          // Game has been resumed
  GAME_OVER: 'game:over',                // Game is over
  
  // UI events
  UI_UPDATE: 'ui:update',                // UI needs to be updated
  SCORE_CHANGED: 'score:changed',        // Score has changed
  SUPER_SHOT_READY: 'super_shot:ready',  // Power meter in super shot range (95-100%)
  
  // Keyboard events
  KEY_DOWN: 'key:down',                  // Key pressed
  KEY_UP: 'key:up',                      // Key released
  
  // State events
  STATE_CHANGE: 'state:change',          // Game state changed
}; 