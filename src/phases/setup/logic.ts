// Setup Phase Module
// Handles initial warrior positioning during game setup

import type { GameState, GameWarrior } from '../../types/game';
import type { GameEvent, EventType, SelectWarriorEvent, ConfirmPositionEvent } from '../../engine/types/events';
import type { ScreenCommand, GameSetupScreen } from '../../engine/types/screens';
import type { PhaseModule, PhaseContext, PhaseResult, AvailableAction } from '../shared/types';
import { successResult, errorResult } from '../shared/types';
import { toWarriorView, toWarbandView, getCurrentWarband, getOpponentWarband, findWarrior, findWarriorView } from '../shared/viewModels';
import { generateActionId, addLog, canWarriorAct } from '../shared/stateUtils';

// =====================================
// SETUP PHASE UTILITIES
// =====================================

/**
 * Get warriors that can still be positioned during setup
 */
export function getSetupActableWarriors(state: GameState): GameWarrior[] {
  const warband = getCurrentWarband(state);
  return warband.warriors.filter(w => canWarriorAct(w, 'setup'));
}

/**
 * Get available actions for a warrior during setup phase
 */
export function getSetupAvailableActions(warrior: GameWarrior): AvailableAction[] {
  if (!canWarriorAct(warrior, 'setup')) return [];
  return [{ type: 'position', description: 'Mark Positioned', requiresTarget: false }];
}

// =====================================
// SETUP PHASE MODULE
// =====================================

export const setupPhase: PhaseModule = {
  phase: 'setup',

  getSupportedEvents(): EventType[] {
    return ['SELECT_WARRIOR', 'DESELECT', 'CONFIRM_POSITION'];
  },

  processEvent(
    event: GameEvent,
    state: GameState,
    context: PhaseContext
  ): PhaseResult {
    switch (event.type) {
      case 'SELECT_WARRIOR':
        return handleSelectWarrior(event, state, context);

      case 'DESELECT':
        return handleDeselect();

      case 'CONFIRM_POSITION':
        return handleConfirmPosition(event, state, context);

      default:
        return errorResult(`Setup phase cannot handle event: ${event.type}`);
    }
  },

  buildScreen(state: GameState, context: PhaseContext): ScreenCommand {
    const currentWarband = getCurrentWarband(state);
    const opponentWarband = getOpponentWarband(state);

    // Warriors that still need to be positioned
    const warriorsToPosition = getSetupActableWarriors(state);

    const screen: GameSetupScreen = {
      screen: 'GAME_SETUP',
      data: {
        warband: toWarbandView(currentWarband),
        opponentWarband: toWarbandView(opponentWarband),
        scenario: {
          name: state.scenarioData.name,
          description: state.scenarioData.description
        },
        currentPlayer: state.currentPlayer,
        warriorsToPosition: warriorsToPosition.map(w => toWarriorView(w, state.currentPlayer - 1)),
        selectedWarrior: context.selectedWarriorId
          ? findWarriorView(state, context.selectedWarriorId)
          : null
      },
      availableEvents: ['SELECT_WARRIOR', 'CONFIRM_POSITION', 'ADVANCE_PHASE'],
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
  state: GameState,
  _context: PhaseContext
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

  // Verify warrior can still be positioned
  if (!canWarriorAct(result.warrior, 'setup')) {
    return errorResult('Warrior has already been positioned');
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

function handleConfirmPosition(
  _event: ConfirmPositionEvent,
  state: GameState,
  context: PhaseContext
): PhaseResult {
  if (!context.selectedWarriorId) {
    return errorResult('No warrior selected');
  }

  const warbandIndex = state.currentPlayer - 1;

  // Mark warrior as positioned
  markWarriorPositioned(state, warbandIndex, context.selectedWarriorId);

  // Deselect after action
  return successResult(true, {
    selectedWarriorId: null
  });
}

// =====================================
// STATE MUTATIONS
// =====================================

/**
 * Mark a warrior as positioned during setup phase
 */
function markWarriorPositioned(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string
): void {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  // Store previous state for undo
  const previousState: Partial<GameWarrior> = {
    hasActed: warrior.hasActed
  };

  // Create action record
  const action = {
    id: generateActionId(),
    type: 'setStatus' as const,
    timestamp: new Date().toISOString(),
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    warriorId,
    warbandIndex,
    previousState,
    description: `${warrior.name || warrior.type} positioned`
  };

  // Apply state change - mark as acted to track positioning
  warrior.hasActed = true;

  // Record action
  gameState.actionHistory.push(action);
  addLog(gameState, action.description);
}

export default setupPhase;
