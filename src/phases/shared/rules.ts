// Shared Game Rules - Core functions used across phases and components
// Combat math, dice rolling, and pure game functions

import { getWoundRoll } from '../../data/characteristics';
import { MELEE_WEAPONS, RANGED_WEAPONS } from '../../data/equipment';

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

export interface CharacteristicTestResult {
  success: boolean;
  roll: number;
  autoFail?: boolean;
}

export interface LeadershipTestResult {
  success: boolean;
  roll: number;
}

export interface ShootingModifiers {
  cover?: boolean;
  longRange?: boolean;
  moved?: boolean;
  largeTarget?: boolean;
  accuracy?: number;
}

export interface ToHitResult {
  success: boolean;
  roll: number;
  needed: number;
  criticalHit: boolean;
}

export interface WoundResult {
  success: boolean;
  roll: number | null;
  needed?: number;
  cannotWound?: boolean;
  criticalHit?: boolean;
}

export interface CriticalHitResult {
  type: 'vitalPart' | 'exposedSpot' | 'masterStrike';
  wounds: number;
  ignoresArmor: boolean;
  injuryBonus: number;
  description: string;
}

export interface ArmorSaveModifiers {
  shield?: boolean;
  strengthMod?: number;
  weaponMod?: number;
  enemyBonus?: number;
}

export interface ArmorSaveResult {
  success: boolean;
  roll: number | null;
  needed?: number;
  noSave?: boolean;
}

export interface InjuryModifiers {
  concussion?: boolean;
  injuryBonus?: number;
}

export interface InjuryResult {
  result: 'knockedDown' | 'stunned' | 'outOfAction';
  roll: number;
  modified?: boolean;
}

export interface HelmetSaveResult {
  success: boolean;
  roll: number;
  description: string;
}

export interface ParryResult {
  success: boolean;
  roll?: number;
  needed?: number;
  cannotParry?: boolean;
}

export interface JumpTestResult {
  success: boolean;
  tests: CharacteristicTestResult[];
}

export interface FallingDamageResult {
  hits: number;
  strength: number;
}

export interface TurnPhase {
  id: string;
  name: string;
  description: string;
}

export interface RecoveryAction {
  warrior: string;
  action: 'rally' | 'recover' | 'standUp';
  success?: boolean;
  from?: string;
  to?: string;
}

// =====================================
// DICE UTILITIES
// =====================================

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

// =====================================
// CHARACTERISTIC TESTS
// =====================================

export function characteristicTest(characteristicValue: number): CharacteristicTestResult {
  const roll = rollD6();
  if (roll === 6) return { success: false, roll, autoFail: true };
  return { success: roll <= characteristicValue, roll };
}

export function leadershipTest(leadershipValue: number): LeadershipTestResult {
  const roll = roll2D6();
  return { success: roll <= leadershipValue, roll };
}

// =====================================
// WOUND AND DAMAGE RESOLUTION
// =====================================

export function rollToWound(strength: number, toughness: number): WoundResult {
  const needed = getWoundRoll(strength, toughness);
  if (needed === null) {
    return { success: false, roll: null, cannotWound: true };
  }

  const roll = rollD6();
  const isCritical = roll === 6 && needed <= 5;

  return {
    success: roll >= needed,
    roll,
    needed,
    criticalHit: isCritical
  };
}

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

export function rollArmorSave(baseArmor: number, modifiers: ArmorSaveModifiers = {}): ArmorSaveResult {
  let save = baseArmor;

  if (modifiers.shield) save += 1;
  if (modifiers.strengthMod) save -= modifiers.strengthMod;
  if (modifiers.weaponMod) save -= modifiers.weaponMod;
  if (modifiers.enemyBonus) save += modifiers.enemyBonus;

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

export function rollInjury(modifiers: InjuryModifiers = {}): InjuryResult {
  let roll = rollD6();

  if (modifiers.concussion && roll >= 2 && roll <= 4) {
    return { result: 'stunned', roll, modified: true };
  }

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

export function rollHelmetSave(): HelmetSaveResult {
  const roll = rollD6();
  return {
    success: roll >= 4,
    roll,
    description: roll >= 4 ? 'Helmet saves! Knocked down instead of stunned.' : 'Helmet fails to protect.'
  };
}

// =====================================
// ARMOR AND MODIFIER CALCULATIONS
// =====================================

export function calculateArmorSaveModifier(strength: number): number {
  if (strength <= 3) return 0;
  return -(strength - 3);
}

// =====================================
// WEAPON HELPERS
// =====================================

export function getWeaponRules(weaponKey: string): string[] {
  const melee = MELEE_WEAPONS[weaponKey as keyof typeof MELEE_WEAPONS];
  if (melee) return melee.rules || [];

  const ranged = RANGED_WEAPONS[weaponKey as keyof typeof RANGED_WEAPONS];
  if (ranged) return ranged.rules || [];

  return [];
}

export function weaponHasRule(weaponKey: string, rule: string): boolean {
  return getWeaponRules(weaponKey).includes(rule);
}

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

    if (melee.rules?.includes('heavy') && !isFirstRound) {
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

export function getWeaponArmorModifier(weaponKey: string): number {
  const rules = getWeaponRules(weaponKey);

  if (rules.includes('cuttingEdge')) return -1;

  for (const rule of rules) {
    if (rule.startsWith('saveModifier')) {
      const match = rule.match(/saveModifier(-?\d+)/);
      if (match) return parseInt(match[1]);
    }
  }

  return 0;
}

export function getWeaponEnemyArmorBonus(weaponKey: string): number {
  if (weaponHasRule(weaponKey, 'enemyArmorSaveBonus')) {
    return 1;
  }
  return 0;
}

// =====================================
// ROUT AND LEADERSHIP TESTS
// =====================================

export function checkRoutRequired(warband: WarbandWithStatus): boolean {
  const outOfAction = warband.warriors.filter(w => w.status === 'outOfAction').length;
  const total = warband.warriors.length;
  return outOfAction >= Math.ceil(total / 4);
}

export function rollRoutTest(leadershipValue: number): LeadershipTestResult {
  return leadershipTest(leadershipValue);
}

export function rollFearTest(leadershipValue: number): LeadershipTestResult {
  return leadershipTest(leadershipValue);
}

// =====================================
// MOVEMENT AND TERRAIN TESTS
// =====================================

export function rollClimbingTest(initiativeValue: number): CharacteristicTestResult {
  return characteristicTest(initiativeValue);
}

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

export function calculateFallingDamage(heightInInches: number): FallingDamageResult {
  const hits = rollD3();
  const strength = heightInInches;
  return { hits, strength };
}

export function getChargeDistance(movement: number): number {
  return movement * 2;
}

export function getRunDistance(movement: number): number {
  return movement * 2;
}

// =====================================
// UTILITY FUNCTIONS
// =====================================

export function getDistance(pos1: Position, pos2: Position): number {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

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

// =====================================
// TURN PHASES CONSTANT
// =====================================

export const TURN_PHASES: TurnPhase[] = [
  { id: 'recovery', name: 'Recovery Phase', description: 'Rally fleeing, recover stunned/knocked down' },
  { id: 'movement', name: 'Movement Phase', description: 'Declare charges, compulsory moves, remaining moves' },
  { id: 'shooting', name: 'Shooting Phase', description: 'Fire missile weapons' },
  { id: 'combat', name: 'Hand-to-Hand Combat Phase', description: 'Resolve close combat (both players fight)' }
];

// =====================================
// RECOVERY PHASE ACTIONS
// =====================================

export function recoveryPhase(warband: WarbandWithStatus): RecoveryAction[] {
  const actions: RecoveryAction[] = [];

  for (const warrior of warband.warriors) {
    if (warrior.status === 'fleeing') {
      const test = leadershipTest(warrior.leadership || 7);
      if (test.success) {
        actions.push({ warrior: warrior.id, action: 'rally', success: true });
        warrior.status = 'standing';
      } else {
        actions.push({ warrior: warrior.id, action: 'rally', success: false });
      }
    } else if (warrior.status === 'stunned') {
      actions.push({ warrior: warrior.id, action: 'recover', from: 'stunned', to: 'knockedDown' });
      warrior.status = 'knockedDown';
    } else if (warrior.status === 'knockedDown') {
      actions.push({ warrior: warrior.id, action: 'standUp' });
      warrior.status = 'standing';
      warrior.halfMovement = true;
      warrior.strikesLast = true;
    }
  }

  return actions;
}

// =====================================
// BASE PARRY (used by combat rules)
// =====================================

export function attemptParry(opponentHighestRoll: number): ParryResult {
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
