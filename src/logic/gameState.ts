// Game State Management

import { leadershipTest } from "../phases/shared/rules";
import type { GameState, GameWarband, Warband, RoutTestResult } from "../types";

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
