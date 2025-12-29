// LocalAdapter - Single-player and AI mode support
//
// This adapter provides:
// - Single-player hotseat mode (two players on same device)
// - AI opponent integration (future)
// - Headless operation for testing and bots

import type { GameEvent } from '../phases/types/events';
import type { ScreenCommand } from '../phases/types/screens';
import type { GameState } from '../types/game';

// AI decision callback type
export type AIDecisionCallback = (
  screen: ScreenCommand,
  state: GameState,
  availableEvents: string[]
) => GameEvent | null;

// AI configuration
export interface AIConfig {
  // Delay before AI makes a move (ms)
  thinkingDelay: number;
  // AI difficulty/strategy identifier
  strategy: 'random' | 'defensive' | 'aggressive' | 'balanced';
  // Custom decision function (overrides strategy)
  customDecision?: AIDecisionCallback;
}

const DEFAULT_AI_CONFIG: AIConfig = {
  thinkingDelay: 1000,
  strategy: 'random'
};

/**
 * LocalAdapter provides single-player and AI functionality
 * without network communication.
 */
export class LocalAdapter {
  private aiEnabled: boolean = false;
  private aiConfig: AIConfig = DEFAULT_AI_CONFIG;
  private aiPlayerNumber: 1 | 2 = 2; // AI plays as player 2 by default
  private decisionCallback: AIDecisionCallback | null = null;
  private pendingDecision: ReturnType<typeof setTimeout> | null = null;

  // Callback to submit AI decisions
  private submitEventCallback: ((event: Omit<GameEvent, 'id' | 'timestamp' | 'playerId'>) => void) | null = null;

  // =====================================
  // CONFIGURATION
  // =====================================

  /**
   * Enable AI opponent.
   */
  enableAI(config?: Partial<AIConfig>, playerNumber: 1 | 2 = 2): void {
    this.aiEnabled = true;
    this.aiConfig = { ...DEFAULT_AI_CONFIG, ...config };
    this.aiPlayerNumber = playerNumber;

    if (config?.customDecision) {
      this.decisionCallback = config.customDecision;
    } else {
      this.decisionCallback = this.createStrategyDecision(this.aiConfig.strategy);
    }
  }

  /**
   * Disable AI opponent.
   */
  disableAI(): void {
    this.aiEnabled = false;
    this.cancelPendingDecision();
  }

  /**
   * Check if AI is enabled.
   */
  isAIEnabled(): boolean {
    return this.aiEnabled;
  }

  /**
   * Get the AI player number.
   */
  getAIPlayerNumber(): 1 | 2 {
    return this.aiPlayerNumber;
  }

  /**
   * Set the callback for submitting AI events.
   */
  setEventSubmitter(callback: (event: Omit<GameEvent, 'id' | 'timestamp' | 'playerId'>) => void): void {
    this.submitEventCallback = callback;
  }

  // =====================================
  // AI DECISION MAKING
  // =====================================

  /**
   * Called when it's the AI's turn.
   * Schedules an AI decision after the thinking delay.
   */
  onAITurn(screen: ScreenCommand, state: GameState): void {
    if (!this.aiEnabled || !this.submitEventCallback) {
      return;
    }

    // Cancel any pending decision
    this.cancelPendingDecision();

    // Schedule the decision
    this.pendingDecision = setTimeout(() => {
      this.makeDecision(screen, state);
    }, this.aiConfig.thinkingDelay);
  }

  /**
   * Cancel any pending AI decision.
   */
  cancelPendingDecision(): void {
    if (this.pendingDecision) {
      clearTimeout(this.pendingDecision);
      this.pendingDecision = null;
    }
  }

  /**
   * Make an immediate AI decision (for testing).
   */
  makeImmediateDecision(screen: ScreenCommand, state: GameState): GameEvent | null {
    if (!this.decisionCallback) {
      return null;
    }
    return this.decisionCallback(screen, state, screen.availableEvents);
  }

  // =====================================
  // PRIVATE HELPERS
  // =====================================

  private makeDecision(screen: ScreenCommand, state: GameState): void {
    if (!this.decisionCallback || !this.submitEventCallback) {
      return;
    }

    const event = this.decisionCallback(screen, state, screen.availableEvents);
    if (event) {
      this.submitEventCallback({
        type: event.type,
        payload: event.payload
      });
    }
  }

  private createStrategyDecision(strategy: AIConfig['strategy']): AIDecisionCallback {
    switch (strategy) {
      case 'random':
        return this.randomStrategy.bind(this);
      case 'defensive':
        return this.defensiveStrategy.bind(this);
      case 'aggressive':
        return this.aggressiveStrategy.bind(this);
      case 'balanced':
      default:
        return this.balancedStrategy.bind(this);
    }
  }

  /**
   * Random strategy: Makes random valid moves.
   * Simple but useful for testing.
   */
  private randomStrategy(
    screen: ScreenCommand,
    state: GameState,
    availableEvents: string[]
  ): GameEvent | null {
    // Handle different screen types
    switch (screen.screen) {
      case 'GAME_SETUP':
        return this.makeSetupDecision(screen);
      case 'RECOVERY_PHASE':
        return this.makeRecoveryDecision(screen);
      case 'MOVEMENT_PHASE':
        return this.makeMovementDecision(screen);
      case 'SHOOTING_PHASE':
      case 'SHOOTING_TARGET_SELECT':
      case 'SHOOTING_CONFIRM':
        return this.makeShootingDecision(screen);
      case 'COMBAT_PHASE':
        return this.makeCombatDecision(screen);
      case 'COMBAT_RESOLUTION':
      case 'ROUT_TEST_RESULT':
        // Acknowledge and continue
        if (availableEvents.includes('ACKNOWLEDGE')) {
          return this.createEventStub('ACKNOWLEDGE', {});
        }
        break;
      case 'ROUT_TEST':
        if (availableEvents.includes('CONFIRM_ROUT_TEST')) {
          return this.createEventStub('CONFIRM_ROUT_TEST', {});
        }
        break;
    }

    // Default: try to advance phase if possible
    if (availableEvents.includes('ADVANCE_PHASE')) {
      return this.createEventStub('ADVANCE_PHASE', {});
    }

    return null;
  }

  /**
   * Defensive strategy: Prioritizes defense and positioning.
   */
  private defensiveStrategy(
    screen: ScreenCommand,
    state: GameState,
    availableEvents: string[]
  ): GameEvent | null {
    // For now, fall back to random strategy
    // TODO: Implement proper defensive logic
    return this.randomStrategy(screen, state, availableEvents);
  }

  /**
   * Aggressive strategy: Prioritizes attacks and charges.
   */
  private aggressiveStrategy(
    screen: ScreenCommand,
    state: GameState,
    availableEvents: string[]
  ): GameEvent | null {
    // For now, fall back to random strategy
    // TODO: Implement proper aggressive logic
    return this.randomStrategy(screen, state, availableEvents);
  }

  /**
   * Balanced strategy: Mix of defensive and aggressive.
   */
  private balancedStrategy(
    screen: ScreenCommand,
    state: GameState,
    availableEvents: string[]
  ): GameEvent | null {
    // For now, fall back to random strategy
    // TODO: Implement proper balanced logic
    return this.randomStrategy(screen, state, availableEvents);
  }

  // =====================================
  // DECISION HELPERS
  // =====================================

  private makeSetupDecision(screen: ScreenCommand): GameEvent | null {
    const data = screen.data as { warriorsToPosition?: Array<{ id: string }> };
    const warriors = data.warriorsToPosition ?? [];
    if (warriors.length > 0) {
      // Select first unpositioned warrior and position them
      return this.createEventStub('SELECT_WARRIOR', { warriorId: warriors[0].id });
    }
    return this.createEventStub('ADVANCE_PHASE', {});
  }

  private makeRecoveryDecision(screen: ScreenCommand): GameEvent | null {
    const data = screen.data as {
      fleeingWarriors?: Array<{ id: string }>;
      stunnedWarriors?: Array<{ id: string }>;
      knockedDownWarriors?: Array<{ id: string }>;
    };

    // Rally fleeing warriors
    if (data.fleeingWarriors && data.fleeingWarriors.length > 0) {
      return this.createEventStub('RECOVERY_ACTION', {
        action: 'rally',
        warriorId: data.fleeingWarriors[0].id
      });
    }

    // Recover stunned warriors
    if (data.stunnedWarriors && data.stunnedWarriors.length > 0) {
      return this.createEventStub('RECOVERY_ACTION', {
        action: 'recoverFromStunned',
        warriorId: data.stunnedWarriors[0].id
      });
    }

    // Stand up knocked down warriors
    if (data.knockedDownWarriors && data.knockedDownWarriors.length > 0) {
      return this.createEventStub('RECOVERY_ACTION', {
        action: 'standUp',
        warriorId: data.knockedDownWarriors[0].id
      });
    }

    return this.createEventStub('ADVANCE_PHASE', {});
  }

  private makeMovementDecision(screen: ScreenCommand): GameEvent | null {
    const data = screen.data as {
      actableWarriors?: Array<{ id: string }>;
      selectedWarrior?: { id: string } | null;
      chargeTargets?: Array<{ id: string }>;
    };

    // If a warrior is selected, try to charge or move
    if (data.selectedWarrior) {
      // Try to charge if there are targets
      if (data.chargeTargets && data.chargeTargets.length > 0) {
        const target = data.chargeTargets[Math.floor(Math.random() * data.chargeTargets.length)];
        return this.createEventStub('CONFIRM_CHARGE', { targetId: target.id });
      }
      // Otherwise just move
      return this.createEventStub('CONFIRM_MOVE', { moveType: 'move' });
    }

    // Select a warrior that can act
    const actable = data.actableWarriors ?? [];
    if (actable.length > 0) {
      const warrior = actable[Math.floor(Math.random() * actable.length)];
      return this.createEventStub('SELECT_WARRIOR', { warriorId: warrior.id });
    }

    return this.createEventStub('ADVANCE_PHASE', {});
  }

  private makeShootingDecision(screen: ScreenCommand): GameEvent | null {
    switch (screen.screen) {
      case 'SHOOTING_PHASE': {
        const data = screen.data as { actableWarriors?: Array<{ id: string }> };
        const actable = data.actableWarriors ?? [];
        if (actable.length > 0) {
          const warrior = actable[Math.floor(Math.random() * actable.length)];
          return this.createEventStub('SELECT_WARRIOR', { warriorId: warrior.id });
        }
        return this.createEventStub('ADVANCE_PHASE', {});
      }
      case 'SHOOTING_TARGET_SELECT': {
        const data = screen.data as { validTargets?: Array<{ id: string }> };
        const targets = data.validTargets ?? [];
        if (targets.length > 0) {
          const target = targets[Math.floor(Math.random() * targets.length)];
          return this.createEventStub('SELECT_TARGET', { targetId: target.id });
        }
        return this.createEventStub('DESELECT', {});
      }
      case 'SHOOTING_CONFIRM': {
        const data = screen.data as { target?: { id: string } };
        if (data.target) {
          return this.createEventStub('CONFIRM_SHOT', { targetId: data.target.id });
        }
        return this.createEventStub('DESELECT', {});
      }
    }
    return null;
  }

  private makeCombatDecision(screen: ScreenCommand): GameEvent | null {
    const data = screen.data as {
      currentFighter?: { warriorId: string };
      meleeTargets?: Array<{ id: string }>;
    };

    if (data.currentFighter && data.meleeTargets && data.meleeTargets.length > 0) {
      const target = data.meleeTargets[Math.floor(Math.random() * data.meleeTargets.length)];
      return this.createEventStub('CONFIRM_MELEE', {
        targetId: target.id,
        weaponKey: 'sword' // Default weapon
      });
    }

    return this.createEventStub('ADVANCE_PHASE', {});
  }

  private createEventStub(type: string, payload: unknown): GameEvent {
    return {
      id: '',
      timestamp: '',
      playerId: '',
      type,
      payload
    } as GameEvent;
  }
}

// Singleton instance
let localAdapterInstance: LocalAdapter | null = null;

/**
 * Get the singleton LocalAdapter instance.
 */
export function getLocalAdapter(): LocalAdapter {
  if (!localAdapterInstance) {
    localAdapterInstance = new LocalAdapter();
  }
  return localAdapterInstance;
}

/**
 * Create a new LocalAdapter instance (for testing).
 */
export function createLocalAdapter(): LocalAdapter {
  return new LocalAdapter();
}
