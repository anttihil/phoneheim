// Shared Phase Utilities
// Re-exports types and utilities used across all phases

export type {
  PhaseSubState,
  PhaseContext,
  PhaseResult,
  PhaseModule,
  PhaseRegistry,
  AvailableAction
} from './types';

export {
  createPhaseContext,
  resetContextForPhaseChange,
  successResult,
  errorResult,
  createPhaseRegistry
} from './types';

export {
  generateActionId,
  addLog,
  createAction,
  recordAction,
  setWarriorStatus,
  canWarriorAct
} from './stateUtils';

export {
  toWarriorView,
  toWarbandView,
  getCurrentWarband,
  getOpponentWarband,
  findWarrior,
  findWarriorView
} from './viewModels';

// State machine exports
export {
  getNextState,
  isNewTurn,
  resetWarriorFlags,
  createInitialState,
  createNewTurnState
} from './stateMachine';

// Shared rules exports (dice, wound resolution, armor saves, etc.)
export {
  // Dice functions
  rollD6,
  roll2D6,
  rollD66,
  rollD3,
  // Combat resolution
  rollToWound,
  rollArmorSave,
  rollInjury,
  rollCriticalHit,
  // Modifiers
  calculateArmorSaveModifier,
  // Weapon helpers
  getWeaponStrength,
  getWeaponArmorModifier,
  getWeaponEnemyArmorBonus,
  weaponHasRule,
  getDistance,
  // Leadership
  leadershipTest,
  // Constants
  TURN_PHASES
} from './rules';

// Type exports from rules
export type {
  TurnPhase,
  ToHitResult,
  WoundResult,
  ArmorSaveResult,
  InjuryResult,
  CriticalHitResult,
  LeadershipTestResult
} from './rules';
