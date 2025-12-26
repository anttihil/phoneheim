// Shooting Phase Handler
// Handles shooting attacks and target validation

import type {
  GameState,
  GameWarrior,
  GameAction,
  ShootingModifiers,
  ShootingTarget,
  CombatResolution
} from '../../types/game';
import { RANGED_WEAPONS } from '../../data/equipment';
import {
  rollToHitShooting,
  rollToWound,
  rollArmorSave,
  rollInjury,
  rollCriticalHit,
  calculateShootingModifiers,
  calculateArmorSaveModifier,
  getWeaponStrength,
  getWeaponArmorModifier,
  getWeaponEnemyArmorBonus,
  getWeaponAccuracyBonus
} from '../rules/combat';
import type { ShootingResult } from './types';

// =====================================
// UTILITY FUNCTIONS
// =====================================

function generateActionId(): string {
  return 'action_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function addLog(gameState: GameState, message: string): void {
  gameState.log.push({
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    message,
    timestamp: new Date().toISOString()
  });
}

/**
 * Find warrior by ID across all warbands
 */
function findWarrior(gameState: GameState, warriorId: string): { warrior: GameWarrior; warbandIndex: number } | null {
  for (let warbandIndex = 0; warbandIndex < gameState.warbands.length; warbandIndex++) {
    const warband = gameState.warbands[warbandIndex];
    const warrior = warband.warriors.find(w => w.id === warriorId);
    if (warrior) {
      return { warrior, warbandIndex };
    }
  }
  return null;
}

/**
 * Get warrior's armor save value
 */
export function getWarriorArmorSave(warrior: GameWarrior): number {
  const armor = warrior.equipment?.armor || [];

  let baseSave = 7; // No armor = cannot save

  if (armor.includes('gromrilArmor')) {
    baseSave = 4;
  } else if (armor.includes('heavyArmor')) {
    baseSave = 5;
  } else if (armor.includes('lightArmor')) {
    baseSave = 6;
  }

  // Shield adds +1
  if (armor.includes('shield')) {
    baseSave -= 1;
  }

  return baseSave;
}

/**
 * Apply injury result to a warrior
 */
function applyInjuryResult(
  gameState: GameState,
  warbandIndex: number,
  warrior: GameWarrior,
  injuryResult: 'knockedDown' | 'stunned' | 'outOfAction'
): void {
  const warband = gameState.warbands[warbandIndex];

  if (injuryResult === 'knockedDown') {
    warrior.gameStatus = 'knockedDown';
    addLog(gameState, `${warrior.name || warrior.type} is knocked down`);
  } else if (injuryResult === 'stunned') {
    warrior.gameStatus = 'stunned';
    addLog(gameState, `${warrior.name || warrior.type} is stunned`);
  } else {
    warrior.gameStatus = 'outOfAction';
    warband.outOfActionCount++;
    addLog(gameState, `${warrior.name || warrior.type} is taken out of action`);
  }
}

// =====================================
// SHOOTING PHASE QUERIES
// =====================================

/**
 * Check if warrior can shoot
 */
export function canWarriorShoot(gameState: GameState, warrior: GameWarrior): boolean {
  // Must be standing
  if (warrior.gameStatus !== 'standing') return false;

  // Cannot shoot if already shot
  if (warrior.hasShot) return false;

  // Cannot shoot if ran, charged, or failed a charge
  if (warrior.hasRun || warrior.hasCharged || warrior.hasFailedCharge) return false;

  // Cannot shoot if in combat
  if (warrior.combatState.inCombat) return false;

  // Must have ranged weapon
  if (!warrior.equipment?.ranged || warrior.equipment.ranged.length === 0) return false;

  return true;
}

/**
 * Get available shooting targets for a warrior
 */
export function getShootingTargets(
  gameState: GameState,
  shooterId: string
): ShootingTarget[] {
  const shooterResult = findWarrior(gameState, shooterId);
  if (!shooterResult) return [];

  const { warrior: shooter, warbandIndex } = shooterResult;
  const opponentIndex = warbandIndex === 0 ? 1 : 0;
  const opponentWarband = gameState.warbands[opponentIndex];

  // Get shooter's ranged weapon (use first ranged weapon)
  const weaponKey = shooter.equipment?.ranged?.[0];
  if (!weaponKey) return [];

  const weapon = RANGED_WEAPONS[weaponKey as keyof typeof RANGED_WEAPONS];
  const weaponRange = weapon?.range ?? 24;

  const targets: ShootingTarget[] = [];

  for (const target of opponentWarband.warriors) {
    // Cannot shoot at out of action warriors
    if (target.gameStatus === 'outOfAction') continue;

    // Cannot shoot at hidden warriors (unless within detection range)
    if (target.isHidden) continue;

    // Cannot shoot into combat
    if (target.combatState.inCombat) continue;

    // Determine if in cover and long range (for now, use stored state - user toggles)
    const inCover = target.combatState.inCover;

    // Calculate to-hit needed
    const ballisticSkill = shooter.profile.BS;
    const modifiers: ShootingModifiers = {
      cover: inCover,
      longRange: false, // Will be toggled by user
      moved: shooter.hasMoved,
      largeTarget: false // Could be derived from target's special rules
    };

    // Get weapon accuracy bonus
    const accuracyBonus = getWeaponAccuracyBonus(weaponKey);

    // Calculate base to-hit
    const modTotal = calculateShootingModifiers(modifiers);
    const baseNeeded = ballisticSkill <= 1 ? 6 : (7 - ballisticSkill);
    const toHitNeeded = Math.max(2, Math.min(6, baseNeeded + modTotal - accuracyBonus));

    targets.push({
      targetId: target.id,
      targetName: target.name || target.type,
      targetStatus: target.gameStatus,
      inCover,
      longRange: false,
      toHitNeeded
    });
  }

  return targets;
}

// =====================================
// SHOOTING PHASE ACTIONS
// =====================================

/**
 * Execute a shooting attack
 */
export function executeShot(
  gameState: GameState,
  shooterId: string,
  targetId: string,
  modifiers: ShootingModifiers
): ShootingResult {
  const shooterResult = findWarrior(gameState, shooterId);
  const targetResult = findWarrior(gameState, targetId);

  if (!shooterResult || !targetResult) {
    throw new Error('Shooter or target not found');
  }

  const { warrior: shooter, warbandIndex: shooterWarbandIndex } = shooterResult;
  const { warrior: target, warbandIndex: targetWarbandIndex } = targetResult;

  // Get weapon
  const weaponKey = shooter.equipment?.ranged?.[0] || 'bow';
  const weapon = RANGED_WEAPONS[weaponKey as keyof typeof RANGED_WEAPONS];
  const weaponStrength = getWeaponStrength(weaponKey, shooter.profile.S);
  const weaponName = weapon?.name || weaponKey;

  // Build resolution
  const resolution: CombatResolution = {
    attackerId: shooterId,
    attackerName: shooter.name || shooter.type,
    defenderId: targetId,
    defenderName: target.name || target.type,
    weapon: weaponName,
    weaponStrength,
    toHitRoll: 0,
    toHitNeeded: 0,
    hit: false,
    finalOutcome: 'miss'
  };

  // Store previous state
  const previousState: Partial<GameWarrior> = {
    hasShot: shooter.hasShot,
    isHidden: shooter.isHidden
  };

  // Shooting reveals hidden warriors
  if (shooter.isHidden) {
    shooter.isHidden = false;
    addLog(gameState, `${shooter.name || shooter.type} is revealed (shooting)`);
  }

  // Roll to hit
  const accuracyBonus = getWeaponAccuracyBonus(weaponKey);
  const hitResult = rollToHitShooting(shooter.profile.BS, {
    cover: modifiers.cover,
    longRange: modifiers.longRange,
    moved: modifiers.moved,
    largeTarget: modifiers.largeTarget,
    accuracy: accuracyBonus
  });

  resolution.toHitRoll = hitResult.roll;
  resolution.toHitNeeded = hitResult.needed;
  resolution.hit = hitResult.success;

  // If miss, we're done
  if (!hitResult.success) {
    resolution.finalOutcome = 'miss';
    shooter.hasShot = true;

    const action = createShootingAction(gameState, shooterWarbandIndex, shooter, targetWarbandIndex, target, previousState, resolution);
    return { action, resolution };
  }

  // Roll to wound
  const woundResult = rollToWound(weaponStrength, target.profile.T);
  resolution.toWoundRoll = woundResult.roll ?? undefined;
  resolution.toWoundNeeded = woundResult.needed;
  resolution.wounded = woundResult.success;
  resolution.criticalHit = woundResult.criticalHit;

  if (!woundResult.success) {
    resolution.finalOutcome = 'noWound';
    shooter.hasShot = true;

    const action = createShootingAction(gameState, shooterWarbandIndex, shooter, targetWarbandIndex, target, previousState, resolution);
    return { action, resolution };
  }

  // Handle critical hit
  if (woundResult.criticalHit) {
    const critResult = rollCriticalHit();
    resolution.criticalType = critResult.type;
    resolution.criticalDescription = critResult.description;

    // Apply critical effects
    if (critResult.ignoresArmor) {
      resolution.noArmorSave = true;
    }
  }

  // Roll armor save (if allowed)
  if (!resolution.noArmorSave) {
    const baseArmor = getWarriorArmorSave(target);
    if (baseArmor <= 6) {
      const strengthMod = calculateArmorSaveModifier(weaponStrength);
      const weaponMod = getWeaponArmorModifier(weaponKey);
      const enemyBonus = getWeaponEnemyArmorBonus(weaponKey);

      const saveResult = rollArmorSave(baseArmor, {
        strengthMod,
        weaponMod,
        enemyBonus
      });

      resolution.armorSaveRoll = saveResult.roll ?? undefined;
      resolution.armorSaveNeeded = saveResult.needed;
      resolution.armorSaved = saveResult.success;

      if (saveResult.success) {
        resolution.finalOutcome = 'saved';
        shooter.hasShot = true;

        const action = createShootingAction(gameState, shooterWarbandIndex, shooter, targetWarbandIndex, target, previousState, resolution);
        return { action, resolution };
      }
    }
  }

  // Apply wound to target
  target.woundsRemaining -= 1;

  // If still has wounds, no injury roll needed
  if (target.woundsRemaining > 0) {
    resolution.finalOutcome = 'knockedDown'; // Indicates wound taken
    shooter.hasShot = true;

    const action = createShootingAction(gameState, shooterWarbandIndex, shooter, targetWarbandIndex, target, previousState, resolution);
    return { action, resolution };
  }

  // Roll for injury
  const injuryMods: { concussion?: boolean; injuryBonus?: number } = {};
  if (resolution.criticalType === 'masterStrike') {
    injuryMods.injuryBonus = 2;
  }

  const injuryResult = rollInjury(injuryMods);
  resolution.injuryRoll = injuryResult.roll;
  resolution.injuryResult = injuryResult.result;
  resolution.finalOutcome = injuryResult.result;

  // Apply injury to target
  applyInjuryResult(gameState, targetWarbandIndex, target, injuryResult.result);

  shooter.hasShot = true;

  const action = createShootingAction(gameState, shooterWarbandIndex, shooter, targetWarbandIndex, target, previousState, resolution);
  return { action, resolution };
}

/**
 * Helper to create shooting action
 */
function createShootingAction(
  gameState: GameState,
  shooterWarbandIndex: number,
  shooter: GameWarrior,
  targetWarbandIndex: number,
  target: GameWarrior,
  previousState: Partial<GameWarrior>,
  resolution: CombatResolution
): GameAction {
  const action: GameAction = {
    id: generateActionId(),
    type: 'shoot',
    timestamp: new Date().toISOString(),
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    warriorId: shooter.id,
    warbandIndex: shooterWarbandIndex,
    targetId: target.id,
    targetWarbandIndex,
    previousState,
    description: `${shooter.name || shooter.type} shoots ${target.name || target.type} - ${resolution.finalOutcome}`
  };

  gameState.actionHistory.push(action);
  addLog(gameState, action.description);

  return action;
}
