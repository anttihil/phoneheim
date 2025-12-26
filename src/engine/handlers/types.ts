// Handler Types - Result and Options types for phase handlers

import type { GameAction, WarriorGameStatus } from '../../types/game';

// =====================================
// RECOVERY HANDLER TYPES
// =====================================

export interface RallyResult {
  success: boolean;
  roll: number;
  leadershipNeeded: number;
  action: GameAction;
}

// =====================================
// MOVEMENT HANDLER TYPES
// =====================================

export interface MoveOptions {
  disengageFromDowned?: boolean; // If true, will disengage from knocked down/stunned enemies
}

export interface RunOptions {
  hasEnemiesNearby?: boolean; // Are non-hidden standing enemies within 8"?
}

export interface ClimbOptions {
  height: number; // Height to climb in inches
  direction: 'up' | 'down';
}

export interface ClimbResult {
  action: GameAction;
  success: boolean;
  fell?: boolean; // If climbing down failed, warrior fell
}

export interface JumpDownResult {
  action: GameAction;
  success: boolean;
  testsPassed: number;
  testsFailed: number;
}

export interface FallingDamageResult {
  action: GameAction;
  hits: number;
  strength: number;
  woundsDealt: number;
  finalStatus: WarriorGameStatus;
}

export interface EdgeFallCheckResult {
  testRequired: boolean;
  testPassed?: boolean;
  testRoll?: number;
  fell: boolean;
  fallDamage?: FallingDamageResult;
}

export interface ChargeOptions {
  reachedTarget?: boolean; // Did the warrior reach the target? (default: true)
  interceptedBy?: {
    warriorId: string;
    warbandIndex: number;
  }; // If set, charge is intercepted by this warrior instead of reaching original target
}

export interface CanMoveInCombatResult {
  canMove: boolean;
  reason?: string;
}

// =====================================
// SHOOTING HANDLER TYPES
// =====================================

// Shooting types are in types/game.ts (ShootingModifiers, CombatResolution, ShootingTarget)

export interface ShootingResult {
  action: GameAction;
  resolution: import('../../types/game').CombatResolution;
}

// =====================================
// COMBAT HANDLER TYPES
// =====================================

// Combat types are in types/game.ts (StrikeOrderEntry, MeleeTarget, CombatResolution)

export interface MeleeResult {
  action: GameAction;
  resolution: import('../../types/game').CombatResolution;
}
