// Combat Phase Handler
// Handles melee combat, strike order, and attack resolution

import type {
  GameState,
  GameWarrior,
  GameAction,
  CombatResolution,
  StrikeOrderEntry,
  MeleeTarget
} from '../../types/game';
import {
  rollToHitMelee,
  rollToWound,
  rollArmorSave,
  rollInjury,
  rollCriticalHit,
  calculateArmorSaveModifier,
  getWeaponStrength,
  getWeaponArmorModifier,
  getWeaponEnemyArmorBonus,
  canWeaponParry,
  weaponCausesConcussion,
  attemptParryWithReroll
} from '../rules/combat';
import { getWarriorArmorSave } from './shooting';
import type { MeleeResult } from './types';

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
 * Apply injury result to target (internal helper)
 */
function applyInjuryResult(
  gameState: GameState,
  warbandIndex: number,
  target: GameWarrior,
  injury: 'knockedDown' | 'stunned' | 'outOfAction'
): void {
  target.gameStatus = injury;

  if (injury === 'outOfAction') {
    gameState.warbands[warbandIndex].outOfActionCount++;
    // Disengage from combat
    disengageWarriorInternal(gameState, warbandIndex, target.id);
  }
}

/**
 * Internal disengage (doesn't create action)
 */
function disengageWarriorInternal(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string
): void {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) return;

  // Remove from all engaged enemies
  for (const enemyId of warrior.combatState.engagedWith) {
    for (const enemyWarband of gameState.warbands) {
      const enemy = enemyWarband.warriors.find(w => w.id === enemyId);
      if (enemy) {
        enemy.combatState.engagedWith = enemy.combatState.engagedWith.filter(id => id !== warriorId);
        if (enemy.combatState.engagedWith.length === 0) {
          enemy.combatState.inCombat = false;
        }
      }
    }
  }

  // Clear warrior's combat state
  warrior.combatState.inCombat = false;
  warrior.combatState.engagedWith = [];
}

// =====================================
// COMBAT PHASE QUERIES
// =====================================

/**
 * Build strike order for combat phase
 * Returns warriors sorted by strike order rules:
 * 1. Chargers strike first
 * 2. Those who stood up strike last
 * 3. Higher initiative goes first
 * 4. Equal initiative - random roll-off
 */
export function buildStrikeOrder(gameState: GameState): StrikeOrderEntry[] {
  const entries: StrikeOrderEntry[] = [];

  // Collect all warriors in combat from both warbands
  for (let warbandIndex = 0; warbandIndex < 2; warbandIndex++) {
    const warband = gameState.warbands[warbandIndex];
    for (const warrior of warband.warriors) {
      // Only standing warriors in combat participate
      if (warrior.combatState.inCombat && warrior.gameStatus === 'standing') {
        entries.push({
          warriorId: warrior.id,
          warriorName: warrior.name || warrior.type,
          warbandIndex,
          initiative: warrior.profile.I,
          charged: warrior.hasCharged,
          stoodUp: warrior.strikesLast,
          attacks: warrior.profile.A,
          attacksUsed: 0
        });
      }
    }
  }

  // Sort by strike order rules
  entries.sort((a, b) => {
    // 1. Chargers strike first
    if (a.charged && !b.charged) return -1;
    if (!a.charged && b.charged) return 1;

    // 2. Those who stood up strike last
    if (a.stoodUp && !b.stoodUp) return 1;
    if (!a.stoodUp && b.stoodUp) return -1;

    // 3. Higher initiative goes first
    if (a.initiative !== b.initiative) {
      return b.initiative - a.initiative;
    }

    // 4. Equal initiative - roll off (we'll use random for now)
    return Math.random() - 0.5;
  });

  return entries;
}

/**
 * Get melee targets for a warrior
 */
export function getMeleeTargets(gameState: GameState, attackerId: string): MeleeTarget[] {
  const attackerResult = findWarrior(gameState, attackerId);
  if (!attackerResult) return [];

  const { warrior: attacker, warbandIndex: attackerWarbandIndex } = attackerResult;
  const targets: MeleeTarget[] = [];

  for (const targetId of attacker.combatState.engagedWith) {
    const targetResult = findWarrior(gameState, targetId);
    if (targetResult) {
      const { warrior: target, warbandIndex } = targetResult;
      targets.push({
        targetId: target.id,
        targetName: target.name || target.type,
        targetStatus: target.gameStatus,
        warbandIndex
      });
    }
  }

  return targets;
}

// =====================================
// COMBAT PHASE ACTIONS
// =====================================

/**
 * Execute a single melee attack
 */
export function executeMeleeAttack(
  gameState: GameState,
  attackerId: string,
  defenderId: string,
  weaponKey: string = 'sword'
): MeleeResult {
  const attackerResult = findWarrior(gameState, attackerId);
  const defenderResult = findWarrior(gameState, defenderId);

  if (!attackerResult || !defenderResult) {
    throw new Error('Attacker or defender not found');
  }

  const { warrior: attacker, warbandIndex: attackerWarbandIndex } = attackerResult;
  const { warrior: defender, warbandIndex: defenderWarbandIndex } = defenderResult;

  // Check if first round of combat (for flail/morningstar)
  const isFirstRound = attacker.hasCharged;

  // Get weapon strength
  const weaponStrength = getWeaponStrength(weaponKey, attacker.profile.S, isFirstRound);
  const weaponName = weaponKey;

  // Build resolution
  const resolution: CombatResolution = {
    attackerId,
    attackerName: attacker.name || attacker.type,
    defenderId,
    defenderName: defender.name || defender.type,
    weapon: weaponName,
    weaponStrength,
    toHitRoll: 0,
    toHitNeeded: 0,
    hit: false,
    finalOutcome: 'miss'
  };

  // Store previous states
  const previousState: Partial<GameWarrior> = {};
  const previousDefenderState: Partial<GameWarrior> = {
    woundsRemaining: defender.woundsRemaining,
    gameStatus: defender.gameStatus
  };

  // Check if auto-hit (knocked down or stunned target)
  if (defender.gameStatus === 'knockedDown' || defender.gameStatus === 'stunned') {
    resolution.autoHit = true;
    resolution.hit = true;
    resolution.toHitRoll = 0;
    resolution.toHitNeeded = 0;
  } else {
    // Roll to hit
    const hitResult = rollToHitMelee(attacker.profile.WS, defender.profile.WS);
    resolution.toHitRoll = hitResult.roll;
    resolution.toHitNeeded = hitResult.needed;
    resolution.hit = hitResult.success;

    // Check for parry if hit
    if (hitResult.success) {
      const defenderWeapons = defender.equipment?.melee || [];
      const hasParryWeapon = defenderWeapons.some(w => canWeaponParry(w));
      const hasBuckler = (defender.equipment?.armor || []).includes('buckler');
      const canParry = hasParryWeapon || hasBuckler;
      const canReroll = hasParryWeapon && hasBuckler; // Sword + buckler = reroll

      if (canParry) {
        resolution.parryAttempted = true;
        const parryResult = attemptParryWithReroll(hitResult.roll, canReroll);
        resolution.parryRoll = parryResult.roll;
        resolution.parrySuccess = parryResult.success;

        if (parryResult.success) {
          resolution.hit = false;
          resolution.finalOutcome = 'parried';

          const action = createMeleeAction(gameState, attackerWarbandIndex, attacker, defenderWarbandIndex, defender, previousState, resolution);
          return { action, resolution };
        }
      }
    }

    if (!hitResult.success) {
      resolution.finalOutcome = 'miss';

      const action = createMeleeAction(gameState, attackerWarbandIndex, attacker, defenderWarbandIndex, defender, previousState, resolution);
      return { action, resolution };
    }
  }

  // Roll to wound
  const woundResult = rollToWound(weaponStrength, defender.profile.T);
  resolution.toWoundRoll = woundResult.roll ?? undefined;
  resolution.toWoundNeeded = woundResult.needed;
  resolution.wounded = woundResult.success;
  resolution.criticalHit = woundResult.criticalHit;

  if (!woundResult.success) {
    resolution.finalOutcome = 'noWound';

    const action = createMeleeAction(gameState, attackerWarbandIndex, attacker, defenderWarbandIndex, defender, previousState, resolution);
    return { action, resolution };
  }

  // Handle critical hit
  if (woundResult.criticalHit) {
    const critResult = rollCriticalHit();
    resolution.criticalType = critResult.type;
    resolution.criticalDescription = critResult.description;

    if (critResult.ignoresArmor) {
      resolution.noArmorSave = true;
    }
  }

  // Knocked down/stunned targets: wound + failed save = out of action immediately
  if (resolution.autoHit && (defender.gameStatus === 'knockedDown' || defender.gameStatus === 'stunned')) {
    // For stunned targets, any wound = out of action
    if (defender.gameStatus === 'stunned') {
      resolution.finalOutcome = 'outOfAction';
      applyInjuryResult(gameState, defenderWarbandIndex, defender, 'outOfAction');

      const action = createMeleeAction(gameState, attackerWarbandIndex, attacker, defenderWarbandIndex, defender, previousState, resolution);
      return { action, resolution };
    }

    // For knocked down, roll armor save first
    if (!resolution.noArmorSave) {
      const baseArmor = getWarriorArmorSave(defender);
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

          const action = createMeleeAction(gameState, attackerWarbandIndex, attacker, defenderWarbandIndex, defender, previousState, resolution);
          return { action, resolution };
        }
      }
    }

    // Knocked down + wound + failed save = out of action
    resolution.finalOutcome = 'outOfAction';
    applyInjuryResult(gameState, defenderWarbandIndex, defender, 'outOfAction');

    const action = createMeleeAction(gameState, attackerWarbandIndex, attacker, defenderWarbandIndex, defender, previousState, resolution);
    return { action, resolution };
  }

  // Standard armor save for standing targets
  if (!resolution.noArmorSave) {
    const baseArmor = getWarriorArmorSave(defender);
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

        const action = createMeleeAction(gameState, attackerWarbandIndex, attacker, defenderWarbandIndex, defender, previousState, resolution);
        return { action, resolution };
      }
    }
  }

  // Apply wound
  defender.woundsRemaining -= 1;

  // If still has wounds, no injury roll
  if (defender.woundsRemaining > 0) {
    resolution.finalOutcome = 'knockedDown'; // Took a wound but still up

    const action = createMeleeAction(gameState, attackerWarbandIndex, attacker, defenderWarbandIndex, defender, previousState, resolution);
    return { action, resolution };
  }

  // Roll injury
  const injuryMods: { concussion?: boolean; injuryBonus?: number } = {};
  if (weaponCausesConcussion(weaponKey)) {
    injuryMods.concussion = true;
  }
  if (resolution.criticalType === 'masterStrike') {
    injuryMods.injuryBonus = 2;
  }

  const injuryResult = rollInjury(injuryMods);
  resolution.injuryRoll = injuryResult.roll;
  resolution.injuryResult = injuryResult.result;
  resolution.finalOutcome = injuryResult.result;

  // Apply injury
  applyInjuryResult(gameState, defenderWarbandIndex, defender, injuryResult.result);

  const action = createMeleeAction(gameState, attackerWarbandIndex, attacker, defenderWarbandIndex, defender, previousState, resolution);
  return { action, resolution };
}

/**
 * Helper to create melee action
 */
function createMeleeAction(
  gameState: GameState,
  attackerWarbandIndex: number,
  attacker: GameWarrior,
  defenderWarbandIndex: number,
  defender: GameWarrior,
  previousState: Partial<GameWarrior>,
  resolution: CombatResolution
): GameAction {
  const action: GameAction = {
    id: generateActionId(),
    type: 'meleeAttack',
    timestamp: new Date().toISOString(),
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    warriorId: attacker.id,
    warbandIndex: attackerWarbandIndex,
    targetId: defender.id,
    targetWarbandIndex: defenderWarbandIndex,
    previousState,
    description: `${attacker.name || attacker.type} attacks ${defender.name || defender.type} - ${resolution.finalOutcome}`
  };

  gameState.actionHistory.push(action);
  addLog(gameState, action.description);

  return action;
}
