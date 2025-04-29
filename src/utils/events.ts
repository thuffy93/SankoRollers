/**
 * Events system for Cosmic Rollers using a pub/sub pattern
 */

// Define event types
export enum EventType {
  SHOT_STARTED = 'SHOT_STARTED',
  SHOT_COMPLETED = 'SHOT_COMPLETED',
  SHOT_EXECUTE = 'SHOT_EXECUTE',
  SHOT_BOUNCE = 'SHOT_BOUNCE',
  SHOT_BOUNCE_REQUESTED = 'SHOT_BOUNCE_REQUESTED',
  BALL_STOPPED = 'BALL_STOPPED',
  BALL_COLLISION = 'BALL_COLLISION',
  BALL_OUT_OF_BOUNDS = 'BALL_OUT_OF_BOUNDS',
  ANGLE_CHANGED = 'ANGLE_CHANGED',
  POWER_CHANGED = 'POWER_CHANGED',
  SPIN_UPDATED = 'SPIN_UPDATED',
  WALL_CLING_START = 'WALL_CLING_START',
  WALL_CLING_END = 'WALL_CLING_END',
  TARGET_HIT = 'TARGET_HIT',
  HOLE_COMPLETE = 'HOLE_COMPLETE',
  DEBUG_INFO_UPDATE = 'DEBUG_INFO_UPDATE',
}

// Event payload type
export type EventPayload = {
  [key: string]: any;
};

// Event callback type
export type EventCallback = (payload: EventPayload) => void;

// Events manager
export class EventsManager {
  private subscribers: Map<EventType, EventCallback[]> = new Map();

  /**
   * Subscribe to an event
   * @param eventType The event to listen for
   * @param callback Function to call when event occurs
   * @returns Unsubscribe function
   */
  public subscribe(eventType: EventType, callback: EventCallback): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    
    this.subscribers.get(eventType)?.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(eventType) || [];
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Publish an event
   * @param eventType The event to publish
   * @param payload Data to send with the event
   */
  public publish(eventType: EventType, payload: EventPayload = {}): void {
    const callbacks = this.subscribers.get(eventType) || [];
    callbacks.forEach(callback => callback(payload));
  }

  /**
   * Clear all subscribers
   */
  public clear(): void {
    this.subscribers.clear();
  }
}

// Create and export a singleton instance
export const eventsManager = new EventsManager(); 