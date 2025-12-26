// Game State Management

import { SCENARIOS } from '../data/scenarios';
import { leadershipTest } from './gameRules';
import type {
  GameState,
  GameWarband,
  GameWarrior,
  GamePhase,
  GameAction,
  Warband,
  WarriorCombatState,
  RoutTestResult
} from '../types';

// Re-export recovery handler functions for backward compatibility
export {
  getWarriorsNeedingRecovery,
  isRecoveryPhaseComplete,
  rallyWarrior,
  recoverFromStunned,
  standUpWarrior
} from '../engine/handlers/recovery';
export type { RallyResult } from '../engine/handlers/types';

// Re-export movement handler functions for backward compatibility
export {
  engageWarriors,
  disengageWarrior,
  canMoveInCombat,
  disengageFromCombat,
  moveWarrior,
  runWarrior,
  climbWarrior,
  jumpDownWarrior,
  applyFalling,
  checkEdgeFall,
  canWarriorHide,
  hideWarrior,
  revealWarrior,
  getDetectionRange,
  checkHiddenWarriorsForDetection,
  chargeWarrior,
  markWarriorPositioned
} from '../engine/handlers/movement';
export type {
  MoveOptions,
  RunOptions,
  ClimbOptions,
  ClimbResult,
  JumpDownResult,
  FallingDamageResult,
  EdgeFallCheckResult,
  ChargeOptions,
  CanMoveInCombatResult
} from '../engine/handlers/types';

// Re-export shooting handler functions for backward compatibility
export {
  canWarriorShoot,
  getShootingTargets,
  executeShot,
  getWarriorArmorSave
} from '../engine/handlers/shooting';
export type { ShootingResult } from '../engine/handlers/types';

// Re-export combat handler functions for backward compatibility
export {
  buildStrikeOrder,
  getMeleeTargets,
  executeMeleeAttack
} from '../engine/handlers/combat';
export type { MeleeResult } from '../engine/handlers/types';

// Re-export state machine functions for backward compatibility
export {
  getNextState,
  isNewTurn,
  isLeavingSetup,
  resetWarriorFlags,
  resetPlayerActedFlags,
  isPhaseComplete,
  canAdvancePhase,
  getActableWarriorCount,
  getPhaseName,
  GAME_PHASES
} from '../engine/handlers/stateMachine';
export type { TurnState } from '../engine/handlers/stateMachine';

// Import state machine functions for use in advancePhase
import {
  getNextState,
  isNewTurn,
  isLeavingSetup,
  resetWarriorFlags,
  resetPlayerActedFlags,
  getPhaseName
} from '../engine/handlers/stateMachine';

// Create a new game state
export function createGameState(warband1: Warband, warband2: Warband, scenarioKey: string): GameState {
  const scenario = SCENARIOS[scenarioKey];

  return {
    id: generateGameId(),
    scenario: scenarioKey,
    scenarioData: scenario,
    turn: 1,
    currentPlayer: 1,
    phase: 'setup',
    warbands: [
      initWarbandForGame(warband1, 1),
      initWarbandForGame(warband2, 2)
    ],
    wyrdstoneCounters: [],
    objectives: [],
    log: [],
    actionHistory: [],
    startedAt: new Date().toISOString(),
    ended: false,
    winner: null
  };
}

// Initialize warband for game
function initWarbandForGame(warband: Warband, playerNumber: 1 | 2): GameWarband {
  return {
    ...warband,
    player: playerNumber,
    warriors: warband.warriors.map(w => ({
      ...w,
      gameStatus: 'standing' as const,
      woundsRemaining: w.profile.W,
      hasActed: false,
      hasMoved: false,
      hasRun: false,
      hasShot: false,
      hasCharged: false,
      hasFailedCharge: false,
      hasFallen: false,
      hasRecovered: false,
      isHidden: false,
      carriedWyrdstone: 0,
      position: null,
      combatState: {
        inCombat: false,
        inCover: false,
        engagedWith: []
      },
      halfMovement: false,
      strikesLast: false,
      divingChargeBonus: false
    })),
    outOfActionCount: 0,
    routFailed: false
  };
}

// Get current warband
export function getCurrentWarband(gameState: GameState): GameWarband {
  return gameState.warbands[gameState.currentPlayer - 1];
}

// Get opposing warband
export function getOpposingWarband(gameState: GameState): GameWarband {
  return gameState.warbands[gameState.currentPlayer === 1 ? 1 : 0];
}

// Advance to next phase using state machine
// Mordheim turn structure: Each phase has both players act before moving to next phase
// Flow: Recovery (P1→P2) → Movement (P1→P2) → Shooting (P1→P2) → Combat (P1→P2) → Next Turn
export function advancePhase(gameState: GameState): void {
  const currentState = {
    turn: gameState.turn,
    phase: gameState.phase,
    currentPlayer: gameState.currentPlayer
  };

  const nextState = getNextState(currentState);

  // Handle setup phase player transition
  if (gameState.phase === 'setup' && nextState.phase === 'setup') {
    // Player 1 setup done, now Player 2
    gameState.currentPlayer = nextState.currentPlayer;
    resetPlayerActedFlags(gameState, 1);
    addLog(gameState, 'Setup Phase - Player 2');
    return;
  }

  // Handle transition from setup to regular gameplay
  if (isLeavingSetup(currentState, nextState)) {
    gameState.phase = nextState.phase;
    gameState.currentPlayer = nextState.currentPlayer;
    resetWarriorFlags(gameState);
    addLog(gameState, `Turn ${gameState.turn}, Recovery Phase - Player ${gameState.currentPlayer}`);
    return;
  }

  // Handle new turn
  if (isNewTurn(currentState, nextState)) {
    gameState.turn = nextState.turn;
    gameState.phase = nextState.phase;
    gameState.currentPlayer = nextState.currentPlayer;
    resetWarriorFlags(gameState);
    addLog(gameState, `Turn ${gameState.turn}, Recovery Phase - Player ${gameState.currentPlayer}`);
    return;
  }

  // Regular phase/player transition
  gameState.phase = nextState.phase;
  gameState.currentPlayer = nextState.currentPlayer;
  addLog(gameState, `Turn ${gameState.turn}, ${getPhaseName(gameState.phase)} - Player ${gameState.currentPlayer}`);
}

// Update warrior status
export function setWarriorStatus(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string,
  status: GameWarrior['gameStatus']
): void {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (warrior) {
    const oldStatus = warrior.gameStatus;
    warrior.gameStatus = status;

    if (status === 'outOfAction') {
      warband.outOfActionCount++;
    }

    addLog(gameState, `${warrior.name || warrior.type}: ${oldStatus} -> ${status}`);
  }
}

// Apply wound to warrior
export function applyWound(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string,
  wounds: number = 1
): boolean {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (warrior) {
    warrior.woundsRemaining -= wounds;

    if (warrior.woundsRemaining <= 0) {
      warrior.woundsRemaining = 0;
      addLog(gameState, `${warrior.name || warrior.type} reduced to 0 wounds - roll for injury`);
      return true; // Needs injury roll
    }

    addLog(gameState, `${warrior.name || warrior.type} takes ${wounds} wound(s), ${warrior.woundsRemaining} remaining`);
    return false;
  }
  return false;
}

// Check if rout test is required
export function isRoutTestRequired(warband: GameWarband): boolean {
  const totalWarriors = warband.warriors.length;
  const outOfAction = warband.outOfActionCount;
  return outOfAction >= Math.ceil(totalWarriors / 4);
}

// End the game
export function endGame(gameState: GameState, winner: 1 | 2 | null, reason: string): void {
  gameState.ended = true;
  gameState.winner = winner;
  gameState.endReason = reason;
  gameState.endedAt = new Date().toISOString();

  addLog(gameState, `Game ended! Player ${winner} wins by ${reason}`);
}

// Add to game log
export function addLog(gameState: GameState, message: string): void {
  gameState.log.push({
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    message,
    timestamp: new Date().toISOString()
  });
}

// Get standing warriors
export function getStandingWarriors(warband: GameWarband): GameWarrior[] {
  return warband.warriors.filter(w => w.gameStatus === 'standing');
}

// Get warriors that can act
export function getActableWarriors(warband: GameWarband, phase: GamePhase): GameWarrior[] {
  return warband.warriors.filter(w => {
    if (w.gameStatus !== 'standing') return false;
    if (w.hasActed) return false;

    switch (phase) {
      case 'movement':
        return !w.hasMoved;
      case 'shooting':
        return !w.hasShot && !w.hasCharged && hasRangedWeapon(w);
      default:
        return true;
    }
  });
}

// Check if warrior has ranged weapon
function hasRangedWeapon(warrior: GameWarrior): boolean {
  return warrior.equipment?.ranged?.length > 0;
}

// Generate game ID
function generateGameId(): string {
  return 'game_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Export game state for saving
export function exportGameState(gameState: GameState): string {
  return JSON.stringify(gameState, null, 2);
}

// Import game state
export function importGameState(json: string): GameState {
  return JSON.parse(json);
}

// =====================================
// RECOVERY PHASE MECHANICS
// =====================================
// (Moved to engine/handlers/recovery.ts - re-exported above)

// =====================================
// COMBAT STATE MANAGEMENT
// =====================================

// Set warrior combat state
export function setWarriorCombatState(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string,
  combatState: Partial<WarriorCombatState>
): GameAction {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  // Store previous state for undo
  const previousState: Partial<GameWarrior> = {
    combatState: { ...warrior.combatState }
  };

  // Create action record
  const action: GameAction = {
    id: generateActionId(),
    type: 'setCombatState',
    timestamp: new Date().toISOString(),
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    warriorId,
    warbandIndex,
    previousState,
    description: `${warrior.name || warrior.type} combat state updated`
  };

  // Apply changes
  if (combatState.inCombat !== undefined) {
    warrior.combatState.inCombat = combatState.inCombat;
  }
  if (combatState.inCover !== undefined) {
    warrior.combatState.inCover = combatState.inCover;
  }
  if (combatState.engagedWith !== undefined) {
    warrior.combatState.engagedWith = combatState.engagedWith;
  }

  // Record action
  gameState.actionHistory.push(action);

  return action;
}

// Set warrior in cover state
export function setWarriorCover(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string,
  inCover: boolean
): void {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  warrior.combatState.inCover = inCover;
  addLog(gameState, `${warrior.name || warrior.type} ${inCover ? 'takes cover' : 'leaves cover'}`);
}

// =====================================
// WARRIOR ACTION TRACKING
// =====================================

// Check if warrior can perform an action in current phase
export function canWarriorAct(warrior: GameWarrior, phase: GamePhase): boolean {
  // Out of action warriors cannot act
  if (warrior.gameStatus === 'outOfAction') {
    return false;
  }

  switch (phase) {
    case 'setup':
      // Can position if standing and hasn't been positioned (marked as acted)
      return warrior.gameStatus === 'standing' && !warrior.hasActed;

    case 'recovery':
      // Can act if fleeing, stunned, or knocked down and hasn't recovered
      return (
        (warrior.gameStatus === 'fleeing' ||
          warrior.gameStatus === 'stunned' ||
          warrior.gameStatus === 'knockedDown') &&
        !warrior.hasRecovered
      );

    case 'movement':
      // Can move if standing and hasn't moved
      return warrior.gameStatus === 'standing' && !warrior.hasMoved;

    case 'shooting':
      // Can shoot if standing, hasn't shot, didn't charge, didn't run, has ranged weapon
      return (
        warrior.gameStatus === 'standing' &&
        !warrior.hasShot &&
        !warrior.hasCharged &&
        !warrior.hasRun &&
        hasRangedWeapon(warrior)
      );

    case 'combat':
      // Can fight if engaged in combat
      return warrior.combatState.inCombat && warrior.gameStatus === 'standing';

    default:
      return false;
  }
}

// Get available actions for a warrior in current phase
export interface AvailableAction {
  type: string;
  description: string;
  requiresTarget: boolean;
  validTargets?: string[];
}

export function getAvailableActions(
  warrior: GameWarrior,
  phase: GamePhase,
  gameState: GameState
): AvailableAction[] {
  const actions: AvailableAction[] = [];

  if (!canWarriorAct(warrior, phase)) {
    return actions;
  }

  switch (phase) {
    case 'setup':
      actions.push({ type: 'position', description: 'Mark Positioned', requiresTarget: false });
      break;

    case 'recovery':
      if (warrior.gameStatus === 'fleeing') {
        actions.push({ type: 'rally', description: 'Rally (Leadership test)', requiresTarget: false });
      }
      if (warrior.gameStatus === 'stunned') {
        actions.push({ type: 'recoverFromStunned', description: 'Recover (becomes knocked down)', requiresTarget: false });
      }
      if (warrior.gameStatus === 'knockedDown') {
        if (!warrior.combatState.inCombat) {
          actions.push({ type: 'standUp', description: 'Stand up (half move, strikes last)', requiresTarget: false });
        }
      }
      break;

    case 'movement':
      actions.push({ type: 'move', description: 'Move', requiresTarget: false });
      actions.push({ type: 'run', description: 'Run (double movement, no shooting)', requiresTarget: false });
      // Charge requires targets
      const chargeTargets = getValidChargeTargets(warrior, gameState);
      if (chargeTargets.length > 0) {
        actions.push({
          type: 'charge',
          description: 'Charge (double movement into combat)',
          requiresTarget: true,
          validTargets: chargeTargets
        });
      }
      break;

    case 'shooting':
      const shootingTargets = getValidShootingTargets(warrior, gameState);
      if (shootingTargets.length > 0) {
        actions.push({
          type: 'shoot',
          description: 'Shoot',
          requiresTarget: true,
          validTargets: shootingTargets
        });
      }
      break;

    case 'combat':
      if (warrior.combatState.engagedWith.length > 0) {
        actions.push({
          type: 'fight',
          description: 'Fight in combat',
          requiresTarget: true,
          validTargets: warrior.combatState.engagedWith
        });
      }
      break;
  }

  return actions;
}

// Get valid charge targets for a warrior
function getValidChargeTargets(warrior: GameWarrior, gameState: GameState): string[] {
  const targets: string[] = [];
  const currentPlayerIndex = gameState.currentPlayer - 1;
  const opponentIndex = currentPlayerIndex === 0 ? 1 : 0;
  const opponentWarband = gameState.warbands[opponentIndex];

  for (const enemy of opponentWarband.warriors) {
    if (enemy.gameStatus === 'standing' || enemy.gameStatus === 'knockedDown') {
      // In a real implementation, would check distance and line of sight
      targets.push(enemy.id);
    }
  }

  return targets;
}

// Get valid shooting targets for a warrior
function getValidShootingTargets(warrior: GameWarrior, gameState: GameState): string[] {
  const targets: string[] = [];
  const currentPlayerIndex = gameState.currentPlayer - 1;
  const opponentIndex = currentPlayerIndex === 0 ? 1 : 0;
  const opponentWarband = gameState.warbands[opponentIndex];

  for (const enemy of opponentWarband.warriors) {
    // Cannot shoot at hidden enemies, can shoot at all visible enemies
    if (enemy.gameStatus !== 'outOfAction' && !enemy.isHidden) {
      targets.push(enemy.id);
    }
  }

  return targets;
}

// Mark warrior as having acted
export function markWarriorActed(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string,
  actionType: 'moved' | 'shot' | 'charged' | 'acted'
): void {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  switch (actionType) {
    case 'moved':
      warrior.hasMoved = true;
      break;
    case 'shot':
      warrior.hasShot = true;
      break;
    case 'charged':
      warrior.hasCharged = true;
      warrior.hasMoved = true;
      break;
    case 'acted':
      warrior.hasActed = true;
      break;
  }
}

// Movement phase functions moved to engine/handlers/movement.ts



// =====================================
// UNDO FUNCTIONALITY
// =====================================

// Get the last action that can be undone
export function getLastUndoableAction(gameState: GameState): GameAction | null {
  if (gameState.actionHistory.length === 0) {
    return null;
  }
  return gameState.actionHistory[gameState.actionHistory.length - 1];
}

// Undo the last action
export function undoLastAction(gameState: GameState): GameAction | null {
  const action = gameState.actionHistory.pop();

  if (!action) {
    return null;
  }

  const warband = gameState.warbands[action.warbandIndex];
  const warrior = warband.warriors.find(w => w.id === action.warriorId);

  if (!warrior) {
    throw new Error('Warrior not found for undo');
  }

  // Restore previous state
  Object.assign(warrior, action.previousState);

  // If action affected out of action count, restore it
  if (action.previousState.gameStatus !== 'outOfAction' && warrior.gameStatus === 'outOfAction') {
    warband.outOfActionCount--;
  }

  addLog(gameState, `UNDO: ${action.description}`);

  return action;
}

// Generate action ID
function generateActionId(): string {
  return 'action_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// =====================================
// WARRIOR SELECTION HELPERS
// =====================================

// Get all warriors that can act in the current phase
export function getWarriorsForPhase(gameState: GameState): GameWarrior[] {
  const warband = getCurrentWarband(gameState);
  const phase = gameState.phase;

  return warband.warriors.filter(warrior => canWarriorAct(warrior, phase));
}

// Find warrior by ID across all warbands
export function findWarrior(gameState: GameState, warriorId: string): { warrior: GameWarrior; warbandIndex: number } | null {
  for (let i = 0; i < gameState.warbands.length; i++) {
    const warrior = gameState.warbands[i].warriors.find(w => w.id === warriorId);
    if (warrior) {
      return { warrior, warbandIndex: i };
    }
  }
  return null;
}

// Shooting phase functions moved to engine/handlers/shooting.ts

// Combat phase functions moved to engine/handlers/combat.ts

// =====================================
// ROUT TEST FUNCTIONS
// =====================================

// Execute rout test for a warband
export function executeRoutTest(
  gameState: GameState,
  warbandIndex: number
): RoutTestResult {
  const warband = gameState.warbands[warbandIndex];

  // Find leader for Leadership value
  const leader = warband.warriors.find(w =>
    w.type.toLowerCase().includes('captain') ||
    w.type.toLowerCase().includes('leader') ||
    w.type.toLowerCase().includes('chieftain') ||
    w.type.toLowerCase().includes('magister')
  ) || warband.warriors[0];

  const leadershipValue = leader?.profile.Ld ?? 7;

  const testResult = leadershipTest(leadershipValue);

  const result: RoutTestResult = {
    roll: testResult.roll,
    needed: leadershipValue,
    passed: testResult.success,
    warbandIndex
  };

  if (!testResult.success) {
    // Warband routs
    warband.routFailed = true;
    addLog(gameState, `${warband.name} fails rout test (rolled ${testResult.roll} vs Ld ${leadershipValue}) and flees!`);
  } else {
    addLog(gameState, `${warband.name} passes rout test (rolled ${testResult.roll} vs Ld ${leadershipValue})`);
  }

  return result;
}
