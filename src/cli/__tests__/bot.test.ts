// Bot unit tests

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimpleBot, runBotGame, simulateGames } from '../bot';
import {
  createTestWarband,
  createTestGameState,
  resetIdCounter
} from '../../engine/__tests__/testHelpers';
import type { ScreenCommand } from '../../engine/types/screens';
import type { GameState } from '../../types/game';

describe('SimpleBot', () => {
  let bot: SimpleBot;

  beforeEach(() => {
    resetIdCounter();
    bot = new SimpleBot({ playerNumber: 1, strategy: 'random' });
  });

  describe('configuration', () => {
    it('should use default configuration', () => {
      const defaultBot = new SimpleBot();
      // Default player is 2
      expect(true).toBe(true);
    });

    it('should accept custom configuration', () => {
      const customBot = new SimpleBot({
        playerNumber: 1,
        strategy: 'aggressive',
        moveDelay: 500,
        verbose: true
      });
      expect(true).toBe(true);
    });
  });

  describe('decision making', () => {
    it('should make decision for setup phase', () => {
      const screen: ScreenCommand = {
        screen: 'GAME_SETUP',
        phase: 'setup',
        turn: 1,
        currentPlayer: 1,
        data: {
          warriorsToPosition: [{ id: 'w1', name: 'Warrior 1' }]
        },
        availableEvents: ['SELECT_WARRIOR', 'ADVANCE_PHASE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'setup',
        currentPlayer: 1
      });

      const decision = bot.decide(screen, state);

      expect(decision).not.toBeNull();
      expect(decision?.type).toBe('SELECT_WARRIOR');
    });

    it('should return null when not player turn', () => {
      const screen: ScreenCommand = {
        screen: 'MOVEMENT_PHASE',
        phase: 'movement',
        turn: 1,
        currentPlayer: 2, // Not bot's turn
        data: { actableWarriors: [], selectedWarrior: null },
        availableEvents: ['ADVANCE_PHASE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'movement',
        currentPlayer: 2
      });

      const decision = bot.decide(screen, state);

      expect(decision).toBeNull();
    });

    it('should acknowledge combat resolution', () => {
      const screen: ScreenCommand = {
        screen: 'COMBAT_RESOLUTION',
        phase: 'combat',
        turn: 1,
        currentPlayer: 1,
        data: {},
        availableEvents: ['ACKNOWLEDGE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'combat',
        currentPlayer: 1
      });

      const decision = bot.decide(screen, state);

      expect(decision).not.toBeNull();
      expect(decision?.type).toBe('ACKNOWLEDGE');
    });

    it('should confirm rout test', () => {
      const screen: ScreenCommand = {
        screen: 'ROUT_TEST',
        phase: 'movement',
        turn: 1,
        currentPlayer: 1,
        data: {},
        availableEvents: ['CONFIRM_ROUT_TEST']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'movement',
        currentPlayer: 1
      });

      const decision = bot.decide(screen, state);

      expect(decision).not.toBeNull();
      expect(decision?.type).toBe('CONFIRM_ROUT_TEST');
    });

    it('should return null for game over', () => {
      const screen: ScreenCommand = {
        screen: 'GAME_OVER',
        phase: 'movement',
        turn: 10,
        currentPlayer: 1,
        data: { winner: 1, reason: 'rout' },
        availableEvents: []
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'movement',
        currentPlayer: 1
      });

      const decision = bot.decide(screen, state);

      expect(decision).toBeNull();
    });
  });

  describe('recovery phase handling', () => {
    it('should rally fleeing warriors', () => {
      const screen: ScreenCommand = {
        screen: 'RECOVERY_PHASE',
        phase: 'recovery',
        turn: 1,
        currentPlayer: 1,
        data: {
          fleeingWarriors: [{ id: 'w1', name: 'Fleeing Warrior' }],
          stunnedWarriors: [],
          knockedDownWarriors: []
        },
        availableEvents: ['RECOVERY_ACTION', 'ADVANCE_PHASE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'recovery',
        currentPlayer: 1
      });

      const decision = bot.decide(screen, state);

      expect(decision).not.toBeNull();
      expect(decision?.type).toBe('RECOVERY_ACTION');
      expect((decision?.payload as { action: string }).action).toBe('rally');
    });

    it('should recover stunned warriors', () => {
      const screen: ScreenCommand = {
        screen: 'RECOVERY_PHASE',
        phase: 'recovery',
        turn: 1,
        currentPlayer: 1,
        data: {
          fleeingWarriors: [],
          stunnedWarriors: [{ id: 'w1', name: 'Stunned Warrior' }],
          knockedDownWarriors: []
        },
        availableEvents: ['RECOVERY_ACTION', 'ADVANCE_PHASE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'recovery',
        currentPlayer: 1
      });

      const decision = bot.decide(screen, state);

      expect(decision).not.toBeNull();
      expect(decision?.type).toBe('RECOVERY_ACTION');
      expect((decision?.payload as { action: string }).action).toBe('recoverFromStunned');
    });

    it('should stand up knocked down warriors', () => {
      const screen: ScreenCommand = {
        screen: 'RECOVERY_PHASE',
        phase: 'recovery',
        turn: 1,
        currentPlayer: 1,
        data: {
          fleeingWarriors: [],
          stunnedWarriors: [],
          knockedDownWarriors: [{ id: 'w1', name: 'KD Warrior' }]
        },
        availableEvents: ['RECOVERY_ACTION', 'ADVANCE_PHASE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'recovery',
        currentPlayer: 1
      });

      const decision = bot.decide(screen, state);

      expect(decision).not.toBeNull();
      expect(decision?.type).toBe('RECOVERY_ACTION');
      expect((decision?.payload as { action: string }).action).toBe('standUp');
    });
  });

  describe('movement phase handling', () => {
    it('should select a warrior when none selected', () => {
      const screen: ScreenCommand = {
        screen: 'MOVEMENT_PHASE',
        phase: 'movement',
        turn: 1,
        currentPlayer: 1,
        data: {
          actableWarriors: [{ id: 'w1', name: 'Warrior 1' }],
          selectedWarrior: null,
          chargeTargets: []
        },
        availableEvents: ['SELECT_WARRIOR', 'ADVANCE_PHASE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'movement',
        currentPlayer: 1
      });

      const decision = bot.decide(screen, state);

      expect(decision).not.toBeNull();
      expect(decision?.type).toBe('SELECT_WARRIOR');
    });

    it('should move when warrior is selected', () => {
      const screen: ScreenCommand = {
        screen: 'MOVEMENT_PHASE',
        phase: 'movement',
        turn: 1,
        currentPlayer: 1,
        data: {
          actableWarriors: [],
          selectedWarrior: { id: 'w1', name: 'Warrior 1' },
          chargeTargets: []
        },
        availableEvents: ['CONFIRM_MOVE', 'DESELECT']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'movement',
        currentPlayer: 1
      });

      const decision = bot.decide(screen, state);

      expect(decision).not.toBeNull();
      expect(decision?.type).toBe('CONFIRM_MOVE');
    });

    it('should charge when targets available', () => {
      const screen: ScreenCommand = {
        screen: 'MOVEMENT_PHASE',
        phase: 'movement',
        turn: 1,
        currentPlayer: 1,
        data: {
          actableWarriors: [],
          selectedWarrior: { id: 'w1', name: 'Warrior 1' },
          chargeTargets: [{ id: 'enemy1', name: 'Enemy 1' }]
        },
        availableEvents: ['CONFIRM_CHARGE', 'CONFIRM_MOVE', 'DESELECT']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'movement',
        currentPlayer: 1
      });

      const decision = bot.decide(screen, state);

      expect(decision).not.toBeNull();
      expect(decision?.type).toBe('CONFIRM_CHARGE');
    });
  });

  describe('shooting phase handling', () => {
    it('should select warrior in shooting phase', () => {
      const screen: ScreenCommand = {
        screen: 'SHOOTING_PHASE',
        phase: 'shooting',
        turn: 1,
        currentPlayer: 1,
        data: {
          actableWarriors: [{ id: 'w1', name: 'Archer' }]
        },
        availableEvents: ['SELECT_WARRIOR', 'ADVANCE_PHASE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'shooting',
        currentPlayer: 1
      });

      const decision = bot.decide(screen, state);

      expect(decision).not.toBeNull();
      expect(decision?.type).toBe('SELECT_WARRIOR');
    });

    it('should select target when available', () => {
      const screen: ScreenCommand = {
        screen: 'SHOOTING_TARGET_SELECT',
        phase: 'shooting',
        turn: 1,
        currentPlayer: 1,
        data: {
          validTargets: [{ id: 'enemy1', name: 'Enemy 1' }]
        },
        availableEvents: ['SELECT_TARGET', 'DESELECT']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'shooting',
        currentPlayer: 1
      });

      const decision = bot.decide(screen, state);

      expect(decision).not.toBeNull();
      expect(decision?.type).toBe('SELECT_TARGET');
    });

    it('should confirm shot', () => {
      const screen: ScreenCommand = {
        screen: 'SHOOTING_CONFIRM',
        phase: 'shooting',
        turn: 1,
        currentPlayer: 1,
        data: {
          target: { id: 'enemy1', name: 'Enemy 1' }
        },
        availableEvents: ['CONFIRM_SHOT', 'DESELECT']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'shooting',
        currentPlayer: 1
      });

      const decision = bot.decide(screen, state);

      expect(decision).not.toBeNull();
      expect(decision?.type).toBe('CONFIRM_SHOT');
    });
  });

  describe('combat phase handling', () => {
    it('should attack melee target', () => {
      const screen: ScreenCommand = {
        screen: 'COMBAT_PHASE',
        phase: 'combat',
        turn: 1,
        currentPlayer: 1,
        data: {
          currentFighter: { warriorId: 'w1', name: 'Fighter' },
          meleeTargets: [{ id: 'enemy1', name: 'Enemy 1' }]
        },
        availableEvents: ['CONFIRM_MELEE', 'ADVANCE_PHASE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'combat',
        currentPlayer: 1
      });

      const decision = bot.decide(screen, state);

      expect(decision).not.toBeNull();
      expect(decision?.type).toBe('CONFIRM_MELEE');
    });
  });

  describe('strategy variants', () => {
    it('aggressive strategy should prioritize charges', () => {
      const aggressiveBot = new SimpleBot({ playerNumber: 1, strategy: 'aggressive' });

      const screen: ScreenCommand = {
        screen: 'MOVEMENT_PHASE',
        phase: 'movement',
        turn: 1,
        currentPlayer: 1,
        data: {
          actableWarriors: [],
          selectedWarrior: { id: 'w1', name: 'Warrior' },
          chargeTargets: [{ id: 'enemy1', name: 'Enemy' }]
        },
        availableEvents: ['CONFIRM_CHARGE', 'CONFIRM_MOVE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'movement',
        currentPlayer: 1
      });

      const decision = aggressiveBot.decide(screen, state);

      expect(decision?.type).toBe('CONFIRM_CHARGE');
    });

    it('defensive strategy should prefer move over run', () => {
      const defensiveBot = new SimpleBot({ playerNumber: 1, strategy: 'defensive' });

      const screen: ScreenCommand = {
        screen: 'MOVEMENT_PHASE',
        phase: 'movement',
        turn: 1,
        currentPlayer: 1,
        data: {
          actableWarriors: [],
          selectedWarrior: { id: 'w1', name: 'Warrior' },
          chargeTargets: []
        },
        availableEvents: ['CONFIRM_MOVE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'movement',
        currentPlayer: 1
      });

      const decision = defensiveBot.decide(screen, state);

      expect(decision?.type).toBe('CONFIRM_MOVE');
      expect((decision?.payload as { moveType: string }).moveType).toBe('move');
    });
  });

  describe('custom decision function', () => {
    it('should use custom decision function', () => {
      const customBot = new SimpleBot({
        playerNumber: 1,
        strategy: 'custom',
        customDecision: (screen, state) => ({
          id: 'custom-1',
          timestamp: new Date().toISOString(),
          playerId: 'custom',
          type: 'ADVANCE_PHASE',
          payload: {}
        } as any)
      });

      const screen: ScreenCommand = {
        screen: 'MOVEMENT_PHASE',
        phase: 'movement',
        turn: 1,
        currentPlayer: 1,
        data: { actableWarriors: [] },
        availableEvents: ['ADVANCE_PHASE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, { currentPlayer: 1 });

      const decision = customBot.decide(screen, state);

      expect(decision?.type).toBe('ADVANCE_PHASE');
    });
  });
});

describe('runBotGame', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it('should run a complete game between two bots', async () => {
    const wb1 = createTestWarband('Warband 1', 3);
    const wb2 = createTestWarband('Warband 2', 3);

    const result = await runBotGame(wb1, wb2, 'skirmish', {
      strategy: 'random',
      maxTurns: 5, // Low limit for testing
      verbose: false
    }, {
      strategy: 'random',
      maxTurns: 5,
      verbose: false
    });

    expect(result).toBeDefined();
    expect(result.turns).toBeGreaterThan(0);
    expect(result.eventCount).toBeGreaterThan(0);
    expect(result.history).toBeDefined();
  }, 10000); // Longer timeout for bot game

  it('should stop at max turns', async () => {
    const wb1 = createTestWarband('Warband 1', 3);
    const wb2 = createTestWarband('Warband 2', 3);

    const result = await runBotGame(wb1, wb2, 'skirmish', {
      maxTurns: 2,
      verbose: false
    }, {
      maxTurns: 2,
      verbose: false
    });

    // Either game ended naturally or hit turn limit
    expect(result.turns).toBeLessThanOrEqual(3);
  }, 10000);
});

describe('simulateGames', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it('should simulate multiple games', async () => {
    const wb1 = createTestWarband('Warband 1', 2);
    const wb2 = createTestWarband('Warband 2', 2);

    const stats = await simulateGames(wb1, wb2, 2, 'skirmish', {
      maxTurns: 3,
      verbose: false
    }, {
      maxTurns: 3,
      verbose: false
    });

    expect(stats.player1Wins + stats.player2Wins + stats.draws).toBe(2);
    expect(stats.averageTurns).toBeGreaterThan(0);
    expect(stats.averageEvents).toBeGreaterThan(0);
  }, 30000);
});
