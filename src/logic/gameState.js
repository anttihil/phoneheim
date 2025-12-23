// Game State Management

import { SCENARIOS } from '../data/scenarios.js';
import { TURN_PHASES } from './gameRules.js';

// Create a new game state
export function createGameState(warband1, warband2, scenarioKey) {
  const scenario = SCENARIOS[scenarioKey];

  return {
    id: generateGameId(),
    scenario: scenarioKey,
    scenarioData: scenario,
    turn: 1,
    currentPlayer: 1, // 1 or 2
    phase: 'setup', // setup, recovery, movement, shooting, combat, end
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
function initWarbandForGame(warband, playerNumber) {
  return {
    ...warband,
    player: playerNumber,
    warriors: warband.warriors.map(w => ({
      ...w,
      gameStatus: 'standing', // standing, knockedDown, stunned, outOfAction, fleeing
      woundsRemaining: w.profile.W,
      hasActed: false,
      hasMoved: false,
      hasShot: false,
      hasCharged: false,
      isHidden: false,
      carriedWyrdstone: 0,
      position: null // { x, y } if tracking position
    })),
    outOfActionCount: 0,
    routFailed: false
  };
}

// Get current warband
export function getCurrentWarband(gameState) {
  return gameState.warbands[gameState.currentPlayer - 1];
}

// Get opposing warband
export function getOpposingWarband(gameState) {
  return gameState.warbands[gameState.currentPlayer === 1 ? 1 : 0];
}

// Advance to next phase
export function advancePhase(gameState) {
  const phases = ['recovery', 'movement', 'shooting', 'combat'];
  const currentIndex = phases.indexOf(gameState.phase);

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
function resetWarriorFlags(gameState) {
  const warband = getCurrentWarband(gameState);
  for (const warrior of warband.warriors) {
    warrior.hasActed = false;
    warrior.hasMoved = false;
    warrior.hasShot = false;
    warrior.hasCharged = false;
  }
}

// Update warrior status
export function setWarriorStatus(gameState, warbandIndex, warriorId, status) {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (warrior) {
    const oldStatus = warrior.gameStatus;
    warrior.gameStatus = status;

    if (status === 'outOfAction') {
      warband.outOfActionCount++;
    }

    addLog(gameState, `${warrior.name || warrior.type}: ${oldStatus} → ${status}`);
  }
}

// Apply wound to warrior
export function applyWound(gameState, warbandIndex, warriorId, wounds = 1) {
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
export function isRoutTestRequired(warband) {
  const totalWarriors = warband.warriors.length;
  const outOfAction = warband.outOfActionCount;
  return outOfAction >= Math.ceil(totalWarriors / 4);
}

// End the game
export function endGame(gameState, winner, reason) {
  gameState.ended = true;
  gameState.winner = winner;
  gameState.endReason = reason;
  gameState.endedAt = new Date().toISOString();

  addLog(gameState, `Game ended! Player ${winner} wins by ${reason}`);
}

// Add to game log
export function addLog(gameState, message) {
  gameState.log.push({
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    message,
    timestamp: new Date().toISOString()
  });
}

// Get standing warriors
export function getStandingWarriors(warband) {
  return warband.warriors.filter(w => w.gameStatus === 'standing');
}

// Get warriors that can act
export function getActableWarriors(warband, phase) {
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
function hasRangedWeapon(warrior) {
  return warrior.equipment?.ranged?.length > 0;
}

// Generate game ID
function generateGameId() {
  return 'game_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Export game state for saving
export function exportGameState(gameState) {
  return JSON.stringify(gameState, null, 2);
}

// Import game state
export function importGameState(json) {
  return JSON.parse(json);
}
