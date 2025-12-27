// PhaseCoordinator unit tests

import { describe, it, expect, beforeEach } from 'vitest';
import { PhaseCoordinator } from '../PhaseCoordinator';
import {
  createTestWarband,
  createTestGameState,
  resetIdCounter,
  createTestEvent
} from './testHelpers';
import type {
  SelectWarriorEvent,
  ConfirmMoveEvent,
  ConfirmChargeEvent,
  ConfirmPositionEvent,
  AdvancePhaseEvent,
  RecoveryActionEvent,
  ConfirmShotEvent,
  ConfirmMeleeEvent
} from '../types/events';

describe('PhaseCoordinator', () => {
  let coordinator: PhaseCoordinator;

  beforeEach(() => {
    resetIdCounter();
    coordinator = new PhaseCoordinator();
  });

  describe('createGame', () => {
    it('should initialize game state with two warbands', () => {
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');

      coordinator.createGame(wb1, wb2, 'skirmish');

      const state = coordinator.getState();
      expect(state).not.toBeNull();
      expect(state?.turn).toBe(1);
      expect(state?.currentPlayer).toBe(1);
      expect(state?.phase).toBe('setup');
      expect(state?.warbands.length).toBe(2);
      expect(state?.warbands[0].name).toBe('Warband 1');
      expect(state?.warbands[1].name).toBe('Warband 2');
    });

    it('should clear previous game state when creating a new game', () => {
      const wb1 = createTestWarband('First');
      const wb2 = createTestWarband('Second');

      coordinator.createGame(wb1, wb2, 'skirmish');

      // Create another game
      const wb3 = createTestWarband('Third');
      const wb4 = createTestWarband('Fourth');
      coordinator.createGame(wb3, wb4, 'streetFight');

      const state = coordinator.getState();
      expect(state?.warbands[0].name).toBe('Third');
      expect(coordinator.getHistory()).toHaveLength(0);
    });

    it('should initialize empty history', () => {
      const wb1 = createTestWarband('Test 1');
      const wb2 = createTestWarband('Test 2');

      coordinator.createGame(wb1, wb2, 'skirmish');

      expect(coordinator.getHistory()).toHaveLength(0);
    });
  });

  describe('getCurrentScreen', () => {
    it('should return error screen when no game is active', () => {
      const screen = coordinator.getCurrentScreen();
      expect(screen.screen).toBe('ERROR');
      expect(screen.data).toHaveProperty('message', 'No active game');
    });

    it('should return setup screen for new game', () => {
      const wb1 = createTestWarband('Test 1');
      const wb2 = createTestWarband('Test 2');
      coordinator.createGame(wb1, wb2, 'skirmish');

      const screen = coordinator.getCurrentScreen();
      expect(screen.screen).toBe('GAME_SETUP');
      expect(screen.phase).toBe('setup');
      expect(screen.currentPlayer).toBe(1);
    });
  });

  describe('processEvent - error handling', () => {
    it('should return error when no game is active', () => {
      const result = coordinator.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: 'test' })
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active game');
    });
  });

  describe('Setup Phase', () => {
    beforeEach(() => {
      const wb1 = createTestWarband('Player 1');
      const wb2 = createTestWarband('Player 2');
      coordinator.createGame(wb1, wb2, 'skirmish');
    });

    it('should select a warrior from current player warband', () => {
      const state = coordinator.getState()!;
      const warriorId = state.warbands[0].warriors[0].id;

      const result = coordinator.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId })
      );

      expect(result.success).toBe(true);
      expect(result.screenCommand.screen).toBe('GAME_SETUP');
    });

    it('should fail to select warrior from opponent warband', () => {
      const state = coordinator.getState()!;
      const opponentWarriorId = state.warbands[1].warriors[0].id;

      const result = coordinator.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: opponentWarriorId })
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot select opponent warrior');
    });

    it('should confirm warrior position', () => {
      const state = coordinator.getState()!;
      const warriorId = state.warbands[0].warriors[0].id;

      // Select warrior first
      coordinator.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId })
      );

      // Confirm position
      const result = coordinator.processEvent(
        createTestEvent<ConfirmPositionEvent>('CONFIRM_POSITION', {})
      );

      expect(result.success).toBe(true);
    });

    it('should advance from Player 1 to Player 2 setup', () => {
      const state = coordinator.getState()!;

      // Position all Player 1 warriors
      for (const warrior of state.warbands[0].warriors) {
        coordinator.processEvent(
          createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id })
        );
        coordinator.processEvent(
          createTestEvent<ConfirmPositionEvent>('CONFIRM_POSITION', {})
        );
      }

      // Advance phase
      const result = coordinator.processEvent(
        createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {})
      );

      expect(result.success).toBe(true);
      expect(coordinator.getState()?.phase).toBe('setup');
      expect(coordinator.getState()?.currentPlayer).toBe(2);
    });

    it('should advance to recovery phase after both players complete setup', () => {
      const state = coordinator.getState()!;

      // Player 1 setup
      for (const warrior of state.warbands[0].warriors) {
        coordinator.processEvent(
          createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id })
        );
        coordinator.processEvent(
          createTestEvent<ConfirmPositionEvent>('CONFIRM_POSITION', {})
        );
      }
      coordinator.processEvent(
        createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {})
      );

      // Player 2 setup
      for (const warrior of state.warbands[1].warriors) {
        coordinator.processEvent(
          createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id })
        );
        coordinator.processEvent(
          createTestEvent<ConfirmPositionEvent>('CONFIRM_POSITION', {})
        );
      }
      coordinator.processEvent(
        createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {})
      );

      // Should now be in recovery phase, Player 1
      expect(coordinator.getState()?.phase).toBe('recovery');
      expect(coordinator.getState()?.currentPlayer).toBe(1);
    });
  });

  describe('Phase Transitions', () => {
    beforeEach(() => {
      const wb1 = createTestWarband('Player 1');
      const wb2 = createTestWarband('Player 2');
      coordinator.createGame(wb1, wb2, 'skirmish');

      // Skip setup phase for both players
      skipSetupPhase(coordinator);
    });

    it('should be in recovery phase after setup', () => {
      expect(coordinator.getState()?.phase).toBe('recovery');
      expect(coordinator.getState()?.currentPlayer).toBe(1);
    });

    it('should alternate players within recovery phase', () => {
      // Player 1 advances
      coordinator.processEvent(
        createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {})
      );

      expect(coordinator.getState()?.phase).toBe('recovery');
      expect(coordinator.getState()?.currentPlayer).toBe(2);
    });

    it('should advance to movement after both players complete recovery', () => {
      // Player 1 advances
      coordinator.processEvent(
        createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {})
      );
      // Player 2 advances
      coordinator.processEvent(
        createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {})
      );

      expect(coordinator.getState()?.phase).toBe('movement');
      expect(coordinator.getState()?.currentPlayer).toBe(1);
    });

    it('should advance through full turn cycle', () => {
      const phases = ['recovery', 'movement', 'shooting', 'combat'];

      // Verify starting state
      expect(coordinator.getState()?.phase).toBe('recovery');
      expect(coordinator.getState()?.turn).toBe(1);

      // Go through all phases (each player must advance)
      for (const expectedPhase of phases) {
        expect(coordinator.getState()?.phase).toBe(expectedPhase);

        // Player 1 advances
        coordinator.processEvent(
          createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {})
        );
        // Player 2 advances
        coordinator.processEvent(
          createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {})
        );
      }

      // Should be turn 2, recovery phase
      expect(coordinator.getState()?.turn).toBe(2);
      expect(coordinator.getState()?.phase).toBe('recovery');
    });
  });

  describe('Movement Phase', () => {
    beforeEach(() => {
      const wb1 = createTestWarband('Player 1');
      const wb2 = createTestWarband('Player 2');
      coordinator.createGame(wb1, wb2, 'skirmish');
      skipSetupPhase(coordinator);
      advanceToPhase(coordinator, 'movement');
    });

    it('should be in movement phase', () => {
      expect(coordinator.getState()?.phase).toBe('movement');
    });

    it('should select warrior for movement', () => {
      const state = coordinator.getState()!;
      const warriorId = state.warbands[0].warriors[0].id;

      const result = coordinator.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId })
      );

      expect(result.success).toBe(true);
      expect(result.screenCommand.screen).toBe('MOVEMENT_PHASE');
    });

    it('should move warrior', () => {
      const state = coordinator.getState()!;
      const warriorId = state.warbands[0].warriors[0].id;

      // Select
      coordinator.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId })
      );

      // Move
      const result = coordinator.processEvent(
        createTestEvent<ConfirmMoveEvent>('CONFIRM_MOVE', { moveType: 'move' })
      );

      expect(result.success).toBe(true);
      expect(state.warbands[0].warriors[0].hasMoved).toBe(true);
    });

    it('should run warrior', () => {
      const state = coordinator.getState()!;
      const warriorId = state.warbands[0].warriors[0].id;

      // Select
      coordinator.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId })
      );

      // Run
      const result = coordinator.processEvent(
        createTestEvent<ConfirmMoveEvent>('CONFIRM_MOVE', { moveType: 'run' })
      );

      expect(result.success).toBe(true);
      expect(state.warbands[0].warriors[0].hasMoved).toBe(true);
      expect(state.warbands[0].warriors[0].hasRun).toBe(true);
    });

    it('should charge enemy warrior', () => {
      const state = coordinator.getState()!;
      const attackerId = state.warbands[0].warriors[0].id;
      const targetId = state.warbands[1].warriors[0].id;

      // Select attacker
      coordinator.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: attackerId })
      );

      // Charge target
      const result = coordinator.processEvent(
        createTestEvent<ConfirmChargeEvent>('CONFIRM_CHARGE', { targetId })
      );

      expect(result.success).toBe(true);
      expect(state.warbands[0].warriors[0].hasCharged).toBe(true);
      expect(state.warbands[0].warriors[0].combatState.inCombat).toBe(true);
      expect(state.warbands[1].warriors[0].combatState.inCombat).toBe(true);
    });

    it('should not allow moving twice', () => {
      const state = coordinator.getState()!;
      const warriorId = state.warbands[0].warriors[0].id;

      // First move
      coordinator.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId })
      );
      coordinator.processEvent(
        createTestEvent<ConfirmMoveEvent>('CONFIRM_MOVE', { moveType: 'move' })
      );

      // Try to select again for move
      const result = coordinator.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId })
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Warrior cannot move');
    });
  });

  describe('Undo', () => {
    it('should reset to initial state', () => {
      const wb1 = createTestWarband('Player 1');
      const wb2 = createTestWarband('Player 2');
      coordinator.createGame(wb1, wb2, 'skirmish');

      const state = coordinator.getState()!;
      const warriorId = state.warbands[0].warriors[0].id;

      // Make some changes in setup phase
      coordinator.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId })
      );
      coordinator.processEvent(
        createTestEvent<ConfirmPositionEvent>('CONFIRM_POSITION', {})
      );

      expect(coordinator.getHistory().length).toBeGreaterThan(0);

      // Reset
      const result = coordinator.resetToInitialState();

      expect(result.success).toBe(true);
      expect(coordinator.getState()?.phase).toBe('setup');
      expect(coordinator.getHistory()).toHaveLength(0);
    });

    it('should undo to specific event', () => {
      const wb1 = createTestWarband('Player 1');
      const wb2 = createTestWarband('Player 2');
      coordinator.createGame(wb1, wb2, 'skirmish');

      const state = coordinator.getState()!;
      const warriorId = state.warbands[0].warriors[0].id;

      // First action
      coordinator.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId })
      );
      const firstEventId = coordinator.getHistory()[0].id;

      // Second action
      coordinator.processEvent(
        createTestEvent<ConfirmPositionEvent>('CONFIRM_POSITION', {})
      );

      expect(coordinator.getHistory().length).toBe(2);

      // Undo to first event
      const result = coordinator.undoToEvent(firstEventId);

      expect(result.success).toBe(true);
      expect(coordinator.getHistory().length).toBe(1);
    });

    it('should fail undo when no initial state available', () => {
      // Create a new coordinator without calling createGame
      const emptyCoordinator = new PhaseCoordinator();

      const result = emptyCoordinator.resetToInitialState();

      expect(result.success).toBe(false);
      expect(result.error).toContain('no initial state');
    });
  });

  describe('Serialization', () => {
    it('should serialize game state', () => {
      const wb1 = createTestWarband('Player 1');
      const wb2 = createTestWarband('Player 2');
      coordinator.createGame(wb1, wb2, 'skirmish');

      const serialized = coordinator.serialize();

      expect(serialized.state).toBeDefined();
      expect(serialized.history).toBeDefined();
      expect(serialized.state.warbands[0].name).toBe('Player 1');
    });

    it('should load serialized game state', () => {
      const wb1 = createTestWarband('Player 1');
      const wb2 = createTestWarband('Player 2');
      coordinator.createGame(wb1, wb2, 'skirmish');
      skipSetupPhase(coordinator);

      const serialized = coordinator.serialize();

      // Create new coordinator and load
      const newCoordinator = new PhaseCoordinator();
      newCoordinator.loadGame(serialized.state, serialized.history);

      expect(newCoordinator.getState()?.phase).toBe(serialized.state.phase);
      expect(newCoordinator.getHistory().length).toBe(serialized.history.length);
    });
  });

  describe('IGameEngine Interface Compliance', () => {
    it('should implement all IGameEngine methods', () => {
      // Check that all methods exist
      expect(typeof coordinator.createGame).toBe('function');
      expect(typeof coordinator.loadGame).toBe('function');
      expect(typeof coordinator.processEvent).toBe('function');
      expect(typeof coordinator.getCurrentScreen).toBe('function');
      expect(typeof coordinator.getState).toBe('function');
      expect(typeof coordinator.getHistory).toBe('function');
      expect(typeof coordinator.serialize).toBe('function');
      expect(typeof coordinator.undoToEvent).toBe('function');
      expect(typeof coordinator.undoLastEvents).toBe('function');
      expect(typeof coordinator.resetToInitialState).toBe('function');
    });

    it('should return ProcessResult from processEvent', () => {
      const wb1 = createTestWarband('Player 1');
      const wb2 = createTestWarband('Player 2');
      coordinator.createGame(wb1, wb2, 'skirmish');

      const state = coordinator.getState()!;
      const warriorId = state.warbands[0].warriors[0].id;

      const result = coordinator.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId })
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('stateChanged');
      expect(result).toHaveProperty('screenCommand');
    });
  });
});

// Helper functions

function skipSetupPhase(coordinator: PhaseCoordinator): void {
  const state = coordinator.getState()!;

  // Player 1 setup
  for (const warrior of state.warbands[0].warriors) {
    coordinator.processEvent(
      createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id })
    );
    coordinator.processEvent(
      createTestEvent<ConfirmPositionEvent>('CONFIRM_POSITION', {})
    );
  }
  coordinator.processEvent(
    createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {})
  );

  // Player 2 setup
  for (const warrior of state.warbands[1].warriors) {
    coordinator.processEvent(
      createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id })
    );
    coordinator.processEvent(
      createTestEvent<ConfirmPositionEvent>('CONFIRM_POSITION', {})
    );
  }
  coordinator.processEvent(
    createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {})
  );
}

function advanceToPhase(coordinator: PhaseCoordinator, targetPhase: string): void {
  const phases = ['recovery', 'movement', 'shooting', 'combat'];
  const currentPhase = coordinator.getState()?.phase;
  const currentIndex = phases.indexOf(currentPhase as string);
  const targetIndex = phases.indexOf(targetPhase);

  if (currentIndex === -1 || targetIndex === -1) return;

  // Advance through phases until we reach target
  for (let i = currentIndex; i < targetIndex; i++) {
    // Both players advance
    coordinator.processEvent(
      createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {})
    );
    coordinator.processEvent(
      createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {})
    );
  }
}
