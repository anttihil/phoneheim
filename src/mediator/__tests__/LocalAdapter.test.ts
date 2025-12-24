// LocalAdapter unit tests

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  LocalAdapter,
  createLocalAdapter,
  getLocalAdapter
} from '../LocalAdapter';
import type { ScreenCommand } from '../../engine/types/screens';
import type { GameState } from '../../types/game';
import {
  createTestGameState,
  resetIdCounter
} from '../../engine/__tests__/testHelpers';

describe('LocalAdapter', () => {
  let adapter: LocalAdapter;

  beforeEach(() => {
    resetIdCounter();
    vi.useFakeTimers();
    adapter = createLocalAdapter();
  });

  afterEach(() => {
    adapter.disableAI();
    vi.useRealTimers();
  });

  describe('AI configuration', () => {
    it('should enable AI with default config', () => {
      adapter.enableAI();

      expect(adapter.isAIEnabled()).toBe(true);
      expect(adapter.getAIPlayerNumber()).toBe(2);
    });

    it('should enable AI with custom config', () => {
      adapter.enableAI({ thinkingDelay: 2000, strategy: 'aggressive' }, 1);

      expect(adapter.isAIEnabled()).toBe(true);
      expect(adapter.getAIPlayerNumber()).toBe(1);
    });

    it('should disable AI', () => {
      adapter.enableAI();
      adapter.disableAI();

      expect(adapter.isAIEnabled()).toBe(false);
    });
  });

  describe('AI decision making', () => {
    it('should make immediate decision for setup phase', () => {
      adapter.enableAI();

      const screen: ScreenCommand = {
        screen: 'GAME_SETUP',
        phase: 'setup',
        turn: 1,
        currentPlayer: 2,
        data: {
          warriorsToPosition: [{ id: 'w1', name: 'Warrior 1' }]
        },
        availableEvents: ['SELECT_WARRIOR', 'ADVANCE_PHASE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'setup',
        currentPlayer: 2
      });

      const decision = adapter.makeImmediateDecision(screen, state);

      expect(decision).not.toBeNull();
      expect(decision?.type).toBe('SELECT_WARRIOR');
    });

    it('should make immediate decision for recovery phase', () => {
      adapter.enableAI();

      const screen: ScreenCommand = {
        screen: 'RECOVERY_PHASE',
        phase: 'recovery',
        turn: 1,
        currentPlayer: 2,
        data: {
          fleeingWarriors: [{ id: 'w1', name: 'Warrior 1' }],
          stunnedWarriors: [],
          knockedDownWarriors: []
        },
        availableEvents: ['RECOVERY_ACTION', 'ADVANCE_PHASE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'recovery',
        currentPlayer: 2
      });

      const decision = adapter.makeImmediateDecision(screen, state);

      expect(decision).not.toBeNull();
      expect(decision?.type).toBe('RECOVERY_ACTION');
      expect(decision?.payload).toEqual({
        action: 'rally',
        warriorId: 'w1'
      });
    });

    it('should make immediate decision for movement phase', () => {
      adapter.enableAI();

      const screen: ScreenCommand = {
        screen: 'MOVEMENT_PHASE',
        phase: 'movement',
        turn: 1,
        currentPlayer: 2,
        data: {
          actableWarriors: [{ id: 'w1', name: 'Warrior 1' }],
          selectedWarrior: null,
          chargeTargets: []
        },
        availableEvents: ['SELECT_WARRIOR', 'ADVANCE_PHASE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'movement',
        currentPlayer: 2
      });

      const decision = adapter.makeImmediateDecision(screen, state);

      expect(decision).not.toBeNull();
      expect(decision?.type).toBe('SELECT_WARRIOR');
    });

    it('should advance phase when no warriors can act', () => {
      adapter.enableAI();

      const screen: ScreenCommand = {
        screen: 'MOVEMENT_PHASE',
        phase: 'movement',
        turn: 1,
        currentPlayer: 2,
        data: {
          actableWarriors: [],
          selectedWarrior: null,
          chargeTargets: []
        },
        availableEvents: ['ADVANCE_PHASE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'movement',
        currentPlayer: 2
      });

      const decision = adapter.makeImmediateDecision(screen, state);

      expect(decision).not.toBeNull();
      expect(decision?.type).toBe('ADVANCE_PHASE');
    });

    it('should acknowledge combat resolution', () => {
      adapter.enableAI();

      const screen: ScreenCommand = {
        screen: 'COMBAT_RESOLUTION',
        phase: 'combat',
        turn: 1,
        currentPlayer: 2,
        data: {},
        availableEvents: ['ACKNOWLEDGE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'combat',
        currentPlayer: 2
      });

      const decision = adapter.makeImmediateDecision(screen, state);

      expect(decision).not.toBeNull();
      expect(decision?.type).toBe('ACKNOWLEDGE');
    });

    it('should handle shooting target select', () => {
      adapter.enableAI();

      const screen: ScreenCommand = {
        screen: 'SHOOTING_TARGET_SELECT',
        phase: 'shooting',
        turn: 1,
        currentPlayer: 2,
        data: {
          validTargets: [{ id: 'enemy1', name: 'Enemy 1' }]
        },
        availableEvents: ['SELECT_TARGET', 'DESELECT']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'shooting',
        currentPlayer: 2
      });

      const decision = adapter.makeImmediateDecision(screen, state);

      expect(decision).not.toBeNull();
      expect(decision?.type).toBe('SELECT_TARGET');
    });
  });

  describe('AI turn handling', () => {
    it('should schedule AI decision with delay', () => {
      const eventSubmitter = vi.fn();
      adapter.setEventSubmitter(eventSubmitter);
      adapter.enableAI({ thinkingDelay: 1000 });

      const screen: ScreenCommand = {
        screen: 'MOVEMENT_PHASE',
        phase: 'movement',
        turn: 1,
        currentPlayer: 2,
        data: {
          actableWarriors: [],
          selectedWarrior: null
        },
        availableEvents: ['ADVANCE_PHASE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, {
        phase: 'movement',
        currentPlayer: 2
      });

      adapter.onAITurn(screen, state);

      // Should not have been called yet
      expect(eventSubmitter).not.toHaveBeenCalled();

      // Advance timers
      vi.advanceTimersByTime(1000);

      // Now should have been called
      expect(eventSubmitter).toHaveBeenCalled();
    });

    it('should cancel pending decision when new turn starts', () => {
      const eventSubmitter = vi.fn();
      adapter.setEventSubmitter(eventSubmitter);
      adapter.enableAI({ thinkingDelay: 1000 });

      const screen1: ScreenCommand = {
        screen: 'MOVEMENT_PHASE',
        phase: 'movement',
        turn: 1,
        currentPlayer: 2,
        data: { actableWarriors: [], selectedWarrior: null },
        availableEvents: ['ADVANCE_PHASE']
      } as ScreenCommand;

      const screen2: ScreenCommand = {
        screen: 'SHOOTING_PHASE',
        phase: 'shooting',
        turn: 1,
        currentPlayer: 2,
        data: { actableWarriors: [] },
        availableEvents: ['ADVANCE_PHASE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, { currentPlayer: 2 });

      // Start first decision
      adapter.onAITurn(screen1, state);

      // Before delay completes, start second decision (this should cancel the first)
      vi.advanceTimersByTime(500);
      adapter.onAITurn(screen2, state);

      // At this point, no call yet (first was cancelled, second timer just started)
      expect(eventSubmitter).toHaveBeenCalledTimes(0);

      // Complete the delay for the second decision (1000ms from when it was started)
      vi.advanceTimersByTime(1000);

      // Only one call should have happened (for the second decision)
      expect(eventSubmitter).toHaveBeenCalledTimes(1);
    });

    it('should not act when AI is disabled', () => {
      const eventSubmitter = vi.fn();
      adapter.setEventSubmitter(eventSubmitter);
      // Don't enable AI

      const screen: ScreenCommand = {
        screen: 'MOVEMENT_PHASE',
        phase: 'movement',
        turn: 1,
        currentPlayer: 2,
        data: { actableWarriors: [], selectedWarrior: null },
        availableEvents: ['ADVANCE_PHASE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, { currentPlayer: 2 });

      adapter.onAITurn(screen, state);
      vi.advanceTimersByTime(2000);

      expect(eventSubmitter).not.toHaveBeenCalled();
    });

    it('should cancel pending decision on disableAI', () => {
      const eventSubmitter = vi.fn();
      adapter.setEventSubmitter(eventSubmitter);
      adapter.enableAI({ thinkingDelay: 1000 });

      const screen: ScreenCommand = {
        screen: 'MOVEMENT_PHASE',
        phase: 'movement',
        turn: 1,
        currentPlayer: 2,
        data: { actableWarriors: [], selectedWarrior: null },
        availableEvents: ['ADVANCE_PHASE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, { currentPlayer: 2 });

      adapter.onAITurn(screen, state);
      vi.advanceTimersByTime(500);

      // Disable AI before decision completes
      adapter.disableAI();
      vi.advanceTimersByTime(600);

      expect(eventSubmitter).not.toHaveBeenCalled();
    });
  });

  describe('custom decision function', () => {
    it('should use custom decision when provided', () => {
      const customDecision = vi.fn().mockReturnValue({
        id: '',
        timestamp: '',
        playerId: '',
        type: 'CUSTOM_ACTION',
        payload: {}
      });

      adapter.enableAI({ strategy: 'random', customDecision });

      const screen: ScreenCommand = {
        screen: 'MOVEMENT_PHASE',
        phase: 'movement',
        turn: 1,
        currentPlayer: 2,
        data: { actableWarriors: [], selectedWarrior: null },
        availableEvents: ['ADVANCE_PHASE']
      } as ScreenCommand;

      const state = createTestGameState(undefined, undefined, { currentPlayer: 2 });

      const decision = adapter.makeImmediateDecision(screen, state);

      expect(customDecision).toHaveBeenCalledWith(screen, state, ['ADVANCE_PHASE']);
      expect(decision?.type).toBe('CUSTOM_ACTION');
    });
  });

  describe('getLocalAdapter singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getLocalAdapter();
      const instance2 = getLocalAdapter();

      expect(instance1).toBe(instance2);
    });
  });
});
