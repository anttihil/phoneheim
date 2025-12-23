// InputMediator - Coordinates events between UI, engine, and network
//
// Responsibilities:
// - Wraps raw event data with id/timestamp
// - Validates turn ownership before processing
// - Notifies listeners when screen changes
// - Provides clean API for UI to submit events

import { GameEngine, ProcessResult } from '../engine';
import type { GameEvent, EventType } from '../engine/types/events';
import type { ScreenCommand } from '../engine/types/screens';
import type { Warband } from '../types/warband';
import type { GameState } from '../types/game';

// Callback type for screen command listeners
export type ScreenCommandListener = (screen: ScreenCommand) => void;

// Callback type for error listeners
export type ErrorListener = (error: string) => void;

// Event submission without id/timestamp (UI provides these)
export type EventSubmission<T extends GameEvent = GameEvent> = {
  type: T['type'];
  payload: T['payload'];
};

// Player identity for turn validation
export interface PlayerIdentity {
  playerId: string;
  playerNumber: 1 | 2;
}

export class InputMediator {
  private engine: GameEngine;
  private screenListeners: Set<ScreenCommandListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();
  private localPlayer: PlayerIdentity | null = null;
  private turnValidationEnabled: boolean = true;

  constructor(engine?: GameEngine) {
    this.engine = engine ?? new GameEngine();
  }

  // =====================================
  // GAME LIFECYCLE
  // =====================================

  /**
   * Create a new game with the given warbands and scenario.
   * Sets the local player identity for turn validation.
   */
  createGame(
    warband1: Warband,
    warband2: Warband,
    scenario: string,
    localPlayer: PlayerIdentity
  ): ScreenCommand {
    this.engine.createGame(warband1, warband2, scenario);
    this.localPlayer = localPlayer;
    const screen = this.engine.getCurrentScreen();
    this.notifyScreenListeners(screen);
    return screen;
  }

  /**
   * Load an existing game state.
   * Used for resuming games or syncing with remote state.
   */
  loadGame(
    state: GameState,
    history: GameEvent[],
    localPlayer: PlayerIdentity
  ): ScreenCommand {
    this.engine.loadGame(state, history);
    this.localPlayer = localPlayer;
    const screen = this.engine.getCurrentScreen();
    this.notifyScreenListeners(screen);
    return screen;
  }

  /**
   * Set the local player identity.
   * Used when joining an existing game.
   */
  setLocalPlayer(player: PlayerIdentity): void {
    this.localPlayer = player;
  }

  /**
   * Enable or disable turn validation.
   * Useful for testing or single-player mode.
   */
  setTurnValidation(enabled: boolean): void {
    this.turnValidationEnabled = enabled;
  }

  // =====================================
  // EVENT SUBMISSION
  // =====================================

  /**
   * Submit an event to the game engine.
   * Wraps with id/timestamp and validates turn ownership.
   */
  submitEvent<T extends GameEvent>(submission: EventSubmission<T>): ProcessResult {
    // Validate game is active
    if (!this.engine.getState()) {
      const error = 'No active game';
      this.notifyErrorListeners(error);
      return {
        success: false,
        error,
        stateChanged: false,
        screenCommand: this.engine.getCurrentScreen()
      };
    }

    // Validate turn ownership (skip for certain event types)
    if (this.turnValidationEnabled && !this.isEventAllowed(submission.type)) {
      const error = 'Not your turn';
      this.notifyErrorListeners(error);
      return {
        success: false,
        error,
        stateChanged: false,
        screenCommand: this.engine.getCurrentScreen()
      };
    }

    // Create full event with id and timestamp
    const event = this.createEvent(submission);

    // Process through engine
    const result = this.engine.processEvent(event);

    // Notify listeners
    if (result.success) {
      this.notifyScreenListeners(result.screenCommand);
    } else if (result.error) {
      this.notifyErrorListeners(result.error);
    }

    return result;
  }

  /**
   * Submit a raw event (already has id/timestamp).
   * Used for replaying events from network or history.
   */
  submitRawEvent(event: GameEvent): ProcessResult {
    const result = this.engine.processEvent(event);

    if (result.success) {
      this.notifyScreenListeners(result.screenCommand);
    } else if (result.error) {
      this.notifyErrorListeners(result.error);
    }

    return result;
  }

  // =====================================
  // UNDO OPERATIONS
  // =====================================

  /**
   * Undo to a specific event.
   */
  undoToEvent(eventId: string): ProcessResult {
    const result = this.engine.undoToEvent(eventId);

    if (result.success) {
      this.notifyScreenListeners(result.screenCommand);
    } else if (result.error) {
      this.notifyErrorListeners(result.error);
    }

    return result;
  }

  /**
   * Undo the last N events.
   */
  undoLastEvents(count: number): ProcessResult {
    const result = this.engine.undoLastEvents(count);

    if (result.success) {
      this.notifyScreenListeners(result.screenCommand);
    } else if (result.error) {
      this.notifyErrorListeners(result.error);
    }

    return result;
  }

  /**
   * Reset game to initial state.
   */
  resetGame(): ProcessResult {
    const result = this.engine.resetToInitialState();

    if (result.success) {
      this.notifyScreenListeners(result.screenCommand);
    } else if (result.error) {
      this.notifyErrorListeners(result.error);
    }

    return result;
  }

  // =====================================
  // SUBSCRIPTIONS
  // =====================================

  /**
   * Subscribe to screen command updates.
   * Returns unsubscribe function.
   */
  onScreenCommand(listener: ScreenCommandListener): () => void {
    this.screenListeners.add(listener);
    return () => this.screenListeners.delete(listener);
  }

  /**
   * Subscribe to error notifications.
   * Returns unsubscribe function.
   */
  onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  // =====================================
  // ACCESSORS
  // =====================================

  /**
   * Get the current screen command.
   */
  getCurrentScreen(): ScreenCommand {
    return this.engine.getCurrentScreen();
  }

  /**
   * Get the current game state.
   */
  getState(): GameState | null {
    return this.engine.getState();
  }

  /**
   * Get the event history.
   */
  getHistory(): GameEvent[] {
    return this.engine.getHistory();
  }

  /**
   * Get the underlying engine (for advanced use cases).
   */
  getEngine(): GameEngine {
    return this.engine;
  }

  /**
   * Get the local player identity.
   */
  getLocalPlayer(): PlayerIdentity | null {
    return this.localPlayer;
  }

  /**
   * Check if it's the local player's turn.
   */
  isLocalPlayerTurn(): boolean {
    if (!this.localPlayer) return false;
    const state = this.engine.getState();
    if (!state) return false;
    return state.currentPlayer === this.localPlayer.playerNumber;
  }

  /**
   * Get available event types for current screen.
   */
  getAvailableEvents(): EventType[] {
    const screen = this.engine.getCurrentScreen();
    return screen.availableEvents;
  }

  // =====================================
  // SERIALIZATION
  // =====================================

  /**
   * Serialize the current game state for saving or network sync.
   */
  serialize(): { state: GameState; history: GameEvent[] } {
    const serialized = this.engine.serialize();
    return {
      state: serialized.state,
      history: serialized.history
    };
  }

  // =====================================
  // PRIVATE HELPERS
  // =====================================

  private createEvent<T extends GameEvent>(submission: EventSubmission<T>): T {
    return {
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      playerId: this.localPlayer?.playerId ?? 'anonymous',
      type: submission.type,
      payload: submission.payload
    } as T;
  }

  private isEventAllowed(eventType: EventType): boolean {
    if (!this.localPlayer) return true; // No player set, allow all

    const state = this.engine.getState();
    if (!state) return false;

    // Events that are always allowed regardless of turn
    const alwaysAllowed: EventType[] = [
      'UNDO',
      'REQUEST_STATE',
      'ACKNOWLEDGE' // Acknowledging results should be allowed
    ];

    if (alwaysAllowed.includes(eventType)) {
      return true;
    }

    // For other events, must be the current player's turn
    return state.currentPlayer === this.localPlayer.playerNumber;
  }

  private notifyScreenListeners(screen: ScreenCommand): void {
    for (const listener of this.screenListeners) {
      try {
        listener(screen);
      } catch (error) {
        console.error('Error in screen listener:', error);
      }
    }
  }

  private notifyErrorListeners(error: string): void {
    for (const listener of this.errorListeners) {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    }
  }
}

// Factory function for convenience
export function createMediator(engine?: GameEngine): InputMediator {
  return new InputMediator(engine);
}
