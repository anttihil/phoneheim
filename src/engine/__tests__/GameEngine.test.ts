// GameEngine unit tests

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../GameEngine';
import {
  createTestWarband,
  createTestGameState,
  resetIdCounter,
  createTestEvent
} from './testHelpers';
import type { SelectWarriorEvent, ConfirmMoveEvent, AdvancePhaseEvent } from '../types/events';

describe('GameEngine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    resetIdCounter();
    engine = new GameEngine();
  });

  describe('createGame', () => {
    it('should initialize game state with two warbands', () => {
      const wb1 = createTestWarband('Warband 1');
      const wb2 = createTestWarband('Warband 2');

      engine.createGame(wb1, wb2, 'skirmish');

      const state = engine.getState();
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

      engine.createGame(wb1, wb2, 'skirmish');

      // Create another game
      const wb3 = createTestWarband('Third');
      const wb4 = createTestWarband('Fourth');
      engine.createGame(wb3, wb4, 'streetFight');

      const state = engine.getState();
      expect(state?.warbands[0].name).toBe('Third');
      expect(engine.getHistory()).toHaveLength(0);
      expect(engine.getSelectedWarriorId()).toBeNull();
    });
  });

  describe('getCurrentScreen', () => {
    it('should return error screen when no game is active', () => {
      const screen = engine.getCurrentScreen();
      expect(screen.screen).toBe('ERROR');
      expect(screen.data.message).toBe('No active game');
    });

    it('should return setup screen for new game', () => {
      const wb1 = createTestWarband('Test 1');
      const wb2 = createTestWarband('Test 2');
      engine.createGame(wb1, wb2, 'skirmish');

      const screen = engine.getCurrentScreen();
      expect(screen.screen).toBe('GAME_SETUP');
      expect(screen.phase).toBe('setup');
      expect(screen.currentPlayer).toBe(1);
    });
  });

  describe('SELECT_WARRIOR event', () => {
    beforeEach(() => {
      const wb1 = createTestWarband('Player 1');
      const wb2 = createTestWarband('Player 2');
      engine.createGame(wb1, wb2, 'skirmish');
    });

    it('should select a warrior from current player warband', () => {
      const state = engine.getState()!;
      const warriorId = state.warbands[0].warriors[0].id;

      const result = engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId }, { playerId: 'p1' })
      );

      expect(result.success).toBe(true);
      expect(engine.getSelectedWarriorId()).toBe(warriorId);
    });

    it('should fail to select warrior from opponent warband', () => {
      const state = engine.getState()!;
      const opponentWarriorId = state.warbands[1].warriors[0].id;

      const result = engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: opponentWarriorId }, { playerId: 'p1' })
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot select opponent warrior');
    });

    it('should fail with non-existent warrior', () => {
      const result = engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: 'invalid-id' }, { playerId: 'p1' })
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Warrior not found');
    });

    it('should update screen command with selected warrior', () => {
      const state = engine.getState()!;
      const warrior = state.warbands[0].warriors[0];

      engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id }, { playerId: 'p1' })
      );

      const screen = engine.getCurrentScreen();
      expect(screen.screen).toBe('GAME_SETUP');
      if (screen.screen === 'GAME_SETUP') {
        expect(screen.data.selectedWarrior).not.toBeNull();
        expect(screen.data.selectedWarrior?.id).toBe(warrior.id);
      }
    });
  });

  describe('DESELECT event', () => {
    beforeEach(() => {
      const wb1 = createTestWarband('Player 1');
      const wb2 = createTestWarband('Player 2');
      engine.createGame(wb1, wb2, 'skirmish');
    });

    it('should clear warrior selection', () => {
      const state = engine.getState()!;
      const warriorId = state.warbands[0].warriors[0].id;

      // First select
      engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId }, { playerId: 'p1' })
      );
      expect(engine.getSelectedWarriorId()).toBe(warriorId);

      // Then deselect
      const result = engine.processEvent(
        createTestEvent('DESELECT', {}, { playerId: 'p1' })
      );

      expect(result.success).toBe(true);
      expect(engine.getSelectedWarriorId()).toBeNull();
    });
  });

  describe('Movement Phase', () => {
    beforeEach(() => {
      const wb1 = createTestWarband('Player 1');
      const wb2 = createTestWarband('Player 2');
      engine.createGame(wb1, wb2, 'skirmish');

      // Advance through setup phase
      // Position all Player 1 warriors
      const state = engine.getState()!;
      for (const warrior of state.warbands[0].warriors) {
        engine.processEvent(
          createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id }, { playerId: 'p1' })
        );
        engine.processEvent(
          createTestEvent('CONFIRM_POSITION', {}, { playerId: 'p1' })
        );
      }

      // Advance to Player 2 setup
      engine.processEvent(
        createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {}, { playerId: 'p1' })
      );

      // Position all Player 2 warriors
      for (const warrior of state.warbands[1].warriors) {
        engine.processEvent(
          createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id }, { playerId: 'p2' })
        );
        engine.processEvent(
          createTestEvent('CONFIRM_POSITION', {}, { playerId: 'p2' })
        );
      }

      // Advance to recovery phase
      engine.processEvent(
        createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {}, { playerId: 'p2' })
      );

      // Skip Player 1 recovery (no warriors need recovery)
      engine.processEvent(
        createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {}, { playerId: 'p1' })
      );

      // Skip Player 2 recovery
      engine.processEvent(
        createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {}, { playerId: 'p2' })
      );

      // Now in movement phase
      expect(engine.getState()!.phase).toBe('movement');
    });

    it('should show movement phase screen', () => {
      const screen = engine.getCurrentScreen();
      expect(screen.screen).toBe('MOVEMENT_PHASE');
      expect(screen.phase).toBe('movement');
    });

    it('should list actable warriors in movement screen', () => {
      const screen = engine.getCurrentScreen();
      expect(screen.screen).toBe('MOVEMENT_PHASE');

      if (screen.screen === 'MOVEMENT_PHASE') {
        // All warriors should be actable since none have moved
        expect(screen.data.actableWarriors.length).toBeGreaterThan(0);
      }
    });

    it('should move a warrior when CONFIRM_MOVE is processed', () => {
      const state = engine.getState()!;
      const warrior = state.warbands[0].warriors[0];

      // Select warrior
      engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id }, { playerId: 'p1' })
      );

      // Confirm move
      const result = engine.processEvent(
        createTestEvent<ConfirmMoveEvent>('CONFIRM_MOVE', { moveType: 'move' }, { playerId: 'p1' })
      );

      expect(result.success).toBe(true);

      // Warrior should be marked as moved
      const updatedState = engine.getState()!;
      const movedWarrior = updatedState.warbands[0].warriors.find(w => w.id === warrior.id);
      expect(movedWarrior?.hasMoved).toBe(true);
    });

    it('should mark warrior as run when move type is run', () => {
      const state = engine.getState()!;
      const warrior = state.warbands[0].warriors[0];

      engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id }, { playerId: 'p1' })
      );

      engine.processEvent(
        createTestEvent<ConfirmMoveEvent>('CONFIRM_MOVE', { moveType: 'run' }, { playerId: 'p1' })
      );

      const updatedState = engine.getState()!;
      const runWarrior = updatedState.warbands[0].warriors.find(w => w.id === warrior.id);
      expect(runWarrior?.hasMoved).toBe(true);
      expect(runWarrior?.hasRun).toBe(true);
    });

    it('should deselect warrior after move', () => {
      const state = engine.getState()!;
      const warrior = state.warbands[0].warriors[0];

      engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id }, { playerId: 'p1' })
      );

      engine.processEvent(
        createTestEvent<ConfirmMoveEvent>('CONFIRM_MOVE', { moveType: 'move' }, { playerId: 'p1' })
      );

      expect(engine.getSelectedWarriorId()).toBeNull();
    });

    it('should not include moved warriors in actable list', () => {
      const state = engine.getState()!;
      const warrior = state.warbands[0].warriors[0];

      // Move warrior
      engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id }, { playerId: 'p1' })
      );
      engine.processEvent(
        createTestEvent<ConfirmMoveEvent>('CONFIRM_MOVE', { moveType: 'move' }, { playerId: 'p1' })
      );

      // Check screen
      const screen = engine.getCurrentScreen();
      if (screen.screen === 'MOVEMENT_PHASE') {
        const actableIds = screen.data.actableWarriors.map(w => w.id);
        expect(actableIds).not.toContain(warrior.id);
      }
    });

    it('should show charge targets when warrior is selected', () => {
      const state = engine.getState()!;
      const warrior = state.warbands[0].warriors[0];

      engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id }, { playerId: 'p1' })
      );

      const screen = engine.getCurrentScreen();
      if (screen.screen === 'MOVEMENT_PHASE') {
        expect(screen.data.chargeTargets.length).toBeGreaterThan(0);
        expect(screen.data.canCharge).toBe(true);
      }
    });
  });

  describe('ADVANCE_PHASE event', () => {
    beforeEach(() => {
      const wb1 = createTestWarband('Player 1');
      const wb2 = createTestWarband('Player 2');
      engine.createGame(wb1, wb2, 'skirmish');
    });

    it('should switch current player in setup phase', () => {
      const state = engine.getState()!;

      // Position all P1 warriors
      for (const warrior of state.warbands[0].warriors) {
        engine.processEvent(
          createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id }, { playerId: 'p1' })
        );
        engine.processEvent(
          createTestEvent('CONFIRM_POSITION', {}, { playerId: 'p1' })
        );
      }

      // Advance phase
      engine.processEvent(
        createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {}, { playerId: 'p1' })
      );

      // Should now be Player 2's turn in setup
      expect(engine.getState()!.currentPlayer).toBe(2);
      expect(engine.getState()!.phase).toBe('setup');
    });

    it('should record events in history', () => {
      const state = engine.getState()!;
      const warrior = state.warbands[0].warriors[0];

      engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id }, { playerId: 'p1' })
      );

      const history = engine.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].type).toBe('SELECT_WARRIOR');
    });
  });

  describe('Recovery Phase', () => {
    beforeEach(() => {
      const wb1 = createTestWarband('Player 1');
      const wb2 = createTestWarband('Player 2');
      engine.createGame(wb1, wb2, 'skirmish');

      // Fast-forward to recovery phase
      const state = engine.getState()!;

      // Complete setup for both players
      for (const warrior of state.warbands[0].warriors) {
        engine.processEvent(
          createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id }, { playerId: 'p1' })
        );
        engine.processEvent(
          createTestEvent('CONFIRM_POSITION', {}, { playerId: 'p1' })
        );
      }
      engine.processEvent(createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {}, { playerId: 'p1' }));

      for (const warrior of state.warbands[1].warriors) {
        engine.processEvent(
          createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id }, { playerId: 'p2' })
        );
        engine.processEvent(
          createTestEvent('CONFIRM_POSITION', {}, { playerId: 'p2' })
        );
      }
      engine.processEvent(createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {}, { playerId: 'p2' }));

      // Now in recovery phase
      expect(engine.getState()!.phase).toBe('recovery');
    });

    it('should show recovery phase screen', () => {
      const screen = engine.getCurrentScreen();
      expect(screen.screen).toBe('RECOVERY_PHASE');
    });

    it('should recover stunned warrior to knocked down', () => {
      const state = engine.getState()!;
      const warrior = state.warbands[0].warriors[0];

      // Manually set warrior to stunned for testing
      warrior.gameStatus = 'stunned';
      warrior.hasRecovered = false;

      const result = engine.processEvent(
        createTestEvent('RECOVERY_ACTION', {
          action: 'recoverFromStunned',
          warriorId: warrior.id
        }, { playerId: 'p1' })
      );

      expect(result.success).toBe(true);
      expect(warrior.gameStatus).toBe('knockedDown');
      expect(warrior.hasRecovered).toBe(true);
    });

    it('should stand up knocked down warrior', () => {
      const state = engine.getState()!;
      const warrior = state.warbands[0].warriors[0];

      // Manually set warrior to knocked down for testing
      warrior.gameStatus = 'knockedDown';
      warrior.hasRecovered = false;

      const result = engine.processEvent(
        createTestEvent('RECOVERY_ACTION', {
          action: 'standUp',
          warriorId: warrior.id
        }, { playerId: 'p1' })
      );

      expect(result.success).toBe(true);
      expect(warrior.gameStatus).toBe('standing');
      expect(warrior.hasRecovered).toBe(true);
      expect(warrior.halfMovement).toBe(true);
      expect(warrior.strikesLast).toBe(true);
    });

    it('should rally fleeing warrior on successful leadership test', () => {
      const state = engine.getState()!;
      const warrior = state.warbands[0].warriors[0];

      // Manually set warrior to fleeing for testing
      warrior.gameStatus = 'fleeing';
      warrior.hasRecovered = false;

      const result = engine.processEvent(
        createTestEvent('RECOVERY_ACTION', {
          action: 'rally',
          warriorId: warrior.id
        }, { playerId: 'p1' })
      );

      expect(result.success).toBe(true);
      expect(warrior.hasRecovered).toBe(true);
      // Result depends on dice roll - warrior may be standing or still fleeing
    });

    it('should fail if warrior is not in correct state for action', () => {
      const state = engine.getState()!;
      const warrior = state.warbands[0].warriors[0];

      // Warrior is standing, cannot recover from stunned
      expect(warrior.gameStatus).toBe('standing');

      const result = engine.processEvent(
        createTestEvent('RECOVERY_ACTION', {
          action: 'recoverFromStunned',
          warriorId: warrior.id
        }, { playerId: 'p1' })
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Warrior is not stunned');
    });

    it('should list warriors needing recovery in screen data', () => {
      const state = engine.getState()!;

      // Set up some warriors needing recovery
      state.warbands[0].warriors[0].gameStatus = 'stunned';
      state.warbands[0].warriors[0].hasRecovered = false;
      state.warbands[0].warriors[1].gameStatus = 'knockedDown';
      state.warbands[0].warriors[1].hasRecovered = false;

      const screen = engine.getCurrentScreen();
      expect(screen.screen).toBe('RECOVERY_PHASE');

      if (screen.screen === 'RECOVERY_PHASE') {
        expect(screen.data.stunnedWarriors.length).toBe(1);
        expect(screen.data.knockedDownWarriors.length).toBe(1);
      }
    });
  });

  describe('Shooting Phase', () => {
    beforeEach(() => {
      const wb1 = createTestWarband('Player 1');
      const wb2 = createTestWarband('Player 2');
      engine.createGame(wb1, wb2, 'skirmish');

      // Fast-forward to shooting phase
      const state = engine.getState()!;

      // Complete setup for both players
      for (const warrior of state.warbands[0].warriors) {
        engine.processEvent(
          createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id }, { playerId: 'p1' })
        );
        engine.processEvent(
          createTestEvent('CONFIRM_POSITION', {}, { playerId: 'p1' })
        );
      }
      engine.processEvent(createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {}, { playerId: 'p1' }));

      for (const warrior of state.warbands[1].warriors) {
        engine.processEvent(
          createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id }, { playerId: 'p2' })
        );
        engine.processEvent(
          createTestEvent('CONFIRM_POSITION', {}, { playerId: 'p2' })
        );
      }
      engine.processEvent(createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {}, { playerId: 'p2' }));

      // Skip recovery and movement phases
      engine.processEvent(createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {}, { playerId: 'p1' }));
      engine.processEvent(createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {}, { playerId: 'p2' }));
      engine.processEvent(createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {}, { playerId: 'p1' }));
      engine.processEvent(createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {}, { playerId: 'p2' }));

      // Now in shooting phase
      expect(engine.getState()!.phase).toBe('shooting');
    });

    it('should show shooting phase screen', () => {
      const screen = engine.getCurrentScreen();
      expect(screen.screen).toBe('SHOOTING_PHASE');
    });

    it('should execute shot and show combat resolution', () => {
      const state = engine.getState()!;
      const shooter = state.warbands[0].warriors[0];
      const target = state.warbands[1].warriors[0];

      // Give shooter a ranged weapon
      shooter.equipment.ranged = ['bow'];

      // Select shooter
      engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: shooter.id }, { playerId: 'p1' })
      );

      // Confirm shot
      const result = engine.processEvent(
        createTestEvent('CONFIRM_SHOT', { targetId: target.id }, { playerId: 'p1' })
      );

      expect(result.success).toBe(true);

      // Should show combat resolution screen
      const screen = engine.getCurrentScreen();
      expect(screen.screen).toBe('COMBAT_RESOLUTION');
    });

    it('should return to shooting phase after acknowledging resolution', () => {
      const state = engine.getState()!;
      const shooter = state.warbands[0].warriors[0];
      const target = state.warbands[1].warriors[0];

      shooter.equipment.ranged = ['bow'];

      engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: shooter.id }, { playerId: 'p1' })
      );
      engine.processEvent(
        createTestEvent('CONFIRM_SHOT', { targetId: target.id }, { playerId: 'p1' })
      );

      // Acknowledge resolution
      engine.processEvent(
        createTestEvent('ACKNOWLEDGE', {}, { playerId: 'p1' })
      );

      // Should be back to shooting phase (or rout test if target was killed)
      let screen = engine.getCurrentScreen();

      // Handle any pending rout tests first
      while (screen.screen === 'ROUT_TEST') {
        engine.processEvent(
          createTestEvent('ACKNOWLEDGE', {}, { playerId: 'p1' })
        );
        screen = engine.getCurrentScreen();
      }

      expect(screen.screen).toBe('SHOOTING_PHASE');
    });

    it('should mark shooter as having shot', () => {
      const state = engine.getState()!;
      const shooter = state.warbands[0].warriors[0];
      const target = state.warbands[1].warriors[0];

      shooter.equipment.ranged = ['bow'];

      engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: shooter.id }, { playerId: 'p1' })
      );
      engine.processEvent(
        createTestEvent('CONFIRM_SHOT', { targetId: target.id }, { playerId: 'p1' })
      );

      expect(shooter.hasShot).toBe(true);
    });
  });

  describe('Combat Phase', () => {
    beforeEach(() => {
      const wb1 = createTestWarband('Player 1');
      const wb2 = createTestWarband('Player 2');
      engine.createGame(wb1, wb2, 'skirmish');

      // Fast-forward to combat phase
      const state = engine.getState()!;

      // Complete setup for both players
      for (const warrior of state.warbands[0].warriors) {
        engine.processEvent(
          createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id }, { playerId: 'p1' })
        );
        engine.processEvent(
          createTestEvent('CONFIRM_POSITION', {}, { playerId: 'p1' })
        );
      }
      engine.processEvent(createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {}, { playerId: 'p1' }));

      for (const warrior of state.warbands[1].warriors) {
        engine.processEvent(
          createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id }, { playerId: 'p2' })
        );
        engine.processEvent(
          createTestEvent('CONFIRM_POSITION', {}, { playerId: 'p2' })
        );
      }
      engine.processEvent(createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {}, { playerId: 'p2' }));

      // Skip recovery, movement, shooting phases for both players
      for (let i = 0; i < 6; i++) {
        engine.processEvent(createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {}, { playerId: i % 2 === 0 ? 'p1' : 'p2' }));
      }

      // Now in combat phase
      expect(engine.getState()!.phase).toBe('combat');
    });

    it('should show combat phase screen', () => {
      const screen = engine.getCurrentScreen();
      expect(screen.screen).toBe('COMBAT_PHASE');
    });

    it('should show empty strike order when no warriors in combat', () => {
      const screen = engine.getCurrentScreen();
      expect(screen.screen).toBe('COMBAT_PHASE');

      if (screen.screen === 'COMBAT_PHASE') {
        expect(screen.data.strikeOrder).toHaveLength(0);
        expect(screen.data.allFightersComplete).toBe(true);
        expect(screen.data.currentFighter).toBeNull();
      }
    });

    it('should build strike order when warriors are in combat', () => {
      const state = engine.getState()!;
      const attacker = state.warbands[0].warriors[0];
      const defender = state.warbands[1].warriors[0];

      // Set up combat engagement
      attacker.combatState.inCombat = true;
      attacker.combatState.engagedWith = [defender.id];
      defender.combatState.inCombat = true;
      defender.combatState.engagedWith = [attacker.id];

      const screen = engine.getCurrentScreen();
      expect(screen.screen).toBe('COMBAT_PHASE');

      if (screen.screen === 'COMBAT_PHASE') {
        expect(screen.data.strikeOrder.length).toBeGreaterThan(0);
        expect(screen.data.allFightersComplete).toBe(false);
        expect(screen.data.currentFighter).not.toBeNull();
      }
    });

    it('should order chargers first in strike order', () => {
      const state = engine.getState()!;
      const charger = state.warbands[0].warriors[0];
      const defender = state.warbands[1].warriors[0];

      // Set up combat with charger
      charger.combatState.inCombat = true;
      charger.combatState.engagedWith = [defender.id];
      charger.hasCharged = true;
      defender.combatState.inCombat = true;
      defender.combatState.engagedWith = [charger.id];

      const screen = engine.getCurrentScreen();
      expect(screen.screen).toBe('COMBAT_PHASE');

      if (screen.screen === 'COMBAT_PHASE') {
        // Charger should be first
        expect(screen.data.strikeOrder[0].warriorId).toBe(charger.id);
        expect(screen.data.strikeOrder[0].charged).toBe(true);
      }
    });

    it('should show melee targets for current fighter', () => {
      const state = engine.getState()!;
      const attacker = state.warbands[0].warriors[0];
      const defender = state.warbands[1].warriors[0];

      attacker.combatState.inCombat = true;
      attacker.combatState.engagedWith = [defender.id];
      attacker.profile.I = 10; // High initiative to go first
      defender.combatState.inCombat = true;
      defender.combatState.engagedWith = [attacker.id];
      defender.profile.I = 1; // Low initiative

      const screen = engine.getCurrentScreen();
      expect(screen.screen).toBe('COMBAT_PHASE');

      if (screen.screen === 'COMBAT_PHASE') {
        // Current fighter is attacker, so defender should be in melee targets
        expect(screen.data.currentFighter?.id).toBe(attacker.id);
        expect(screen.data.meleeTargets.length).toBeGreaterThan(0);
        expect(screen.data.meleeTargets.some(t => t.id === defender.id)).toBe(true);
      }
    });

    it('should execute melee attack and show combat resolution', () => {
      const state = engine.getState()!;
      const attacker = state.warbands[0].warriors[0];
      const defender = state.warbands[1].warriors[0];

      attacker.combatState.inCombat = true;
      attacker.combatState.engagedWith = [defender.id];
      attacker.profile.I = 10; // High initiative to go first
      defender.combatState.inCombat = true;
      defender.combatState.engagedWith = [attacker.id];
      defender.profile.I = 1;

      // Trigger screen to build strike order
      engine.getCurrentScreen();

      // Execute melee attack
      const result = engine.processEvent(
        createTestEvent('CONFIRM_MELEE', {
          targetId: defender.id,
          weaponKey: 'sword'
        }, { playerId: 'p1' })
      );

      expect(result.success).toBe(true);

      // Should show combat resolution
      const screen = engine.getCurrentScreen();
      expect(screen.screen).toBe('COMBAT_RESOLUTION');
    });

    it('should advance to next fighter after acknowledging attack', () => {
      const state = engine.getState()!;
      const fighter1 = state.warbands[0].warriors[0];
      const fighter2 = state.warbands[1].warriors[0];

      fighter1.combatState.inCombat = true;
      fighter1.combatState.engagedWith = [fighter2.id];
      fighter1.profile.I = 10;
      fighter2.combatState.inCombat = true;
      fighter2.combatState.engagedWith = [fighter1.id];
      fighter2.profile.I = 1;

      // Build strike order - verify initial state
      let screen = engine.getCurrentScreen();
      expect(screen.screen).toBe('COMBAT_PHASE');
      if (screen.screen === 'COMBAT_PHASE') {
        expect(screen.data.currentFighterIndex).toBe(0);
      }

      // First attack
      engine.processEvent(
        createTestEvent('CONFIRM_MELEE', {
          targetId: fighter2.id,
          weaponKey: 'sword'
        }, { playerId: 'p1' })
      );

      // Acknowledge combat resolution
      engine.processEvent(
        createTestEvent('ACKNOWLEDGE', {}, { playerId: 'p1' })
      );

      // Handle any pending rout tests
      screen = engine.getCurrentScreen();
      while (screen.screen === 'ROUT_TEST') {
        engine.processEvent(
          createTestEvent('ACKNOWLEDGE', {}, { playerId: 'p1' })
        );
        screen = engine.getCurrentScreen();
      }

      // Should now be at combat phase with index > 0
      expect(screen.screen).toBe('COMBAT_PHASE');

      if (screen.screen === 'COMBAT_PHASE') {
        // Index should be at least 1 (advanced from 0)
        expect(screen.data.currentFighterIndex).toBeGreaterThanOrEqual(1);
      }
    });

    it('should fail melee attack with invalid target', () => {
      const state = engine.getState()!;
      const attacker = state.warbands[0].warriors[0];
      const defender = state.warbands[1].warriors[0];
      const invalidTarget = state.warbands[1].warriors[1];

      attacker.combatState.inCombat = true;
      attacker.combatState.engagedWith = [defender.id]; // Only engaged with defender
      attacker.profile.I = 10;
      defender.combatState.inCombat = true;
      defender.combatState.engagedWith = [attacker.id];
      defender.profile.I = 1;

      // Build strike order
      engine.getCurrentScreen();

      // Try to attack invalid target
      const result = engine.processEvent(
        createTestEvent('CONFIRM_MELEE', {
          targetId: invalidTarget.id, // Not engaged with
          weaponKey: 'sword'
        }, { playerId: 'p1' })
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid melee target');
    });

    it('should show allFightersComplete when all fighters have acted', () => {
      const state = engine.getState()!;
      const fighter1 = state.warbands[0].warriors[0];
      const fighter2 = state.warbands[1].warriors[0];

      fighter1.combatState.inCombat = true;
      fighter1.combatState.engagedWith = [fighter2.id];
      fighter1.profile.I = 10;
      fighter2.combatState.inCombat = true;
      fighter2.combatState.engagedWith = [fighter1.id];
      fighter2.profile.I = 1;

      // Build strike order
      engine.getCurrentScreen();

      // First fighter attacks
      engine.processEvent(
        createTestEvent('CONFIRM_MELEE', { targetId: fighter2.id, weaponKey: 'sword' }, { playerId: 'p1' })
      );
      engine.processEvent(createTestEvent('ACKNOWLEDGE', {}, { playerId: 'p1' }));

      // Check if fighter2 is still standing and in combat (wasn't taken out)
      if (fighter2.gameStatus === 'standing' && fighter2.combatState.inCombat) {
        // Second fighter attacks
        engine.processEvent(
          createTestEvent('CONFIRM_MELEE', { targetId: fighter1.id, weaponKey: 'sword' }, { playerId: 'p2' })
        );
        engine.processEvent(createTestEvent('ACKNOWLEDGE', {}, { playerId: 'p2' }));
      }

      // After all attacks, we should be back at combat phase with all complete
      let screen = engine.getCurrentScreen();

      // Handle any pending resolutions or rout tests
      while (screen.screen === 'COMBAT_RESOLUTION' || screen.screen === 'ROUT_TEST') {
        engine.processEvent(createTestEvent('ACKNOWLEDGE', {}, { playerId: 'p1' }));
        screen = engine.getCurrentScreen();
      }

      // Now should be at combat phase
      expect(screen.screen).toBe('COMBAT_PHASE');

      if (screen.screen === 'COMBAT_PHASE') {
        expect(screen.data.allFightersComplete).toBe(true);
        expect(screen.availableEvents).toContain('ADVANCE_PHASE');
        expect(screen.availableEvents).not.toContain('CONFIRM_MELEE');
      }
    });

    it('should reset strike order when advancing out of combat phase', () => {
      const state = engine.getState()!;

      // No combat, can advance directly
      const screen = engine.getCurrentScreen();
      expect(screen.screen).toBe('COMBAT_PHASE');

      // Advance phase
      engine.processEvent(createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {}, { playerId: 'p1' }));

      // Should have moved to next phase/player
      const newState = engine.getState()!;
      expect(newState.phase !== 'combat' || newState.currentPlayer !== 1).toBe(true);
    });
  });

  describe('Undo Support', () => {
    beforeEach(() => {
      const wb1 = createTestWarband('Player 1');
      const wb2 = createTestWarband('Player 2');
      engine.createGame(wb1, wb2, 'skirmish');
    });

    it('should undo to a specific event', () => {
      const state = engine.getState()!;
      const warrior1 = state.warbands[0].warriors[0];
      const warrior2 = state.warbands[0].warriors[1];

      // Select first warrior
      engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior1.id }, { playerId: 'p1' })
      );
      const firstEventId = engine.getHistory()[0].id;

      // Position first warrior
      engine.processEvent(
        createTestEvent('CONFIRM_POSITION', {}, { playerId: 'p1' })
      );

      // Select second warrior
      engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior2.id }, { playerId: 'p1' })
      );

      // Should have 3 events
      expect(engine.getHistory()).toHaveLength(3);

      // Undo to first event
      const result = engine.undoToEvent(firstEventId);
      expect(result.success).toBe(true);

      // Should have only 1 event now
      expect(engine.getHistory()).toHaveLength(1);
      expect(engine.getHistory()[0].id).toBe(firstEventId);

      // First warrior should still be selected
      expect(engine.getSelectedWarriorId()).toBe(warrior1.id);
    });

    it('should undo the last N events', () => {
      const state = engine.getState()!;
      const warrior1 = state.warbands[0].warriors[0];
      const warrior2 = state.warbands[0].warriors[1];

      // Process some events
      engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior1.id }, { playerId: 'p1' })
      );
      engine.processEvent(
        createTestEvent('CONFIRM_POSITION', {}, { playerId: 'p1' })
      );
      engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior2.id }, { playerId: 'p1' })
      );

      expect(engine.getHistory()).toHaveLength(3);

      // Undo last 2 events
      const result = engine.undoLastEvents(2);
      expect(result.success).toBe(true);

      // Should have 1 event left
      expect(engine.getHistory()).toHaveLength(1);
    });

    it('should reset to initial state', () => {
      const state = engine.getState()!;
      const warrior1 = state.warbands[0].warriors[0];

      // Process some events
      engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior1.id }, { playerId: 'p1' })
      );
      engine.processEvent(
        createTestEvent('CONFIRM_POSITION', {}, { playerId: 'p1' })
      );
      engine.processEvent(
        createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {}, { playerId: 'p1' })
      );

      expect(engine.getHistory()).toHaveLength(3);
      expect(engine.getState()!.currentPlayer).toBe(2);

      // Reset to initial state
      const result = engine.resetToInitialState();
      expect(result.success).toBe(true);

      // Should be back to initial state
      expect(engine.getHistory()).toHaveLength(0);
      expect(engine.getState()!.currentPlayer).toBe(1);
      expect(engine.getState()!.phase).toBe('setup');
      expect(engine.getSelectedWarriorId()).toBeNull();
    });

    it('should fail undo with invalid event ID', () => {
      engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: engine.getState()!.warbands[0].warriors[0].id }, { playerId: 'p1' })
      );

      const result = engine.undoToEvent('invalid-id');
      expect(result.success).toBe(false);
      expect(result.error).toContain('target event not found');
    });

    it('should fail undoLastEvents with count greater than history length', () => {
      engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: engine.getState()!.warbands[0].warriors[0].id }, { playerId: 'p1' })
      );

      const result = engine.undoLastEvents(5);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot undo 5 events');
    });

    it('should undo all events when count equals history length', () => {
      const state = engine.getState()!;
      const warrior1 = state.warbands[0].warriors[0];

      engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior1.id }, { playerId: 'p1' })
      );
      engine.processEvent(
        createTestEvent('CONFIRM_POSITION', {}, { playerId: 'p1' })
      );

      expect(engine.getHistory()).toHaveLength(2);

      const result = engine.undoLastEvents(2);
      expect(result.success).toBe(true);
      expect(engine.getHistory()).toHaveLength(0);
    });

    it('should preserve game state consistency after undo', () => {
      // Complete setup for all warriors
      const state = engine.getState()!;
      for (const warrior of state.warbands[0].warriors) {
        engine.processEvent(
          createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior.id }, { playerId: 'p1' })
        );
        engine.processEvent(
          createTestEvent('CONFIRM_POSITION', {}, { playerId: 'p1' })
        );
      }

      // Advance phase
      engine.processEvent(
        createTestEvent<AdvancePhaseEvent>('ADVANCE_PHASE', {}, { playerId: 'p1' })
      );

      // Remember the event count and state after player 1 setup
      const setupCompleteEventCount = engine.getHistory().length;
      expect(engine.getState()!.currentPlayer).toBe(2);

      // Position one of player 2's warriors
      engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: state.warbands[1].warriors[0].id }, { playerId: 'p2' })
      );
      engine.processEvent(
        createTestEvent('CONFIRM_POSITION', {}, { playerId: 'p2' })
      );

      // Undo back to end of player 1's turn
      const targetEventId = engine.getHistory()[setupCompleteEventCount - 1].id;
      engine.undoToEvent(targetEventId);

      // Should still be player 2's turn after the advance phase
      expect(engine.getState()!.currentPlayer).toBe(2);
      expect(engine.getHistory()).toHaveLength(setupCompleteEventCount);

      // Player 2's warrior should not be positioned anymore
      const p2Warrior = engine.getState()!.warbands[1].warriors[0];
      expect(p2Warrior.hasActed).toBe(false);
    });

    it('should handle undo via UNDO event', () => {
      const state = engine.getState()!;
      const warrior1 = state.warbands[0].warriors[0];

      // Process first event
      engine.processEvent(
        createTestEvent<SelectWarriorEvent>('SELECT_WARRIOR', { warriorId: warrior1.id }, { playerId: 'p1' })
      );
      const firstEventId = engine.getHistory()[0].id;

      // Process second event
      engine.processEvent(
        createTestEvent('CONFIRM_POSITION', {}, { playerId: 'p1' })
      );

      expect(engine.getHistory()).toHaveLength(2);

      // Send UNDO event directly
      const result = engine.processEvent(
        createTestEvent('UNDO', { toEventId: firstEventId }, { playerId: 'p1' })
      );

      expect(result.success).toBe(true);
      expect(engine.getHistory()).toHaveLength(1);
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize game state', () => {
      const wb1 = createTestWarband('Player 1');
      const wb2 = createTestWarband('Player 2');
      engine.createGame(wb1, wb2, 'skirmish');

      const serialized = engine.serialize();
      expect(serialized.state).not.toBeNull();
      expect(serialized.history).toHaveLength(0);

      // Create new engine and load
      const engine2 = new GameEngine();
      engine2.loadGame(serialized.state, serialized.history);

      expect(engine2.getState()?.turn).toBe(1);
      expect(engine2.getState()?.phase).toBe('setup');
    });
  });
});
