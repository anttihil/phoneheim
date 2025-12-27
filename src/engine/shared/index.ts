// Shared utilities for the game engine

export {
  // Types
  type TurnState,
  // Constants
  GAME_PHASES,
  // Functions
  getPhaseName,
  getNextState,
  isNewTurn,
  isLeavingSetup,
  resetWarriorFlags,
  resetPlayerActedFlags,
  isPhaseComplete,
  canAdvancePhase,
  getActableWarriorCount
} from './stateMachine';
