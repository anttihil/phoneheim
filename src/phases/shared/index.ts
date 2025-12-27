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
