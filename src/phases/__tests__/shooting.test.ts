import { describe, it, expect, beforeEach } from 'vitest';
import { getShootingActableWarriors, getValidShootingTargets, getShootingAvailableActions } from '../shooting/logic';
import { createTestGameState, resetIdCounter, getWarrior, createTestWarrior, createTestWarband, toGameWarband } from './testHelpers';
import type { GameState } from '../../types/game';

describe('Shooting Phase Utilities', () => {
  let state: GameState;

  beforeEach(() => {
    resetIdCounter();
    // Create warbands with ranged weapons
    const wb1 = createTestWarband('Warband 1');
    wb1.warriors[0].equipment.ranged = ['bow'];
    wb1.warriors[1].equipment.ranged = ['bow'];
    wb1.warriors[2].equipment.ranged = []; // No ranged weapon

    const wb2 = createTestWarband('Warband 2');

    state = createTestGameState(wb1, wb2, { phase: 'shooting' });
  });

  describe('getShootingActableWarriors', () => {
    it('returns standing warriors with ranged weapons who have not shot', () => {
      const actable = getShootingActableWarriors(state);
      // Only 2 warriors have ranged weapons
      expect(actable.length).toBe(2);
    });

    it('excludes warriors who have already shot', () => {
      state.warbands[0].warriors[0].hasShot = true;

      const actable = getShootingActableWarriors(state);
      expect(actable.length).toBe(1);
    });

    it('excludes warriors who charged', () => {
      state.warbands[0].warriors[0].hasCharged = true;

      const actable = getShootingActableWarriors(state);
      expect(actable.length).toBe(1);
    });

    it('excludes warriors who ran', () => {
      state.warbands[0].warriors[0].hasRun = true;

      const actable = getShootingActableWarriors(state);
      expect(actable.length).toBe(1);
    });

    it('excludes warriors without ranged weapons', () => {
      const actable = getShootingActableWarriors(state);
      // Warrior at index 2 has no ranged weapon
      expect(actable.find(w => w.id === state.warbands[0].warriors[2].id)).toBeUndefined();
    });

    it('excludes knocked down warriors', () => {
      state.warbands[0].warriors[0].gameStatus = 'knockedDown';

      const actable = getShootingActableWarriors(state);
      expect(actable.length).toBe(1);
    });

    it('excludes out of action warriors', () => {
      state.warbands[0].warriors[0].gameStatus = 'outOfAction';

      const actable = getShootingActableWarriors(state);
      expect(actable.length).toBe(1);
    });
  });

  describe('getValidShootingTargets', () => {
    it('returns visible enemy warriors', () => {
      const targets = getValidShootingTargets(state);
      expect(targets.length).toBe(3);
    });

    it('excludes hidden warriors', () => {
      state.warbands[1].warriors[0].isHidden = true;

      const targets = getValidShootingTargets(state);
      expect(targets.length).toBe(2);
      expect(targets.find(w => w.isHidden)).toBeUndefined();
    });

    it('excludes out of action warriors', () => {
      state.warbands[1].warriors[0].gameStatus = 'outOfAction';

      const targets = getValidShootingTargets(state);
      expect(targets.length).toBe(2);
    });

    it('includes knocked down warriors', () => {
      state.warbands[1].warriors[0].gameStatus = 'knockedDown';

      const targets = getValidShootingTargets(state);
      expect(targets.length).toBe(3);
      expect(targets.find(w => w.gameStatus === 'knockedDown')).toBeDefined();
    });

    it('includes stunned warriors', () => {
      state.warbands[1].warriors[0].gameStatus = 'stunned';

      const targets = getValidShootingTargets(state);
      expect(targets.length).toBe(3);
      expect(targets.find(w => w.gameStatus === 'stunned')).toBeDefined();
    });

    it('returns empty array when all enemies are out of action', () => {
      state.warbands[1].warriors.forEach(w => {
        w.gameStatus = 'outOfAction';
      });

      const targets = getValidShootingTargets(state);
      expect(targets.length).toBe(0);
    });
  });

  describe('getShootingAvailableActions', () => {
    it('returns shoot action when targets exist', () => {
      const warrior = getWarrior(state, 0, 0); // Has ranged weapon
      const actions = getShootingAvailableActions(warrior, state);

      expect(actions.length).toBe(1);
      expect(actions[0].type).toBe('shoot');
      expect(actions[0].description).toBe('Shoot');
      expect(actions[0].requiresTarget).toBe(true);
      expect(actions[0].validTargets?.length).toBe(3);
    });

    it('returns empty array when no targets', () => {
      state.warbands[1].warriors.forEach(w => {
        w.gameStatus = 'outOfAction';
      });

      const warrior = getWarrior(state, 0, 0);
      const actions = getShootingAvailableActions(warrior, state);
      expect(actions.length).toBe(0);
    });

    it('returns empty array for warrior without ranged weapon', () => {
      const warrior = getWarrior(state, 0, 2); // No ranged weapon
      const actions = getShootingAvailableActions(warrior, state);
      expect(actions.length).toBe(0);
    });

    it('returns empty array for warrior who has shot', () => {
      const warrior = getWarrior(state, 0, 0);
      warrior.hasShot = true;

      const actions = getShootingAvailableActions(warrior, state);
      expect(actions.length).toBe(0);
    });

    it('returns empty array for warrior who charged', () => {
      const warrior = getWarrior(state, 0, 0);
      warrior.hasCharged = true;

      const actions = getShootingAvailableActions(warrior, state);
      expect(actions.length).toBe(0);
    });

    it('returns empty array for warrior who ran', () => {
      const warrior = getWarrior(state, 0, 0);
      warrior.hasRun = true;

      const actions = getShootingAvailableActions(warrior, state);
      expect(actions.length).toBe(0);
    });
  });
});
