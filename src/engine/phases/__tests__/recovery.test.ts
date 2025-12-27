import { describe, it, expect, beforeEach } from 'vitest';
import { getWarriorsNeedingRecovery, getRecoveryAvailableActions, isRecoveryPhaseComplete } from '../recovery';
import { createTestGameState, resetIdCounter, getWarrior, createTestWarband, toGameWarband } from '../../__tests__/testHelpers';
import type { GameState, GameWarband } from '../../../types/game';

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

    it('excludes standing warriors', () => {
      // All warriors are standing by default
      const result = getWarriorsNeedingRecovery(warband);
      expect(result.fleeing.length).toBe(0);
      expect(result.stunned.length).toBe(0);
      expect(result.knockedDown.length).toBe(0);
    });

    it('excludes already-recovered warriors', () => {
      warband.warriors[0].gameStatus = 'fleeing';
      warband.warriors[0].hasRecovered = true;

      const result = getWarriorsNeedingRecovery(warband);
      expect(result.fleeing.length).toBe(0);
    });

    it('returns multiple warriors in different states', () => {
      warband.warriors[0].gameStatus = 'fleeing';
      warband.warriors[1].gameStatus = 'stunned';
      warband.warriors[2].gameStatus = 'knockedDown';

      const result = getWarriorsNeedingRecovery(warband);
      expect(result.fleeing.length).toBe(1);
      expect(result.stunned.length).toBe(1);
      expect(result.knockedDown.length).toBe(1);
    });
  });

  describe('getRecoveryAvailableActions', () => {
    it('returns rally for fleeing warrior', () => {
      const warrior = getWarrior(state, 0, 0);
      warrior.gameStatus = 'fleeing';

      const actions = getRecoveryAvailableActions(warrior);
      expect(actions.length).toBe(1);
      expect(actions[0].type).toBe('rally');
      expect(actions[0].description).toContain('Rally');
      expect(actions[0].requiresTarget).toBe(false);
    });

    it('returns recoverFromStunned for stunned warrior', () => {
      const warrior = getWarrior(state, 0, 0);
      warrior.gameStatus = 'stunned';

      const actions = getRecoveryAvailableActions(warrior);
      expect(actions.length).toBe(1);
      expect(actions[0].type).toBe('recoverFromStunned');
      expect(actions[0].description).toContain('Recover');
    });

    it('returns standUp for knocked down warrior not in combat', () => {
      const warrior = getWarrior(state, 0, 0);
      warrior.gameStatus = 'knockedDown';

      const actions = getRecoveryAvailableActions(warrior);
      expect(actions.length).toBe(1);
      expect(actions[0].type).toBe('standUp');
      expect(actions[0].description).toContain('Stand up');
    });

    it('excludes standUp for knocked down warrior in combat', () => {
      const warrior = getWarrior(state, 0, 0);
      warrior.gameStatus = 'knockedDown';
      warrior.combatState.inCombat = true;

      const actions = getRecoveryAvailableActions(warrior);
      expect(actions.length).toBe(0);
    });

    it('returns empty array for standing warrior', () => {
      const warrior = getWarrior(state, 0, 0);
      // Standing by default

      const actions = getRecoveryAvailableActions(warrior);
      expect(actions.length).toBe(0);
    });

    it('returns empty array for warrior who has recovered', () => {
      const warrior = getWarrior(state, 0, 0);
      warrior.gameStatus = 'fleeing';
      warrior.hasRecovered = true;

      const actions = getRecoveryAvailableActions(warrior);
      expect(actions.length).toBe(0);
    });
  });

  describe('isRecoveryPhaseComplete', () => {
    it('returns true when no warriors need recovery', () => {
      // All warriors are standing by default
      expect(isRecoveryPhaseComplete(warband)).toBe(true);
    });

    it('returns false when warriors need recovery', () => {
      warband.warriors[0].gameStatus = 'fleeing';
      expect(isRecoveryPhaseComplete(warband)).toBe(false);
    });

    it('returns true when all needing recovery have recovered', () => {
      warband.warriors[0].gameStatus = 'fleeing';
      warband.warriors[0].hasRecovered = true;

      expect(isRecoveryPhaseComplete(warband)).toBe(true);
    });
  });
});
