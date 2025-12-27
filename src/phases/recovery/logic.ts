// Recovery Phase Module
// Handles rally, recover from stunned, and stand up actions

import type { GameState, GameWarrior, GameAction, GameWarband } from '../../types/game';
import type {
  GameEvent,
  EventType,
  SelectWarriorEvent,
  RecoveryActionEvent
} from '../../engine/types/events';
import type { ScreenCommand, RecoveryPhaseScreen } from '../../engine/types/screens';
import type { PhaseModule, PhaseContext, PhaseResult, AvailableAction } from '../shared/types';
import { successResult, errorResult } from '../shared/types';
import { toWarriorView, toWarbandView, getCurrentWarband, findWarrior, findWarriorView } from '../shared/viewModels';
import { generateActionId, addLog, canWarriorAct } from '../shared/stateUtils';
import { leadershipTest } from '../../engine/rules/combat';

// =====================================
// RECOVERY PHASE MODULE
// =====================================

export const recoveryPhase: PhaseModule = {
  phase: 'recovery',

  getSupportedEvents(): EventType[] {
    return ['SELECT_WARRIOR', 'DESELECT', 'RECOVERY_ACTION'];
  },

  processEvent(
    event: GameEvent,
    state: GameState,
    context: PhaseContext
  ): PhaseResult {
    switch (event.type) {
      case 'SELECT_WARRIOR':
        return handleSelectWarrior(event, state);

      case 'DESELECT':
        return handleDeselect();

      case 'RECOVERY_ACTION':
        return handleRecoveryAction(event, state);

      default:
        return errorResult(`Recovery phase cannot handle event: ${event.type}`);
    }
  },

  buildScreen(state: GameState, context: PhaseContext): ScreenCommand {
    const currentWarband = getCurrentWarband(state);
    const warbandIndex = state.currentPlayer - 1;

    // Get warriors needing recovery
    const { fleeing, stunned, knockedDown } = getWarriorsNeedingRecovery(currentWarband);
    const completedRecoveries = currentWarband.warriors
      .filter(w => w.hasRecovered)
      .map(w => w.id);

    const screen: RecoveryPhaseScreen = {
      screen: 'RECOVERY_PHASE',
      data: {
        currentPlayer: state.currentPlayer,
        warband: toWarbandView(currentWarband),
        fleeingWarriors: fleeing.map(w => toWarriorView(w, warbandIndex)),
        stunnedWarriors: stunned.map(w => toWarriorView(w, warbandIndex)),
        knockedDownWarriors: knockedDown.map(w => toWarriorView(w, warbandIndex)),
        completedRecoveries,
        selectedWarrior: context.selectedWarriorId
          ? findWarriorView(state, context.selectedWarriorId)
          : null
      },
      availableEvents: ['SELECT_WARRIOR', 'RECOVERY_ACTION', 'ADVANCE_PHASE'],
      turn: state.turn,
      phase: state.phase,
      currentPlayer: state.currentPlayer,
      gameId: state.id
    };

    return screen;
  }
};

// =====================================
// EVENT HANDLERS
// =====================================

function handleSelectWarrior(
  event: SelectWarriorEvent,
  state: GameState
): PhaseResult {
  const { warriorId } = event.payload;

  // Verify warrior exists
  const result = findWarrior(state, warriorId);
  if (!result) {
    return errorResult('Warrior not found');
  }

  // Verify warrior belongs to current player
  if (result.warbandIndex !== state.currentPlayer - 1) {
    return errorResult('Cannot select opponent warrior');
  }

  // Verify warrior needs recovery
  if (!canWarriorAct(result.warrior, 'recovery')) {
    return errorResult('Warrior does not need recovery');
  }

  return successResult(true, {
    selectedWarriorId: warriorId,
    selectedTargetId: null
  });
}

function handleDeselect(): PhaseResult {
  return successResult(true, {
    selectedWarriorId: null,
    selectedTargetId: null
  });
}

function handleRecoveryAction(
  event: RecoveryActionEvent,
  state: GameState
): PhaseResult {
  const { action, warriorId } = event.payload;
  const warbandIndex = state.currentPlayer - 1;

  // Verify warrior exists and belongs to current player
  const result = findWarrior(state, warriorId);
  if (!result) {
    return errorResult('Warrior not found');
  }
  if (result.warbandIndex !== warbandIndex) {
    return errorResult('Cannot perform recovery on opponent warrior');
  }

  try {
    switch (action) {
      case 'rally':
        if (result.warrior.gameStatus !== 'fleeing') {
          return errorResult('Warrior is not fleeing');
        }
        rallyWarrior(state, warbandIndex, warriorId);
        break;

      case 'recoverFromStunned':
        if (result.warrior.gameStatus !== 'stunned') {
          return errorResult('Warrior is not stunned');
        }
        recoverFromStunned(state, warbandIndex, warriorId);
        break;

      case 'standUp':
        if (result.warrior.gameStatus !== 'knockedDown') {
          return errorResult('Warrior is not knocked down');
        }
        standUpWarrior(state, warbandIndex, warriorId);
        break;

      default:
        return errorResult(`Unknown recovery action: ${action}`);
    }
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : 'Recovery action failed');
  }

  // Deselect after action
  return successResult(true, {
    selectedWarriorId: null
  });
}

// =====================================
// RECOVERY ACTIONS
// =====================================

/**
 * Rally a fleeing warrior using a Leadership test
 */
function rallyWarrior(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string
): { success: boolean; roll: number; leadershipNeeded: number } {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior || warrior.gameStatus !== 'fleeing') {
    throw new Error('Warrior is not fleeing and cannot rally');
  }

  // Store previous state for undo
  const previousState: Partial<GameWarrior> = {
    gameStatus: warrior.gameStatus,
    hasRecovered: warrior.hasRecovered
  };

  // Roll Leadership test (2D6 <= Ld)
  const leadershipValue = warrior.profile.Ld;
  const testResult = leadershipTest(leadershipValue);

  // Create action record
  const action: GameAction = {
    id: generateActionId(),
    type: 'rally',
    timestamp: new Date().toISOString(),
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    warriorId,
    warbandIndex,
    previousState,
    diceRolls: [{ roll: testResult.roll, needed: leadershipValue, success: testResult.success }],
    description: testResult.success
      ? `${warrior.name || warrior.type} rallies successfully (rolled ${testResult.roll} vs Ld ${leadershipValue})`
      : `${warrior.name || warrior.type} fails to rally (rolled ${testResult.roll} vs Ld ${leadershipValue})`
  };

  // Apply result
  if (testResult.success) {
    warrior.gameStatus = 'standing';
  }
  warrior.hasRecovered = true;

  // Record action
  gameState.actionHistory.push(action);
  addLog(gameState, action.description);

  return {
    success: testResult.success,
    roll: testResult.roll,
    leadershipNeeded: leadershipValue
  };
}

/**
 * Recover a stunned warrior - automatically becomes knocked down
 */
function recoverFromStunned(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string
): void {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior || warrior.gameStatus !== 'stunned') {
    throw new Error('Warrior is not stunned');
  }

  // Store previous state for undo
  const previousState: Partial<GameWarrior> = {
    gameStatus: warrior.gameStatus,
    hasRecovered: warrior.hasRecovered
  };

  // Create action record
  const action: GameAction = {
    id: generateActionId(),
    type: 'recoverFromStunned',
    timestamp: new Date().toISOString(),
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    warriorId,
    warbandIndex,
    previousState,
    description: `${warrior.name || warrior.type} recovers from stunned to knocked down`
  };

  // Apply result
  warrior.gameStatus = 'knockedDown';
  warrior.hasRecovered = true;

  // Record action
  gameState.actionHistory.push(action);
  addLog(gameState, action.description);
}

/**
 * Stand up a knocked down warrior - gains half movement and strikes last
 * Cannot stand up if engaged with standing enemies
 */
function standUpWarrior(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string
): void {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior || warrior.gameStatus !== 'knockedDown') {
    throw new Error('Warrior is not knocked down');
  }

  // Check if warrior is in combat - cannot stand up freely if engaged
  if (warrior.combatState.inCombat && warrior.combatState.engagedWith.length > 0) {
    throw new Error('Warrior is engaged in combat and cannot stand up freely');
  }

  // Store previous state for undo
  const previousState: Partial<GameWarrior> = {
    gameStatus: warrior.gameStatus,
    hasRecovered: warrior.hasRecovered,
    halfMovement: warrior.halfMovement,
    strikesLast: warrior.strikesLast
  };

  // Create action record
  const action: GameAction = {
    id: generateActionId(),
    type: 'standUp',
    timestamp: new Date().toISOString(),
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    warriorId,
    warbandIndex,
    previousState,
    description: `${warrior.name || warrior.type} stands up (half movement, strikes last this turn)`
  };

  // Apply result
  warrior.gameStatus = 'standing';
  warrior.hasRecovered = true;
  warrior.halfMovement = true;
  warrior.strikesLast = true;

  // Record action
  gameState.actionHistory.push(action);
  addLog(gameState, action.description);
}

// =====================================
// QUERY HELPERS
// =====================================

/**
 * Get available recovery actions for a warrior
 */
export function getRecoveryAvailableActions(warrior: GameWarrior): AvailableAction[] {
  const actions: AvailableAction[] = [];

  if (warrior.hasRecovered) return actions;

  if (warrior.gameStatus === 'fleeing') {
    actions.push({ type: 'rally', description: 'Rally (Leadership test)', requiresTarget: false });
  }
  if (warrior.gameStatus === 'stunned') {
    actions.push({ type: 'recoverFromStunned', description: 'Recover (becomes knocked down)', requiresTarget: false });
  }
  if (warrior.gameStatus === 'knockedDown' && !warrior.combatState.inCombat) {
    actions.push({ type: 'standUp', description: 'Stand up (half move, strikes last)', requiresTarget: false });
  }

  return actions;
}

/**
 * Get warriors that need recovery actions in the recovery phase
 */
export function getWarriorsNeedingRecovery(warband: GameWarband): {
  fleeing: GameWarrior[];
  stunned: GameWarrior[];
  knockedDown: GameWarrior[];
} {
  return {
    fleeing: warband.warriors.filter(w => w.gameStatus === 'fleeing' && !w.hasRecovered),
    stunned: warband.warriors.filter(w => w.gameStatus === 'stunned' && !w.hasRecovered),
    knockedDown: warband.warriors.filter(w => w.gameStatus === 'knockedDown' && !w.hasRecovered)
  };
}

/**
 * Check if all warriors have completed recovery actions
 */
export function isRecoveryPhaseComplete(warband: GameWarband): boolean {
  const { fleeing, stunned, knockedDown } = getWarriorsNeedingRecovery(warband);
  return fleeing.length === 0 && stunned.length === 0 && knockedDown.length === 0;
}

export default recoveryPhase;
