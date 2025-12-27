// InputMediator unit tests

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InputMediator, createMediator } from '../InputMediator';
import { PhaseCoordinator } from '../../engine';
import {
  createTestWarband,
  resetIdCounter
} from '../../engine/__tests__/testHelpers';
import type { ScreenCommand } from '../../engine/types/screens';

describe('InputMediator', () => {
  let mediator: InputMediator;

  beforeEach(() => {
    resetIdCounter();
    mediator = new InputMediator();
  });

  describe('createGame', () => {
    it('should create a game and set local player', () => {
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');

      const screen = mediator.createGame(wb1, wb2, 'skirmish', {
        playerId: 'player1',
        playerNumber: 1
      });

      expect(screen.screen).toBe('GAME_SETUP');
      expect(mediator.getState()).not.toBeNull();
      expect(mediator.getLocalPlayer()?.playerNumber).toBe(1);
    });

    it('should notify screen listeners on game creation', () => {
      const listener = vi.fn();
      mediator.onScreenCommand(listener);

      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');

      mediator.createGame(wb1, wb2, 'skirmish', {
        playerId: 'player1',
        playerNumber: 1
      });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        screen: 'GAME_SETUP'
      }));
    });
  });

  describe('submitEvent', () => {
    beforeEach(() => {
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');
      mediator.createGame(wb1, wb2, 'skirmish', {
        playerId: 'player1',
        playerNumber: 1
      });
    });

    it('should process valid events', () => {
      const state = mediator.getState()!;
      const warriorId = state.warbands[0].warriors[0].id;

      const result = mediator.submitEvent({
        type: 'SELECT_WARRIOR',
        payload: { warriorId }
      });

      expect(result.success).toBe(true);
    });

    it('should wrap events with id and timestamp', () => {
      const state = mediator.getState()!;
      const warriorId = state.warbands[0].warriors[0].id;

      mediator.submitEvent({
        type: 'SELECT_WARRIOR',
        payload: { warriorId }
      });

      const history = mediator.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].id).toBeDefined();
      expect(history[0].timestamp).toBeDefined();
      expect(history[0].playerId).toBe('player1');
    });

    it('should notify screen listeners on successful event', () => {
      const listener = vi.fn();
      mediator.onScreenCommand(listener);

      // Clear the call from createGame
      listener.mockClear();

      const state = mediator.getState()!;
      const warriorId = state.warbands[0].warriors[0].id;

      mediator.submitEvent({
        type: 'SELECT_WARRIOR',
        payload: { warriorId }
      });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should notify error listeners on failed event', () => {
      const errorListener = vi.fn();
      mediator.onError(errorListener);

      // Try to select non-existent warrior
      mediator.submitEvent({
        type: 'SELECT_WARRIOR',
        payload: { warriorId: 'invalid-id' }
      });

      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(errorListener).toHaveBeenCalledWith('Warrior not found');
    });

    it('should fail when no game is active', () => {
      const freshMediator = new InputMediator();
      const errorListener = vi.fn();
      freshMediator.onError(errorListener);

      const result = freshMediator.submitEvent({
        type: 'SELECT_WARRIOR',
        payload: { warriorId: 'any-id' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active game');
      expect(errorListener).toHaveBeenCalledWith('No active game');
    });
  });

  describe('turn validation', () => {
    beforeEach(() => {
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');
      mediator.createGame(wb1, wb2, 'skirmish', {
        playerId: 'player1',
        playerNumber: 1
      });
    });

    it('should allow events when it is local player turn', () => {
      const state = mediator.getState()!;
      const warriorId = state.warbands[0].warriors[0].id;

      const result = mediator.submitEvent({
        type: 'SELECT_WARRIOR',
        payload: { warriorId }
      });

      expect(result.success).toBe(true);
    });

    it('should reject events when it is not local player turn', () => {
      // Advance to player 2's turn
      const state = mediator.getState()!;
      for (const warrior of state.warbands[0].warriors) {
        mediator.submitEvent({
          type: 'SELECT_WARRIOR',
          payload: { warriorId: warrior.id }
        });
        mediator.submitEvent({
          type: 'CONFIRM_POSITION',
          payload: {}
        });
      }
      mediator.submitEvent({
        type: 'ADVANCE_PHASE',
        payload: {}
      });

      // Now it's player 2's turn
      expect(mediator.getState()!.currentPlayer).toBe(2);

      // Try to act as player 1 (who set up the game)
      const p2WarriorId = state.warbands[1].warriors[0].id;
      const result = mediator.submitEvent({
        type: 'SELECT_WARRIOR',
        payload: { warriorId: p2WarriorId }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not your turn');
    });

    it('should allow ACKNOWLEDGE events regardless of turn', () => {
      // Advance to player 2's turn
      const state = mediator.getState()!;
      for (const warrior of state.warbands[0].warriors) {
        mediator.submitEvent({
          type: 'SELECT_WARRIOR',
          payload: { warriorId: warrior.id }
        });
        mediator.submitEvent({
          type: 'CONFIRM_POSITION',
          payload: {}
        });
      }
      mediator.submitEvent({
        type: 'ADVANCE_PHASE',
        payload: {}
      });

      // ACKNOWLEDGE should be allowed even on opponent's turn
      const result = mediator.submitEvent({
        type: 'ACKNOWLEDGE',
        payload: {}
      });

      expect(result.success).toBe(true);
    });

    it('should skip validation when disabled', () => {
      mediator.setTurnValidation(false);

      // Advance to player 2's turn
      const state = mediator.getState()!;
      for (const warrior of state.warbands[0].warriors) {
        mediator.submitEvent({
          type: 'SELECT_WARRIOR',
          payload: { warriorId: warrior.id }
        });
        mediator.submitEvent({
          type: 'CONFIRM_POSITION',
          payload: {}
        });
      }
      mediator.submitEvent({
        type: 'ADVANCE_PHASE',
        payload: {}
      });

      expect(mediator.getState()!.currentPlayer).toBe(2);

      // Should be allowed even though it's player 2's turn
      const p2WarriorId = state.warbands[1].warriors[0].id;
      const result = mediator.submitEvent({
        type: 'SELECT_WARRIOR',
        payload: { warriorId: p2WarriorId }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('isLocalPlayerTurn', () => {
    it('should return true when local player turn', () => {
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');
      mediator.createGame(wb1, wb2, 'skirmish', {
        playerId: 'player1',
        playerNumber: 1
      });

      expect(mediator.isLocalPlayerTurn()).toBe(true);
    });

    it('should return false when not local player turn', () => {
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');
      mediator.createGame(wb1, wb2, 'skirmish', {
        playerId: 'player2',
        playerNumber: 2
      });

      // Game starts with player 1
      expect(mediator.isLocalPlayerTurn()).toBe(false);
    });

    it('should return false when no local player set', () => {
      expect(mediator.isLocalPlayerTurn()).toBe(false);
    });
  });

  describe('subscriptions', () => {
    it('should allow unsubscribing from screen listeners', () => {
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');

      const listener = vi.fn();
      const unsubscribe = mediator.onScreenCommand(listener);

      mediator.createGame(wb1, wb2, 'skirmish', {
        playerId: 'player1',
        playerNumber: 1
      });

      expect(listener).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();
      listener.mockClear();

      // Submit another event
      const state = mediator.getState()!;
      mediator.submitEvent({
        type: 'SELECT_WARRIOR',
        payload: { warriorId: state.warbands[0].warriors[0].id }
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should allow unsubscribing from error listeners', () => {
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');
      mediator.createGame(wb1, wb2, 'skirmish', {
        playerId: 'player1',
        playerNumber: 1
      });

      const errorListener = vi.fn();
      const unsubscribe = mediator.onError(errorListener);

      // Trigger an error
      mediator.submitEvent({
        type: 'SELECT_WARRIOR',
        payload: { warriorId: 'invalid' }
      });

      expect(errorListener).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();
      errorListener.mockClear();

      // Trigger another error
      mediator.submitEvent({
        type: 'SELECT_WARRIOR',
        payload: { warriorId: 'invalid' }
      });

      expect(errorListener).not.toHaveBeenCalled();
    });
  });

  describe('undo operations', () => {
    beforeEach(() => {
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');
      mediator.createGame(wb1, wb2, 'skirmish', {
        playerId: 'player1',
        playerNumber: 1
      });
    });

    it('should undo to event and notify listeners', () => {
      const state = mediator.getState()!;
      const warrior1 = state.warbands[0].warriors[0];
      const warrior2 = state.warbands[0].warriors[1];

      mediator.submitEvent({
        type: 'SELECT_WARRIOR',
        payload: { warriorId: warrior1.id }
      });
      const firstEventId = mediator.getHistory()[0].id;

      mediator.submitEvent({
        type: 'CONFIRM_POSITION',
        payload: {}
      });
      mediator.submitEvent({
        type: 'SELECT_WARRIOR',
        payload: { warriorId: warrior2.id }
      });

      const listener = vi.fn();
      mediator.onScreenCommand(listener);

      const result = mediator.undoToEvent(firstEventId);

      expect(result.success).toBe(true);
      expect(mediator.getHistory()).toHaveLength(1);
      expect(listener).toHaveBeenCalled();
    });

    it('should undo last events and notify listeners', () => {
      const state = mediator.getState()!;

      mediator.submitEvent({
        type: 'SELECT_WARRIOR',
        payload: { warriorId: state.warbands[0].warriors[0].id }
      });
      mediator.submitEvent({
        type: 'CONFIRM_POSITION',
        payload: {}
      });

      const listener = vi.fn();
      mediator.onScreenCommand(listener);

      const result = mediator.undoLastEvents(1);

      expect(result.success).toBe(true);
      expect(mediator.getHistory()).toHaveLength(1);
      expect(listener).toHaveBeenCalled();
    });

    it('should reset game and notify listeners', () => {
      const state = mediator.getState()!;

      mediator.submitEvent({
        type: 'SELECT_WARRIOR',
        payload: { warriorId: state.warbands[0].warriors[0].id }
      });
      mediator.submitEvent({
        type: 'CONFIRM_POSITION',
        payload: {}
      });

      const listener = vi.fn();
      mediator.onScreenCommand(listener);

      const result = mediator.resetGame();

      expect(result.success).toBe(true);
      expect(mediator.getHistory()).toHaveLength(0);
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('loadGame', () => {
    it('should load game state and notify listeners', () => {
      // Create and play a game
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');
      mediator.createGame(wb1, wb2, 'skirmish', {
        playerId: 'player1',
        playerNumber: 1
      });

      const state = mediator.getState()!;
      mediator.submitEvent({
        type: 'SELECT_WARRIOR',
        payload: { warriorId: state.warbands[0].warriors[0].id }
      });

      // Serialize
      const { state: savedState, history } = mediator.serialize();

      // Create new mediator and load
      const newMediator = new InputMediator();
      const listener = vi.fn();
      newMediator.onScreenCommand(listener);

      const screen = newMediator.loadGame(savedState, history, {
        playerId: 'player1',
        playerNumber: 1
      });

      expect(screen.screen).toBe('GAME_SETUP');
      expect(listener).toHaveBeenCalledTimes(1);
      expect(newMediator.getHistory()).toHaveLength(1);
    });
  });

  describe('getAvailableEvents', () => {
    it('should return available events from current screen', () => {
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');
      mediator.createGame(wb1, wb2, 'skirmish', {
        playerId: 'player1',
        playerNumber: 1
      });

      const available = mediator.getAvailableEvents();

      expect(available).toContain('SELECT_WARRIOR');
      expect(available).toContain('ADVANCE_PHASE');
    });
  });

  describe('createMediator factory', () => {
    it('should create a new mediator with fresh engine', () => {
      const mediator1 = createMediator();
      const mediator2 = createMediator();

      expect(mediator1).not.toBe(mediator2);
      expect(mediator1.getEngine()).not.toBe(mediator2.getEngine());
    });

    it('should use provided engine', () => {
      const engine = new PhaseCoordinator();
      const mediator = createMediator(engine);

      expect(mediator.getEngine()).toBe(engine);
    });
  });

  describe('submitRawEvent', () => {
    it('should process pre-formed events', () => {
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');
      mediator.createGame(wb1, wb2, 'skirmish', {
        playerId: 'player1',
        playerNumber: 1
      });

      const state = mediator.getState()!;
      const warriorId = state.warbands[0].warriors[0].id;

      const result = mediator.submitRawEvent({
        id: 'custom-id',
        timestamp: '2024-01-01T00:00:00Z',
        playerId: 'remote-player',
        type: 'SELECT_WARRIOR',
        payload: { warriorId }
      });

      expect(result.success).toBe(true);

      const history = mediator.getHistory();
      expect(history[0].id).toBe('custom-id');
      expect(history[0].playerId).toBe('remote-player');
    });
  });
});
