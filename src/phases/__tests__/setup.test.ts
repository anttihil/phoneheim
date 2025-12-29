import { describe, it, expect, beforeEach } from 'vitest';
import { getSetupActableWarriors, getSetupAvailableActions } from '../setup/logic';
import { createTestGameState, resetIdCounter, getWarrior } from './testHelpers';
import type { GameState } from '../../types/game';

describe('Setup Phase Utilities', () => {
  let state: GameState;

  beforeEach(() => {
    resetIdCounter();
    state = createTestGameState(undefined, undefined, { phase: 'setup' });
  });

  describe('getSetupActableWarriors', () => {
    it('returns standing warriors who have not acted', () => {
      const actable = getSetupActableWarriors(state);
      // All warriors should be actable initially
      expect(actable.length).toBe(3);
    });

    it('excludes warriors who have already acted', () => {
      // Mark first warrior as acted
      state.warbands[0].warriors[0].hasActed = true;

      const actable = getSetupActableWarriors(state);
      expect(actable.length).toBe(2);
      expect(actable.find(w => w.id === state.warbands[0].warriors[0].id)).toBeUndefined();
    });

    it('excludes knocked down warriors', () => {
      // Set first warrior to knocked down
      state.warbands[0].warriors[0].gameStatus = 'knockedDown';

      const actable = getSetupActableWarriors(state);
      expect(actable.length).toBe(2);
    });

    it('excludes stunned warriors', () => {
      // Set first warrior to stunned
      state.warbands[0].warriors[0].gameStatus = 'stunned';

      const actable = getSetupActableWarriors(state);
      expect(actable.length).toBe(2);
    });

    it('excludes out of action warriors', () => {
      // Set first warrior to out of action
      state.warbands[0].warriors[0].gameStatus = 'outOfAction';

      const actable = getSetupActableWarriors(state);
      expect(actable.length).toBe(2);
    });
  });

  describe('getSetupAvailableActions', () => {
    it('returns position action for actable warrior', () => {
      const warrior = getWarrior(state, 0, 0);
      const actions = getSetupAvailableActions(warrior);

      expect(actions.length).toBe(1);
      expect(actions[0].type).toBe('position');
      expect(actions[0].description).toBe('Mark Positioned');
      expect(actions[0].requiresTarget).toBe(false);
    });

    it('returns empty array for warrior who has acted', () => {
      const warrior = getWarrior(state, 0, 0);
      warrior.hasActed = true;

      const actions = getSetupAvailableActions(warrior);
      expect(actions.length).toBe(0);
    });

    it('returns empty array for knocked down warrior', () => {
      const warrior = getWarrior(state, 0, 0);
      warrior.gameStatus = 'knockedDown';

      const actions = getSetupAvailableActions(warrior);
      expect(actions.length).toBe(0);
    });

    it('returns empty array for out of action warrior', () => {
      const warrior = getWarrior(state, 0, 0);
      warrior.gameStatus = 'outOfAction';

      const actions = getSetupAvailableActions(warrior);
      expect(actions.length).toBe(0);
    });
  });
});
