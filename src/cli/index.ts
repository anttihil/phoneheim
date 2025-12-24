// CLI Interface for Headless Game Operation
//
// Provides a command-line interface for:
// - Running games without UI (for testing, bots, agents)
// - Interactive game sessions
// - Automated game simulations
// - JSON-based input/output for integration

import { GameEngine } from '../engine';
import type { GameEvent } from '../engine/types/events';
import type { ScreenCommand } from '../engine/types/screens';
import type { Warband } from '../types/warband';
import type { GameState } from '../types/game';

// CLI options
export interface CLIOptions {
  // Input mode: 'interactive' for stdin, 'json' for JSON commands
  inputMode: 'interactive' | 'json';
  // Output mode: 'pretty' for human-readable, 'json' for machine-readable
  outputMode: 'pretty' | 'json';
  // Whether to auto-advance when there's only one valid action
  autoAdvance: boolean;
  // Delay between auto-advances (ms)
  autoAdvanceDelay: number;
}

const DEFAULT_OPTIONS: CLIOptions = {
  inputMode: 'interactive',
  outputMode: 'pretty',
  autoAdvance: false,
  autoAdvanceDelay: 500
};

/**
 * GameCLI provides a command-line interface to the game engine.
 */
export class GameCLI {
  private engine: GameEngine;
  private options: CLIOptions;

  constructor(options: Partial<CLIOptions> = {}) {
    this.engine = new GameEngine();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // =====================================
  // GAME LIFECYCLE
  // =====================================

  /**
   * Create a new game with the given warbands and scenario.
   */
  createGame(warband1: Warband, warband2: Warband, scenario: string = 'skirmish'): ScreenCommand {
    this.engine.createGame(warband1, warband2, scenario);
    return this.engine.getCurrentScreen();
  }

  /**
   * Load a game from saved state.
   */
  loadGame(state: GameState, history: GameEvent[]): ScreenCommand {
    this.engine.loadGame(state, history);
    return this.engine.getCurrentScreen();
  }

  // =====================================
  // EVENT SUBMISSION
  // =====================================

  /**
   * Submit an event to the game engine.
   * Returns the result and new screen command.
   */
  submitEvent(event: GameEvent): { success: boolean; error?: string; screen: ScreenCommand } {
    const result = this.engine.processEvent(event);
    return {
      success: result.success,
      error: result.error,
      screen: result.screenCommand
    };
  }

  /**
   * Submit an event using just type and payload (creates full event).
   */
  submitAction(
    type: string,
    payload: unknown,
    playerId: string = 'cli_player'
  ): { success: boolean; error?: string; screen: ScreenCommand } {
    const event: GameEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      playerId,
      type,
      payload
    } as GameEvent;

    return this.submitEvent(event);
  }

  // =====================================
  // STATE ACCESS
  // =====================================

  /**
   * Get the current screen command.
   */
  getScreen(): ScreenCommand {
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
   * Get available events for the current screen.
   */
  getAvailableEvents(): string[] {
    const screen = this.engine.getCurrentScreen();
    return screen.availableEvents;
  }

  // =====================================
  // UNDO OPERATIONS
  // =====================================

  /**
   * Undo to a specific event.
   */
  undoToEvent(eventId: string): ScreenCommand {
    const result = this.engine.undoToEvent(eventId);
    return result.screenCommand;
  }

  /**
   * Undo the last N events.
   */
  undoLastEvents(count: number): ScreenCommand {
    const result = this.engine.undoLastEvents(count);
    return result.screenCommand;
  }

  /**
   * Reset to initial state.
   */
  resetGame(): ScreenCommand {
    const result = this.engine.resetToInitialState();
    return result.screenCommand;
  }

  // =====================================
  // OUTPUT FORMATTING
  // =====================================

  /**
   * Format a screen command for output.
   */
  formatScreen(screen: ScreenCommand): string {
    if (this.options.outputMode === 'json') {
      return JSON.stringify(screen, null, 2);
    }
    return this.formatPrettyScreen(screen);
  }

  /**
   * Format the game state for output.
   */
  formatState(state: GameState): string {
    if (this.options.outputMode === 'json') {
      return JSON.stringify(state, null, 2);
    }
    return this.formatPrettyState(state);
  }

  /**
   * Print the current screen to stdout.
   */
  printScreen(): void {
    const screen = this.getScreen();
    console.log(this.formatScreen(screen));
  }

  /**
   * Print the current state to stdout.
   */
  printState(): void {
    const state = this.getState();
    if (state) {
      console.log(this.formatState(state));
    } else {
      console.log('No active game');
    }
  }

  // =====================================
  // SERIALIZATION
  // =====================================

  /**
   * Serialize the current game for saving.
   */
  serialize(): { state: GameState; history: GameEvent[] } {
    return this.engine.serialize();
  }

  /**
   * Export the game as JSON string.
   */
  exportJSON(): string {
    return JSON.stringify(this.serialize(), null, 2);
  }

  // =====================================
  // PRIVATE HELPERS
  // =====================================

  private eventIdCounter = 0;

  private generateEventId(): string {
    return `cli-${Date.now()}-${++this.eventIdCounter}`;
  }

  private formatPrettyScreen(screen: ScreenCommand): string {
    const lines: string[] = [];
    lines.push('='.repeat(50));
    lines.push(`Screen: ${screen.screen}`);
    lines.push(`Phase: ${screen.phase ?? 'N/A'}`);
    lines.push(`Turn: ${screen.turn ?? 'N/A'}`);
    lines.push(`Current Player: ${screen.currentPlayer ?? 'N/A'}`);
    lines.push('-'.repeat(50));

    // Format screen-specific data
    lines.push('Data:');
    lines.push(this.formatData(screen.data, 2));

    lines.push('-'.repeat(50));
    lines.push(`Available Events: ${screen.availableEvents.join(', ')}`);
    lines.push('='.repeat(50));

    return lines.join('\n');
  }

  private formatPrettyState(state: GameState): string {
    const lines: string[] = [];
    lines.push('='.repeat(50));
    lines.push('GAME STATE');
    lines.push('-'.repeat(50));
    lines.push(`Scenario: ${state.scenario}`);
    lines.push(`Turn: ${state.turn}`);
    lines.push(`Phase: ${state.phase}`);
    lines.push(`Current Player: ${state.currentPlayer}`);
    lines.push(`Ended: ${state.ended}`);
    if (state.winner) {
      lines.push(`Winner: Player ${state.winner}`);
    }
    lines.push('-'.repeat(50));

    // Format warbands
    for (let i = 0; i < state.warbands.length; i++) {
      const wb = state.warbands[i];
      lines.push(`\n${wb.name} (Player ${i + 1}):`);
      lines.push(`  Out of Action: ${wb.outOfActionCount}`);
      lines.push(`  Rout Failed: ${wb.routFailed}`);
      lines.push('  Warriors:');

      for (const w of wb.warriors) {
        const status = w.gameStatus.toUpperCase();
        const wounds = `${w.woundsRemaining}/${w.profile.W}`;
        const flags: string[] = [];
        if (w.hasMoved) flags.push('Moved');
        if (w.hasRun) flags.push('Ran');
        if (w.hasShot) flags.push('Shot');
        if (w.hasCharged) flags.push('Charged');
        if (w.combatState.inCombat) flags.push('In Combat');
        if (w.combatState.inCover) flags.push('In Cover');

        const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
        lines.push(`    - ${w.name || w.type}: ${status} (W: ${wounds})${flagStr}`);
      }
    }

    lines.push('='.repeat(50));
    return lines.join('\n');
  }

  private formatData(data: unknown, indent: number = 0): string {
    const prefix = ' '.repeat(indent);
    if (data === null || data === undefined) {
      return `${prefix}(empty)`;
    }
    if (typeof data !== 'object') {
      return `${prefix}${data}`;
    }
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return `${prefix}[]`;
      }
      return data.map((item, i) => `${prefix}[${i}]: ${this.formatData(item, indent + 2)}`).join('\n');
    }

    const lines: string[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null) {
        lines.push(`${prefix}${key}:`);
        lines.push(this.formatData(value, indent + 2));
      } else {
        lines.push(`${prefix}${key}: ${value}`);
      }
    }
    return lines.join('\n');
  }
}

// =====================================
// FACTORY FUNCTIONS
// =====================================

/**
 * Create a new GameCLI instance.
 */
export function createCLI(options?: Partial<CLIOptions>): GameCLI {
  return new GameCLI(options);
}

/**
 * Create a GameCLI configured for JSON input/output.
 */
export function createJSONCLI(): GameCLI {
  return new GameCLI({
    inputMode: 'json',
    outputMode: 'json'
  });
}

/**
 * Create a GameCLI configured for interactive use.
 */
export function createInteractiveCLI(): GameCLI {
  return new GameCLI({
    inputMode: 'interactive',
    outputMode: 'pretty'
  });
}
