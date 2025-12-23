// Game State Management

import { SCENARIOS } from '../data/scenarios';
import type {
  GameState,
  GameWarband,
  GameWarrior,
  GamePhase,
  GameLogEntry,
  Warband,
  Scenario
} from '../types';

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
      hasShot: false,
      hasCharged: false,
      isHidden: false,
      carriedWyrdstone: 0,
      position: null
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

// Advance to next phase
export function advancePhase(gameState: GameState): void {
  const phases: GamePhase[] = ['recovery', 'movement', 'shooting', 'combat'];
  const currentIndex = phases.indexOf(gameState.phase as GamePhase);

  if (gameState.phase === 'setup') {
    gameState.phase = 'recovery';
    return;
  }

  if (currentIndex < phases.length - 1) {
    gameState.phase = phases[currentIndex + 1];
  } else {
    // End of turn
    if (gameState.currentPlayer === 1) {
      gameState.currentPlayer = 2;
      gameState.phase = 'recovery';
    } else {
      gameState.turn++;
      gameState.currentPlayer = 1;
      gameState.phase = 'recovery';
    }

    // Reset warrior flags for new turn
    resetWarriorFlags(gameState);
  }

  addLog(gameState, `Turn ${gameState.turn}, Player ${gameState.currentPlayer}, ${gameState.phase} phase`);
}

// Reset warrior action flags at start of turn
function resetWarriorFlags(gameState: GameState): void {
  const warband = getCurrentWarband(gameState);
  for (const warrior of warband.warriors) {
    warrior.hasActed = false;
    warrior.hasMoved = false;
    warrior.hasShot = false;
    warrior.hasCharged = false;
  }
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
