// InputMediator - Coordinates events between UI, engine, and network
//
// Responsibilities:
// - Wraps raw event data with id/timestamp
// - Validates turn ownership before processing
// - Notifies listeners when screen changes
// - Provides clean API for UI to submit events
// - Integrates with NetworkAdapter for multiplayer
// - Integrates with LocalAdapter for AI/single-player

import { PhaseCoordinator } from '../engine';
import type { IGameEngine, ProcessResult } from '../engine/types/engine';
import type { GameEvent, EventType } from '../engine/types/events';
import type { ScreenCommand } from '../engine/types/screens';
import type { Warband } from '../types/warband';
import type { GameState } from '../types/game';
import { NetworkAdapter } from './NetworkAdapter';
import { LocalAdapter } from './LocalAdapter';

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
  private engine: IGameEngine;
  private screenListeners: Set<ScreenCommandListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();
  private localPlayer: PlayerIdentity | null = null;
  private turnValidationEnabled: boolean = true;

  // Network and local adapters
  private networkAdapter: NetworkAdapter | null = null;
  private localAdapter: LocalAdapter | null = null;
  private isMultiplayer: boolean = false;

  constructor(engine?: IGameEngine) {
    this.engine = engine ?? new PhaseCoordinator();
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

      // Broadcast state to network if connected
      if (this.networkAdapter && this.networkAdapter.isConnected()) {
        const state = this.engine.getState();
        if (state) {
          this.networkAdapter.broadcastState(state, this.engine.getHistory());
        }
      }

      // Check if it's now AI's turn
      this.checkAITurn();
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
  getEngine(): IGameEngine {
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
  // NETWORK ADAPTER INTEGRATION
  // =====================================

  /**
   * Connect a network adapter for multiplayer games.
   */
  connect(adapter: NetworkAdapter): void {
    this.networkAdapter = adapter;
    this.isMultiplayer = true;

    // Subscribe to remote state updates
    adapter.onRemoteState((state, history) => {
      this.handleRemoteState(state, history);
    });

    // Subscribe to remote events (for spectators)
    adapter.onRemoteEvent((event) => {
      this.handleRemoteEvent(event);
    });

    // Provide state when requested
    adapter.setStateProvider(() => {
      const state = this.engine.getState();
      if (!state) return null;
      return {
        state,
        history: this.engine.getHistory()
      };
    });
  }

  /**
   * Disconnect from the network adapter.
   */
  disconnect(): void {
    if (this.networkAdapter) {
      this.networkAdapter.disconnect();
      this.networkAdapter = null;
    }
    this.isMultiplayer = false;
  }

  /**
   * Get the network adapter.
   */
  getNetworkAdapter(): NetworkAdapter | null {
    return this.networkAdapter;
  }

  /**
   * Check if in multiplayer mode.
   */
  isInMultiplayerMode(): boolean {
    return this.isMultiplayer;
  }

  /**
   * Handle incoming remote state from opponent.
   * Used when it's the opponent's turn and they've made moves.
   */
  private handleRemoteState(state: GameState, history: GameEvent[]): void {
    // Load the remote state
    this.engine.loadGame(state, history);

    // Notify UI of the new screen
    const screen = this.engine.getCurrentScreen();
    this.notifyScreenListeners(screen);

    // Check if it's now AI's turn (if AI is enabled)
    this.checkAITurn();
  }

  /**
   * Handle incoming remote event (for spectators).
   */
  private handleRemoteEvent(event: GameEvent): void {
    // Process the event locally to build up state
    const result = this.engine.processEvent(event);
    if (result.success) {
      this.notifyScreenListeners(result.screenCommand);
    }
  }

  // =====================================
  // LOCAL ADAPTER INTEGRATION (AI)
  // =====================================

  /**
   * Enable AI opponent.
   */
  enableAI(adapter?: LocalAdapter, playerNumber: 1 | 2 = 2): void {
    this.localAdapter = adapter ?? new LocalAdapter();
    this.localAdapter.enableAI({ thinkingDelay: 1000, strategy: 'random' }, playerNumber);

    // Set up the event submitter
    this.localAdapter.setEventSubmitter((event) => {
      // Temporarily switch to AI player to submit event
      const savedPlayer = this.localPlayer;
      this.localPlayer = {
        playerId: `ai_player${playerNumber}`,
        playerNumber
      };

      this.submitEvent(event as EventSubmission);

      // Restore original player
      this.localPlayer = savedPlayer;
    });

    // Check if it's AI's turn right now
    this.checkAITurn();
  }

  /**
   * Disable AI opponent.
   */
  disableAI(): void {
    if (this.localAdapter) {
      this.localAdapter.disableAI();
      this.localAdapter = null;
    }
  }

  /**
   * Get the local adapter.
   */
  getLocalAdapter(): LocalAdapter | null {
    return this.localAdapter;
  }

  /**
   * Check if AI is enabled.
   */
  isAIEnabled(): boolean {
    return this.localAdapter?.isAIEnabled() ?? false;
  }

  /**
   * Check if it's the AI's turn and trigger AI decision if so.
   */
  private checkAITurn(): void {
    if (!this.localAdapter || !this.localAdapter.isAIEnabled()) {
      return;
    }

    const state = this.engine.getState();
    if (!state) return;

    const aiPlayerNumber = this.localAdapter.getAIPlayerNumber();
    if (state.currentPlayer === aiPlayerNumber) {
      // It's AI's turn
      const screen = this.engine.getCurrentScreen();
      this.localAdapter.onAITurn(screen, state);
    }
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
export function createMediator(engine?: IGameEngine): InputMediator {
  return new InputMediator(engine);
}
