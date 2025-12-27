// IGameEngine - Common interface for game engines
//
// This interface allows GameEngine and PhaseCoordinator to be used
// interchangeably, enabling incremental migration.

import type { Warband } from '../../types/warband';
import type { GameState } from '../../types/game';
import type { GameEvent } from './events';
import type { ScreenCommand } from './screens';

/**
 * Result of processing a game event
 */
export interface ProcessResult {
  success: boolean;
  error?: string;
  stateChanged: boolean;
  screenCommand: ScreenCommand;
}

/**
 * Base serialized game state for save/load
 * Implementations may add additional engine-specific fields
 */
export interface SerializedGame {
  state: GameState;
  history: GameEvent[];
}

/**
 * Common interface for game engines.
 * Both GameEngine and PhaseCoordinator implement this interface.
 */
export interface IGameEngine {
  /**
   * Create a new game with two warbands and a scenario.
   */
  createGame(warband1: Warband, warband2: Warband, scenario: string): void;

  /**
   * Load an existing game state and event history.
   */
  loadGame(state: GameState, history: GameEvent[]): void;

  /**
   * Process a game event and return the result.
   */
  processEvent(event: GameEvent): ProcessResult;

  /**
   * Get the current screen command based on game state.
   */
  getCurrentScreen(): ScreenCommand;

  /**
   * Get the current game state, or null if no game is active.
   */
  getState(): GameState | null;

  /**
   * Get the event history for the current game.
   */
  getHistory(): GameEvent[];

  /**
   * Serialize the game for save/load.
   */
  serialize(): SerializedGame;

  /**
   * Undo to a specific event in history.
   */
  undoToEvent(eventId: string): ProcessResult;

  /**
   * Undo the last N events.
   */
  undoLastEvents(count: number): ProcessResult;

  /**
   * Reset the game to its initial state.
   */
  resetToInitialState(): ProcessResult;
}
