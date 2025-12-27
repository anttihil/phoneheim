// Movement Phase Module
// Handles movement, running, charging, and related actions

import type { GameState, GameWarrior, GameAction } from '../../types/game';
import type {
  GameEvent,
  EventType,
  SelectWarriorEvent,
  ConfirmMoveEvent,
  ConfirmChargeEvent
} from '../../engine/types/events';
import type { ScreenCommand, MovementPhaseScreen } from '../../engine/types/screens';
import type { PhaseModule, PhaseContext, PhaseResult, AvailableAction } from '../shared/types';
import { successResult, errorResult } from '../shared/types';
import {
  toWarriorView,
  toWarbandView,
  getCurrentWarband,
  getOpponentWarband,
  findWarrior,
  findWarriorView
} from '../shared/viewModels';
import { generateActionId, addLog, canWarriorAct } from '../shared/stateUtils';

// =====================================
// MOVEMENT PHASE UTILITIES
// =====================================

/**
 * Get warriors that can move during movement phase
 */
export function getMovementActableWarriors(state: GameState): GameWarrior[] {
  const warband = getCurrentWarband(state);
  return warband.warriors.filter(w => canWarriorAct(w, 'movement'));
}

/**
 * Get valid charge targets from opponent warband
 * Warriors that are standing or knocked down can be charged
 */
export function getValidChargeTargets(state: GameState): GameWarrior[] {
  const opponentWarband = getOpponentWarband(state);
  return opponentWarband.warriors.filter(w =>
    w.gameStatus === 'standing' || w.gameStatus === 'knockedDown'
  );
}

/**
 * Get available movement actions for a warrior
 */
export function getMovementAvailableActions(warrior: GameWarrior, state: GameState): AvailableAction[] {
  if (!canWarriorAct(warrior, 'movement')) return [];

  const actions: AvailableAction[] = [
    { type: 'move', description: 'Move', requiresTarget: false },
    { type: 'run', description: 'Run (double movement, no shooting)', requiresTarget: false }
  ];

  const chargeTargets = getValidChargeTargets(state);
  if (chargeTargets.length > 0) {
    actions.push({
      type: 'charge',
      description: 'Charge (double movement into combat)',
      requiresTarget: true,
      validTargets: chargeTargets.map(w => w.id)
    });
  }

  return actions;
}

// =====================================
// MOVEMENT PHASE MODULE
// =====================================

export const movementPhase: PhaseModule = {
  phase: 'movement',

  getSupportedEvents(): EventType[] {
    return ['SELECT_WARRIOR', 'DESELECT', 'CONFIRM_MOVE', 'CONFIRM_CHARGE'];
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

      case 'CONFIRM_MOVE':
        return handleConfirmMove(event, state, context);

      case 'CONFIRM_CHARGE':
        return handleConfirmCharge(event, state, context);

      default:
        return errorResult(`Movement phase cannot handle event: ${event.type}`);
    }
  },

  buildScreen(state: GameState, context: PhaseContext): ScreenCommand {
    const currentWarband = getCurrentWarband(state);
    const opponentWarband = getOpponentWarband(state);
    const warbandIndex = state.currentPlayer - 1;

    // Warriors who can still move
    const actableWarriors = getMovementActableWarriors(state);

    // Determine available actions for selected warrior
    let chargeTargets: GameWarrior[] = [];
    let canMove = false;
    let canRun = false;
    let canCharge = false;

    if (context.selectedWarriorId) {
      const result = findWarrior(state, context.selectedWarriorId);
      if (result && canWarriorAct(result.warrior, 'movement')) {
        canMove = true;
        canRun = true;
        // Get valid charge targets from opponent warband
        chargeTargets = getValidChargeTargets(state);
        canCharge = chargeTargets.length > 0;
      }
    }

    const screen: MovementPhaseScreen = {
      screen: 'MOVEMENT_PHASE',
      data: {
        currentPlayer: state.currentPlayer,
        warband: toWarbandView(currentWarband),
        opponentWarband: toWarbandView(opponentWarband),
        actableWarriors: actableWarriors.map(w => toWarriorView(w, warbandIndex)),
        selectedWarrior: context.selectedWarriorId
          ? findWarriorView(state, context.selectedWarriorId)
          : null,
        chargeTargets: chargeTargets.map(w => toWarriorView(w, warbandIndex === 0 ? 1 : 0)),
        canMove,
        canRun,
        canCharge
      },
      availableEvents: ['SELECT_WARRIOR', 'DESELECT', 'CONFIRM_MOVE', 'CONFIRM_CHARGE', 'ADVANCE_PHASE'],
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

  // Verify warrior can move
  if (!canWarriorAct(result.warrior, 'movement')) {
    return errorResult('Warrior cannot move');
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

function handleConfirmMove(
  event: ConfirmMoveEvent,
  state: GameState,
  context: PhaseContext
): PhaseResult {
  if (!context.selectedWarriorId) {
    return errorResult('No warrior selected');
  }

  const warbandIndex = state.currentPlayer - 1;

  try {
    if (event.payload.moveType === 'move') {
      moveWarrior(state, warbandIndex, context.selectedWarriorId);
    } else {
      runWarrior(state, warbandIndex, context.selectedWarriorId);
    }
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : 'Move failed');
  }

  // Deselect after action
  return successResult(true, {
    selectedWarriorId: null
  });
}

function handleConfirmCharge(
  event: ConfirmChargeEvent,
  state: GameState,
  context: PhaseContext
): PhaseResult {
  if (!context.selectedWarriorId) {
    return errorResult('No warrior selected');
  }

  const { targetId } = event.payload;
  const warbandIndex = state.currentPlayer - 1;
  const targetWarbandIndex = warbandIndex === 0 ? 1 : 0;

  try {
    chargeWarrior(state, warbandIndex, context.selectedWarriorId, targetWarbandIndex, targetId);
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : 'Charge failed');
  }

  // Deselect after action
  return successResult(true, {
    selectedWarriorId: null,
    selectedTargetId: null
  });
}

// =====================================
// MOVEMENT ACTIONS
// =====================================

/**
 * Move warrior (normal movement)
 */
function moveWarrior(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string
): void {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  if (warrior.gameStatus !== 'standing') {
    throw new Error('Warrior must be standing to move');
  }

  if (warrior.hasMoved) {
    throw new Error('Warrior has already moved this turn');
  }

  // Check combat restrictions
  if (warrior.combatState.inCombat) {
    const combatCheck = canMoveInCombat(gameState, warbandIndex, warriorId);
    if (!combatCheck.canMove) {
      throw new Error(combatCheck.reason || 'Cannot move while in combat');
    }
    // Disengage from downed enemies
    disengageFromCombat(gameState, warbandIndex, warriorId);
  }

  // Store previous state for undo
  const previousState: Partial<GameWarrior> = {
    hasMoved: warrior.hasMoved,
    combatState: { ...warrior.combatState }
  };

  // Create action record
  const action: GameAction = {
    id: generateActionId(),
    type: 'move',
    timestamp: new Date().toISOString(),
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    warriorId,
    warbandIndex,
    previousState,
    description: `${warrior.name || warrior.type} moves`
  };

  // Apply state change
  warrior.hasMoved = true;

  // Record action
  gameState.actionHistory.push(action);
  addLog(gameState, action.description);
}

/**
 * Run warrior (double movement, no shooting)
 */
function runWarrior(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string
): void {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  if (warrior.gameStatus !== 'standing') {
    throw new Error('Warrior must be standing to run');
  }

  if (warrior.hasMoved) {
    throw new Error('Warrior has already moved this turn');
  }

  // Store previous state for undo
  const previousState: Partial<GameWarrior> = {
    hasMoved: warrior.hasMoved,
    hasRun: warrior.hasRun
  };

  // Create action record
  const action: GameAction = {
    id: generateActionId(),
    type: 'run',
    timestamp: new Date().toISOString(),
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    warriorId,
    warbandIndex,
    previousState,
    description: `${warrior.name || warrior.type} runs (double movement, no shooting)`
  };

  // Apply state change
  warrior.hasMoved = true;
  warrior.hasRun = true;

  // Record action
  gameState.actionHistory.push(action);
  addLog(gameState, action.description);
}

/**
 * Charge warrior (double movement into combat)
 */
function chargeWarrior(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string,
  targetWarbandIndex: number,
  targetId: string
): void {
  const warband = gameState.warbands[warbandIndex];
  const targetWarband = gameState.warbands[targetWarbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);
  const target = targetWarband.warriors.find(w => w.id === targetId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  if (!target) {
    throw new Error('Target not found');
  }

  if (warrior.gameStatus !== 'standing') {
    throw new Error('Warrior must be standing to charge');
  }

  if (warrior.hasMoved) {
    throw new Error('Warrior has already moved this turn');
  }

  // Store previous state for undo
  const previousState: Partial<GameWarrior> = {
    hasMoved: warrior.hasMoved,
    hasCharged: warrior.hasCharged,
    hasFailedCharge: warrior.hasFailedCharge,
    combatState: { ...warrior.combatState }
  };

  // Create action record
  const action: GameAction = {
    id: generateActionId(),
    type: 'charge',
    timestamp: new Date().toISOString(),
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    warriorId,
    warbandIndex,
    targetId,
    targetWarbandIndex,
    previousState,
    description: `${warrior.name || warrior.type} charges ${target.name || target.type}`
  };

  // Apply state change
  warrior.hasMoved = true;
  warrior.hasCharged = true;

  // Engage warriors in combat
  engageWarriors(gameState, warbandIndex, warriorId, targetWarbandIndex, targetId);

  // Record action
  gameState.actionHistory.push(action);
  addLog(gameState, action.description);
}

// =====================================
// COMBAT ENGAGEMENT HELPERS
// =====================================

/**
 * Engage two warriors in combat
 */
function engageWarriors(
  gameState: GameState,
  attackerWarbandIndex: number,
  attackerId: string,
  defenderWarbandIndex: number,
  defenderId: string
): void {
  const attackerWarband = gameState.warbands[attackerWarbandIndex];
  const defenderWarband = gameState.warbands[defenderWarbandIndex];
  const attacker = attackerWarband.warriors.find(w => w.id === attackerId);
  const defender = defenderWarband.warriors.find(w => w.id === defenderId);

  if (!attacker || !defender) {
    throw new Error('Warriors not found for engagement');
  }

  // Set attacker in combat with defender
  attacker.combatState.inCombat = true;
  if (!attacker.combatState.engagedWith.includes(defenderId)) {
    attacker.combatState.engagedWith.push(defenderId);
  }

  // Set defender in combat with attacker
  defender.combatState.inCombat = true;
  if (!defender.combatState.engagedWith.includes(attackerId)) {
    defender.combatState.engagedWith.push(attackerId);
  }
}

/**
 * Check if a warrior in combat can move away
 * Warriors can only move if all engaged enemies are knocked down or stunned
 */
function canMoveInCombat(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string
): { canMove: boolean; reason?: string } {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    return { canMove: false, reason: 'Warrior not found' };
  }

  // If not in combat, can always move
  if (!warrior.combatState.inCombat || warrior.combatState.engagedWith.length === 0) {
    return { canMove: true };
  }

  // Check each engaged enemy
  const opponentIndex = warbandIndex === 0 ? 1 : 0;
  const opponents = gameState.warbands[opponentIndex].warriors;

  for (const enemyId of warrior.combatState.engagedWith) {
    const enemy = opponents.find(w => w.id === enemyId);
    if (!enemy) continue;

    // If any enemy is standing, cannot move away
    if (enemy.gameStatus === 'standing') {
      return {
        canMove: false,
        reason: 'Cannot move while engaged with standing enemies'
      };
    }
  }

  // All engaged enemies are knocked down or stunned - can move away
  return { canMove: true };
}

/**
 * Disengage warrior from all enemies in combat
 */
function disengageFromCombat(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string
): void {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  if (!warrior.combatState.inCombat) {
    return; // Nothing to disengage from
  }

  // Get opponent warband
  const opponentIndex = warbandIndex === 0 ? 1 : 0;
  const opponents = gameState.warbands[opponentIndex].warriors;

  // Remove this warrior from all engaged enemies' engagedWith lists
  for (const enemyId of warrior.combatState.engagedWith) {
    const enemy = opponents.find(w => w.id === enemyId);
    if (!enemy) continue;

    enemy.combatState.engagedWith = enemy.combatState.engagedWith.filter(id => id !== warriorId);
    if (enemy.combatState.engagedWith.length === 0) {
      enemy.combatState.inCombat = false;
    }
  }

  // Clear warrior's combat state
  warrior.combatState.inCombat = false;
  warrior.combatState.engagedWith = [];
}

export default movementPhase;
