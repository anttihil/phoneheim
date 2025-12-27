import { describe, it, expect, beforeEach } from 'vitest';
import { buildStrikeOrder, getMeleeTargets, getCombatAvailableActions } from '../combat/logic';
import { createPhaseContext } from '../shared/types';
import { createTestGameState, resetIdCounter, getWarrior } from '../../engine/__tests__/testHelpers';
import type { GameState } from '../../types/game';
import type { PhaseContext } from '../shared/types';

describe('Combat Phase Utilities', () => {
  let state: GameState;
  let context: PhaseContext;

  beforeEach(() => {
    resetIdCounter();
    state = createTestGameState(undefined, undefined, { phase: 'combat' });
    context = createPhaseContext();
  });

  describe('buildStrikeOrder', () => {
    it('includes all standing warriors in combat', () => {
      // Put two warriors in combat
      const warrior1 = state.warbands[0].warriors[0];
      const warrior2 = state.warbands[1].warriors[0];

      warrior1.combatState.inCombat = true;
      warrior1.combatState.engagedWith = [warrior2.id];
      warrior2.combatState.inCombat = true;
      warrior2.combatState.engagedWith = [warrior1.id];

      const strikeOrder = buildStrikeOrder(state);
      expect(strikeOrder.length).toBe(2);
    });

    it('puts chargers first', () => {
      const warrior1 = state.warbands[0].warriors[0];
      const warrior2 = state.warbands[1].warriors[0];

      warrior1.combatState.inCombat = true;
      warrior1.combatState.engagedWith = [warrior2.id];
      warrior1.hasCharged = true; // Charged

      warrior2.combatState.inCombat = true;
      warrior2.combatState.engagedWith = [warrior1.id];
      warrior2.hasCharged = false;

      // Set same initiative so only charge matters
      warrior1.profile.I = 3;
      warrior2.profile.I = 3;

      const strikeOrder = buildStrikeOrder(state);
      expect(strikeOrder[0].charged).toBe(true);
    });

    it('puts stood-up warriors last', () => {
      const warrior1 = state.warbands[0].warriors[0];
      const warrior2 = state.warbands[1].warriors[0];

      warrior1.combatState.inCombat = true;
      warrior1.combatState.engagedWith = [warrior2.id];
      warrior1.strikesLast = true; // Stood up

      warrior2.combatState.inCombat = true;
      warrior2.combatState.engagedWith = [warrior1.id];
      warrior2.strikesLast = false;

      // Set same initiative
      warrior1.profile.I = 3;
      warrior2.profile.I = 3;

      const strikeOrder = buildStrikeOrder(state);
      expect(strikeOrder[1].stoodUp).toBe(true);
    });

    it('sorts by initiative within groups', () => {
      const warrior1 = state.warbands[0].warriors[0];
      const warrior2 = state.warbands[1].warriors[0];

      warrior1.combatState.inCombat = true;
      warrior1.combatState.engagedWith = [warrior2.id];
      warrior1.profile.I = 5; // Higher initiative

      warrior2.combatState.inCombat = true;
      warrior2.combatState.engagedWith = [warrior1.id];
      warrior2.profile.I = 3; // Lower initiative

      const strikeOrder = buildStrikeOrder(state);
      expect(strikeOrder[0].initiative).toBe(5);
      expect(strikeOrder[1].initiative).toBe(3);
    });

    it('excludes non-standing warriors', () => {
      const warrior1 = state.warbands[0].warriors[0];
      const warrior2 = state.warbands[1].warriors[0];

      warrior1.combatState.inCombat = true;
      warrior1.combatState.engagedWith = [warrior2.id];
      warrior1.gameStatus = 'knockedDown'; // Not standing

      warrior2.combatState.inCombat = true;
      warrior2.combatState.engagedWith = [warrior1.id];

      const strikeOrder = buildStrikeOrder(state);
      expect(strikeOrder.length).toBe(1);
      expect(strikeOrder[0].warriorId).toBe(warrior2.id);
    });

    it('excludes warriors not in combat', () => {
      const warrior1 = state.warbands[0].warriors[0];
      // warrior1 is not in combat (default)

      const strikeOrder = buildStrikeOrder(state);
      expect(strikeOrder.length).toBe(0);
    });

    it('includes attack count from profile', () => {
      const warrior1 = state.warbands[0].warriors[0];
      const warrior2 = state.warbands[1].warriors[0];

      warrior1.combatState.inCombat = true;
      warrior1.combatState.engagedWith = [warrior2.id];
      warrior1.profile.A = 2;

      warrior2.combatState.inCombat = true;
      warrior2.combatState.engagedWith = [warrior1.id];

      const strikeOrder = buildStrikeOrder(state);
      const entry1 = strikeOrder.find(e => e.warriorId === warrior1.id);
      expect(entry1?.attacks).toBe(2);
      expect(entry1?.attacksUsed).toBe(0);
    });
  });

  describe('getMeleeTargets', () => {
    it('returns warriors in engagedWith list', () => {
      const warrior1 = state.warbands[0].warriors[0];
      const warrior2 = state.warbands[1].warriors[0];

      warrior1.combatState.inCombat = true;
      warrior1.combatState.engagedWith = [warrior2.id];

      const targets = getMeleeTargets(state, warrior1.id);
      expect(targets.length).toBe(1);
      expect(targets[0].targetId).toBe(warrior2.id);
    });

    it('includes target status information', () => {
      const warrior1 = state.warbands[0].warriors[0];
      const warrior2 = state.warbands[1].warriors[0];

      warrior1.combatState.inCombat = true;
      warrior1.combatState.engagedWith = [warrior2.id];
      warrior2.gameStatus = 'knockedDown';

      const targets = getMeleeTargets(state, warrior1.id);
      expect(targets[0].targetStatus).toBe('knockedDown');
    });

    it('returns empty array when not engaged', () => {
      const warrior1 = state.warbands[0].warriors[0];
      // Not in combat

      const targets = getMeleeTargets(state, warrior1.id);
      expect(targets.length).toBe(0);
    });

    it('returns multiple targets when engaged with many', () => {
      const warrior1 = state.warbands[0].warriors[0];
      const warrior2 = state.warbands[1].warriors[0];
      const warrior3 = state.warbands[1].warriors[1];

      warrior1.combatState.inCombat = true;
      warrior1.combatState.engagedWith = [warrior2.id, warrior3.id];

      const targets = getMeleeTargets(state, warrior1.id);
      expect(targets.length).toBe(2);
    });

    it('includes warband index for each target', () => {
      const warrior1 = state.warbands[0].warriors[0];
      const warrior2 = state.warbands[1].warriors[0];

      warrior1.combatState.inCombat = true;
      warrior1.combatState.engagedWith = [warrior2.id];

      const targets = getMeleeTargets(state, warrior1.id);
      expect(targets[0].warbandIndex).toBe(1);
    });
  });

  describe('getCombatAvailableActions', () => {
    beforeEach(() => {
      // Set up combat between two warriors
      const warrior1 = state.warbands[0].warriors[0];
      const warrior2 = state.warbands[1].warriors[0];

      warrior1.combatState.inCombat = true;
      warrior1.combatState.engagedWith = [warrior2.id];
      warrior2.combatState.inCombat = true;
      warrior2.combatState.engagedWith = [warrior1.id];

      // Build strike order and set context
      context.strikeOrder = buildStrikeOrder(state);
      context.currentFighterIndex = 0;
    });

    it('returns fight action for current fighter with attacks', () => {
      const currentFighter = context.strikeOrder[0];
      const warrior = state.warbands[currentFighter.warbandIndex].warriors.find(
        w => w.id === currentFighter.warriorId
      )!;

      const actions = getCombatAvailableActions(warrior, state, context);
      expect(actions.length).toBe(1);
      expect(actions[0].type).toBe('fight');
      expect(actions[0].requiresTarget).toBe(true);
      expect(actions[0].validTargets?.length).toBeGreaterThan(0);
    });

    it('returns empty for non-current fighter', () => {
      // Get the warrior that's NOT at index 0
      const nonCurrentEntry = context.strikeOrder[1];
      const warrior = state.warbands[nonCurrentEntry.warbandIndex].warriors.find(
        w => w.id === nonCurrentEntry.warriorId
      )!;

      const actions = getCombatAvailableActions(warrior, state, context);
      expect(actions.length).toBe(0);
    });

    it('returns empty when attacks exhausted', () => {
      const currentFighter = context.strikeOrder[0];
      currentFighter.attacksUsed = currentFighter.attacks;

      const warrior = state.warbands[currentFighter.warbandIndex].warriors.find(
        w => w.id === currentFighter.warriorId
      )!;

      const actions = getCombatAvailableActions(warrior, state, context);
      expect(actions.length).toBe(0);
    });

    it('returns empty when strike order is empty', () => {
      context.strikeOrder = [];
      context.currentFighterIndex = 0;

      const warrior = getWarrior(state, 0, 0);
      const actions = getCombatAvailableActions(warrior, state, context);
      expect(actions.length).toBe(0);
    });

    it('returns empty when currentFighterIndex exceeds strike order', () => {
      context.currentFighterIndex = 99;

      const warrior = getWarrior(state, 0, 0);
      const actions = getCombatAvailableActions(warrior, state, context);
      expect(actions.length).toBe(0);
    });
  });
});
