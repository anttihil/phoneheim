// Movement Phase Handler
// Handles movement, running, charging, climbing, jumping, falling, and hiding

import type {
  GameState,
  GameWarrior,
  GameAction
} from '../../types/game';
import {
  rollClimbingTest,
  rollJumpTest,
  calculateFallingDamage,
  characteristicTest,
  rollToWound,
  rollInjury
} from '../rules/combat';
import type {
  MoveOptions,
  RunOptions,
  ClimbOptions,
  ClimbResult,
  JumpDownResult,
  FallingDamageResult,
  EdgeFallCheckResult,
  ChargeOptions,
  CanMoveInCombatResult
} from './types';

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

// =====================================
// COMBAT ENGAGEMENT HELPERS
// =====================================

/**
 * Engage two warriors in combat
 */
export function engageWarriors(
  gameState: GameState,
  attackerWarbandIndex: number,
  attackerId: string,
  defenderWarbandIndex: number,
  defenderId: string
): void {
  const attackerWarband = gameState.warbands[attackerWarbandIndex];
  const defenderWarband = gameState.warbands[defenderWarbandIndex];
  const attacker = attackerWarband.warriors.find(w => w.id === attackerId);
  const defender = defenderWarband.warriors.find(w => w.id === defenderId);

  if (!attacker || !defender) {
    throw new Error('Attacker or defender not found');
  }

  // Update attacker
  attacker.combatState.inCombat = true;
  if (!attacker.combatState.engagedWith.includes(defenderId)) {
    attacker.combatState.engagedWith.push(defenderId);
  }

  // Update defender
  defender.combatState.inCombat = true;
  if (!defender.combatState.engagedWith.includes(attackerId)) {
    defender.combatState.engagedWith.push(attackerId);
  }

  addLog(gameState, `${attacker.name || attacker.type} engages ${defender.name || defender.type} in combat`);
}

/**
 * Disengage warrior from combat (clears all combat engagement)
 */
export function disengageWarrior(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string
): void {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

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
// COMBAT MOVEMENT RESTRICTIONS
// =====================================

/**
 * Check if a warrior in combat can move away
 * Warriors can only move if all engaged enemies are knocked down or stunned
 */
export function canMoveInCombat(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string
): CanMoveInCombatResult {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    return { canMove: false, reason: 'Warrior not found' };
  }

  // If not in combat, can always move
  if (!warrior.combatState.inCombat || warrior.combatState.engagedWith.length === 0) {
    return { canMove: true };
  }

  // Check each engaged enemy
  const opponentIndex = warbandIndex === 0 ? 1 : 0;
  const opponents = gameState.warbands[opponentIndex].warriors;

  for (const enemyId of warrior.combatState.engagedWith) {
    const enemy = opponents.find(w => w.id === enemyId);
    if (!enemy) continue;

    // If any enemy is standing, cannot move away
    if (enemy.gameStatus === 'standing') {
      return {
        canMove: false,
        reason: 'Cannot move while engaged with standing enemies'
      };
    }
  }

  // All engaged enemies are knocked down or stunned - can move away
  return { canMove: true };
}

/**
 * Disengage warrior from all enemies in combat
 * Should only be called when canMoveInCombat returns true
 */
export function disengageFromCombat(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string
): void {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  if (!warrior.combatState.inCombat) {
    return; // Nothing to disengage from
  }

  // Get opponent warband
  const opponentIndex = warbandIndex === 0 ? 1 : 0;
  const opponents = gameState.warbands[opponentIndex].warriors;

  // Remove this warrior from all engaged enemies' engagedWith lists
  for (const enemyId of warrior.combatState.engagedWith) {
    const enemy = opponents.find(w => w.id === enemyId);
    if (!enemy) continue;

    enemy.combatState.engagedWith = enemy.combatState.engagedWith.filter(id => id !== warriorId);
    if (enemy.combatState.engagedWith.length === 0) {
      enemy.combatState.inCombat = false;
    }
  }

  // Clear warrior's combat state
  warrior.combatState.inCombat = false;
  warrior.combatState.engagedWith = [];
}

// =====================================
// MOVEMENT PHASE ACTIONS
// =====================================

/**
 * Move warrior (normal movement)
 */
export function moveWarrior(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string,
  options: MoveOptions = {}
): GameAction {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  if (warrior.gameStatus !== 'standing') {
    throw new Error('Warrior must be standing to move');
  }

  if (warrior.hasMoved) {
    throw new Error('Warrior has already moved this turn');
  }

  // Check combat restrictions
  if (warrior.combatState.inCombat) {
    const combatCheck = canMoveInCombat(gameState, warbandIndex, warriorId);
    if (!combatCheck.canMove) {
      throw new Error(combatCheck.reason || 'Cannot move while in combat');
    }

    // Disengage from downed enemies if requested
    if (options.disengageFromDowned) {
      disengageFromCombat(gameState, warbandIndex, warriorId);
    }
  }

  // Store previous state for undo
  const previousState: Partial<GameWarrior> = {
    hasMoved: warrior.hasMoved,
    combatState: { ...warrior.combatState }
  };

  // Create action record
  const action: GameAction = {
    id: generateActionId(),
    type: 'move',
    timestamp: new Date().toISOString(),
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    warriorId,
    warbandIndex,
    previousState,
    description: options.disengageFromDowned
      ? `${warrior.name || warrior.type} moves away from downed enemies`
      : `${warrior.name || warrior.type} moves`
  };

  // Apply state change
  warrior.hasMoved = true;

  // Record action
  gameState.actionHistory.push(action);
  addLog(gameState, action.description);

  return action;
}

/**
 * Run warrior (double movement, no shooting)
 */
export function runWarrior(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string,
  options: RunOptions = {}
): GameAction {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  if (warrior.gameStatus !== 'standing') {
    throw new Error('Warrior must be standing to run');
  }

  if (warrior.hasMoved) {
    throw new Error('Warrior has already moved this turn');
  }

  // Check running restriction: cannot run if enemies within 8"
  if (options.hasEnemiesNearby) {
    throw new Error('Cannot run when standing enemies are within 8 inches');
  }

  // Store previous state for undo
  const previousState: Partial<GameWarrior> = {
    hasMoved: warrior.hasMoved,
    hasRun: warrior.hasRun
  };

  // Create action record
  const action: GameAction = {
    id: generateActionId(),
    type: 'run',
    timestamp: new Date().toISOString(),
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    warriorId,
    warbandIndex,
    previousState,
    description: `${warrior.name || warrior.type} runs (double movement, no shooting)`
  };

  // Apply state change
  warrior.hasMoved = true;
  warrior.hasRun = true;

  // Record action
  gameState.actionHistory.push(action);
  addLog(gameState, action.description);

  return action;
}

/**
 * Climb warrior (requires Initiative test)
 */
export function climbWarrior(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string,
  options: ClimbOptions
): ClimbResult {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  if (warrior.gameStatus !== 'standing') {
    throw new Error('Warrior must be standing to climb');
  }

  if (warrior.hasMoved) {
    throw new Error('Warrior has already moved this turn');
  }

  // Cannot climb more than movement value
  if (options.height > warrior.profile.M) {
    throw new Error(`Cannot climb more than ${warrior.profile.M} inches (movement value)`);
  }

  if (options.height <= 0) {
    throw new Error('Climb height must be positive');
  }

  // Store previous state for undo
  const previousState: Partial<GameWarrior> = {
    hasMoved: warrior.hasMoved,
    gameStatus: warrior.gameStatus,
    woundsRemaining: warrior.woundsRemaining
  };

  // Roll climbing test
  const climbTest = rollClimbingTest(warrior.profile.I);

  if (climbTest.success) {
    // Successful climb
    const action: GameAction = {
      id: generateActionId(),
      type: 'climb',
      timestamp: new Date().toISOString(),
      turn: gameState.turn,
      phase: gameState.phase,
      player: gameState.currentPlayer,
      warriorId,
      warbandIndex,
      previousState,
      diceRolls: [{ roll: climbTest.roll, needed: warrior.profile.I, success: true }],
      description: `${warrior.name || warrior.type} climbs ${options.direction} ${options.height}" (Initiative test: ${climbTest.roll} vs ${warrior.profile.I} - passed)`
    };

    // Apply state change
    warrior.hasMoved = true;

    // Record action
    gameState.actionHistory.push(action);
    addLog(gameState, action.description);

    return { action, success: true };
  } else {
    // Failed climb
    if (options.direction === 'up') {
      // Fail climbing up: cannot move, stays at base
      const action: GameAction = {
        id: generateActionId(),
        type: 'climb',
        timestamp: new Date().toISOString(),
        turn: gameState.turn,
        phase: gameState.phase,
        player: gameState.currentPlayer,
        warriorId,
        warbandIndex,
        previousState,
        diceRolls: [{ roll: climbTest.roll, needed: warrior.profile.I, success: false }],
        description: `${warrior.name || warrior.type} fails to climb up (Initiative test: ${climbTest.roll} vs ${warrior.profile.I} - failed)`
      };

      // Apply state change - warrior cannot move further
      warrior.hasMoved = true;

      // Record action
      gameState.actionHistory.push(action);
      addLog(gameState, action.description);

      return { action, success: false };
    } else {
      // Fail climbing down: fall from starting height
      const action: GameAction = {
        id: generateActionId(),
        type: 'climb',
        timestamp: new Date().toISOString(),
        turn: gameState.turn,
        phase: gameState.phase,
        player: gameState.currentPlayer,
        warriorId,
        warbandIndex,
        previousState,
        diceRolls: [{ roll: climbTest.roll, needed: warrior.profile.I, success: false }],
        description: `${warrior.name || warrior.type} fails to climb down and falls ${options.height}" (Initiative test: ${climbTest.roll} vs ${warrior.profile.I} - failed)`
      };

      // Apply state change - warrior fell and cannot move
      warrior.hasMoved = true;

      // Record action
      gameState.actionHistory.push(action);
      addLog(gameState, action.description);

      // Note: Falling damage should be applied separately using applyFalling()
      return { action, success: false, fell: true };
    }
  }
}

/**
 * Jump down from height (max 6", Initiative test per 2")
 */
export function jumpDownWarrior(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string,
  height: number,
  isDivingCharge: boolean = false
): JumpDownResult {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  if (warrior.gameStatus !== 'standing') {
    throw new Error('Warrior must be standing to jump');
  }

  if (height <= 0) {
    throw new Error('Jump height must be positive');
  }

  if (height > 6) {
    throw new Error('Cannot jump down more than 6 inches');
  }

  // Store previous state for undo
  const previousState: Partial<GameWarrior> = {
    hasMoved: warrior.hasMoved,
    hasFallen: warrior.hasFallen,
    divingChargeBonus: warrior.divingChargeBonus,
    woundsRemaining: warrior.woundsRemaining
  };

  // Roll Initiative tests (1 per full 2")
  const jumpTest = rollJumpTest(warrior.profile.I, height);
  const testsPassed = jumpTest.tests.filter(t => t.success).length;
  const testsFailed = jumpTest.tests.filter(t => !t.success).length;

  if (jumpTest.success) {
    // Successful jump
    const action: GameAction = {
      id: generateActionId(),
      type: 'jumpDown',
      timestamp: new Date().toISOString(),
      turn: gameState.turn,
      phase: gameState.phase,
      player: gameState.currentPlayer,
      warriorId,
      warbandIndex,
      previousState,
      diceRolls: jumpTest.tests.map(t => ({ roll: t.roll, needed: warrior.profile.I, success: t.success })),
      description: `${warrior.name || warrior.type} jumps down ${height}" successfully${isDivingCharge ? ' (diving charge: +1 S, +1 to hit)' : ''}`
    };

    // Apply diving charge bonus if applicable
    if (isDivingCharge) {
      warrior.divingChargeBonus = true;
    }

    // Record action
    gameState.actionHistory.push(action);
    addLog(gameState, action.description);

    return { action, success: true, testsPassed, testsFailed };
  } else {
    // Failed jump - warrior falls and takes damage
    const action: GameAction = {
      id: generateActionId(),
      type: 'jumpDown',
      timestamp: new Date().toISOString(),
      turn: gameState.turn,
      phase: gameState.phase,
      player: gameState.currentPlayer,
      warriorId,
      warbandIndex,
      previousState,
      diceRolls: jumpTest.tests.map(t => ({ roll: t.roll, needed: warrior.profile.I, success: t.success })),
      description: `${warrior.name || warrior.type} fails to land safely from ${height}" jump`
    };

    // Apply state change - warrior fell
    warrior.hasMoved = true;
    warrior.hasFallen = true;

    // Record action
    gameState.actionHistory.push(action);
    addLog(gameState, action.description);

    // Note: Falling damage should be applied separately using applyFalling()
    return { action, success: false, testsPassed, testsFailed };
  }
}

/**
 * Apply falling damage to a warrior
 */
export function applyFalling(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string,
  heightInInches: number
): FallingDamageResult {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  // Store previous state for undo
  const previousState: Partial<GameWarrior> = {
    hasMoved: warrior.hasMoved,
    hasFallen: warrior.hasFallen,
    woundsRemaining: warrior.woundsRemaining,
    gameStatus: warrior.gameStatus
  };

  // Calculate falling damage: D3 hits at S = height, no armor saves
  const fallingDamage = calculateFallingDamage(heightInInches);
  let woundsDealt = 0;

  // Apply each hit
  for (let i = 0; i < fallingDamage.hits; i++) {
    const woundRoll = rollToWound(fallingDamage.strength, warrior.profile.T);
    if (woundRoll.success) {
      // No armor save for falling damage
      woundsDealt++;
      warrior.woundsRemaining--;

      if (warrior.woundsRemaining <= 0) {
        // Roll injury
        const injuryResult = rollInjury();
        if (injuryResult.result === 'knockedDown') {
          warrior.gameStatus = 'knockedDown';
        } else if (injuryResult.result === 'stunned') {
          warrior.gameStatus = 'stunned';
        } else {
          warrior.gameStatus = 'outOfAction';
          warband.outOfActionCount++;
        }
        break;
      }
    }
  }

  // Warrior fell - cannot move or hide
  warrior.hasMoved = true;
  warrior.hasFallen = true;

  const action: GameAction = {
    id: generateActionId(),
    type: 'fall',
    timestamp: new Date().toISOString(),
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    warriorId,
    warbandIndex,
    previousState,
    description: `${warrior.name || warrior.type} takes falling damage from ${heightInInches}" (${fallingDamage.hits} hits at S${fallingDamage.strength}, ${woundsDealt} wound(s))`
  };

  // Record action
  gameState.actionHistory.push(action);
  addLog(gameState, action.description);

  return {
    action,
    hits: fallingDamage.hits,
    strength: fallingDamage.strength,
    woundsDealt,
    finalStatus: warrior.gameStatus
  };
}

/**
 * Check if knocked down/stunned warrior near edge falls
 * Call this after injury result when warrior is knocked down or stunned
 */
export function checkEdgeFall(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string,
  isNearEdge: boolean,
  edgeHeight: number
): EdgeFallCheckResult {
  if (!isNearEdge) {
    return { testRequired: false, fell: false };
  }

  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  // Must be knocked down or stunned to need this check
  if (warrior.gameStatus !== 'knockedDown' && warrior.gameStatus !== 'stunned') {
    return { testRequired: false, fell: false };
  }

  // Roll Initiative test
  const test = characteristicTest(warrior.profile.I);

  if (test.success) {
    // Passed - warrior catches themselves, no fall
    addLog(gameState, `${warrior.name || warrior.type} passes Initiative test and avoids falling off edge`);
    return {
      testRequired: true,
      testPassed: true,
      testRoll: test.roll,
      fell: false
    };
  } else {
    // Failed - warrior falls
    addLog(gameState, `${warrior.name || warrior.type} fails Initiative test and falls ${edgeHeight}" from the edge`);

    // Apply falling damage
    const fallDamage = applyFalling(gameState, warbandIndex, warriorId, edgeHeight);

    return {
      testRequired: true,
      testPassed: false,
      testRoll: test.roll,
      fell: true,
      fallDamage
    };
  }
}

// =====================================
// HIDING MECHANICS
// =====================================

/**
 * Check if warrior can hide
 */
export function canWarriorHide(warrior: GameWarrior): { canHide: boolean; reason?: string } {
  if (warrior.gameStatus !== 'standing') {
    return { canHide: false, reason: 'Warrior must be standing to hide' };
  }

  if (warrior.hasRun) {
    return { canHide: false, reason: 'Cannot hide after running' };
  }

  if (warrior.hasCharged) {
    return { canHide: false, reason: 'Cannot hide after charging' };
  }

  if (warrior.hasFailedCharge) {
    return { canHide: false, reason: 'Cannot hide after failing a charge' };
  }

  if (warrior.hasFallen) {
    return { canHide: false, reason: 'Cannot hide after falling' };
  }

  if (warrior.combatState.inCombat) {
    return { canHide: false, reason: 'Cannot hide while in combat' };
  }

  return { canHide: true };
}

/**
 * Hide warrior behind cover
 */
export function hideWarrior(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string
): GameAction {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  const canHide = canWarriorHide(warrior);
  if (!canHide.canHide) {
    throw new Error(canHide.reason);
  }

  // Store previous state for undo
  const previousState: Partial<GameWarrior> = {
    isHidden: warrior.isHidden
  };

  // Create action record
  const action: GameAction = {
    id: generateActionId(),
    type: 'hide',
    timestamp: new Date().toISOString(),
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    warriorId,
    warbandIndex,
    previousState,
    description: `${warrior.name || warrior.type} hides`
  };

  // Apply state change
  warrior.isHidden = true;

  // Record action
  gameState.actionHistory.push(action);
  addLog(gameState, action.description);

  return action;
}

/**
 * Reveal hidden warrior
 */
export function revealWarrior(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string,
  reason: string = 'detected'
): GameAction {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  if (!warrior.isHidden) {
    throw new Error('Warrior is not hidden');
  }

  // Store previous state for undo
  const previousState: Partial<GameWarrior> = {
    isHidden: warrior.isHidden
  };

  // Create action record
  const action: GameAction = {
    id: generateActionId(),
    type: 'reveal',
    timestamp: new Date().toISOString(),
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    warriorId,
    warbandIndex,
    previousState,
    description: `${warrior.name || warrior.type} is revealed (${reason})`
  };

  // Apply state change
  warrior.isHidden = false;

  // Record action
  gameState.actionHistory.push(action);
  addLog(gameState, action.description);

  return action;
}

/**
 * Get detection range for a warrior (based on Initiative)
 */
export function getDetectionRange(warrior: GameWarrior): number {
  return warrior.profile.I;
}

/**
 * Check hidden warriors for detection at start of movement phase
 * Returns list of warriors that should be revealed
 */
export function checkHiddenWarriorsForDetection(
  gameState: GameState,
  detectingWarbandIndex: number,
  hiddenWarriorsNearby: Array<{ warriorId: string; warbandIndex: number }>
): Array<{ warriorId: string; warbandIndex: number }> {
  // This is a simplified version - in actual use, the UI would prompt the player
  // to confirm which hidden warriors are within detection range of their warriors
  // The hiddenWarriorsNearby array is populated based on player confirmation
  return hiddenWarriorsNearby;
}

// =====================================
// CHARGE
// =====================================

/**
 * Charge warrior (double movement into combat)
 */
export function chargeWarrior(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string,
  targetWarbandIndex: number,
  targetId: string,
  options: ChargeOptions = {}
): GameAction {
  const warband = gameState.warbands[warbandIndex];
  const targetWarband = gameState.warbands[targetWarbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);
  const target = targetWarband.warriors.find(w => w.id === targetId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  if (!target) {
    throw new Error('Target not found');
  }

  if (warrior.gameStatus !== 'standing') {
    throw new Error('Warrior must be standing to charge');
  }

  if (warrior.hasMoved) {
    throw new Error('Warrior has already moved this turn');
  }

  // Default to successful charge for backwards compatibility
  const reachedTarget = options.reachedTarget !== false;

  // Store previous state for undo
  const previousState: Partial<GameWarrior> = {
    hasMoved: warrior.hasMoved,
    hasCharged: warrior.hasCharged,
    hasFailedCharge: warrior.hasFailedCharge,
    combatState: { ...warrior.combatState }
  };

  if (reachedTarget) {
    // Check for interception
    const intercepted = options.interceptedBy;

    if (intercepted) {
      // Charge was intercepted - engage with interceptor instead of original target
      const interceptorWarband = gameState.warbands[intercepted.warbandIndex];
      const interceptor = interceptorWarband.warriors.find(w => w.id === intercepted.warriorId);

      if (!interceptor) {
        throw new Error('Interceptor not found');
      }

      const action: GameAction = {
        id: generateActionId(),
        type: 'charge',
        timestamp: new Date().toISOString(),
        turn: gameState.turn,
        phase: gameState.phase,
        player: gameState.currentPlayer,
        warriorId,
        warbandIndex,
        targetId: intercepted.warriorId, // Record the interceptor as the actual target
        targetWarbandIndex: intercepted.warbandIndex,
        previousState,
        description: `${warrior.name || warrior.type} charges ${target.name || target.type} but is intercepted by ${interceptor.name || interceptor.type}`
      };

      // Apply state change - charger still counts as having charged (strikes first)
      warrior.hasMoved = true;
      warrior.hasCharged = true;

      // Engage with interceptor, not original target
      engageWarriors(gameState, warbandIndex, warriorId, intercepted.warbandIndex, intercepted.warriorId);

      // Record action
      gameState.actionHistory.push(action);
      addLog(gameState, action.description);

      return action;
    }

    // Normal successful charge - engage in combat with original target
    const action: GameAction = {
      id: generateActionId(),
      type: 'charge',
      timestamp: new Date().toISOString(),
      turn: gameState.turn,
      phase: gameState.phase,
      player: gameState.currentPlayer,
      warriorId,
      warbandIndex,
      targetId,
      targetWarbandIndex,
      previousState,
      description: `${warrior.name || warrior.type} charges ${target.name || target.type}`
    };

    // Apply state change
    warrior.hasMoved = true;
    warrior.hasCharged = true;

    // Engage warriors in combat
    engageWarriors(gameState, warbandIndex, warriorId, targetWarbandIndex, targetId);

    // Record action
    gameState.actionHistory.push(action);
    addLog(gameState, action.description);

    return action;
  } else {
    // Failed charge - move normal distance toward target, cannot shoot
    const action: GameAction = {
      id: generateActionId(),
      type: 'failedCharge',
      timestamp: new Date().toISOString(),
      turn: gameState.turn,
      phase: gameState.phase,
      player: gameState.currentPlayer,
      warriorId,
      warbandIndex,
      targetId,
      targetWarbandIndex,
      previousState,
      description: `${warrior.name || warrior.type} fails to reach ${target.name || target.type} (moves normal distance)`
    };

    // Apply state change for failed charge
    warrior.hasMoved = true;
    warrior.hasFailedCharge = true;
    // Note: hasCharged remains false as warrior didn't engage

    // Record action
    gameState.actionHistory.push(action);
    addLog(gameState, action.description);

    return action;
  }
}

// =====================================
// SETUP PHASE
// =====================================

/**
 * Mark warrior as positioned (setup phase)
 */
export function markWarriorPositioned(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string
): GameAction {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  // Store previous state for undo
  const previousState: Partial<GameWarrior> = {
    hasActed: warrior.hasActed
  };

  // Create action record
  const action: GameAction = {
    id: generateActionId(),
    type: 'setStatus',
    timestamp: new Date().toISOString(),
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    warriorId,
    warbandIndex,
    previousState,
    description: `${warrior.name || warrior.type} positioned`
  };

  // Apply state change - mark as acted to track positioning
  warrior.hasActed = true;

  // Record action
  gameState.actionHistory.push(action);
  addLog(gameState, action.description);

  return action;
}
