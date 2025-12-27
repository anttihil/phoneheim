// Game State Management

import { SCENARIOS } from '../data/scenarios';
import { leadershipTest } from '../engine/rules/combat';
import type {
  GameState,
  GameWarband,
  GameWarrior,
  GameAction,
  Warband,
  WarriorCombatState,
  RoutTestResult
} from '../types';

// Re-export state machine functions
export {
  getNextState,
  isNewTurn,
  isLeavingSetup,
  isPlayerSwitching,
  resetWarriorFlags,
  resetPlayerActedFlags,
  isPhaseComplete,
  canAdvancePhase,
  getActableWarriorCount,
  getPhaseName,
  GAME_PHASES
} from '../engine/shared/stateMachine';
export type { TurnState } from '../engine/shared/stateMachine';

// Import state machine functions for use in advancePhase
import {
  getNextState,
  isNewTurn,
  isLeavingSetup,
  isPlayerSwitching,
  resetWarriorFlags,
  resetPlayerActedFlags,
  getPhaseName
} from '../engine/shared/stateMachine';

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
// Mordheim turn structure: Each player completes all phases before the other player acts
// Flow: Setup (P1→P2) → P1: Recovery→Movement→Shooting→Combat → P2: Recovery→Movement→Shooting→Combat → Next Turn
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

  // Handle new turn (P2 Combat → P1 Recovery of next turn)
  if (isNewTurn(currentState, nextState)) {
    gameState.turn = nextState.turn;
    gameState.phase = nextState.phase;
    gameState.currentPlayer = nextState.currentPlayer;
    resetWarriorFlags(gameState);
    addLog(gameState, `Turn ${gameState.turn}, Recovery Phase - Player ${gameState.currentPlayer}`);
    return;
  }

  // Handle mid-turn player switch (P1 Combat → P2 Recovery)
  if (isPlayerSwitching(currentState, nextState)) {
    gameState.phase = nextState.phase;
    gameState.currentPlayer = nextState.currentPlayer;
    resetWarriorFlags(gameState);
    addLog(gameState, `Turn ${gameState.turn}, Recovery Phase - Player ${gameState.currentPlayer}`);
    return;
  }

  // Regular phase transition (same player, next phase)
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
