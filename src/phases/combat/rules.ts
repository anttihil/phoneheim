// Combat Phase Rules - Melee-only functions
// Functions specific to close combat resolution

import { getCloseCombatToHit } from '../../data/characteristics';
import {
  rollD6,
  weaponHasRule,
  getDistance,
  type ToHitResult,
} from '../shared/rules';

// =====================================
// TYPE DEFINITIONS
// =====================================

interface Position {
  x: number;
  y: number;
}

interface WarbandWithStatus {
  warriors: Array<{
    id: string;
    leadership?: number;
    status: string;
    halfMovement?: boolean;
    strikesLast?: boolean;
    skills?: string[];
    position?: Position;
    initiative?: number;
    inBaseContactWith?: string;
  }>;
}

export interface ExtendedParryResult {
  success: boolean;
  roll: number;
  rerolled?: boolean;
  rerollRoll?: number;
  needed: number;
}

// =====================================
// MELEE TO HIT
// =====================================

export function rollToHitMelee(attackerWS: number, defenderWS: number): ToHitResult {
  const needed = getCloseCombatToHit(attackerWS, defenderWS);
  const roll = rollD6();
  return {
    success: roll >= needed,
    roll,
    needed,
    criticalHit: roll === 6
  };
}

// =====================================
// PARRY FUNCTIONS
// =====================================

export function canWeaponParry(weaponKey: string): boolean {
  return weaponHasRule(weaponKey, 'parry');
}

export function attemptParryWithReroll(opponentHighestRoll: number, canReroll: boolean): ExtendedParryResult {
  if (opponentHighestRoll === 6) {
    return { success: false, roll: 0, needed: 7 };
  }

  const needed = opponentHighestRoll + 1;
  const roll = rollD6();

  if (roll > opponentHighestRoll) {
    return { success: true, roll, needed };
  }

  if (canReroll) {
    const rerollRoll = rollD6();
    return {
      success: rerollRoll > opponentHighestRoll,
      roll,
      rerolled: true,
      rerollRoll,
      needed
    };
  }

  return { success: false, roll, needed };
}

// =====================================
// WEAPON SPECIAL RULES
// =====================================

export function weaponCausesConcussion(weaponKey: string): boolean {
  return weaponHasRule(weaponKey, 'concussion');
}

export function weaponStrikesLast(weaponKey: string): boolean {
  return weaponHasRule(weaponKey, 'strikeLast');
}

export function weaponStrikesFirst(weaponKey: string): boolean {
  return weaponHasRule(weaponKey, 'strikeFirst');
}

// =====================================
// ALL ALONE TEST
// =====================================

export function checkAllAlone(
  warrior: WarbandWithStatus['warriors'][0],
  warband: WarbandWithStatus,
  enemies: Array<{ inBaseContactWith?: string; status: string }>
): boolean {
  if (warrior.skills?.includes('combatMaster')) return false;

  const inCombatWith = enemies.filter(e => e.inBaseContactWith === warrior.id && e.status === 'standing');
  if (inCombatWith.length < 2) return false;

  const friendsNearby = warband.warriors.filter(w =>
    w.id !== warrior.id &&
    w.status === 'standing' &&
    w.position && warrior.position &&
    getDistance(warrior.position, w.position) <= 6
  );

  return friendsNearby.length === 0;
}
