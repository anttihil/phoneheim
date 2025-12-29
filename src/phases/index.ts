// Phases Module Registry
// Exports all phase modules and types for the modular architecture

// Shared exports
export * from './shared';

// Type exports (from moved engine/types/)
export * from './types';

// PhaseCoordinator (main engine implementation)
export { PhaseCoordinator } from './PhaseCoordinator';

// Phase module exports
export { setupPhase, getSetupActableWarriors, getSetupAvailableActions, SetupScreen } from './setup';
export { recoveryPhase, getWarriorsNeedingRecovery, isRecoveryPhaseComplete, getRecoveryAvailableActions, RecoveryScreen, RoutTestModal } from './recovery';
export { movementPhase, getMovementActableWarriors, getValidChargeTargets, getMovementAvailableActions, MovementScreen } from './movement';
export { shootingPhase, getShootingActableWarriors, getValidShootingTargets, getShootingAvailableActions, ShootingScreen, TargetSelectScreen, ConfirmScreen, ShootingPanel } from './shooting';
export { combatPhase, getCombatAvailableActions, buildStrikeOrder, getMeleeTargets, CombatScreen, CombatPanel, CombatResolutionModal } from './combat';
export { GameOverScreen } from './gameOver';

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
