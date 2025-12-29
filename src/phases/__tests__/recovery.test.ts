import { describe, it, expect, beforeEach } from 'vitest';
import { getWarriorsNeedingRecovery, getRecoveryAvailableActions, isRecoveryPhaseComplete } from '../recovery/logic';
import { createTestGameState, resetIdCounter, getWarrior, createTestWarband, toGameWarband } from './testHelpers';
import type { GameState, GameWarband } from '../../types/game';

describe('Recovery Phase Utilities', () => {
  let state: GameState;
  let warband: GameWarband;

  beforeEach(() => {
    resetIdCounter();
    state = createTestGameState(undefined, undefined, { phase: 'recovery' });
    warband = state.warbands[0];
  });

  describe('getWarriorsNeedingRecovery', () => {
    it('returns fleeing warriors', () => {
      warband.warriors[0].gameStatus = 'fleeing';

      const result = getWarriorsNeedingRecovery(warband);
      expect(result.fleeing.length).toBe(1);
      expect(result.fleeing[0].id).toBe(warband.warriors[0].id);
    });

    it('returns stunned warriors', () => {
      warband.warriors[0].gameStatus = 'stunned';

      const result = getWarriorsNeedingRecovery(warband);
      expect(result.stunned.length).toBe(1);
      expect(result.stunned[0].id).toBe(warband.warriors[0].id);
    });

    it('returns knocked down warriors', () => {
      warband.warriors[0].gameStatus = 'knockedDown';

      const result = getWarriorsNeedingRecovery(warband);
      expect(result.knockedDown.length).toBe(1);
      expect(result.knockedDown[0].id).toBe(warband.warriors[0].id);
    });

    it('returns empty arrays when no warriors need recovery', () => {
      const result = getWarriorsNeedingRecovery(warband);
      expect(result.fleeing.length).toBe(0);
      expect(result.stunned.length).toBe(0);
      expect(result.knockedDown.length).toBe(0);
    });

    it('categorizes multiple warriors correctly', () => {
      warband.warriors[0].gameStatus = 'fleeing';
      warband.warriors[1].gameStatus = 'stunned';
      warband.warriors[2].gameStatus = 'knockedDown';

      const result = getWarriorsNeedingRecovery(warband);
      expect(result.fleeing.length).toBe(1);
      expect(result.stunned.length).toBe(1);
      expect(result.knockedDown.length).toBe(1);
    });
  });

  describe('isRecoveryPhaseComplete', () => {
    it('returns true when no warriors need recovery', () => {
      expect(isRecoveryPhaseComplete(warband)).toBe(true);
    });

    it('returns false when fleeing warriors exist', () => {
      warband.warriors[0].gameStatus = 'fleeing';
      warband.warriors[0].hasRecovered = false;

      expect(isRecoveryPhaseComplete(warband)).toBe(false);
    });

    it('returns false when stunned warriors exist', () => {
      warband.warriors[0].gameStatus = 'stunned';
      warband.warriors[0].hasRecovered = false;

      expect(isRecoveryPhaseComplete(warband)).toBe(false);
    });

    it('returns false when knocked down warriors exist', () => {
      warband.warriors[0].gameStatus = 'knockedDown';
      warband.warriors[0].hasRecovered = false;

      expect(isRecoveryPhaseComplete(warband)).toBe(false);
    });

    it('returns true when all recovery warriors have recovered', () => {
      warband.warriors[0].gameStatus = 'fleeing';
      warband.warriors[0].hasRecovered = true;
      warband.warriors[1].gameStatus = 'stunned';
      warband.warriors[1].hasRecovered = true;

      expect(isRecoveryPhaseComplete(warband)).toBe(true);
    });
  });

  describe('getRecoveryAvailableActions', () => {
    it('returns rally action for fleeing warrior', () => {
      const warrior = getWarrior(state, 0, 0);
      warrior.gameStatus = 'fleeing';

      const actions = getRecoveryAvailableActions(warrior);
      expect(actions.length).toBe(1);
      expect(actions[0].type).toBe('rally');
    });

    it('returns recover action for stunned warrior', () => {
      const warrior = getWarrior(state, 0, 0);
      warrior.gameStatus = 'stunned';

      const actions = getRecoveryAvailableActions(warrior);
      expect(actions.length).toBe(1);
      expect(actions[0].type).toBe('recoverFromStunned');
    });

    it('returns standUp action for knocked down warrior', () => {
      const warrior = getWarrior(state, 0, 0);
      warrior.gameStatus = 'knockedDown';

      const actions = getRecoveryAvailableActions(warrior);
      expect(actions.length).toBe(1);
      expect(actions[0].type).toBe('standUp');
    });

    it('returns empty array for standing warrior', () => {
      const warrior = getWarrior(state, 0, 0);
      warrior.gameStatus = 'standing';

      const actions = getRecoveryAvailableActions(warrior);
      expect(actions.length).toBe(0);
    });

    it('returns empty array for recovered warrior', () => {
      const warrior = getWarrior(state, 0, 0);
      warrior.gameStatus = 'stunned';
      warrior.hasRecovered = true;

      const actions = getRecoveryAvailableActions(warrior);
      expect(actions.length).toBe(0);
    });
  });
});
