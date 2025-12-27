// Shooting Phase Module
// Handles shooting attacks with sub-states for resolution modals

import type {
  GameState,
  GameWarrior,
  GameAction,
  ShootingModifiers,
  CombatResolution
} from '../../types/game';
import type {
  GameEvent,
  EventType,
  SelectWarriorEvent,
  SelectTargetEvent,
  SetModifierEvent,
  ConfirmShotEvent,
  AcknowledgeEvent
} from '../types/events';
import type {
  ScreenCommand,
  ShootingPhaseScreen,
  CombatResolutionScreen
} from '../types/screens';
import type { PhaseModule, PhaseContext, PhaseResult } from './types';
import { successResult, errorResult } from './types';
import {
  toWarriorView,
  toWarbandView,
  getCurrentWarband,
  getOpponentWarband,
  findWarrior,
  findWarriorView
} from './viewModels';
import { generateActionId, addLog, canWarriorAct } from './stateUtils';
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

// =====================================
// SHOOTING PHASE MODULE
// =====================================

export const shootingPhase: PhaseModule = {
  phase: 'shooting',

  getSupportedEvents(): EventType[] {
    return ['SELECT_WARRIOR', 'DESELECT', 'SELECT_TARGET', 'SET_MODIFIER', 'CONFIRM_SHOT', 'ACKNOWLEDGE'];
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
      case 'SELECT_WARRIOR':
        return handleSelectWarrior(event, state);

      case 'DESELECT':
        return handleDeselect();

      case 'SELECT_TARGET':
        return handleSelectTarget(event, state, context);

      case 'SET_MODIFIER':
        return handleSetModifier(event, context);

      case 'CONFIRM_SHOT':
        return handleConfirmShot(event, state, context);

      default:
        return errorResult(`Shooting phase cannot handle event: ${event.type}`);
    }
  },

  buildScreen(state: GameState, context: PhaseContext): ScreenCommand {
    // Handle sub-states first
    if (context.subState === 'resolution' && context.pendingResolution) {
      return buildResolutionScreen(state, context);
    }

    // Main shooting phase screen
    const currentWarband = getCurrentWarband(state);
    const opponentWarband = getOpponentWarband(state);
    const warbandIndex = state.currentPlayer - 1;

    const actableWarriors = currentWarband.warriors.filter(w =>
      canWarriorAct(w, 'shooting')
    );

    const screen: ShootingPhaseScreen = {
      screen: 'SHOOTING_PHASE',
      data: {
        currentPlayer: state.currentPlayer,
        warband: toWarbandView(currentWarband),
        opponentWarband: toWarbandView(opponentWarband),
        actableWarriors: actableWarriors.map(w => toWarriorView(w, warbandIndex)),
        selectedWarrior: context.selectedWarriorId
          ? findWarriorView(state, context.selectedWarriorId)
          : null
      },
      availableEvents: ['SELECT_WARRIOR', 'DESELECT', 'SELECT_TARGET', 'SET_MODIFIER', 'CONFIRM_SHOT', 'ADVANCE_PHASE'],
      turn: state.turn,
      phase: state.phase,
      currentPlayer: state.currentPlayer,
      gameId: state.id
    };

    return screen;
  }
};

// =====================================
// EVENT HANDLERS
// =====================================

function handleSelectWarrior(
  event: SelectWarriorEvent,
  state: GameState
): PhaseResult {
  const { warriorId } = event.payload;

  // Verify warrior exists
  const result = findWarrior(state, warriorId);
  if (!result) {
    return errorResult('Warrior not found');
  }

  // Verify warrior belongs to current player
  if (result.warbandIndex !== state.currentPlayer - 1) {
    return errorResult('Cannot select opponent warrior');
  }

  // Verify warrior can shoot
  if (!canWarriorAct(result.warrior, 'shooting')) {
    return errorResult('Warrior cannot shoot');
  }

  return successResult(true, {
    selectedWarriorId: warriorId,
    selectedTargetId: null
  });
}

function handleDeselect(): PhaseResult {
  return successResult(true, {
    selectedWarriorId: null,
    selectedTargetId: null
  });
}

function handleSelectTarget(
  event: SelectTargetEvent,
  state: GameState,
  context: PhaseContext
): PhaseResult {
  if (!context.selectedWarriorId) {
    return errorResult('No warrior selected');
  }

  const { targetId } = event.payload;

  // Verify target exists and is valid
  const result = findWarrior(state, targetId);
  if (!result) {
    return errorResult('Target not found');
  }

  // Cannot target own warband
  if (result.warbandIndex === state.currentPlayer - 1) {
    return errorResult('Cannot target own warrior');
  }

  // Cannot target out of action
  if (result.warrior.gameStatus === 'outOfAction') {
    return errorResult('Cannot target out of action warrior');
  }

  // Cannot target hidden
  if (result.warrior.isHidden) {
    return errorResult('Cannot target hidden warrior');
  }

  return successResult(true, {
    selectedTargetId: targetId
  });
}

function handleSetModifier(
  event: SetModifierEvent,
  context: PhaseContext
): PhaseResult {
  const { modifier, value } = event.payload;

  const updatedModifiers = {
    ...context.shootingModifiers,
    [modifier]: value
  };

  return successResult(false, {
    shootingModifiers: updatedModifiers
  });
}

function handleConfirmShot(
  event: ConfirmShotEvent,
  state: GameState,
  context: PhaseContext
): PhaseResult {
  if (!context.selectedWarriorId) {
    return errorResult('No warrior selected');
  }

  const { targetId } = event.payload;

  try {
    const result = executeShot(state, context.selectedWarriorId, targetId, context.shootingModifiers);

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
      selectedWarriorId: null,
      selectedTargetId: null,
      shootingModifiers: {
        cover: false,
        longRange: false,
        moved: false,
        largeTarget: false
      },
      subState: 'resolution',
      pendingResolution: result.resolution,
      pendingRoutTest
    });
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : 'Shot failed');
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

  // Return to main phase
  return successResult(false, {
    subState: 'main',
    pendingResolution: null,
    pendingRoutTest: null
  });
}

// =====================================
// SCREEN BUILDERS
// =====================================

function buildResolutionScreen(
  state: GameState,
  context: PhaseContext
): ScreenCommand {
  const resolution = context.pendingResolution!;

  // Build outcome description
  let outcomeDescription = '';
  switch (resolution.finalOutcome) {
    case 'miss':
      outcomeDescription = 'The shot missed!';
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
// SHOOTING ACTIONS
// =====================================

/**
 * Get warrior's armor save value
 */
function getWarriorArmorSave(warrior: GameWarrior): number {
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
 * Check if rout test is required
 */
function isRoutTestRequired(warband: { warriors: GameWarrior[]; outOfActionCount: number }): boolean {
  const totalWarriors = warband.warriors.length;
  const outOfAction = warband.outOfActionCount;
  return outOfAction >= Math.ceil(totalWarriors / 4);
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

/**
 * Execute a shooting attack
 */
function executeShot(
  gameState: GameState,
  shooterId: string,
  targetId: string,
  modifiers: ShootingModifiers
): { action: GameAction; resolution: CombatResolution } {
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
    resolution.finalOutcome = 'knockedDown';
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

export default shootingPhase;
