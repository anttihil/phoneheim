// State Utilities
// Shared functions for manipulating game state

import type { GameState, GameAction, GameWarrior, GamePhase } from '../../types/game';

/**
 * Generate a unique action ID
 */
export function generateActionId(): string {
  return 'action_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * Add a message to the game log
 */
export function addLog(gameState: GameState, message: string): void {
  gameState.log.push({
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    message,
    timestamp: new Date().toISOString()
  });
}

/**
 * Create a game action record for undo history
 */
export function createAction(
  gameState: GameState,
  type: GameAction['type'],
  warriorId: string,
  warbandIndex: number,
  previousState: Partial<GameWarrior>,
  description: string,
  options?: {
    targetId?: string;
    targetWarbandIndex?: number;
    diceRolls?: GameAction['diceRolls'];
  }
): GameAction {
  return {
    id: generateActionId(),
    type,
    timestamp: new Date().toISOString(),
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    warriorId,
    warbandIndex,
    previousState,
    description,
    ...options
  };
}

/**
 * Record an action in the game history
 */
export function recordAction(gameState: GameState, action: GameAction): void {
  gameState.actionHistory.push(action);
  addLog(gameState, action.description);
}

/**
 * Set warrior status and track out of action count
 */
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

    if (status === 'outOfAction' && oldStatus !== 'outOfAction') {
      warband.outOfActionCount++;
    }

    addLog(gameState, `${warrior.name || warrior.type}: ${oldStatus} -> ${status}`);
  }
}

/**
 * Check if a warrior can perform actions in the given phase
 */
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
        (warrior.equipment?.ranged?.length ?? 0) > 0
      );

    case 'combat':
      // Can fight if engaged in combat
      return warrior.combatState.inCombat && warrior.gameStatus === 'standing';

    default:
      return false;
  }
}
