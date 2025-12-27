// State Machine for Turn/Phase Management
// Handles transitions between game phases and turns

import type { GameState, GamePhase, GameWarrior } from '../../types/game';

// =====================================
// STATE TYPES
// =====================================

export interface TurnState {
  turn: number;
  phase: GamePhase;
  currentPlayer: 1 | 2;
}

// =====================================
// PHASE CONSTANTS
// =====================================

/**
 * The ordered list of game phases (excluding setup)
 */
export const GAME_PHASES: readonly GamePhase[] = ['recovery', 'movement', 'shooting', 'combat'] as const;

/**
 * Get display name for a phase
 */
export function getPhaseName(phase: GamePhase): string {
  switch (phase) {
    case 'setup': return 'Setup Phase';
    case 'recovery': return 'Recovery Phase';
    case 'movement': return 'Movement Phase';
    case 'shooting': return 'Shooting Phase';
    case 'combat': return 'Combat Phase';
    default: return phase;
  }
}

// =====================================
// STATE TRANSITIONS
// =====================================

/**
 * Get the next state after advancing from the current state
 *
 * Mordheim turn structure: Each phase has both players act before moving to next phase
 * Flow: Setup (P1→P2) → Recovery (P1→P2) → Movement (P1→P2) → Shooting (P1→P2) → Combat (P1→P2) → Next Turn
 */
export function getNextState(current: TurnState): TurnState {
  // Setup phase: both players need to position their warriors
  if (current.phase === 'setup') {
    if (current.currentPlayer === 1) {
      // Player 1 setup done, now Player 2
      return {
        turn: current.turn,
        phase: 'setup',
        currentPlayer: 2
      };
    } else {
      // Both players done with setup, advance to recovery
      return {
        turn: current.turn,
        phase: 'recovery',
        currentPlayer: 1
      };
    }
  }

  const currentIndex = GAME_PHASES.indexOf(current.phase as GamePhase);

  // Within a phase: alternate between players
  if (current.currentPlayer === 1) {
    // Player 1 finished, now Player 2's turn in same phase
    return {
      turn: current.turn,
      phase: current.phase,
      currentPlayer: 2
    };
  } else {
    // Player 2 finished, move to next phase with Player 1
    if (currentIndex < GAME_PHASES.length - 1) {
      // Move to next phase
      return {
        turn: current.turn,
        phase: GAME_PHASES[currentIndex + 1],
        currentPlayer: 1
      };
    } else {
      // End of combat phase = end of turn
      return {
        turn: current.turn + 1,
        phase: 'recovery',
        currentPlayer: 1
      };
    }
  }
}

/**
 * Check if a new turn is starting (requires warrior flag reset)
 */
export function isNewTurn(current: TurnState, next: TurnState): boolean {
  return next.turn > current.turn;
}

/**
 * Check if transitioning from setup to regular gameplay
 */
export function isLeavingSetup(current: TurnState, next: TurnState): boolean {
  return current.phase === 'setup' && next.phase !== 'setup';
}

// =====================================
// WARRIOR FLAG MANAGEMENT
// =====================================

/**
 * Reset warrior action flags at start of turn (both warbands)
 */
export function resetWarriorFlags(gameState: GameState): void {
  for (const warband of gameState.warbands) {
    for (const warrior of warband.warriors) {
      warrior.hasActed = false;
      warrior.hasMoved = false;
      warrior.hasRun = false;
      warrior.hasShot = false;
      warrior.hasCharged = false;
      warrior.hasFailedCharge = false;
      warrior.hasFallen = false;
      warrior.hasRecovered = false;
      // Reset turn-specific modifiers from previous turn
      warrior.halfMovement = false;
      warrior.strikesLast = false;
      warrior.divingChargeBonus = false;
    }
  }
}

/**
 * Reset hasActed flags for a specific player's warband
 */
export function resetPlayerActedFlags(gameState: GameState, playerIndex: number): void {
  for (const warrior of gameState.warbands[playerIndex].warriors) {
    warrior.hasActed = false;
  }
}

// =====================================
// PHASE COMPLETION QUERIES
// =====================================

/**
 * Check if all warriors for current player have acted in current phase
 */
export function isPhaseComplete(gameState: GameState): boolean {
  const currentWarbandIndex = gameState.currentPlayer - 1;
  const warband = gameState.warbands[currentWarbandIndex];

  for (const warrior of warband.warriors) {
    // Skip out of action warriors
    if (warrior.gameStatus === 'outOfAction') continue;

    // If any warrior hasn't acted, phase is not complete
    if (!warrior.hasActed) return false;
  }

  return true;
}

/**
 * Check if all warriors for current player can advance phase
 * This is typically true when isPhaseComplete is true or when
 * the player explicitly chooses to end their phase early
 */
export function canAdvancePhase(gameState: GameState): boolean {
  // During setup, always allow advancing (positioning is optional per warrior)
  if (gameState.phase === 'setup') return true;

  // For other phases, allow if phase is complete or if it's a manual advance
  // The actual phase completion check is done in isPhaseComplete
  return true;
}

/**
 * Get count of warriors that can still act in current phase
 */
export function getActableWarriorCount(gameState: GameState): number {
  const currentWarbandIndex = gameState.currentPlayer - 1;
  const warband = gameState.warbands[currentWarbandIndex];
  let count = 0;

  for (const warrior of warband.warriors) {
    if (warrior.gameStatus !== 'outOfAction' && !warrior.hasActed) {
      count++;
    }
  }

  return count;
}
