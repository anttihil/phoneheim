// Smoke test to verify vitest setup works
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestWarband,
  createTestGameState,
  resetIdCounter
} from './testHelpers';

describe('Test Helpers', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it('should create a test warband with default values', () => {
    const warband = createTestWarband('Test Warband');

    expect(warband.name).toBe('Test Warband');
    expect(warband.warriors.length).toBe(3);
    expect(warband.warriors[0].category).toBe('hero'); // First is leader
    expect(warband.warriors[1].category).toBe('henchman');
  });

  it('should create a test game state', () => {
    const state = createTestGameState();

    expect(state.turn).toBe(1);
    expect(state.currentPlayer).toBe(1);
    expect(state.phase).toBe('movement');
    expect(state.warbands.length).toBe(2);
    expect(state.ended).toBe(false);
  });

  it('should create game state with custom options', () => {
    const state = createTestGameState(undefined, undefined, {
      phase: 'shooting',
      turn: 3,
      currentPlayer: 2
    });

    expect(state.phase).toBe('shooting');
    expect(state.turn).toBe(3);
    expect(state.currentPlayer).toBe(2);
  });

  it('should convert warriors to game warriors with game state', () => {
    const state = createTestGameState();
    const warrior = state.warbands[0].warriors[0];

    expect(warrior.gameStatus).toBe('standing');
    expect(warrior.woundsRemaining).toBe(warrior.profile.W);
    expect(warrior.hasActed).toBe(false);
    expect(warrior.hasMoved).toBe(false);
    expect(warrior.combatState.inCombat).toBe(false);
  });
});
