// Mordheim Core Game Rules Logic
// Combat math, dice rolling, and pure game functions

import { getCloseCombatToHit, getWoundRoll, BS_TO_HIT } from '../../data/characteristics';
import { MELEE_WEAPONS, RANGED_WEAPONS } from '../../data/equipment';
import type { DiceResult, GameWarrior } from '../../types';

// Position type for distance calculations
interface Position {
  x: number;
  y: number;
}

// Warband type for game functions
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

// Result types
interface CharacteristicTestResult {
  success: boolean;
  roll: number;
  autoFail?: boolean;
}

interface LeadershipTestResult {
  success: boolean;
  roll: number;
}

interface ShootingModifiers {
  cover?: boolean;
  longRange?: boolean;
  moved?: boolean;
  largeTarget?: boolean;
  accuracy?: number;
}

interface ToHitResult {
  success: boolean;
  roll: number;
  needed: number;
  criticalHit: boolean;
}

interface WoundResult {
  success: boolean;
  roll: number | null;
  needed?: number;
  cannotWound?: boolean;
  criticalHit?: boolean;
}

interface CriticalHitResult {
  type: 'vitalPart' | 'exposedSpot' | 'masterStrike';
  wounds: number;
  ignoresArmor: boolean;
  injuryBonus: number;
  description: string;
}

interface ArmorSaveModifiers {
  shield?: boolean;
  strengthMod?: number;
  weaponMod?: number;
  enemyBonus?: number;
}

interface ArmorSaveResult {
  success: boolean;
  roll: number | null;
  needed?: number;
  noSave?: boolean;
}

interface InjuryModifiers {
  concussion?: boolean;
  injuryBonus?: number;
}

interface InjuryResult {
  result: 'knockedDown' | 'stunned' | 'outOfAction';
  roll: number;
  modified?: boolean;
}

interface HelmetSaveResult {
  success: boolean;
  roll: number;
  description: string;
}

interface ParryResult {
  success: boolean;
  roll?: number;
  needed?: number;
  cannotParry?: boolean;
}

interface JumpTestResult {
  success: boolean;
  tests: CharacteristicTestResult[];
}

interface FallingDamageResult {
  hits: number;
  strength: number;
}

interface TurnPhase {
  id: string;
  name: string;
  description: string;
}

interface RecoveryAction {
  warrior: string;
  action: 'rally' | 'recover' | 'standUp';
  success?: boolean;
  from?: string;
  to?: string;
}

// Dice rolling utilities
export function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function rollD3(): number {
  return Math.floor(Math.random() * 3) + 1;
}

export function roll2D6(): number {
  return rollD6() + rollD6();
}

export function rollD66(): number {
  return rollD6() * 10 + rollD6();
}

// Characteristic tests
export function characteristicTest(characteristicValue: number): CharacteristicTestResult {
  const roll = rollD6();
  // Natural 6 always fails
  if (roll === 6) return { success: false, roll, autoFail: true };
  return { success: roll <= characteristicValue, roll };
}

export function leadershipTest(leadershipValue: number): LeadershipTestResult {
  const roll = roll2D6();
  return { success: roll <= leadershipValue, roll };
}

// Shooting mechanics
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
    criticalHit: roll === 6 // For determining if critical hit possible
  };
}

// Close combat mechanics
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

// Wounding
export function rollToWound(strength: number, toughness: number): WoundResult {
  const needed = getWoundRoll(strength, toughness);
  if (needed === null) {
    return { success: false, roll: null, cannotWound: true };
  }

  const roll = rollD6();
  const isCritical = roll === 6 && needed <= 5; // Can only crit if not needing 6s to wound

  return {
    success: roll >= needed,
    roll,
    needed,
    criticalHit: isCritical
  };
}

// Critical hit resolution
export function rollCriticalHit(): CriticalHitResult {
  const roll = rollD6();
  if (roll <= 2) {
    return { type: 'vitalPart', wounds: 2, ignoresArmor: false, injuryBonus: 0, description: 'Hits a vital part' };
  } else if (roll <= 4) {
    return { type: 'exposedSpot', wounds: 2, ignoresArmor: true, injuryBonus: 0, description: 'Hits an exposed spot' };
  } else {
    return { type: 'masterStrike', wounds: 2, ignoresArmor: true, injuryBonus: 2, description: 'Master strike!' };
  }
}

// Armor saves
export function rollArmorSave(baseArmor: number, modifiers: ArmorSaveModifiers = {}): ArmorSaveResult {
  let save = baseArmor;

  if (modifiers.shield) save += 1;
  if (modifiers.strengthMod) save -= modifiers.strengthMod;
  if (modifiers.weaponMod) save -= modifiers.weaponMod;
  if (modifiers.enemyBonus) save += modifiers.enemyBonus; // Daggers etc

  // Save cannot be better than 2+
  save = Math.max(2, save);

  if (save > 6) {
    return { success: false, roll: null, noSave: true };
  }

  const roll = rollD6();
  return {
    success: roll >= save,
    roll,
    needed: save
  };
}

// Injury roll
export function rollInjury(modifiers: InjuryModifiers = {}): InjuryResult {
  let roll = rollD6();

  // Apply concussion effect
  if (modifiers.concussion && roll >= 2 && roll <= 4) {
    return { result: 'stunned', roll, modified: true };
  }

  // Apply injury modifiers
  if (modifiers.injuryBonus) {
    roll += modifiers.injuryBonus;
  }

  if (roll <= 2) {
    return { result: 'knockedDown', roll };
  } else if (roll <= 4) {
    return { result: 'stunned', roll };
  } else {
    return { result: 'outOfAction', roll };
  }
}

// Helmet save (against being stunned)
export function rollHelmetSave(): HelmetSaveResult {
  const roll = rollD6();
  return {
    success: roll >= 4,
    roll,
    description: roll >= 4 ? 'Helmet saves! Knocked down instead of stunned.' : 'Helmet fails to protect.'
  };
}

// Parry attempt
export function attemptParry(opponentHighestRoll: number): ParryResult {
  // Cannot parry a 6
  if (opponentHighestRoll === 6) {
    return { success: false, cannotParry: true };
  }

  const roll = rollD6();
  return {
    success: roll > opponentHighestRoll,
    roll,
    needed: opponentHighestRoll + 1
  };
}

// Rout test
export function checkRoutRequired(warband: WarbandWithStatus): boolean {
  const outOfAction = warband.warriors.filter(w => w.status === 'outOfAction').length;
  const total = warband.warriors.length;
  return outOfAction >= Math.ceil(total / 4);
}

export function rollRoutTest(leadershipValue: number): LeadershipTestResult {
  return leadershipTest(leadershipValue);
}

// All Alone test
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

// Fear test
export function rollFearTest(leadershipValue: number): LeadershipTestResult {
  return leadershipTest(leadershipValue);
}

// Climbing test
export function rollClimbingTest(initiativeValue: number): CharacteristicTestResult {
  return characteristicTest(initiativeValue);
}

// Jump test (for each 2" of height)
export function rollJumpTest(initiativeValue: number, height: number): JumpTestResult {
  const testsNeeded = Math.floor(height / 2);
  const results: CharacteristicTestResult[] = [];

  for (let i = 0; i < testsNeeded; i++) {
    const test = characteristicTest(initiativeValue);
    results.push(test);
    if (!test.success) break;
  }

  return {
    success: results.every(r => r.success),
    tests: results
  };
}

// Falling damage
export function calculateFallingDamage(heightInInches: number): FallingDamageResult {
  const hits = rollD3();
  const strength = heightInInches;
  return { hits, strength };
}

// Charge distance
export function getChargeDistance(movement: number): number {
  return movement * 2;
}

// Running distance
export function getRunDistance(movement: number): number {
  return movement * 2;
}

// Hidden detection
export function canDetectHidden(
  detectingWarrior: { position?: Position; initiative?: number },
  hiddenWarrior: { position?: Position }
): boolean {
  if (!detectingWarrior.position || !hiddenWarrior.position || !detectingWarrior.initiative) {
    return false;
  }
  const distance = getDistance(detectingWarrior.position, hiddenWarrior.position);
  return distance <= detectingWarrior.initiative;
}

// Distance calculation helper
export function getDistance(pos1: Position, pos2: Position): number {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Turn sequence phases
export const TURN_PHASES: TurnPhase[] = [
  { id: 'recovery', name: 'Recovery Phase', description: 'Rally fleeing, recover stunned/knocked down' },
  { id: 'movement', name: 'Movement Phase', description: 'Declare charges, compulsory moves, remaining moves' },
  { id: 'shooting', name: 'Shooting Phase', description: 'Fire missile weapons' },
  { id: 'combat', name: 'Hand-to-Hand Combat Phase', description: 'Resolve close combat (both players fight)' }
];

// Recovery phase actions
export function recoveryPhase(warband: WarbandWithStatus): RecoveryAction[] {
  const actions: RecoveryAction[] = [];

  for (const warrior of warband.warriors) {
    if (warrior.status === 'fleeing') {
      // Rally test
      const test = leadershipTest(warrior.leadership || 7);
      if (test.success) {
        actions.push({ warrior: warrior.id, action: 'rally', success: true });
        warrior.status = 'standing';
      } else {
        actions.push({ warrior: warrior.id, action: 'rally', success: false });
        // Continue fleeing
      }
    } else if (warrior.status === 'stunned') {
      actions.push({ warrior: warrior.id, action: 'recover', from: 'stunned', to: 'knockedDown' });
      warrior.status = 'knockedDown';
    } else if (warrior.status === 'knockedDown') {
      actions.push({ warrior: warrior.id, action: 'standUp' });
      warrior.status = 'standing';
      warrior.halfMovement = true; // Can only move half this turn
      warrior.strikesLast = true; // Strikes last in combat this turn
    }
  }

  return actions;
}

// =====================================
// WEAPON AND MODIFIER FUNCTIONS
// =====================================

// Calculate shooting modifiers total
export function calculateShootingModifiers(modifiers: ShootingModifiers): number {
  let total = 0;
  if (modifiers.cover) total += 1;        // -1 to hit (harder)
  if (modifiers.longRange) total += 1;    // -1 to hit
  if (modifiers.moved) total += 1;        // -1 to hit
  if (modifiers.largeTarget) total -= 1;  // +1 to hit (easier)
  return total;
}

// Calculate armor save modifier from strength
export function calculateArmorSaveModifier(strength: number): number {
  // Strength 4+ gives -1 save per point above 3
  if (strength <= 3) return 0;
  return -(strength - 3);
}

// Get weapon special rules
export function getWeaponRules(weaponKey: string): string[] {
  const melee = MELEE_WEAPONS[weaponKey as keyof typeof MELEE_WEAPONS];
  if (melee) return melee.rules || [];

  const ranged = RANGED_WEAPONS[weaponKey as keyof typeof RANGED_WEAPONS];
  if (ranged) return ranged.rules || [];

  return [];
}

// Check if weapon has specific rule
export function weaponHasRule(weaponKey: string, rule: string): boolean {
  return getWeaponRules(weaponKey).includes(rule);
}

// Get weapon strength value (resolves 'user+X' format)
export function getWeaponStrength(weaponKey: string, userStrength: number, isFirstRound: boolean = false): number {
  const melee = MELEE_WEAPONS[weaponKey as keyof typeof MELEE_WEAPONS];
  if (melee) {
    let baseStrength = userStrength;
    const strengthValue = melee.strength;

    if (typeof strengthValue === 'number') {
      baseStrength = strengthValue;
    } else if (strengthValue === 'user') {
      baseStrength = userStrength;
    } else if (strengthValue === 'user+1') {
      baseStrength = userStrength + 1;
    } else if (strengthValue === 'user+2') {
      baseStrength = userStrength + 2;
    } else if (strengthValue === 'user-1') {
      baseStrength = userStrength - 1;
    }

    // Handle first-round-only bonuses (flail, morningstar)
    if (melee.rules?.includes('heavy') && !isFirstRound) {
      // Remove the bonus on subsequent rounds
      if (strengthValue === 'user+1') baseStrength = userStrength;
      if (strengthValue === 'user+2') baseStrength = userStrength;
    }

    return Math.max(1, baseStrength);
  }

  const ranged = RANGED_WEAPONS[weaponKey as keyof typeof RANGED_WEAPONS];
  if (ranged) {
    const strengthValue = ranged.strength;
    if (typeof strengthValue === 'number') {
      return strengthValue;
    } else if (strengthValue === 'user') {
      return userStrength;
    }
    return userStrength;
  }

  return userStrength;
}

// Get weapon's additional armor save modifier
export function getWeaponArmorModifier(weaponKey: string): number {
  const rules = getWeaponRules(weaponKey);

  // Cutting edge (axes) give extra -1
  if (rules.includes('cuttingEdge')) return -1;

  // Check for saveModifier rules
  for (const rule of rules) {
    if (rule.startsWith('saveModifier')) {
      const match = rule.match(/saveModifier(-?\d+)/);
      if (match) return parseInt(match[1]);
    }
  }

  return 0;
}

// Get weapon's enemy armor bonus (daggers give +1 to enemy save)
export function getWeaponEnemyArmorBonus(weaponKey: string): number {
  if (weaponHasRule(weaponKey, 'enemyArmorSaveBonus')) {
    return 1;
  }
  return 0;
}

// Check if weapon can parry
export function canWeaponParry(weaponKey: string): boolean {
  return weaponHasRule(weaponKey, 'parry');
}

// Check if weapon causes concussion
export function weaponCausesConcussion(weaponKey: string): boolean {
  return weaponHasRule(weaponKey, 'concussion');
}

// Check if weapon strikes last
export function weaponStrikesLast(weaponKey: string): boolean {
  return weaponHasRule(weaponKey, 'strikeLast');
}

// Check if weapon strikes first
export function weaponStrikesFirst(weaponKey: string): boolean {
  return weaponHasRule(weaponKey, 'strikeFirst');
}

// Get ranged weapon range
export function getRangedWeaponRange(weaponKey: string): number {
  const weapon = RANGED_WEAPONS[weaponKey as keyof typeof RANGED_WEAPONS];
  return weapon?.range ?? 24;
}

// Check if weapon requires move-or-fire
export function weaponMoveOrFire(weaponKey: string): boolean {
  return weaponHasRule(weaponKey, 'moveOrFire');
}

// Get weapon accuracy bonus
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

// Parry with re-roll option (for sword + buckler combo)
export interface ExtendedParryResult {
  success: boolean;
  roll: number;
  rerolled?: boolean;
  rerollRoll?: number;
  needed: number;
}

export function attemptParryWithReroll(opponentHighestRoll: number, canReroll: boolean): ExtendedParryResult {
  // Cannot parry a natural 6
  if (opponentHighestRoll === 6) {
    return { success: false, roll: 0, needed: 7 };
  }

  const needed = opponentHighestRoll + 1;
  const roll = rollD6();

  if (roll > opponentHighestRoll) {
    return { success: true, roll, needed };
  }

  // If can reroll (has sword AND buckler), try again
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
