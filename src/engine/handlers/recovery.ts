// Recovery Phase Handler
// Handles rally, recover from stunned, and stand up actions

import type {
  GameState,
  GameWarband,
  GameWarrior,
  GameAction
} from '../../types/game';
import { leadershipTest } from '../rules/combat';
import type { RallyResult } from './types';

// =====================================
// UTILITY FUNCTIONS
// =====================================

function generateActionId(): string {
  return 'action_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function addLog(gameState: GameState, message: string): void {
  gameState.log.push({
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    message,
    timestamp: new Date().toISOString()
  });
}

// =====================================
// RECOVERY PHASE QUERIES
// =====================================

/**
 * Get warriors that need recovery actions in the recovery phase
 * @param warband - The warband to check
 * @returns Object with arrays of fleeing, stunned, and knocked down warriors
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
 * @param warband - The warband to check
 * @returns true if no warriors need recovery
 */
export function isRecoveryPhaseComplete(warband: GameWarband): boolean {
  const { fleeing, stunned, knockedDown } = getWarriorsNeedingRecovery(warband);
  return fleeing.length === 0 && stunned.length === 0 && knockedDown.length === 0;
}

// =====================================
// RECOVERY PHASE ACTIONS
// =====================================

/**
 * Rally a fleeing warrior using a Leadership test
 * @param gameState - The game state
 * @param warbandIndex - Index of the warband (0 or 1)
 * @param warriorId - ID of the warrior to rally
 * @returns Rally result with success, roll, and action
 */
export function rallyWarrior(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string
): RallyResult {
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
    leadershipNeeded: leadershipValue,
    action
  };
}

/**
 * Recover a stunned warrior - automatically becomes knocked down
 * @param gameState - The game state
 * @param warbandIndex - Index of the warband (0 or 1)
 * @param warriorId - ID of the stunned warrior
 * @returns The action record
 */
export function recoverFromStunned(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string
): GameAction {
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

  return action;
}

/**
 * Stand up a knocked down warrior - gains half movement and strikes last
 * Cannot stand up if engaged with standing enemies
 * @param gameState - The game state
 * @param warbandIndex - Index of the warband (0 or 1)
 * @param warriorId - ID of the knocked down warrior
 * @returns The action record
 */
export function standUpWarrior(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string
): GameAction {
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

  return action;
}
