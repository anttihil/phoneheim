// Bot Implementation for Headless Game Operation
//
// Provides AI/bot functionality that can:
// - Play complete games autonomously
// - Be used for testing game mechanics
// - Serve as example implementation for external bots/agents

import { PhaseCoordinator } from '../engine';
import type { IGameEngine } from '../engine/types/engine';
import type { GameEvent } from '../engine/types/events';
import type { ScreenCommand } from '../engine/types/screens';
import type { GameState } from '../types/game';
import type { Warband } from '../types/warband';

// Bot configuration
export interface BotConfig {
  // Bot player number (1 or 2)
  playerNumber: 1 | 2;
  // Strategy to use
  strategy: 'random' | 'defensive' | 'aggressive' | 'custom';
  // Custom decision function (when strategy is 'custom')
  customDecision?: (screen: ScreenCommand, state: GameState) => GameEvent | null;
  // Delay between moves (ms) - for pacing
  moveDelay: number;
  // Maximum turns before declaring a draw
  maxTurns: number;
  // Whether to log decisions
  verbose: boolean;
}

const DEFAULT_BOT_CONFIG: BotConfig = {
  playerNumber: 2,
  strategy: 'random',
  moveDelay: 0,
  maxTurns: 100,
  verbose: false
};

// Game result
export interface GameResult {
  winner: 1 | 2 | null;
  reason: string;
  turns: number;
  eventCount: number;
  history: GameEvent[];
}

/**
 * SimpleBot provides basic AI for playing the game.
 */
export class SimpleBot {
  private config: BotConfig;
  private eventIdCounter = 0;

  constructor(config: Partial<BotConfig> = {}) {
    this.config = { ...DEFAULT_BOT_CONFIG, ...config };
  }

  /**
   * Make a decision for the current screen.
   * Returns null if no valid action can be determined.
   */
  decide(screen: ScreenCommand, state: GameState): GameEvent | null {
    // Use custom decision if provided
    if (this.config.strategy === 'custom' && this.config.customDecision) {
      return this.config.customDecision(screen, state);
    }

    // Check if it's our turn
    if (state.currentPlayer !== this.config.playerNumber) {
      return null;
    }

    // Apply strategy
    switch (this.config.strategy) {
      case 'aggressive':
        return this.aggressiveDecision(screen, state);
      case 'defensive':
        return this.defensiveDecision(screen, state);
      case 'random':
      default:
        return this.randomDecision(screen, state);
    }
  }

  /**
   * Random strategy: Makes random valid moves.
   */
  private randomDecision(screen: ScreenCommand, _state: GameState): GameEvent | null {
    const availableEvents = screen.availableEvents;

    switch (screen.screen) {
      case 'GAME_SETUP':
        return this.handleSetup(screen, availableEvents);

      case 'RECOVERY_PHASE':
        return this.handleRecovery(screen, availableEvents);

      case 'MOVEMENT_PHASE':
        return this.handleMovement(screen, availableEvents);

      case 'SHOOTING_PHASE':
        return this.handleShootingPhase(screen, availableEvents);

      case 'SHOOTING_TARGET_SELECT':
        return this.handleShootingTargetSelect(screen, availableEvents);

      case 'SHOOTING_CONFIRM':
        return this.handleShootingConfirm(screen, availableEvents);

      case 'COMBAT_PHASE':
        return this.handleCombat(screen, availableEvents);

      case 'COMBAT_RESOLUTION':
      case 'ROUT_TEST_RESULT':
        return this.createEvent('ACKNOWLEDGE', {});

      case 'ROUT_TEST':
        return this.createEvent('CONFIRM_ROUT_TEST', {});

      case 'GAME_OVER':
        return null;

      default:
        // Try to advance phase if possible
        if (availableEvents.includes('ADVANCE_PHASE')) {
          return this.createEvent('ADVANCE_PHASE', {});
        }
        return null;
    }
  }

  /**
   * Aggressive strategy: Prioritizes attacks.
   */
  private aggressiveDecision(screen: ScreenCommand, state: GameState): GameEvent | null {
    // For movement phase, prioritize charges
    if (screen.screen === 'MOVEMENT_PHASE') {
      const data = screen.data as {
        selectedWarrior?: { id: string } | null;
        chargeTargets?: Array<{ id: string }>;
        actableWarriors?: Array<{ id: string }>;
      };

      // If warrior is selected and can charge, charge
      if (data.selectedWarrior && data.chargeTargets && data.chargeTargets.length > 0) {
        const target = data.chargeTargets[0];
        return this.createEvent('CONFIRM_CHARGE', { targetId: target.id });
      }

      // Find warriors that can charge
      const actable = data.actableWarriors ?? [];
      for (const warrior of actable) {
        // Select the warrior to see if they can charge
        return this.createEvent('SELECT_WARRIOR', { warriorId: warrior.id });
      }
    }

    // For shooting, always shoot if possible
    if (screen.screen === 'SHOOTING_TARGET_SELECT') {
      const data = screen.data as { validTargets?: Array<{ id: string }> };
      const targets = data.validTargets ?? [];
      if (targets.length > 0) {
        return this.createEvent('SELECT_TARGET', { targetId: targets[0].id });
      }
    }

    // Fall back to random for other decisions
    return this.randomDecision(screen, state);
  }

  /**
   * Defensive strategy: Prioritizes safety.
   */
  private defensiveDecision(screen: ScreenCommand, state: GameState): GameEvent | null {
    // For movement, prefer moving over running (preserves shooting)
    if (screen.screen === 'MOVEMENT_PHASE') {
      const data = screen.data as {
        selectedWarrior?: { id: string } | null;
        actableWarriors?: Array<{ id: string }>;
      };

      if (data.selectedWarrior) {
        return this.createEvent('CONFIRM_MOVE', { moveType: 'move' });
      }

      const actable = data.actableWarriors ?? [];
      if (actable.length > 0) {
        return this.createEvent('SELECT_WARRIOR', { warriorId: actable[0].id });
      }
    }

    // Fall back to random for other decisions
    return this.randomDecision(screen, state);
  }

  // =====================================
  // SCREEN HANDLERS
  // =====================================

  private handleSetup(screen: ScreenCommand, availableEvents: string[]): GameEvent | null {
    const data = screen.data as {
      warriorsToPosition?: Array<{ id: string }>;
      selectedWarrior?: { id: string } | null;
    };

    // If a warrior is selected, confirm their position
    if (data.selectedWarrior) {
      return this.createEvent('CONFIRM_POSITION', {});
    }

    // If warriors need positioning, select the first one
    const warriors = data.warriorsToPosition ?? [];
    if (warriors.length > 0) {
      return this.createEvent('SELECT_WARRIOR', { warriorId: warriors[0].id });
    }

    // All positioned, advance phase
    if (availableEvents.includes('ADVANCE_PHASE')) {
      return this.createEvent('ADVANCE_PHASE', {});
    }

    return null;
  }

  private handleRecovery(screen: ScreenCommand, _availableEvents: string[]): GameEvent | null {
    const data = screen.data as {
      fleeingWarriors?: Array<{ id: string }>;
      stunnedWarriors?: Array<{ id: string }>;
      knockedDownWarriors?: Array<{ id: string; inCombat?: boolean }>;
    };

    // Rally fleeing warriors
    if (data.fleeingWarriors && data.fleeingWarriors.length > 0) {
      return this.createEvent('RECOVERY_ACTION', {
        action: 'rally',
        warriorId: data.fleeingWarriors[0].id
      });
    }

    // Recover stunned warriors
    if (data.stunnedWarriors && data.stunnedWarriors.length > 0) {
      return this.createEvent('RECOVERY_ACTION', {
        action: 'recoverFromStunned',
        warriorId: data.stunnedWarriors[0].id
      });
    }

    // Stand up knocked down warriors (only those not in combat)
    if (data.knockedDownWarriors && data.knockedDownWarriors.length > 0) {
      const canStandUp = data.knockedDownWarriors.find(w => !w.inCombat);
      if (canStandUp) {
        return this.createEvent('RECOVERY_ACTION', {
          action: 'standUp',
          warriorId: canStandUp.id
        });
      }
    }

    // Advance phase
    return this.createEvent('ADVANCE_PHASE', {});
  }

  private handleMovement(screen: ScreenCommand, _availableEvents: string[]): GameEvent | null {
    const data = screen.data as {
      actableWarriors?: Array<{ id: string }>;
      selectedWarrior?: { id: string } | null;
      chargeTargets?: Array<{ id: string }>;
    };

    // If warrior is selected, decide action
    if (data.selectedWarrior) {
      // Try charge if targets available
      if (data.chargeTargets && data.chargeTargets.length > 0) {
        const target = this.randomChoice(data.chargeTargets);
        return this.createEvent('CONFIRM_CHARGE', { targetId: target.id });
      }

      // Otherwise move or run
      const moveType = Math.random() > 0.3 ? 'move' : 'run';
      return this.createEvent('CONFIRM_MOVE', { moveType });
    }

    // Select a warrior that can act
    const actable = data.actableWarriors ?? [];
    if (actable.length > 0) {
      const warrior = this.randomChoice(actable);
      return this.createEvent('SELECT_WARRIOR', { warriorId: warrior.id });
    }

    // No more warriors to act, advance phase
    return this.createEvent('ADVANCE_PHASE', {});
  }

  private handleShootingPhase(screen: ScreenCommand, _availableEvents: string[]): GameEvent | null {
    const data = screen.data as { actableWarriors?: Array<{ id: string }> };
    const actable = data.actableWarriors ?? [];

    if (actable.length > 0) {
      const warrior = this.randomChoice(actable);
      return this.createEvent('SELECT_WARRIOR', { warriorId: warrior.id });
    }

    return this.createEvent('ADVANCE_PHASE', {});
  }

  private handleShootingTargetSelect(screen: ScreenCommand, _availableEvents: string[]): GameEvent | null {
    const data = screen.data as { validTargets?: Array<{ id: string }> };
    const targets = data.validTargets ?? [];

    if (targets.length > 0) {
      const target = this.randomChoice(targets);
      return this.createEvent('SELECT_TARGET', { targetId: target.id });
    }

    return this.createEvent('DESELECT', {});
  }

  private handleShootingConfirm(screen: ScreenCommand, _availableEvents: string[]): GameEvent | null {
    const data = screen.data as { target?: { id: string } };

    if (data.target) {
      return this.createEvent('CONFIRM_SHOT', { targetId: data.target.id });
    }

    return this.createEvent('DESELECT', {});
  }

  private handleCombat(screen: ScreenCommand, availableEvents: string[]): GameEvent | null {
    const data = screen.data as {
      currentFighter?: { warriorId: string };
      meleeTargets?: Array<{ id: string }>;
    };

    if (data.currentFighter && data.meleeTargets && data.meleeTargets.length > 0) {
      const target = this.randomChoice(data.meleeTargets);
      return this.createEvent('CONFIRM_MELEE', {
        targetId: target.id,
        weaponKey: 'sword'
      });
    }

    if (availableEvents.includes('ADVANCE_PHASE')) {
      return this.createEvent('ADVANCE_PHASE', {});
    }

    return null;
  }

  // =====================================
  // HELPERS
  // =====================================

  private createEvent(type: string, payload: unknown): GameEvent {
    return {
      id: `bot-${++this.eventIdCounter}`,
      timestamp: new Date().toISOString(),
      playerId: `bot_player${this.config.playerNumber}`,
      type,
      payload
    } as GameEvent;
  }

  private randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}

/**
 * Run a complete game with two bots.
 */
export async function runBotGame(
  warband1: Warband,
  warband2: Warband,
  scenario: string = 'skirmish',
  bot1Config: Partial<BotConfig> = {},
  bot2Config: Partial<BotConfig> = {}
): Promise<GameResult> {
  const engine: IGameEngine = new PhaseCoordinator();
  engine.createGame(warband1, warband2, scenario);

  const bot1 = new SimpleBot({ ...bot1Config, playerNumber: 1 });
  const bot2 = new SimpleBot({ ...bot2Config, playerNumber: 2 });

  const maxTurns = Math.max(
    bot1Config.maxTurns ?? DEFAULT_BOT_CONFIG.maxTurns,
    bot2Config.maxTurns ?? DEFAULT_BOT_CONFIG.maxTurns
  );

  let iterations = 0;
  const maxIterations = maxTurns * 100; // Safety limit

  while (iterations < maxIterations) {
    iterations++;

    const state = engine.getState();
    if (!state) break;

    // Check for game end
    if (state.ended) {
      return {
        winner: state.winner,
        reason: 'Game ended normally',
        turns: state.turn,
        eventCount: engine.getHistory().length,
        history: engine.getHistory()
      };
    }

    // Check turn limit
    if (state.turn > maxTurns) {
      return {
        winner: null,
        reason: 'Maximum turns exceeded',
        turns: state.turn,
        eventCount: engine.getHistory().length,
        history: engine.getHistory()
      };
    }

    // Get current screen
    const screen = engine.getCurrentScreen();

    // Decide which bot plays
    const currentBot = state.currentPlayer === 1 ? bot1 : bot2;

    // Get bot's decision
    const event = currentBot.decide(screen, state);

    if (!event) {
      // No valid action, try to advance phase
      const advanceEvent: GameEvent = {
        id: `sys-${iterations}`,
        timestamp: new Date().toISOString(),
        playerId: `player${state.currentPlayer}`,
        type: 'ADVANCE_PHASE',
        payload: {}
      } as GameEvent;

      const result = engine.processEvent(advanceEvent);
      if (!result.success) {
        // Stuck - break to prevent infinite loop
        return {
          winner: null,
          reason: 'Game stuck - no valid actions',
          turns: state.turn,
          eventCount: engine.getHistory().length,
          history: engine.getHistory()
        };
      }
      continue;
    }

    // Process the event
    const result = engine.processEvent(event);

    if (!result.success) {
      // Log error and continue
      console.error(`Bot event failed: ${result.error}`);
    }

    // Add delay if configured
    const delay = state.currentPlayer === 1
      ? (bot1Config.moveDelay ?? 0)
      : (bot2Config.moveDelay ?? 0);

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Max iterations reached
  const state = engine.getState();
  return {
    winner: null,
    reason: 'Maximum iterations exceeded',
    turns: state?.turn ?? 0,
    eventCount: engine.getHistory().length,
    history: engine.getHistory()
  };
}

/**
 * Simulate multiple games and return statistics.
 */
export async function simulateGames(
  warband1: Warband,
  warband2: Warband,
  gameCount: number = 10,
  scenario: string = 'skirmish',
  bot1Config: Partial<BotConfig> = {},
  bot2Config: Partial<BotConfig> = {}
): Promise<{
  player1Wins: number;
  player2Wins: number;
  draws: number;
  averageTurns: number;
  averageEvents: number;
}> {
  let player1Wins = 0;
  let player2Wins = 0;
  let draws = 0;
  let totalTurns = 0;
  let totalEvents = 0;

  for (let i = 0; i < gameCount; i++) {
    const result = await runBotGame(warband1, warband2, scenario, bot1Config, bot2Config);

    if (result.winner === 1) player1Wins++;
    else if (result.winner === 2) player2Wins++;
    else draws++;

    totalTurns += result.turns;
    totalEvents += result.eventCount;
  }

  return {
    player1Wins,
    player2Wins,
    draws,
    averageTurns: totalTurns / gameCount,
    averageEvents: totalEvents / gameCount
  };
}
