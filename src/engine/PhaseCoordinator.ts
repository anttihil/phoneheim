// PhaseCoordinator - Thin orchestrator for the modular phase architecture
// Replaces the monolithic GameEngine with delegation to phase modules

import type { Warband } from '../types/warband';
import type { GameState } from '../types/game';
import type { GameEvent, UndoEvent } from './types/events';
import type { ScreenCommand } from './types/screens';
import type { IGameEngine, ProcessResult, SerializedGame } from './types/engine';
import { createGameState } from '../logic/gameState';
import {
  getNextState,
  isNewTurn,
  isLeavingSetup,
  resetWarriorFlags,
  resetPlayerActedFlags,
  getPhaseName
} from './shared/stateMachine';
import type { PhaseContext, PhaseRegistry } from '../phases/shared/types';
import { createPhaseContext, createPhaseRegistry } from '../phases/shared/types';
import { setupPhase } from '../phases/setup';
import { recoveryPhase } from '../phases/recovery';
import { movementPhase } from '../phases/movement';
import { shootingPhase } from '../phases/shooting';
import { combatPhase } from '../phases/combat';

// Re-export types for convenience
export type { ProcessResult, SerializedGame };

/**
 * PhaseCoordinator - Orchestrates game flow by delegating to phase modules
 * Implements IGameEngine for compatibility with InputMediator
 */
export class PhaseCoordinator implements IGameEngine {
  private state: GameState | null = null;
  private history: GameEvent[] = [];
  private context: PhaseContext;
  private phases: PhaseRegistry;

  // For undo support
  private initialWarband1: Warband | null = null;
  private initialWarband2: Warband | null = null;
  private initialScenario: string | null = null;

  constructor() {
    this.context = createPhaseContext();
    this.phases = createPhaseRegistry([
      setupPhase,
      recoveryPhase,
      movementPhase,
      shootingPhase,
      combatPhase
    ]);
  }

  // =====================================
  // INITIALIZATION
  // =====================================

  createGame(warband1: Warband, warband2: Warband, scenario: string): void {
    // Store initial state for undo
    this.initialWarband1 = JSON.parse(JSON.stringify(warband1));
    this.initialWarband2 = JSON.parse(JSON.stringify(warband2));
    this.initialScenario = scenario;

    this.state = createGameState(warband1, warband2, scenario);
    this.history = [];
    this.context = createPhaseContext();
  }

  loadGame(state: GameState, history: GameEvent[]): void {
    this.state = state;
    this.history = history;
    this.context = createPhaseContext();
  }

  // =====================================
  // EVENT PROCESSING
  // =====================================

  processEvent(event: GameEvent): ProcessResult {
    if (!this.state) {
      return this.errorResult('No active game');
    }

    // Handle meta-events (UNDO, ADVANCE_PHASE)
    if (event.type === 'UNDO') {
      return this.handleUndo(event as UndoEvent);
    }

    if (event.type === 'ADVANCE_PHASE') {
      return this.handleAdvancePhase();
    }

    // Record event in history
    this.history.push(event);

    // Get active phase module
    const phaseModule = this.phases.get(this.state.phase);
    if (!phaseModule) {
      return this.errorResult(`No module for phase: ${this.state.phase}`);
    }

    // Delegate to phase module
    const result = phaseModule.processEvent(event, this.state, this.context);

    // Apply context updates
    if (result.contextUpdates) {
      Object.assign(this.context, result.contextUpdates);
    }

    // Build screen from phase module
    const screenCommand = phaseModule.buildScreen(this.state, this.context);

    return {
      success: result.success,
      error: result.error,
      stateChanged: result.stateChanged,
      screenCommand
    };
  }

  // =====================================
  // PHASE TRANSITIONS
  // =====================================

  private handleAdvancePhase(): ProcessResult {
    const state = this.state!;
    const currentState = {
      turn: state.turn,
      phase: state.phase,
      currentPlayer: state.currentPlayer
    };

    // Get current phase module and call onExit
    const currentPhase = this.phases.get(state.phase);
    currentPhase?.onExit?.(state, this.context);

    // Handle setup phase player transition
    const nextState = getNextState(currentState);

    if (state.phase === 'setup' && nextState.phase === 'setup') {
      // Player 1 setup done, now Player 2
      state.currentPlayer = nextState.currentPlayer;
      resetPlayerActedFlags(state, 1);
      this.addLog('Setup Phase - Player 2');
      this.resetContextForPhaseChange();

      return this.successResult(true);
    }

    // Handle transition from setup to regular gameplay
    if (isLeavingSetup(currentState, nextState)) {
      state.phase = nextState.phase;
      state.currentPlayer = nextState.currentPlayer;
      resetWarriorFlags(state);
      this.addLog(`Turn ${state.turn}, Recovery Phase - Player ${state.currentPlayer}`);
      this.resetContextForPhaseChange();
      this.callOnEnter(nextState.phase);

      return this.successResult(true);
    }

    // Handle new turn
    if (isNewTurn(currentState, nextState)) {
      state.turn = nextState.turn;
      state.phase = nextState.phase;
      state.currentPlayer = nextState.currentPlayer;
      resetWarriorFlags(state);
      this.addLog(`Turn ${state.turn}, Recovery Phase - Player ${state.currentPlayer}`);
      this.resetContextForPhaseChange();
      this.callOnEnter(nextState.phase);

      return this.successResult(true);
    }

    // Regular phase/player transition
    state.phase = nextState.phase;
    state.currentPlayer = nextState.currentPlayer;
    this.addLog(`Turn ${state.turn}, ${getPhaseName(state.phase)} - Player ${state.currentPlayer}`);
    this.resetContextForPhaseChange();
    this.callOnEnter(nextState.phase);

    return this.successResult(true);
  }

  private resetContextForPhaseChange(): void {
    this.context.selectedWarriorId = null;
    this.context.selectedTargetId = null;
    this.context.subState = 'main';
    this.context.pendingResolution = null;
    this.context.pendingRoutTest = null;
  }

  private callOnEnter(phase: GameState['phase']): void {
    const phaseModule = this.phases.get(phase);
    if (phaseModule?.onEnter) {
      const updates = phaseModule.onEnter(this.state!, this.context);
      if (updates) {
        Object.assign(this.context, updates);
      }
    }
  }

  // =====================================
  // UNDO
  // =====================================

  private handleUndo(event: UndoEvent): ProcessResult {
    const { toEventId } = event.payload;

    if (!this.initialWarband1 || !this.initialWarband2 || !this.initialScenario) {
      return this.errorResult('Cannot undo: no initial state available');
    }

    // Find target event
    const targetIndex = this.history.findIndex(e => e.id === toEventId);
    if (targetIndex === -1) {
      return this.errorResult('Cannot undo: target event not found');
    }

    // Get events to replay
    const eventsToReplay = this.history.slice(0, targetIndex + 1);

    // Reset to initial state
    this.state = createGameState(
      JSON.parse(JSON.stringify(this.initialWarband1)),
      JSON.parse(JSON.stringify(this.initialWarband2)),
      this.initialScenario
    );
    this.history = [];
    this.context = createPhaseContext();

    // Replay events
    for (const eventToReplay of eventsToReplay) {
      const result = this.processEvent(eventToReplay);
      if (!result.success) {
        return this.errorResult(`Undo failed during replay: ${result.error}`);
      }
    }

    return this.successResult(true);
  }

  undoToEvent(eventId: string): ProcessResult {
    const undoEvent: UndoEvent = {
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      playerId: 'system',
      type: 'UNDO',
      payload: { toEventId: eventId }
    };
    return this.processEvent(undoEvent);
  }

  undoLastEvents(count: number): ProcessResult {
    if (count <= 0) {
      return this.errorResult('Count must be positive');
    }

    if (this.history.length < count) {
      return this.errorResult(`Cannot undo ${count} events: only ${this.history.length} in history`);
    }

    if (this.history.length === count) {
      return this.resetToInitialState();
    }

    const targetIndex = this.history.length - count - 1;
    const targetEventId = this.history[targetIndex].id;
    return this.undoToEvent(targetEventId);
  }

  resetToInitialState(): ProcessResult {
    if (!this.initialWarband1 || !this.initialWarband2 || !this.initialScenario) {
      return this.errorResult('Cannot reset: no initial state available');
    }

    this.state = createGameState(
      JSON.parse(JSON.stringify(this.initialWarband1)),
      JSON.parse(JSON.stringify(this.initialWarband2)),
      this.initialScenario
    );
    this.history = [];
    this.context = createPhaseContext();

    return this.successResult(true);
  }

  // =====================================
  // SCREEN GENERATION
  // =====================================

  getCurrentScreen(): ScreenCommand {
    if (!this.state) {
      return this.buildErrorScreen('No active game');
    }

    // Check for game over
    if (this.state.ended) {
      return this.buildGameOverScreen();
    }

    // Delegate to phase module
    const phaseModule = this.phases.get(this.state.phase);
    if (!phaseModule) {
      return this.buildErrorScreen(`No module for phase: ${this.state.phase}`);
    }

    return phaseModule.buildScreen(this.state, this.context);
  }

  private buildGameOverScreen(): ScreenCommand {
    const state = this.state!;

    return {
      screen: 'GAME_OVER',
      data: {
        winner: state.winner,
        winnerName: state.winner
          ? state.warbands[state.winner - 1].name
          : null,
        reason: (state.endReason as 'rout' | 'objective' | 'elimination' | 'voluntary' | 'draw') ?? 'draw',
        gameLog: state.log,
        statistics: {
          turns: state.turn,
          warband1OutOfAction: state.warbands[0].outOfActionCount,
          warband2OutOfAction: state.warbands[1].outOfActionCount
        }
      },
      availableEvents: [],
      turn: state.turn,
      phase: state.phase,
      currentPlayer: state.currentPlayer,
      gameId: state.id
    };
  }

  private buildErrorScreen(message: string): ScreenCommand {
    return {
      screen: 'ERROR',
      data: { message },
      availableEvents: [],
      turn: 0,
      phase: 'setup',
      currentPlayer: 1,
      gameId: ''
    };
  }

  // =====================================
  // ACCESSORS
  // =====================================

  getState(): GameState | null {
    return this.state;
  }

  getHistory(): GameEvent[] {
    return [...this.history];
  }

  getContext(): PhaseContext {
    return { ...this.context };
  }

  // =====================================
  // SERIALIZATION
  // =====================================

  serialize(): SerializedGame {
    return {
      state: this.state!,
      history: [...this.history]
    };
  }

  // =====================================
  // HELPERS
  // =====================================

  private addLog(message: string): void {
    if (!this.state) return;

    this.state.log.push({
      turn: this.state.turn,
      phase: this.state.phase,
      player: this.state.currentPlayer,
      message,
      timestamp: new Date().toISOString()
    });
  }

  private successResult(stateChanged: boolean): ProcessResult {
    return {
      success: true,
      stateChanged,
      screenCommand: this.getCurrentScreen()
    };
  }

  private errorResult(error: string): ProcessResult {
    return {
      success: false,
      error,
      stateChanged: false,
      screenCommand: this.getCurrentScreen()
    };
  }
}

export default PhaseCoordinator;
