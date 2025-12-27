import { describe, it, expect, beforeEach } from 'vitest';
import { getMovementActableWarriors, getValidChargeTargets, getMovementAvailableActions } from '../movement/logic';
import { createTestGameState, resetIdCounter, getWarrior } from '../../engine/__tests__/testHelpers';
import type { GameState } from '../../types/game';

describe('Movement Phase Utilities', () => {
  let state: GameState;

  beforeEach(() => {
    resetIdCounter();
    state = createTestGameState(undefined, undefined, { phase: 'movement' });
  });

  describe('getMovementActableWarriors', () => {
    it('returns standing warriors who have not moved', () => {
      const actable = getMovementActableWarriors(state);
      // All warriors should be actable initially
      expect(actable.length).toBe(3);
    });

    it('excludes warriors who have already moved', () => {
      state.warbands[0].warriors[0].hasMoved = true;

      const actable = getMovementActableWarriors(state);
      expect(actable.length).toBe(2);
      expect(actable.find(w => w.id === state.warbands[0].warriors[0].id)).toBeUndefined();
    });

    it('excludes knocked down warriors', () => {
      state.warbands[0].warriors[0].gameStatus = 'knockedDown';

      const actable = getMovementActableWarriors(state);
      expect(actable.length).toBe(2);
    });

    it('excludes stunned warriors', () => {
      state.warbands[0].warriors[0].gameStatus = 'stunned';

      const actable = getMovementActableWarriors(state);
      expect(actable.length).toBe(2);
    });

    it('excludes out of action warriors', () => {
      state.warbands[0].warriors[0].gameStatus = 'outOfAction';

      const actable = getMovementActableWarriors(state);
      expect(actable.length).toBe(2);
    });
  });

  describe('getValidChargeTargets', () => {
    it('returns standing enemy warriors', () => {
      // Enemy warband is warbands[1], all standing by default
      const targets = getValidChargeTargets(state);
      expect(targets.length).toBe(3);
    });

    it('returns knocked down enemy warriors', () => {
      state.warbands[1].warriors[0].gameStatus = 'knockedDown';
      state.warbands[1].warriors[1].gameStatus = 'standing';
      state.warbands[1].warriors[2].gameStatus = 'standing';

      const targets = getValidChargeTargets(state);
      expect(targets.length).toBe(3);
      expect(targets.find(w => w.gameStatus === 'knockedDown')).toBeDefined();
    });

    it('excludes stunned enemy warriors', () => {
      state.warbands[1].warriors[0].gameStatus = 'stunned';

      const targets = getValidChargeTargets(state);
      expect(targets.length).toBe(2);
      expect(targets.find(w => w.gameStatus === 'stunned')).toBeUndefined();
    });

    it('excludes out of action enemy warriors', () => {
      state.warbands[1].warriors[0].gameStatus = 'outOfAction';

      const targets = getValidChargeTargets(state);
      expect(targets.length).toBe(2);
      expect(targets.find(w => w.gameStatus === 'outOfAction')).toBeUndefined();
    });

    it('returns empty array when all enemies are out of action', () => {
      state.warbands[1].warriors.forEach(w => {
        w.gameStatus = 'outOfAction';
      });

      const targets = getValidChargeTargets(state);
      expect(targets.length).toBe(0);
    });
  });

  describe('getMovementAvailableActions', () => {
    it('always includes move and run actions', () => {
      const warrior = getWarrior(state, 0, 0);
      const actions = getMovementAvailableActions(warrior, state);

      expect(actions.length).toBeGreaterThanOrEqual(2);
      expect(actions.find(a => a.type === 'move')).toBeDefined();
      expect(actions.find(a => a.type === 'run')).toBeDefined();
    });

    it('includes charge when targets exist', () => {
      const warrior = getWarrior(state, 0, 0);
      const actions = getMovementAvailableActions(warrior, state);

      const chargeAction = actions.find(a => a.type === 'charge');
      expect(chargeAction).toBeDefined();
      expect(chargeAction?.requiresTarget).toBe(true);
      expect(chargeAction?.validTargets?.length).toBe(3);
    });

    it('excludes charge when no targets', () => {
      // Set all enemies to out of action
      state.warbands[1].warriors.forEach(w => {
        w.gameStatus = 'outOfAction';
      });

      const warrior = getWarrior(state, 0, 0);
      const actions = getMovementAvailableActions(warrior, state);

      expect(actions.length).toBe(2);
      expect(actions.find(a => a.type === 'charge')).toBeUndefined();
    });

    it('returns empty array for warrior who has moved', () => {
      const warrior = getWarrior(state, 0, 0);
      warrior.hasMoved = true;

      const actions = getMovementAvailableActions(warrior, state);
      expect(actions.length).toBe(0);
    });

    it('returns empty array for knocked down warrior', () => {
      const warrior = getWarrior(state, 0, 0);
      warrior.gameStatus = 'knockedDown';

      const actions = getMovementAvailableActions(warrior, state);
      expect(actions.length).toBe(0);
    });

    it('move action does not require target', () => {
      const warrior = getWarrior(state, 0, 0);
      const actions = getMovementAvailableActions(warrior, state);

      const moveAction = actions.find(a => a.type === 'move');
      expect(moveAction?.requiresTarget).toBe(false);
    });

    it('run action does not require target', () => {
      const warrior = getWarrior(state, 0, 0);
      const actions = getMovementAvailableActions(warrior, state);

      const runAction = actions.find(a => a.type === 'run');
      expect(runAction?.requiresTarget).toBe(false);
    });
  });
});
