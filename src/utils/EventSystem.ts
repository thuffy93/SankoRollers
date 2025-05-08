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

// Common event names used throughout the game
export const GameEvents = {
  // Input Events
  KEY_DOWN: 'key:down',
  KEY_UP: 'key:up',
  
  // Shot Events
  SHOT_AIM: 'shot:aim',
  SHOT_POWER_CHANGE: 'shot:power',
  SHOT_EXECUTE: 'shot:execute',
  SHOT_CANCEL: 'shot:cancel',
  
  // Game State Events
  STATE_CHANGE: 'state:change',
  
  // Ball Events
  BALL_MOVING: 'ball:moving',
  BALL_STOPPED: 'ball:stopped',
  
  // UI Events
  UI_POWER_CHANGE: 'ui:power',
}; 