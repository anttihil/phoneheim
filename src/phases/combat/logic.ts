// Combat Phase Module
// Handles melee combat with strike order, attacks, and resolution modals

import type {
  GameState,
  GameWarrior,
  GameAction,
  CombatResolution,
  StrikeOrderEntry,
  MeleeTarget
} from '../../types/game';
import type {
  GameEvent,
  EventType,
  SelectTargetEvent,
  ConfirmMeleeEvent,
  AcknowledgeEvent
} from '../types/events';
import type {
  ScreenCommand,
  CombatPhaseScreen,
  CombatResolutionScreen,
  WarriorView
} from '../types/screens';
import type { PhaseModule, PhaseContext, PhaseResult, AvailableAction } from '../shared/types';
import { successResult, errorResult } from '../shared/types';
import {
  toWarriorView,
  toWarbandView,
  getCurrentWarband,
  getOpponentWarband,
  findWarrior,
  findWarriorView
} from '../shared/viewModels';
import { generateActionId, addLog } from '../shared/stateUtils';
import {
  rollToWound,
  rollArmorSave,
  rollInjury,
  rollCriticalHit,
  calculateArmorSaveModifier,
  getWeaponStrength,
  getWeaponArmorModifier,
  getWeaponEnemyArmorBonus,
} from '../shared/rules';
import {
  rollToHitMelee,
  canWeaponParry,
  weaponCausesConcussion,
  attemptParryWithReroll
} from './rules';

// =====================================
// COMBAT PHASE MODULE
// =====================================

export const combatPhase: PhaseModule = {
  phase: 'combat',

  getSupportedEvents(): EventType[] {
    return ['SELECT_TARGET', 'CONFIRM_MELEE', 'ACKNOWLEDGE'];
  },

  processEvent(
    event: GameEvent,
    state: GameState,
    context: PhaseContext
  ): PhaseResult {
    // Handle sub-state specific events
    if (context.subState === 'resolution') {
      if (event.type === 'ACKNOWLEDGE') {
        return handleAcknowledge(state, context);
      }
      return errorResult('Must acknowledge resolution before continuing');
    }

    if (context.subState === 'rout_test') {
      // Rout test handling would go here
      return errorResult('Rout test not yet implemented');
    }

    // Main phase events
    switch (event.type) {
      case 'SELECT_TARGET':
        return handleSelectTarget(event, state, context);

      case 'CONFIRM_MELEE':
        return handleConfirmMelee(event, state, context);

      default:
        return errorResult(`Combat phase cannot handle event: ${event.type}`);
    }
  },

  buildScreen(state: GameState, context: PhaseContext): ScreenCommand {
    // Handle sub-states first
    if (context.subState === 'resolution' && context.pendingResolution) {
      return buildResolutionScreen(state, context);
    }

    // Main combat phase screen
    return buildCombatScreen(state, context);
  },

  onEnter(state: GameState, context: PhaseContext): Partial<PhaseContext> {
    // Build strike order when entering combat phase
    const strikeOrder = buildStrikeOrder(state);
    return {
      strikeOrder,
      currentFighterIndex: 0,
      selectedTargetId: null
    };
  },

  onExit(state: GameState, context: PhaseContext): void {
    // Strike order is cleared on exit (handled by PhaseCoordinator context reset)
  }
};

// =====================================
// EVENT HANDLERS
// =====================================

function handleSelectTarget(
  event: SelectTargetEvent,
  state: GameState,
  context: PhaseContext
): PhaseResult {
  const { targetId } = event.payload;

  // Verify target exists
  const result = findWarrior(state, targetId);
  if (!result) {
    return errorResult('Target not found');
  }

  // Verify current fighter has attacks remaining
  if (context.currentFighterIndex >= context.strikeOrder.length) {
    return errorResult('No current fighter');
  }

  const currentFighter = context.strikeOrder[context.currentFighterIndex];

  // Verify target is engaged with current fighter
  const targets = getMeleeTargets(state, currentFighter.warriorId);
  const validTarget = targets.find(t => t.targetId === targetId);
  if (!validTarget) {
    return errorResult('Invalid target - not engaged with fighter');
  }

  return successResult(false, {
    selectedTargetId: targetId
  });
}

function handleConfirmMelee(
  event: ConfirmMeleeEvent,
  state: GameState,
  context: PhaseContext
): PhaseResult {
  const { targetId, weaponKey } = event.payload;

  // Verify we have a current fighter
  if (context.currentFighterIndex >= context.strikeOrder.length) {
    return errorResult('No current fighter');
  }

  const currentFighter = context.strikeOrder[context.currentFighterIndex];

  // Verify fighter has attacks remaining
  if (currentFighter.attacksUsed >= currentFighter.attacks) {
    return errorResult('No attacks remaining');
  }

  // Validate target is engaged with current fighter
  const targets = getMeleeTargets(state, currentFighter.warriorId);
  const validTarget = targets.find(t => t.targetId === targetId);
  if (!validTarget) {
    return errorResult('Invalid target');
  }

  try {
    const result = executeMeleeAttack(state, currentFighter.warriorId, targetId, weaponKey);

    // Increment attacks used
    currentFighter.attacksUsed++;

    // Check if rout test is needed
    let pendingRoutTest: number | null = null;
    for (let i = 0; i < 2; i++) {
      if (isRoutTestRequired(state.warbands[i]) && !state.warbands[i].routFailed) {
        pendingRoutTest = i;
        break;
      }
    }

    // Transition to resolution sub-state
    return successResult(true, {
      selectedTargetId: null,
      subState: 'resolution',
      pendingResolution: result.resolution,
      pendingRoutTest
    });
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : 'Attack failed');
  }
}

function handleAcknowledge(
  state: GameState,
  context: PhaseContext
): PhaseResult {
  // Check if rout test is pending
  if (context.pendingRoutTest !== null) {
    return successResult(false, {
      subState: 'rout_test',
      pendingResolution: null
    });
  }

  // Check if current fighter has used all attacks - advance to next fighter
  let nextFighterIndex = context.currentFighterIndex;
  const strikeOrder = [...context.strikeOrder]; // Copy to update

  if (strikeOrder.length > 0 && nextFighterIndex < strikeOrder.length) {
    const currentFighter = strikeOrder[nextFighterIndex];
    if (currentFighter.attacksUsed >= currentFighter.attacks) {
      nextFighterIndex++;

      // Skip fighters who are no longer able to fight
      while (nextFighterIndex < strikeOrder.length) {
        const entry = strikeOrder[nextFighterIndex];
        const result = findWarrior(state, entry.warriorId);
        if (result && result.warrior.gameStatus === 'standing' && result.warrior.combatState.inCombat) {
          break;
        }
        nextFighterIndex++;
      }
    }
  }

  // Return to main phase with updated fighter index
  return successResult(false, {
    subState: 'main',
    pendingResolution: null,
    pendingRoutTest: null,
    currentFighterIndex: nextFighterIndex
  });
}

// =====================================
// SCREEN BUILDERS
// =====================================

function buildCombatScreen(
  state: GameState,
  context: PhaseContext
): ScreenCommand {
  const currentWarband = getCurrentWarband(state);
  const opponentWarband = getOpponentWarband(state);

  // Get strike order from context
  let strikeOrder = context.strikeOrder;
  let currentFighterIndex = context.currentFighterIndex;

  // Skip fighters who are no longer able to fight
  while (currentFighterIndex < strikeOrder.length) {
    const entry = strikeOrder[currentFighterIndex];
    const result = findWarrior(state, entry.warriorId);
    if (result && result.warrior.gameStatus === 'standing' && result.warrior.combatState.inCombat) {
      break;
    }
    currentFighterIndex++;
  }

  // Check if all fighters have completed their attacks
  const allFightersComplete = currentFighterIndex >= strikeOrder.length;

  // Get current fighter info
  let currentFighter: WarriorView | null = null;
  let meleeTargets: WarriorView[] = [];
  let attacksRemaining = 0;
  let attacksTotal = 0;

  if (!allFightersComplete && strikeOrder.length > 0) {
    const fighterEntry = strikeOrder[currentFighterIndex];
    const fighterResult = findWarrior(state, fighterEntry.warriorId);

    if (fighterResult) {
      currentFighter = toWarriorView(fighterResult.warrior, fighterResult.warbandIndex);
      attacksRemaining = fighterEntry.attacks - fighterEntry.attacksUsed;
      attacksTotal = fighterEntry.attacks;

      // Get valid melee targets
      const targets = getMeleeTargets(state, fighterEntry.warriorId);
      meleeTargets = targets
        .map(t => {
          const targetResult = findWarrior(state, t.targetId);
          if (targetResult) {
            return toWarriorView(targetResult.warrior, targetResult.warbandIndex);
          }
          return null;
        })
        .filter((t): t is WarriorView => t !== null);
    }
  }

  const screen: CombatPhaseScreen = {
    screen: 'COMBAT_PHASE',
    data: {
      currentPlayer: state.currentPlayer,
      warband: toWarbandView(currentWarband),
      opponentWarband: toWarbandView(opponentWarband),
      strikeOrder,
      currentFighterIndex,
      currentFighter,
      meleeTargets,
      selectedTarget: context.selectedTargetId
        ? meleeTargets.find(t => t.id === context.selectedTargetId) ?? null
        : null,
      allFightersComplete,
      attacksRemaining,
      attacksTotal
    },
    availableEvents: allFightersComplete
      ? ['ADVANCE_PHASE']
      : ['SELECT_TARGET', 'CONFIRM_MELEE', 'ADVANCE_PHASE'],
    turn: state.turn,
    phase: state.phase,
    currentPlayer: state.currentPlayer,
    gameId: state.id
  };

  return screen;
}

function buildResolutionScreen(
  state: GameState,
  context: PhaseContext
): ScreenCommand {
  const resolution = context.pendingResolution!;

  // Build outcome description
  let outcomeDescription = '';
  switch (resolution.finalOutcome) {
    case 'miss':
      outcomeDescription = 'The attack missed!';
      break;
    case 'parried':
      outcomeDescription = 'The attack was parried!';
      break;
    case 'noWound':
      outcomeDescription = 'The hit failed to wound.';
      break;
    case 'saved':
      outcomeDescription = 'The armor absorbed the blow.';
      break;
    case 'knockedDown':
      outcomeDescription = `${resolution.defenderName} is knocked down!`;
      break;
    case 'stunned':
      outcomeDescription = `${resolution.defenderName} is stunned!`;
      break;
    case 'outOfAction':
      outcomeDescription = `${resolution.defenderName} is out of action!`;
      break;
  }

  const screen: CombatResolutionScreen = {
    screen: 'COMBAT_RESOLUTION',
    data: {
      attackerName: resolution.attackerName,
      defenderName: resolution.defenderName,
      weapon: resolution.weapon,
      rolls: {
        toHit: {
          roll: resolution.toHitRoll,
          needed: resolution.toHitNeeded,
          success: resolution.hit
        },
        ...(resolution.parryAttempted && {
          parry: {
            roll: resolution.parryRoll!,
            opponentRoll: resolution.toHitRoll,
            success: resolution.parrySuccess!
          }
        }),
        ...(resolution.toWoundRoll !== undefined && {
          toWound: {
            roll: resolution.toWoundRoll,
            needed: resolution.toWoundNeeded!,
            success: resolution.wounded!
          }
        }),
        ...(resolution.criticalHit && {
          critical: {
            roll: 6,
            type: resolution.criticalType!,
            description: resolution.criticalDescription!
          }
        }),
        ...(resolution.armorSaveRoll !== undefined && {
          armorSave: {
            roll: resolution.armorSaveRoll,
            needed: resolution.armorSaveNeeded!,
            success: resolution.armorSaved!,
            noSave: resolution.noArmorSave
          }
        }),
        ...(resolution.injuryRoll !== undefined && {
          injury: {
            roll: resolution.injuryRoll,
            result: resolution.injuryResult!
          }
        })
      },
      outcome: resolution.finalOutcome,
      outcomeDescription
    },
    availableEvents: ['ACKNOWLEDGE'],
    turn: state.turn,
    phase: state.phase,
    currentPlayer: state.currentPlayer,
    gameId: state.id
  };

  return screen;
}

// =====================================
// COMBAT PHASE UTILITIES
// =====================================

/**
 * Get available combat actions for a warrior
 * Only the current fighter in strike order can act
 */
export function getCombatAvailableActions(
  warrior: GameWarrior,
  state: GameState,
  context: PhaseContext
): AvailableAction[] {
  // Only current fighter in strike order can act
  if (context.currentFighterIndex >= context.strikeOrder.length) return [];

  const currentFighter = context.strikeOrder[context.currentFighterIndex];
  if (currentFighter.warriorId !== warrior.id) return [];
  if (currentFighter.attacksUsed >= currentFighter.attacks) return [];

  const targets = getMeleeTargets(state, warrior.id);
  if (targets.length === 0) return [];

  return [{
    type: 'fight',
    description: 'Fight in combat',
    requiresTarget: true,
    validTargets: targets.map(t => t.targetId)
  }];
}

/**
 * Build strike order for combat phase
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

    // 4. Equal initiative - roll off (use random)
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

  const { warrior: attacker } = attackerResult;
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
// COMBAT HELPERS
// =====================================

/**
 * Check if rout test is required
 */
function isRoutTestRequired(warband: { warriors: GameWarrior[]; outOfActionCount: number }): boolean {
  const totalWarriors = warband.warriors.length;
  const outOfAction = warband.outOfActionCount;
  return outOfAction >= Math.ceil(totalWarriors / 4);
}

/**
 * Get warrior's armor save value
 */
function getWarriorArmorSave(warrior: GameWarrior): number {
  const armor = warrior.equipment?.armor || [];

  let baseSave = 7;

  if (armor.includes('gromrilArmor')) {
    baseSave = 4;
  } else if (armor.includes('heavyArmor')) {
    baseSave = 5;
  } else if (armor.includes('lightArmor')) {
    baseSave = 6;
  }

  if (armor.includes('shield')) {
    baseSave -= 1;
  }

  return baseSave;
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

  warrior.combatState.inCombat = false;
  warrior.combatState.engagedWith = [];
}

/**
 * Apply injury result to target
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
    disengageWarriorInternal(gameState, warbandIndex, target.id);
  }
}

/**
 * Execute a single melee attack
 */
function executeMeleeAttack(
  gameState: GameState,
  attackerId: string,
  defenderId: string,
  weaponKey: string = 'sword'
): { action: GameAction; resolution: CombatResolution } {
  const attackerResult = findWarrior(gameState, attackerId);
  const defenderResult = findWarrior(gameState, defenderId);

  if (!attackerResult || !defenderResult) {
    throw new Error('Attacker or defender not found');
  }

  const { warrior: attacker, warbandIndex: attackerWarbandIndex } = attackerResult;
  const { warrior: defender, warbandIndex: defenderWarbandIndex } = defenderResult;

  const isFirstRound = attacker.hasCharged;
  const weaponStrength = getWeaponStrength(weaponKey, attacker.profile.S, isFirstRound);
  const weaponName = weaponKey;

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

  const previousState: Partial<GameWarrior> = {};

  // Check if auto-hit (knocked down or stunned target)
  if (defender.gameStatus === 'knockedDown' || defender.gameStatus === 'stunned') {
    resolution.autoHit = true;
    resolution.hit = true;
    resolution.toHitRoll = 0;
    resolution.toHitNeeded = 0;
  } else {
    const hitResult = rollToHitMelee(attacker.profile.WS, defender.profile.WS);
    resolution.toHitRoll = hitResult.roll;
    resolution.toHitNeeded = hitResult.needed;
    resolution.hit = hitResult.success;

    // Check for parry
    if (hitResult.success) {
      const defenderWeapons = defender.equipment?.melee || [];
      const hasParryWeapon = defenderWeapons.some(w => canWeaponParry(w));
      const hasBuckler = (defender.equipment?.armor || []).includes('buckler');
      const canParry = hasParryWeapon || hasBuckler;
      const canReroll = hasParryWeapon && hasBuckler;

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

  // Handle knocked down/stunned targets specially
  if (resolution.autoHit && (defender.gameStatus === 'knockedDown' || defender.gameStatus === 'stunned')) {
    if (defender.gameStatus === 'stunned') {
      resolution.finalOutcome = 'outOfAction';
      applyInjuryResult(gameState, defenderWarbandIndex, defender, 'outOfAction');

      const action = createMeleeAction(gameState, attackerWarbandIndex, attacker, defenderWarbandIndex, defender, previousState, resolution);
      return { action, resolution };
    }

    // Knocked down - try armor save
    if (!resolution.noArmorSave) {
      const baseArmor = getWarriorArmorSave(defender);
      if (baseArmor <= 6) {
        const strengthMod = calculateArmorSaveModifier(weaponStrength);
        const weaponMod = getWeaponArmorModifier(weaponKey);
        const enemyBonus = getWeaponEnemyArmorBonus(weaponKey);

        const saveResult = rollArmorSave(baseArmor, { strengthMod, weaponMod, enemyBonus });
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

      const saveResult = rollArmorSave(baseArmor, { strengthMod, weaponMod, enemyBonus });
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

  if (defender.woundsRemaining > 0) {
    resolution.finalOutcome = 'knockedDown';
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

export default combatPhase;
