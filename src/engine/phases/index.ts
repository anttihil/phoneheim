// Phase Module Registry
// Exports all phase modules and types for the modular architecture

// Type exports
export type {
  PhaseSubState,
  PhaseContext,
  PhaseResult,
  PhaseModule,
  PhaseRegistry
} from './types';

export {
  createPhaseContext,
  resetContextForPhaseChange,
  successResult,
  errorResult,
  createPhaseRegistry
} from './types';

// Phase module exports
export { setupPhase } from './setup';
export { recoveryPhase, getWarriorsNeedingRecovery, isRecoveryPhaseComplete } from './recovery';
export { movementPhase } from './movement';
export { shootingPhase } from './shooting';
export { combatPhase } from './combat';

// View model exports
export {
  toWarriorView,
  toWarbandView,
  getCurrentWarband,
  getOpponentWarband,
  findWarrior,
  findWarriorView
} from './viewModels';

// State utility exports
export {
  generateActionId,
  addLog,
  createAction,
  recordAction,
  setWarriorStatus,
  canWarriorAct
} from './stateUtils';

// All phases in order (for registry creation)
import { setupPhase } from './setup';
import { recoveryPhase } from './recovery';
import { movementPhase } from './movement';
import { shootingPhase } from './shooting';
import { combatPhase } from './combat';

export const allPhases = [
  setupPhase,
  recoveryPhase,
  movementPhase,
  shootingPhase,
  combatPhase
];
