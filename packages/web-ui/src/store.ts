import type { GameState, ServerMessage, NarrativeEvent } from "@crit-commit/shared";
import { createStarterState } from "@crit-commit/shared";

export type StateSelector<T> = (state: GameState) => T;
export type StateSubscriber<T> = (value: T, previousValue: T | undefined) => void;
export type Unsubscribe = () => void;

interface Subscription<T> {
  selector: StateSelector<T>;
  callback: StateSubscriber<T>;
  lastValue: T | undefined;
}

/**
 * Observable game state store for Crit Commit RPG.
 * Manages the current game state and notifies subscribers of changes to specific state slices.
 */
export class GameStore {
  private state: GameState;
  private subscriptions = new Map<number, Subscription<any>>();
  private nextSubscriptionId = 0;

  constructor(initialState?: GameState) {
    this.state = initialState || createStarterState("Player", "architect");
  }

  /**
   * Get the current game state
   */
  getState(): GameState {
    return { ...this.state };
  }

  /**
   * Update the game state
   */
  setState(newState: GameState): void {
    const previousState = this.state;
    this.state = { ...newState };
    this.notifySubscribers(previousState);
  }

  /**
   * Partially update the game state
   */
  updateState(partial: Partial<GameState>): void {
    const previousState = this.state;
    this.state = { ...this.state, ...partial };
    this.notifySubscribers(previousState);
  }

  /**
   * Subscribe to changes in a specific part of the state
   */
  subscribe<T>(selector: StateSelector<T>, callback: StateSubscriber<T>): Unsubscribe {
    const subscriptionId = this.nextSubscriptionId++;
    const currentValue = selector(this.state);

    const subscription: Subscription<T> = {
      selector,
      callback,
      lastValue: currentValue
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Immediately call the callback with the current value
    try {
      callback(currentValue, undefined);
    } catch (error) {
      console.error("Error in state subscriber:", error);
    }

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(subscriptionId);
    };
  }

  /**
   * Subscribe to the entire game state
   */
  subscribeToState(callback: StateSubscriber<GameState>): Unsubscribe {
    return this.subscribe(state => state, callback);
  }

  /**
   * Subscribe to character changes
   */
  subscribeToCharacter(callback: StateSubscriber<GameState["character"]>): Unsubscribe {
    return this.subscribe(state => state.character, callback);
  }

  /**
   * Subscribe to party changes
   */
  subscribeToParty(callback: StateSubscriber<GameState["party"]>): Unsubscribe {
    return this.subscribe(state => state.party, callback);
  }

  /**
   * Subscribe to quest changes
   */
  subscribeToQuests(callback: StateSubscriber<GameState["quests"]>): Unsubscribe {
    return this.subscribe(state => state.quests, callback);
  }

  /**
   * Subscribe to zone changes
   */
  subscribeToZones(callback: StateSubscriber<GameState["zones"]>): Unsubscribe {
    return this.subscribe(state => state.zones, callback);
  }

  /**
   * Subscribe to inventory changes
   */
  subscribeToInventory(callback: StateSubscriber<GameState["inventory"]>): Unsubscribe {
    return this.subscribe(state => state.inventory, callback);
  }

  /**
   * Subscribe to event feed changes
   */
  subscribeToEvents(callback: StateSubscriber<NarrativeEvent[]>): Unsubscribe {
    return this.subscribe(state => state.eventFeed || [], callback);
  }

  /**
   * Subscribe to settings changes
   */
  subscribeToSettings(callback: StateSubscriber<GameState["settings"]>): Unsubscribe {
    return this.subscribe(state => state.settings, callback);
  }

  /**
   * Handle server messages and update state accordingly
   */
  handleServerMessage(message: ServerMessage): void {
    switch (message.type) {
      case "state_update":
        this.setState(message.gameState);
        break;

      case "event_feed":
        // Merge new events into the event feed
        const currentEvents = this.state.eventFeed || [];
        const newEvents = message.events.filter(
          newEvent => !currentEvents.some(existing =>
            existing.timestamp === newEvent.timestamp && existing.description === newEvent.description
          )
        );

        if (newEvents.length > 0) {
          const updatedEvents = [...currentEvents, ...newEvents]
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .slice(-100); // Keep only the last 100 events

          this.updateState({ eventFeed: updatedEvents });
        }
        break;

      case "crit_trigger":
        // Add crit event to the feed
        const critEvent: NarrativeEvent = {
          id: `crit_${Date.now()}`,
          timestamp: message.timestamp,
          type: "crit",
          description: message.critDescription,
          metadata: {
            xpGained: message.xpGained,
            critStreak: message.critStreak
          }
        };

        const currentCritEvents = this.state.eventFeed || [];
        this.updateState({
          eventFeed: [...currentCritEvents, critEvent].slice(-100)
        });
        break;

      case "encounter_update":
        // Handle encounter updates by updating the current encounter in state
        // This might need to be expanded based on how encounters are stored in GameState
        console.log("Encounter update:", message);
        break;

      case "status":
        // Update connection status or processing state in the store if needed
        console.log("Server status:", message.status, message.message);
        break;

      case "stackjack_update":
        // Handle Stackjack game state updates
        console.log("Stackjack update:", message);
        break;

      case "error":
        console.error("Server error:", message.error, message.context);
        break;

      default:
        console.warn("Unhandled server message type:", (message as any).type);
        break;
    }
  }

  /**
   * Get the number of active subscriptions
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Clear all subscriptions
   */
  clearSubscriptions(): void {
    this.subscriptions.clear();
  }

  private notifySubscribers(previousState: GameState): void {
    this.subscriptions.forEach((subscription) => {
      try {
        const currentValue = subscription.selector(this.state);
        const previousValue = subscription.selector(previousState);

        // Only notify if the selected value has changed
        if (!this.deepEqual(currentValue, previousValue)) {
          subscription.lastValue = currentValue;
          subscription.callback(currentValue, previousValue);
        }
      } catch (error) {
        console.error("Error notifying subscriber:", error);
      }
    });
  }

  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;

    if (typeof a === "object") {
      if (Array.isArray(a) !== Array.isArray(b)) return false;

      if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        return a.every((item, index) => this.deepEqual(item, b[index]));
      }

      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      if (keysA.length !== keysB.length) return false;
      return keysA.every(key => this.deepEqual(a[key], b[key]));
    }

    return false;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.clearSubscriptions();
  }
}

/**
 * Create a global game store instance
 */
export function createGameStore(initialState?: GameState): GameStore {
  return new GameStore(initialState);
}