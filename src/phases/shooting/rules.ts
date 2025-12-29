// Shooting Phase Rules - Shooting-only functions
// Functions specific to ranged combat resolution

import { BS_TO_HIT } from '../../data/characteristics';
import { RANGED_WEAPONS } from '../../data/equipment';
import {
  rollD6,
  weaponHasRule,
  getWeaponRules,
  type ShootingModifiers,
  type ToHitResult,
} from '../shared/rules';

// =====================================
// SHOOTING TO HIT
// =====================================

export function rollToHitShooting(ballisticSkill: number, modifiers: ShootingModifiers = {}): ToHitResult {
  const baseNeeded = BS_TO_HIT[ballisticSkill] || 6;
  let needed = baseNeeded;

  if (modifiers.cover) needed += 1;
  if (modifiers.longRange) needed += 1;
  if (modifiers.moved) needed += 1;
  if (modifiers.largeTarget) needed -= 1;
  if (modifiers.accuracy) needed -= modifiers.accuracy;

  // Minimum of 2+ to hit (1 always misses)
  needed = Math.max(2, Math.min(6, needed));

  const roll = rollD6();
  return {
    success: roll >= needed,
    roll,
    needed,
    criticalHit: roll === 6
  };
}

// =====================================
// SHOOTING MODIFIERS
// =====================================

export function calculateShootingModifiers(modifiers: ShootingModifiers): number {
  let total = 0;
  if (modifiers.cover) total += 1;        // -1 to hit (harder)
  if (modifiers.longRange) total += 1;    // -1 to hit
  if (modifiers.moved) total += 1;        // -1 to hit
  if (modifiers.largeTarget) total -= 1;  // +1 to hit (easier)
  return total;
}

// =====================================
// WEAPON FUNCTIONS
// =====================================

export function getWeaponAccuracyBonus(weaponKey: string): number {
  const rules = getWeaponRules(weaponKey);
  for (const rule of rules) {
    if (rule.startsWith('accuracy')) {
      const match = rule.match(/accuracy\+?(-?\d+)/);
      if (match) return parseInt(match[1]);
    }
  }
  return 0;
}

export function getRangedWeaponRange(weaponKey: string): number {
  const weapon = RANGED_WEAPONS[weaponKey as keyof typeof RANGED_WEAPONS];
  return weapon?.range ?? 24;
}

export function weaponMoveOrFire(weaponKey: string): boolean {
  return weaponHasRule(weaponKey, 'moveOrFire');
}
