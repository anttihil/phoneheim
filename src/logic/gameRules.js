// Mordheim Core Game Rules Logic

import { getCloseCombatToHit, getWoundRoll, getArmorSaveModifier, BS_TO_HIT } from '../data/characteristics.js';

// Dice rolling utilities
export function rollD6() {
  return Math.floor(Math.random() * 6) + 1;
}

export function rollD3() {
  return Math.floor(Math.random() * 3) + 1;
}

export function roll2D6() {
  return rollD6() + rollD6();
}

export function rollD66() {
  return rollD6() * 10 + rollD6();
}

// Characteristic tests
export function characteristicTest(characteristicValue) {
  const roll = rollD6();
  // Natural 6 always fails
  if (roll === 6) return { success: false, roll, autoFail: true };
  return { success: roll <= characteristicValue, roll };
}

export function leadershipTest(leadershipValue) {
  const roll = roll2D6();
  return { success: roll <= leadershipValue, roll };
}

// Shooting mechanics
export function rollToHitShooting(ballisticSkill, modifiers = {}) {
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
export function rollToHitMelee(attackerWS, defenderWS) {
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
export function rollToWound(strength, toughness) {
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
export function rollCriticalHit() {
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
export function rollArmorSave(baseArmor, modifiers = {}) {
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
export function rollInjury(modifiers = {}) {
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
export function rollHelmetSave() {
  const roll = rollD6();
  return {
    success: roll >= 4,
    roll,
    description: roll >= 4 ? 'Helmet saves! Knocked down instead of stunned.' : 'Helmet fails to protect.'
  };
}

// Parry attempt
export function attemptParry(opponentHighestRoll) {
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
export function checkRoutRequired(warband) {
  const outOfAction = warband.warriors.filter(w => w.status === 'outOfAction').length;
  const total = warband.warriors.length;
  return outOfAction >= Math.ceil(total / 4);
}

export function rollRoutTest(leadershipValue) {
  return leadershipTest(leadershipValue);
}

// All Alone test
export function checkAllAlone(warrior, warband, enemies) {
  if (warrior.skills?.includes('combatMaster')) return false;

  const inCombatWith = enemies.filter(e => e.inBaseContactWith === warrior.id && e.status === 'standing');
  if (inCombatWith.length < 2) return false;

  const friendsNearby = warband.warriors.filter(w =>
    w.id !== warrior.id &&
    w.status === 'standing' &&
    getDistance(warrior.position, w.position) <= 6
  );

  return friendsNearby.length === 0;
}

// Fear test
export function rollFearTest(leadershipValue) {
  return leadershipTest(leadershipValue);
}

// Climbing test
export function rollClimbingTest(initiativeValue) {
  return characteristicTest(initiativeValue);
}

// Jump test (for each 2" of height)
export function rollJumpTest(initiativeValue, height) {
  const testsNeeded = Math.floor(height / 2);
  const results = [];

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
export function calculateFallingDamage(heightInInches) {
  const hits = rollD3();
  const strength = heightInInches;
  return { hits, strength };
}

// Charge distance
export function getChargeDistance(movement) {
  return movement * 2;
}

// Running distance
export function getRunDistance(movement) {
  return movement * 2;
}

// Hidden detection
export function canDetectHidden(detectingWarrior, hiddenWarrior) {
  const distance = getDistance(detectingWarrior.position, hiddenWarrior.position);
  return distance <= detectingWarrior.initiative;
}

// Distance calculation helper
export function getDistance(pos1, pos2) {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Turn sequence phases
export const TURN_PHASES = [
  { id: 'recovery', name: 'Recovery Phase', description: 'Rally fleeing, recover stunned/knocked down' },
  { id: 'movement', name: 'Movement Phase', description: 'Declare charges, compulsory moves, remaining moves' },
  { id: 'shooting', name: 'Shooting Phase', description: 'Fire missile weapons' },
  { id: 'combat', name: 'Hand-to-Hand Combat Phase', description: 'Resolve close combat (both players fight)' }
];

// Recovery phase actions
export function recoveryPhase(warband) {
  const actions = [];

  for (const warrior of warband.warriors) {
    if (warrior.status === 'fleeing') {
      // Rally test
      const test = leadershipTest(warrior.leadership);
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
