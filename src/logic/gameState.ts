// Game State Management

import { SCENARIOS } from "../data/scenarios";
import { leadershipTest } from "../engine/rules/combat";
import type { GameState, GameWarband, Warband, RoutTestResult } from "../types";

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
  GAME_PHASES,
} from "../engine/shared/stateMachine";
export type { TurnState } from "../engine/shared/stateMachine";

// Add to game log
export function addLog(gameState: GameState, message: string): void {
  gameState.log.push({
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    message,
    timestamp: new Date().toISOString(),
  });
}

// Generate game ID
function generateGameId(): string {
  return (
    "game_" + Date.now().toString(36) + Math.random().toString(36).substr(2)
  );
}

// Create a new game state
export function createGameState(
  warband1: Warband,
  warband2: Warband,
  scenarioKey: string
): GameState {
  const scenario = SCENARIOS[scenarioKey];

  return {
    id: generateGameId(),
    scenario: scenarioKey,
    scenarioData: scenario,
    turn: 1,
    currentPlayer: 1,
    phase: "setup",
    warbands: [
      initWarbandForGame(warband1, 1),
      initWarbandForGame(warband2, 2),
    ],
    wyrdstoneCounters: [],
    objectives: [],
    log: [],
    actionHistory: [],
    startedAt: new Date().toISOString(),
    ended: false,
    winner: null,
  };
}

// Initialize warband for game
function initWarbandForGame(
  warband: Warband,
  playerNumber: 1 | 2
): GameWarband {
  return {
    ...warband,
    player: playerNumber,
    warriors: warband.warriors.map((w) => ({
      ...w,
      gameStatus: "standing" as const,
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
        engagedWith: [],
      },
      halfMovement: false,
      strikesLast: false,
      divingChargeBonus: false,
    })),
    outOfActionCount: 0,
    routFailed: false,
  };
}

// Check if rout test is required
export function isRoutTestRequired(warband: GameWarband): boolean {
  const totalWarriors = warband.warriors.length;
  const outOfAction = warband.outOfActionCount;
  return outOfAction >= Math.ceil(totalWarriors / 4);
}

// End the game
export function endGame(
  gameState: GameState,
  winner: 1 | 2 | null,
  reason: string
): void {
  gameState.ended = true;
  gameState.winner = winner;
  gameState.endReason = reason;
  gameState.endedAt = new Date().toISOString();

  addLog(gameState, `Game ended! Player ${winner} wins by ${reason}`);
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
  const leader =
    warband.warriors.find(
      (w) =>
        w.type.toLowerCase().includes("captain") ||
        w.type.toLowerCase().includes("leader") ||
        w.type.toLowerCase().includes("chieftain") ||
        w.type.toLowerCase().includes("magister")
    ) || warband.warriors[0];

  const leadershipValue = leader?.profile.Ld ?? 7;

  const testResult = leadershipTest(leadershipValue);

  const result: RoutTestResult = {
    roll: testResult.roll,
    needed: leadershipValue,
    passed: testResult.success,
    warbandIndex,
  };

  if (!testResult.success) {
    // Warband routs
    warband.routFailed = true;
    addLog(
      gameState,
      `${warband.name} fails rout test (rolled ${testResult.roll} vs Ld ${leadershipValue}) and flees!`
    );
  } else {
    addLog(
      gameState,
      `${warband.name} passes rout test (rolled ${testResult.roll} vs Ld ${leadershipValue})`
    );
  }

  return result;
}
