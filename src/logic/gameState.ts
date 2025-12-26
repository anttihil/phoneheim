// Game State Management

import { SCENARIOS } from '../data/scenarios';
import { RANGED_WEAPONS } from '../data/equipment';
import {
  leadershipTest,
  rollToHitShooting,
  rollToHitMelee,
  rollToWound,
  rollArmorSave,
  rollInjury,
  rollCriticalHit,
  rollD6,
  calculateShootingModifiers,
  calculateArmorSaveModifier,
  getWeaponStrength,
  getWeaponArmorModifier,
  getWeaponEnemyArmorBonus,
  canWeaponParry,
  weaponCausesConcussion,
  attemptParryWithReroll,
  getWeaponAccuracyBonus,
  rollClimbingTest,
  rollJumpTest,
  calculateFallingDamage,
  characteristicTest
} from './gameRules';
import type {
  GameState,
  GameWarband,
  GameWarrior,
  GamePhase,
  GameLogEntry,
  GameAction,
  RecoveryActionType,
  Warband,
  Scenario,
  WarriorCombatState,
  ShootingModifiers,
  CombatResolution,
  ShootingTarget,
  StrikeOrderEntry,
  MeleeTarget,
  RoutTestResult
} from '../types';

// Create a new game state
export function createGameState(warband1: Warband, warband2: Warband, scenarioKey: string): GameState {
  const scenario = SCENARIOS[scenarioKey];

  return {
    id: generateGameId(),
    scenario: scenarioKey,
    scenarioData: scenario,
    turn: 1,
    currentPlayer: 1,
    phase: 'setup',
    warbands: [
      initWarbandForGame(warband1, 1),
      initWarbandForGame(warband2, 2)
    ],
    wyrdstoneCounters: [],
    objectives: [],
    log: [],
    actionHistory: [],
    startedAt: new Date().toISOString(),
    ended: false,
    winner: null
  };
}

// Initialize warband for game
function initWarbandForGame(warband: Warband, playerNumber: 1 | 2): GameWarband {
  return {
    ...warband,
    player: playerNumber,
    warriors: warband.warriors.map(w => ({
      ...w,
      gameStatus: 'standing' as const,
      woundsRemaining: w.profile.W,
      hasActed: false,
      hasMoved: false,
      hasRun: false,
      hasShot: false,
      hasCharged: false,
      hasFailedCharge: false,
      hasFallen: false,
      hasRecovered: false,
      isHidden: false,
      carriedWyrdstone: 0,
      position: null,
      combatState: {
        inCombat: false,
        inCover: false,
        engagedWith: []
      },
      halfMovement: false,
      strikesLast: false,
      divingChargeBonus: false
    })),
    outOfActionCount: 0,
    routFailed: false
  };
}

// Get current warband
export function getCurrentWarband(gameState: GameState): GameWarband {
  return gameState.warbands[gameState.currentPlayer - 1];
}

// Get opposing warband
export function getOpposingWarband(gameState: GameState): GameWarband {
  return gameState.warbands[gameState.currentPlayer === 1 ? 1 : 0];
}

// Advance to next phase
// Mordheim turn structure: Each phase has both players act before moving to next phase
// Flow: Recovery (P1→P2) → Movement (P1→P2) → Shooting (P1→P2) → Combat (P1→P2) → Next Turn
export function advancePhase(gameState: GameState): void {
  const phases: GamePhase[] = ['recovery', 'movement', 'shooting', 'combat'];
  const currentIndex = phases.indexOf(gameState.phase as GamePhase);

  // Setup phase: both players need to position their warriors
  if (gameState.phase === 'setup') {
    if (gameState.currentPlayer === 1) {
      // Player 1 setup done, now Player 2
      gameState.currentPlayer = 2;
      // Reset hasActed flags for Player 2's warriors
      for (const warrior of gameState.warbands[1].warriors) {
        warrior.hasActed = false;
      }
      addLog(gameState, 'Setup Phase - Player 2');
    } else {
      // Both players done with setup, advance to recovery
      gameState.phase = 'recovery';
      gameState.currentPlayer = 1;
      // Reset all warrior flags for the actual game
      resetWarriorFlags(gameState);
      addLog(gameState, `Turn ${gameState.turn}, Recovery Phase - Player ${gameState.currentPlayer}`);
    }
    return;
  }

  // Within a phase: alternate between players
  if (gameState.currentPlayer === 1) {
    // Player 1 finished, now Player 2's turn in same phase
    gameState.currentPlayer = 2;
    addLog(gameState, `Turn ${gameState.turn}, ${getPhaseName(gameState.phase)} - Player ${gameState.currentPlayer}`);
  } else {
    // Player 2 finished, move to next phase with Player 1
    gameState.currentPlayer = 1;

    if (currentIndex < phases.length - 1) {
      // Move to next phase
      gameState.phase = phases[currentIndex + 1];
      addLog(gameState, `Turn ${gameState.turn}, ${getPhaseName(gameState.phase)} - Player ${gameState.currentPlayer}`);
    } else {
      // End of combat phase = end of turn
      gameState.turn++;
      gameState.phase = 'recovery';

      // Reset warrior flags for new turn (both warbands)
      resetWarriorFlags(gameState);

      addLog(gameState, `Turn ${gameState.turn}, Recovery Phase - Player ${gameState.currentPlayer}`);
    }
  }
}

// Get display name for phase
function getPhaseName(phase: GamePhase): string {
  switch (phase) {
    case 'recovery': return 'Recovery Phase';
    case 'movement': return 'Movement Phase';
    case 'shooting': return 'Shooting Phase';
    case 'combat': return 'Combat Phase';
    default: return phase;
  }
}

// Reset warrior action flags at start of turn (both warbands)
function resetWarriorFlags(gameState: GameState): void {
  for (const warband of gameState.warbands) {
    for (const warrior of warband.warriors) {
      warrior.hasActed = false;
      warrior.hasMoved = false;
      warrior.hasRun = false;
      warrior.hasShot = false;
      warrior.hasCharged = false;
      warrior.hasFailedCharge = false;
      warrior.hasFallen = false;
      warrior.hasRecovered = false;
      // Reset turn-specific modifiers from previous turn
      warrior.halfMovement = false;
      warrior.strikesLast = false;
      warrior.divingChargeBonus = false;
    }
  }
}

// Update warrior status
export function setWarriorStatus(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string,
  status: GameWarrior['gameStatus']
): void {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (warrior) {
    const oldStatus = warrior.gameStatus;
    warrior.gameStatus = status;

    if (status === 'outOfAction') {
      warband.outOfActionCount++;
    }

    addLog(gameState, `${warrior.name || warrior.type}: ${oldStatus} -> ${status}`);
  }
}

// Apply wound to warrior
export function applyWound(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string,
  wounds: number = 1
): boolean {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (warrior) {
    warrior.woundsRemaining -= wounds;

    if (warrior.woundsRemaining <= 0) {
      warrior.woundsRemaining = 0;
      addLog(gameState, `${warrior.name || warrior.type} reduced to 0 wounds - roll for injury`);
      return true; // Needs injury roll
    }

    addLog(gameState, `${warrior.name || warrior.type} takes ${wounds} wound(s), ${warrior.woundsRemaining} remaining`);
    return false;
  }
  return false;
}

// Check if rout test is required
export function isRoutTestRequired(warband: GameWarband): boolean {
  const totalWarriors = warband.warriors.length;
  const outOfAction = warband.outOfActionCount;
  return outOfAction >= Math.ceil(totalWarriors / 4);
}

// End the game
export function endGame(gameState: GameState, winner: 1 | 2 | null, reason: string): void {
  gameState.ended = true;
  gameState.winner = winner;
  gameState.endReason = reason;
  gameState.endedAt = new Date().toISOString();

  addLog(gameState, `Game ended! Player ${winner} wins by ${reason}`);
}

// Add to game log
export function addLog(gameState: GameState, message: string): void {
  gameState.log.push({
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    message,
    timestamp: new Date().toISOString()
  });
}

// Get standing warriors
export function getStandingWarriors(warband: GameWarband): GameWarrior[] {
  return warband.warriors.filter(w => w.gameStatus === 'standing');
}

// Get warriors that can act
export function getActableWarriors(warband: GameWarband, phase: GamePhase): GameWarrior[] {
  return warband.warriors.filter(w => {
    if (w.gameStatus !== 'standing') return false;
    if (w.hasActed) return false;

    switch (phase) {
      case 'movement':
        return !w.hasMoved;
      case 'shooting':
        return !w.hasShot && !w.hasCharged && hasRangedWeapon(w);
      default:
        return true;
    }
  });
}

// Check if warrior has ranged weapon
function hasRangedWeapon(warrior: GameWarrior): boolean {
  return warrior.equipment?.ranged?.length > 0;
}

// Generate game ID
function generateGameId(): string {
  return 'game_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Export game state for saving
export function exportGameState(gameState: GameState): string {
  return JSON.stringify(gameState, null, 2);
}

// Import game state
export function importGameState(json: string): GameState {
  return JSON.parse(json);
}

// =====================================
// RECOVERY PHASE MECHANICS
// =====================================

// Get warriors that need recovery actions
export function getWarriorsNeedingRecovery(warband: GameWarband): {
  fleeing: GameWarrior[];
  stunned: GameWarrior[];
  knockedDown: GameWarrior[];
} {
  return {
    fleeing: warband.warriors.filter(w => w.gameStatus === 'fleeing' && !w.hasRecovered),
    stunned: warband.warriors.filter(w => w.gameStatus === 'stunned' && !w.hasRecovered),
    knockedDown: warband.warriors.filter(w => w.gameStatus === 'knockedDown' && !w.hasRecovered)
  };
}

// Check if all warriors have completed recovery
export function isRecoveryPhaseComplete(warband: GameWarband): boolean {
  const { fleeing, stunned, knockedDown } = getWarriorsNeedingRecovery(warband);
  return fleeing.length === 0 && stunned.length === 0 && knockedDown.length === 0;
}

// Rally a fleeing warrior (Leadership test)
export interface RallyResult {
  success: boolean;
  roll: number;
  leadershipNeeded: number;
  action: GameAction;
}

export function rallyWarrior(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string
): RallyResult {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior || warrior.gameStatus !== 'fleeing') {
    throw new Error('Warrior is not fleeing and cannot rally');
  }

  // Store previous state for undo
  const previousState: Partial<GameWarrior> = {
    gameStatus: warrior.gameStatus,
    hasRecovered: warrior.hasRecovered
  };

  // Roll Leadership test (2D6 <= Ld)
  const leadershipValue = warrior.profile.Ld;
  const testResult = leadershipTest(leadershipValue);

  // Create action record
  const action: GameAction = {
    id: generateActionId(),
    type: 'rally',
    timestamp: new Date().toISOString(),
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    warriorId,
    warbandIndex,
    previousState,
    diceRolls: [{ roll: testResult.roll, needed: leadershipValue, success: testResult.success }],
    description: testResult.success
      ? `${warrior.name || warrior.type} rallies successfully (rolled ${testResult.roll} vs Ld ${leadershipValue})`
      : `${warrior.name || warrior.type} fails to rally (rolled ${testResult.roll} vs Ld ${leadershipValue})`
  };

  // Apply result
  if (testResult.success) {
    warrior.gameStatus = 'standing';
  }
  warrior.hasRecovered = true;

  // Record action
  gameState.actionHistory.push(action);
  addLog(gameState, action.description);

  return {
    success: testResult.success,
    roll: testResult.roll,
    leadershipNeeded: leadershipValue,
    action
  };
}

// Recover from stunned (automatic - becomes knocked down)
export function recoverFromStunned(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string
): GameAction {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior || warrior.gameStatus !== 'stunned') {
    throw new Error('Warrior is not stunned');
  }

  // Store previous state for undo
  const previousState: Partial<GameWarrior> = {
    gameStatus: warrior.gameStatus,
    hasRecovered: warrior.hasRecovered
  };

  // Create action record
  const action: GameAction = {
    id: generateActionId(),
    type: 'recoverFromStunned',
    timestamp: new Date().toISOString(),
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    warriorId,
    warbandIndex,
    previousState,
    description: `${warrior.name || warrior.type} recovers from stunned to knocked down`
  };

  // Apply result
  warrior.gameStatus = 'knockedDown';
  warrior.hasRecovered = true;

  // Record action
  gameState.actionHistory.push(action);
  addLog(gameState, action.description);

  return action;
}

// Stand up from knocked down (automatic)
export function standUpWarrior(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string
): GameAction {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior || warrior.gameStatus !== 'knockedDown') {
    throw new Error('Warrior is not knocked down');
  }

  // Check if warrior is in combat - cannot stand up freely if engaged
  if (warrior.combatState.inCombat && warrior.combatState.engagedWith.length > 0) {
    throw new Error('Warrior is engaged in combat and cannot stand up freely');
  }

  // Store previous state for undo
  const previousState: Partial<GameWarrior> = {
    gameStatus: warrior.gameStatus,
    hasRecovered: warrior.hasRecovered,
    halfMovement: warrior.halfMovement,
    strikesLast: warrior.strikesLast
  };

  // Create action record
  const action: GameAction = {
    id: generateActionId(),
    type: 'standUp',
    timestamp: new Date().toISOString(),
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    warriorId,
    warbandIndex,
    previousState,
    description: `${warrior.name || warrior.type} stands up (half movement, strikes last this turn)`
  };

  // Apply result
  warrior.gameStatus = 'standing';
  warrior.hasRecovered = true;
  warrior.halfMovement = true;
  warrior.strikesLast = true;

  // Record action
  gameState.actionHistory.push(action);
  addLog(gameState, action.description);

  return action;
}

// =====================================
// COMBAT STATE MANAGEMENT
// =====================================

// Set warrior combat state
export function setWarriorCombatState(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string,
  combatState: Partial<WarriorCombatState>
): GameAction {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  // Store previous state for undo
  const previousState: Partial<GameWarrior> = {
    combatState: { ...warrior.combatState }
  };

  // Create action record
  const action: GameAction = {
    id: generateActionId(),
    type: 'setCombatState',
    timestamp: new Date().toISOString(),
    turn: gameState.turn,
    phase: gameState.phase,
    player: gameState.currentPlayer,
    warriorId,
    warbandIndex,
    previousState,
    description: `${warrior.name || warrior.type} combat state updated`
  };

  // Apply changes
  if (combatState.inCombat !== undefined) {
    warrior.combatState.inCombat = combatState.inCombat;
  }
  if (combatState.inCover !== undefined) {
    warrior.combatState.inCover = combatState.inCover;
  }
  if (combatState.engagedWith !== undefined) {
    warrior.combatState.engagedWith = combatState.engagedWith;
  }

  // Record action
  gameState.actionHistory.push(action);

  return action;
}

// Engage two warriors in combat
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

// Disengage warrior from combat
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

// Set warrior in cover state
export function setWarriorCover(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string,
  inCover: boolean
): void {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  warrior.combatState.inCover = inCover;
  addLog(gameState, `${warrior.name || warrior.type} ${inCover ? 'takes cover' : 'leaves cover'}`);
}

// =====================================
// WARRIOR ACTION TRACKING
// =====================================

// Check if warrior can perform an action in current phase
export function canWarriorAct(warrior: GameWarrior, phase: GamePhase): boolean {
  // Out of action warriors cannot act
  if (warrior.gameStatus === 'outOfAction') {
    return false;
  }

  switch (phase) {
    case 'setup':
      // Can position if standing and hasn't been positioned (marked as acted)
      return warrior.gameStatus === 'standing' && !warrior.hasActed;

    case 'recovery':
      // Can act if fleeing, stunned, or knocked down and hasn't recovered
      return (
        (warrior.gameStatus === 'fleeing' ||
          warrior.gameStatus === 'stunned' ||
          warrior.gameStatus === 'knockedDown') &&
        !warrior.hasRecovered
      );

    case 'movement':
      // Can move if standing and hasn't moved
      return warrior.gameStatus === 'standing' && !warrior.hasMoved;

    case 'shooting':
      // Can shoot if standing, hasn't shot, didn't charge, didn't run, has ranged weapon
      return (
        warrior.gameStatus === 'standing' &&
        !warrior.hasShot &&
        !warrior.hasCharged &&
        !warrior.hasRun &&
        hasRangedWeapon(warrior)
      );

    case 'combat':
      // Can fight if engaged in combat
      return warrior.combatState.inCombat && warrior.gameStatus === 'standing';

    default:
      return false;
  }
}

// Get available actions for a warrior in current phase
export interface AvailableAction {
  type: string;
  description: string;
  requiresTarget: boolean;
  validTargets?: string[];
}

export function getAvailableActions(
  warrior: GameWarrior,
  phase: GamePhase,
  gameState: GameState
): AvailableAction[] {
  const actions: AvailableAction[] = [];

  if (!canWarriorAct(warrior, phase)) {
    return actions;
  }

  switch (phase) {
    case 'setup':
      actions.push({ type: 'position', description: 'Mark Positioned', requiresTarget: false });
      break;

    case 'recovery':
      if (warrior.gameStatus === 'fleeing') {
        actions.push({ type: 'rally', description: 'Rally (Leadership test)', requiresTarget: false });
      }
      if (warrior.gameStatus === 'stunned') {
        actions.push({ type: 'recoverFromStunned', description: 'Recover (becomes knocked down)', requiresTarget: false });
      }
      if (warrior.gameStatus === 'knockedDown') {
        if (!warrior.combatState.inCombat) {
          actions.push({ type: 'standUp', description: 'Stand up (half move, strikes last)', requiresTarget: false });
        }
      }
      break;

    case 'movement':
      actions.push({ type: 'move', description: 'Move', requiresTarget: false });
      actions.push({ type: 'run', description: 'Run (double movement, no shooting)', requiresTarget: false });
      // Charge requires targets
      const chargeTargets = getValidChargeTargets(warrior, gameState);
      if (chargeTargets.length > 0) {
        actions.push({
          type: 'charge',
          description: 'Charge (double movement into combat)',
          requiresTarget: true,
          validTargets: chargeTargets
        });
      }
      break;

    case 'shooting':
      const shootingTargets = getValidShootingTargets(warrior, gameState);
      if (shootingTargets.length > 0) {
        actions.push({
          type: 'shoot',
          description: 'Shoot',
          requiresTarget: true,
          validTargets: shootingTargets
        });
      }
      break;

    case 'combat':
      if (warrior.combatState.engagedWith.length > 0) {
        actions.push({
          type: 'fight',
          description: 'Fight in combat',
          requiresTarget: true,
          validTargets: warrior.combatState.engagedWith
        });
      }
      break;
  }

  return actions;
}

// Get valid charge targets for a warrior
function getValidChargeTargets(warrior: GameWarrior, gameState: GameState): string[] {
  const targets: string[] = [];
  const currentPlayerIndex = gameState.currentPlayer - 1;
  const opponentIndex = currentPlayerIndex === 0 ? 1 : 0;
  const opponentWarband = gameState.warbands[opponentIndex];

  for (const enemy of opponentWarband.warriors) {
    if (enemy.gameStatus === 'standing' || enemy.gameStatus === 'knockedDown') {
      // In a real implementation, would check distance and line of sight
      targets.push(enemy.id);
    }
  }

  return targets;
}

// Get valid shooting targets for a warrior
function getValidShootingTargets(warrior: GameWarrior, gameState: GameState): string[] {
  const targets: string[] = [];
  const currentPlayerIndex = gameState.currentPlayer - 1;
  const opponentIndex = currentPlayerIndex === 0 ? 1 : 0;
  const opponentWarband = gameState.warbands[opponentIndex];

  for (const enemy of opponentWarband.warriors) {
    // Cannot shoot at hidden enemies, can shoot at all visible enemies
    if (enemy.gameStatus !== 'outOfAction' && !enemy.isHidden) {
      targets.push(enemy.id);
    }
  }

  return targets;
}

// Mark warrior as having acted
export function markWarriorActed(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string,
  actionType: 'moved' | 'shot' | 'charged' | 'acted'
): void {
  const warband = gameState.warbands[warbandIndex];
  const warrior = warband.warriors.find(w => w.id === warriorId);

  if (!warrior) {
    throw new Error('Warrior not found');
  }

  switch (actionType) {
    case 'moved':
      warrior.hasMoved = true;
      break;
    case 'shot':
      warrior.hasShot = true;
      break;
    case 'charged':
      warrior.hasCharged = true;
      warrior.hasMoved = true;
      break;
    case 'acted':
      warrior.hasActed = true;
      break;
  }
}

// =====================================
// MOVEMENT PHASE ACTIONS
// =====================================

// Move warrior (normal movement)
// Move options
export interface MoveOptions {
  disengageFromDowned?: boolean; // If true, will disengage from knocked down/stunned enemies
}

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

// Run options for running validation
export interface RunOptions {
  hasEnemiesNearby?: boolean; // Are non-hidden standing enemies within 8"?
}

// Run warrior (double movement, no shooting)
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

// Climb options
export interface ClimbOptions {
  height: number; // Height to climb in inches
  direction: 'up' | 'down';
}

// Climb result
export interface ClimbResult {
  action: GameAction;
  success: boolean;
  fell?: boolean; // If climbing down failed, warrior fell
}

// Climb warrior (requires Initiative test)
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

  if (climbTest.passed) {
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

// Jump down result
export interface JumpDownResult {
  action: GameAction;
  success: boolean;
  testsPassed: number;
  testsFailed: number;
}

// Jump down from height (max 6", Initiative test per 2")
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

// Apply falling damage result
export interface FallingDamageResult {
  action: GameAction;
  hits: number;
  strength: number;
  woundsDealt: number;
  finalStatus: 'standing' | 'knockedDown' | 'stunned' | 'outOfAction';
}

// Apply falling damage to a warrior
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
    if (woundRoll.wounded) {
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

// Edge fall check result
export interface EdgeFallCheckResult {
  testRequired: boolean;
  testPassed?: boolean;
  testRoll?: number;
  fell: boolean;
  fallDamage?: FallingDamageResult;
}

// Check if knocked down/stunned warrior near edge falls
// Call this after injury result when warrior is knocked down or stunned
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

  if (test.passed) {
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

// Check if warrior can hide
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

// Hide warrior behind cover
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

// Reveal hidden warrior
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

// Get detection range for a warrior (based on Initiative)
export function getDetectionRange(warrior: GameWarrior): number {
  return warrior.profile.I;
}

// Check hidden warriors for detection at start of movement phase
// Returns list of warriors that should be revealed
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
// COMBAT MOVEMENT RESTRICTIONS
// =====================================

// Check if a warrior in combat can move away
// Warriors can only move if all engaged enemies are knocked down or stunned
export function canMoveInCombat(
  gameState: GameState,
  warbandIndex: number,
  warriorId: string
): { canMove: boolean; reason?: string } {
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

// Disengage warrior from all enemies in combat
// Should only be called when canMoveInCombat returns true
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

// Charge options for charge validation
export interface ChargeOptions {
  reachedTarget?: boolean; // Did the warrior reach the target? (default: true for backwards compatibility)
  interceptedBy?: {
    warriorId: string;
    warbandIndex: number;
  }; // If set, charge is intercepted by this warrior instead of reaching original target
}

// Charge warrior (double movement into combat)
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

// Mark warrior as positioned (setup phase)
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

// =====================================
// UNDO FUNCTIONALITY
// =====================================

// Get the last action that can be undone
export function getLastUndoableAction(gameState: GameState): GameAction | null {
  if (gameState.actionHistory.length === 0) {
    return null;
  }
  return gameState.actionHistory[gameState.actionHistory.length - 1];
}

// Undo the last action
export function undoLastAction(gameState: GameState): GameAction | null {
  const action = gameState.actionHistory.pop();

  if (!action) {
    return null;
  }

  const warband = gameState.warbands[action.warbandIndex];
  const warrior = warband.warriors.find(w => w.id === action.warriorId);

  if (!warrior) {
    throw new Error('Warrior not found for undo');
  }

  // Restore previous state
  Object.assign(warrior, action.previousState);

  // If action affected out of action count, restore it
  if (action.previousState.gameStatus !== 'outOfAction' && warrior.gameStatus === 'outOfAction') {
    warband.outOfActionCount--;
  }

  addLog(gameState, `UNDO: ${action.description}`);

  return action;
}

// Generate action ID
function generateActionId(): string {
  return 'action_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// =====================================
// WARRIOR SELECTION HELPERS
// =====================================

// Get all warriors that can act in the current phase
export function getWarriorsForPhase(gameState: GameState): GameWarrior[] {
  const warband = getCurrentWarband(gameState);
  const phase = gameState.phase;

  return warband.warriors.filter(warrior => canWarriorAct(warrior, phase));
}

// Find warrior by ID across all warbands
export function findWarrior(gameState: GameState, warriorId: string): { warrior: GameWarrior; warbandIndex: number } | null {
  for (let i = 0; i < gameState.warbands.length; i++) {
    const warrior = gameState.warbands[i].warriors.find(w => w.id === warriorId);
    if (warrior) {
      return { warrior, warbandIndex: i };
    }
  }
  return null;
}

// =====================================
// SHOOTING PHASE FUNCTIONS
// =====================================

// Check if warrior can shoot
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

// Get available shooting targets
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
  const halfRange = weaponRange / 2;

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

// Execute a shooting attack
export function executeShot(
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
  const previousTargetState: Partial<GameWarrior> = {
    woundsRemaining: target.woundsRemaining,
    gameStatus: target.gameStatus
  };

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

// Helper to create shooting action
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

// Get warrior's armor save value
function getWarriorArmorSave(warrior: GameWarrior): number {
  // Check armor equipment
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

// =====================================
// COMBAT PHASE FUNCTIONS
// =====================================

// Build strike order for combat phase
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
          attacks: warrior.profile.A
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

// Get melee targets for a warrior
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

// Execute a single melee attack
export function executeMeleeAttack(
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

// Helper to create melee action
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

// Apply injury result to target
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

// Internal disengage (doesn't create action)
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
// ROUT TEST FUNCTIONS
// =====================================

// Execute rout test for a warband
export function executeRoutTest(
  gameState: GameState,
  warbandIndex: number
): RoutTestResult {
  const warband = gameState.warbands[warbandIndex];

  // Find leader for Leadership value
  const leader = warband.warriors.find(w =>
    w.type.toLowerCase().includes('captain') ||
    w.type.toLowerCase().includes('leader') ||
    w.type.toLowerCase().includes('chieftain') ||
    w.type.toLowerCase().includes('magister')
  ) || warband.warriors[0];

  const leadershipValue = leader?.profile.Ld ?? 7;

  const testResult = leadershipTest(leadershipValue);

  const result: RoutTestResult = {
    roll: testResult.roll,
    needed: leadershipValue,
    passed: testResult.success,
    warbandIndex
  };

  if (!testResult.success) {
    // Warband routs
    warband.routFailed = true;
    addLog(gameState, `${warband.name} fails rout test (rolled ${testResult.roll} vs Ld ${leadershipValue}) and flees!`);
  } else {
    addLog(gameState, `${warband.name} passes rout test (rolled ${testResult.roll} vs Ld ${leadershipValue})`);
  }

  return result;
}
