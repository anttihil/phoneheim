// GameEngine - Headless game engine that processes events and emits screen commands

import type { Warband } from '../types/warband';
import type { GameState, GameWarrior, ShootingModifiers } from '../types/game';
import type {
  GameEvent,
  SelectWarriorEvent,
  ConfirmMoveEvent,
  ConfirmChargeEvent,
  ConfirmPositionEvent,
  AdvancePhaseEvent,
  SetModifierEvent,
  RecoveryActionEvent,
  ConfirmShotEvent,
  ConfirmMeleeEvent,
  UndoEvent
} from './types/events';
import type { ScreenCommand, WarriorView, WarbandView } from './types/screens';
import type { CombatResolution, StrikeOrderEntry } from '../types/game';
import {
  createGameState,
  advancePhase as advanceGamePhase,
  moveWarrior as moveWarriorLogic,
  runWarrior as runWarriorLogic,
  chargeWarrior as chargeWarriorLogic,
  markWarriorPositioned as markWarriorPositionedLogic,
  rallyWarrior as rallyWarriorLogic,
  recoverFromStunned as recoverFromStunnedLogic,
  standUpWarrior as standUpWarriorLogic,
  executeShot as executeShotLogic,
  buildStrikeOrder as buildStrikeOrderLogic,
  getMeleeTargets as getMeleeTargetsLogic,
  executeMeleeAttack as executeMeleeAttackLogic,
  isRoutTestRequired,
  getCurrentWarband,
  getOpposingWarband,
  canWarriorAct,
  findWarrior
} from '../logic/gameState';

// Result of processing an event
export interface ProcessResult {
  success: boolean;
  error?: string;
  stateChanged: boolean;
  screenCommand: ScreenCommand;
}

// Serialized game for save/load and network sync
export interface SerializedGame {
  state: GameState;
  history: GameEvent[];
  selectedWarriorId: string | null;
  selectedTargetId: string | null;
  shootingModifiers: ShootingModifiers;
}

export class GameEngine {
  private state: GameState | null = null;
  private history: GameEvent[] = [];
  private selectedWarriorId: string | null = null;
  private selectedTargetId: string | null = null;
  private shootingModifiers: ShootingModifiers = {
    cover: false,
    longRange: false,
    moved: false,
    largeTarget: false
  };
  // Combat resolution tracking
  private pendingResolution: CombatResolution | null = null;
  private pendingRoutTest: number | null = null;
  // Strike order tracking for combat phase
  private strikeOrder: StrikeOrderEntry[] = [];
  private currentFighterIndex: number = 0;
  // Initial state for undo support (deep copies)
  private initialWarband1: Warband | null = null;
  private initialWarband2: Warband | null = null;
  private initialScenario: string | null = null;

  // =====================================
  // INITIALIZATION
  // =====================================

  createGame(warband1: Warband, warband2: Warband, scenario: string): void {
    // Store deep copies of initial warbands for undo support
    this.initialWarband1 = JSON.parse(JSON.stringify(warband1));
    this.initialWarband2 = JSON.parse(JSON.stringify(warband2));
    this.initialScenario = scenario;

    this.state = createGameState(warband1, warband2, scenario);
    this.history = [];
    this.selectedWarriorId = null;
    this.selectedTargetId = null;
    this.resetShootingModifiers();
    this.pendingResolution = null;
    this.pendingRoutTest = null;
    this.strikeOrder = [];
    this.currentFighterIndex = 0;
  }

  loadGame(state: GameState, history: GameEvent[]): void {
    this.state = state;
    this.history = history;
    this.selectedWarriorId = null;
    this.selectedTargetId = null;
    this.resetShootingModifiers();
    this.pendingResolution = null;
    this.pendingRoutTest = null;
    this.strikeOrder = [];
    this.currentFighterIndex = 0;
  }

  // =====================================
  // EVENT PROCESSING
  // =====================================

  processEvent(event: GameEvent): ProcessResult {
    if (!this.state) {
      return this.errorResult('No active game');
    }

    // Handle UNDO specially - it modifies history rather than being added to it
    if (event.type === 'UNDO') {
      return this.handleUndo(event);
    }

    // Record event in history
    this.history.push(event);

    try {
      switch (event.type) {
        case 'SELECT_WARRIOR':
          return this.handleSelectWarrior(event);

        case 'DESELECT':
          return this.handleDeselect();

        case 'SELECT_TARGET':
          return this.handleSelectTarget(event.payload.targetId);

        case 'CONFIRM_MOVE':
          return this.handleConfirmMove(event);

        case 'CONFIRM_CHARGE':
          return this.handleConfirmCharge(event);

        case 'CONFIRM_POSITION':
          return this.handleConfirmPosition(event);

        case 'SET_MODIFIER':
          return this.handleSetModifier(event);

        case 'ADVANCE_PHASE':
          return this.handleAdvancePhase(event);

        case 'RECOVERY_ACTION':
          return this.handleRecoveryAction(event);

        case 'CONFIRM_SHOT':
          return this.handleConfirmShot(event);

        case 'ACKNOWLEDGE':
          return this.handleAcknowledge();

        case 'CONFIRM_MELEE':
          return this.handleConfirmMelee(event);

        default:
          return this.errorResult(`Unknown event type: ${(event as GameEvent).type}`);
      }
    } catch (error) {
      return this.errorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // =====================================
  // EVENT HANDLERS
  // =====================================

  private handleSelectWarrior(event: SelectWarriorEvent): ProcessResult {
    const { warriorId } = event.payload;

    // Verify warrior exists
    const result = findWarrior(this.state!, warriorId);
    if (!result) {
      return this.errorResult('Warrior not found');
    }

    // Verify warrior belongs to current player
    if (result.warbandIndex !== this.state!.currentPlayer - 1) {
      return this.errorResult('Cannot select opponent warrior');
    }

    this.selectedWarriorId = warriorId;
    this.selectedTargetId = null;

    return this.successResult(true);
  }

  private handleDeselect(): ProcessResult {
    this.selectedWarriorId = null;
    this.selectedTargetId = null;
    return this.successResult(true);
  }

  private handleSelectTarget(targetId: string): ProcessResult {
    if (!this.selectedWarriorId) {
      return this.errorResult('No warrior selected');
    }

    // Verify target exists
    const result = findWarrior(this.state!, targetId);
    if (!result) {
      return this.errorResult('Target not found');
    }

    this.selectedTargetId = targetId;
    return this.successResult(true);
  }

  private handleConfirmMove(event: ConfirmMoveEvent): ProcessResult {
    if (!this.selectedWarriorId) {
      return this.errorResult('No warrior selected');
    }

    const warbandIndex = this.state!.currentPlayer - 1;

    if (event.payload.moveType === 'move') {
      moveWarriorLogic(this.state!, warbandIndex, this.selectedWarriorId);
    } else {
      runWarriorLogic(this.state!, warbandIndex, this.selectedWarriorId);
    }

    // Deselect after action
    this.selectedWarriorId = null;
    return this.successResult(true);
  }

  private handleConfirmCharge(event: ConfirmChargeEvent): ProcessResult {
    if (!this.selectedWarriorId) {
      return this.errorResult('No warrior selected');
    }

    const { targetId } = event.payload;
    const warbandIndex = this.state!.currentPlayer - 1;
    const targetWarbandIndex = warbandIndex === 0 ? 1 : 0;

    chargeWarriorLogic(this.state!, warbandIndex, this.selectedWarriorId, targetWarbandIndex, targetId);

    // Deselect after action
    this.selectedWarriorId = null;
    this.selectedTargetId = null;
    return this.successResult(true);
  }

  private handleConfirmPosition(_event: ConfirmPositionEvent): ProcessResult {
    if (!this.selectedWarriorId) {
      return this.errorResult('No warrior selected');
    }

    const warbandIndex = this.state!.currentPlayer - 1;
    markWarriorPositionedLogic(this.state!, warbandIndex, this.selectedWarriorId);

    // Deselect after action
    this.selectedWarriorId = null;
    return this.successResult(true);
  }

  private handleSetModifier(event: SetModifierEvent): ProcessResult {
    const { modifier, value } = event.payload;
    this.shootingModifiers[modifier] = value;
    return this.successResult(true);
  }

  private handleAdvancePhase(_event: AdvancePhaseEvent): ProcessResult {
    // Reset combat state when leaving combat phase
    if (this.state!.phase === 'combat') {
      this.strikeOrder = [];
      this.currentFighterIndex = 0;
    }

    advanceGamePhase(this.state!);
    this.selectedWarriorId = null;
    this.selectedTargetId = null;
    return this.successResult(true);
  }

  private handleRecoveryAction(event: RecoveryActionEvent): ProcessResult {
    const { action, warriorId } = event.payload;
    const warbandIndex = this.state!.currentPlayer - 1;

    // Verify warrior exists and belongs to current player
    const result = findWarrior(this.state!, warriorId);
    if (!result) {
      return this.errorResult('Warrior not found');
    }
    if (result.warbandIndex !== warbandIndex) {
      return this.errorResult('Cannot perform recovery on opponent warrior');
    }

    switch (action) {
      case 'rally':
        if (result.warrior.gameStatus !== 'fleeing') {
          return this.errorResult('Warrior is not fleeing');
        }
        rallyWarriorLogic(this.state!, warbandIndex, warriorId);
        break;

      case 'recoverFromStunned':
        if (result.warrior.gameStatus !== 'stunned') {
          return this.errorResult('Warrior is not stunned');
        }
        recoverFromStunnedLogic(this.state!, warbandIndex, warriorId);
        break;

      case 'standUp':
        if (result.warrior.gameStatus !== 'knockedDown') {
          return this.errorResult('Warrior is not knocked down');
        }
        standUpWarriorLogic(this.state!, warbandIndex, warriorId);
        break;

      default:
        return this.errorResult(`Unknown recovery action: ${action}`);
    }

    // Deselect after action
    this.selectedWarriorId = null;
    return this.successResult(true);
  }

  private handleConfirmShot(event: ConfirmShotEvent): ProcessResult {
    if (!this.selectedWarriorId) {
      return this.errorResult('No warrior selected');
    }

    const { targetId } = event.payload;

    // Execute the shot
    const result = executeShotLogic(this.state!, this.selectedWarriorId, targetId, this.shootingModifiers);

    // Store resolution for display
    this.pendingResolution = result.resolution;

    // Check if rout test is needed
    for (let i = 0; i < 2; i++) {
      if (isRoutTestRequired(this.state!.warbands[i]) && !this.state!.warbands[i].routFailed) {
        this.pendingRoutTest = i;
        break;
      }
    }

    // Reset modifiers and deselect
    this.resetShootingModifiers();
    this.selectedWarriorId = null;
    this.selectedTargetId = null;

    return this.successResult(true);
  }

  private handleAcknowledge(): ProcessResult {
    // Clear pending resolution modal
    this.pendingResolution = null;

    // Clear pending rout test
    this.pendingRoutTest = null;

    // If in combat phase, check if current fighter has used all attacks
    if (this.state!.phase === 'combat' && this.strikeOrder.length > 0) {
      const currentFighter = this.strikeOrder[this.currentFighterIndex];
      if (currentFighter && currentFighter.attacksUsed >= currentFighter.attacks) {
        // All attacks used, advance to next fighter
        this.currentFighterIndex++;
      }
      // If attacks remain, stay on current fighter (player can attack again)
    }

    return this.successResult(true);
  }

  private handleConfirmMelee(event: ConfirmMeleeEvent): ProcessResult {
    const { targetId, weaponKey } = event.payload;

    // Build strike order if not already built
    if (this.strikeOrder.length === 0) {
      this.strikeOrder = buildStrikeOrderLogic(this.state!);
      this.currentFighterIndex = 0;
    }

    // Validate we have fighters
    if (this.strikeOrder.length === 0) {
      return this.errorResult('No warriors in combat');
    }

    // Validate current fighter index
    if (this.currentFighterIndex >= this.strikeOrder.length) {
      return this.errorResult('All fighters have acted');
    }

    const currentFighter = this.strikeOrder[this.currentFighterIndex];

    // Validate fighter has attacks remaining
    if (currentFighter.attacksUsed >= currentFighter.attacks) {
      return this.errorResult('No attacks remaining for this warrior');
    }

    // Validate target is in the fighter's engaged enemies
    const targets = getMeleeTargetsLogic(this.state!, currentFighter.warriorId);
    const validTarget = targets.find(t => t.targetId === targetId);
    if (!validTarget) {
      return this.errorResult('Invalid melee target');
    }

    // Execute the melee attack
    const result = executeMeleeAttackLogic(
      this.state!,
      currentFighter.warriorId,
      targetId,
      weaponKey
    );

    // Increment attacks used
    currentFighter.attacksUsed++;

    // Store resolution for display
    this.pendingResolution = result.resolution;

    // Check if rout test is needed after the attack
    for (let i = 0; i < 2; i++) {
      if (isRoutTestRequired(this.state!.warbands[i]) && !this.state!.warbands[i].routFailed) {
        this.pendingRoutTest = i;
        break;
      }
    }

    // Fighter advancement happens in handleAcknowledge after all attacks are used

    return this.successResult(true);
  }

  private handleUndo(event: UndoEvent): ProcessResult {
    const { toEventId } = event.payload;

    // Check if we have initial state to restore from
    if (!this.initialWarband1 || !this.initialWarband2 || !this.initialScenario) {
      return this.errorResult('Cannot undo: no initial state available');
    }

    // Find the target event index
    const targetIndex = this.history.findIndex(e => e.id === toEventId);
    if (targetIndex === -1) {
      return this.errorResult('Cannot undo: target event not found in history');
    }

    // Get events to replay (up to and including target event)
    const eventsToReplay = this.history.slice(0, targetIndex + 1);

    // Reset to initial state
    this.state = createGameState(
      JSON.parse(JSON.stringify(this.initialWarband1)),
      JSON.parse(JSON.stringify(this.initialWarband2)),
      this.initialScenario
    );
    this.history = [];
    this.selectedWarriorId = null;
    this.selectedTargetId = null;
    this.resetShootingModifiers();
    this.pendingResolution = null;
    this.pendingRoutTest = null;
    this.strikeOrder = [];
    this.currentFighterIndex = 0;

    // Replay events up to target
    for (const eventToReplay of eventsToReplay) {
      // Process event (this will add it back to history)
      const result = this.processEvent(eventToReplay);
      if (!result.success) {
        // If replay fails, we're in an inconsistent state
        // This shouldn't happen if events were valid originally
        return this.errorResult(`Undo failed during replay: ${result.error}`);
      }
    }

    return this.successResult(true);
  }

  /**
   * Undo all events after the specified event ID.
   * The state will be as if the target event was the last event processed.
   */
  undoToEvent(eventId: string): ProcessResult {
    // Create an undo event and process it
    const undoEvent: UndoEvent = {
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      playerId: 'system',
      type: 'UNDO',
      payload: { toEventId: eventId }
    };
    return this.processEvent(undoEvent);
  }

  /**
   * Undo the last N events.
   * Returns error if there aren't enough events to undo.
   */
  undoLastEvents(count: number): ProcessResult {
    if (count <= 0) {
      return this.errorResult('Count must be positive');
    }

    if (this.history.length < count) {
      return this.errorResult(`Cannot undo ${count} events: only ${this.history.length} events in history`);
    }

    if (this.history.length === count) {
      // Undoing all events - reset to initial state
      return this.resetToInitialState();
    }

    // Find the event to undo to (the one that will remain as last)
    const targetIndex = this.history.length - count - 1;
    const targetEventId = this.history[targetIndex].id;
    return this.undoToEvent(targetEventId);
  }

  /**
   * Reset game to initial state (undo all events).
   */
  resetToInitialState(): ProcessResult {
    if (!this.initialWarband1 || !this.initialWarband2 || !this.initialScenario) {
      return this.errorResult('Cannot reset: no initial state available');
    }

    this.state = createGameState(
      JSON.parse(JSON.stringify(this.initialWarband1)),
      JSON.parse(JSON.stringify(this.initialWarband2)),
      this.initialScenario
    );
    this.history = [];
    this.selectedWarriorId = null;
    this.selectedTargetId = null;
    this.resetShootingModifiers();
    this.pendingResolution = null;
    this.pendingRoutTest = null;
    this.strikeOrder = [];
    this.currentFighterIndex = 0;

    return this.successResult(true);
  }

  // =====================================
  // SCREEN COMMAND BUILDING
  // =====================================

  getCurrentScreen(): ScreenCommand {
    if (!this.state) {
      return this.buildErrorScreen('No active game');
    }

    return this.computeScreenCommand();
  }

  private computeScreenCommand(): ScreenCommand {
    const state = this.state!;

    // Check for game over
    if (state.ended) {
      return this.buildGameOverScreen();
    }

    // Check for pending combat resolution modal
    if (this.pendingResolution) {
      return this.buildCombatResolutionScreen();
    }

    // Check for pending rout test
    if (this.pendingRoutTest !== null) {
      return this.buildRoutTestScreen();
    }

    // Phase-based screens
    switch (state.phase) {
      case 'setup':
        return this.buildSetupScreen();

      case 'recovery':
        return this.buildRecoveryScreen();

      case 'movement':
        return this.buildMovementScreen();

      case 'shooting':
        return this.buildShootingScreen();

      case 'combat':
        return this.buildCombatScreen();

      default:
        return this.buildErrorScreen(`Unknown phase: ${state.phase}`);
    }
  }

  private buildSetupScreen(): ScreenCommand {
    const state = this.state!;
    const currentWarband = getCurrentWarband(state);
    const opponentWarband = getOpposingWarband(state);

    const warriorsToPosition = currentWarband.warriors.filter(w =>
      w.gameStatus === 'standing' && !w.hasActed
    );

    return {
      screen: 'GAME_SETUP',
      data: {
        warband: this.toWarbandView(currentWarband),
        opponentWarband: this.toWarbandView(opponentWarband),
        scenario: {
          name: state.scenarioData.name,
          description: state.scenarioData.description
        },
        currentPlayer: state.currentPlayer,
        warriorsToPosition: warriorsToPosition.map(w => this.toWarriorView(w, state.currentPlayer - 1)),
        selectedWarrior: this.selectedWarriorId
          ? this.toWarriorView(findWarrior(state, this.selectedWarriorId)!.warrior, state.currentPlayer - 1)
          : null
      },
      availableEvents: ['SELECT_WARRIOR', 'CONFIRM_POSITION', 'ADVANCE_PHASE'],
      turn: state.turn,
      phase: state.phase,
      currentPlayer: state.currentPlayer,
      gameId: state.id
    };
  }

  private buildRecoveryScreen(): ScreenCommand {
    const state = this.state!;
    const currentWarband = getCurrentWarband(state);
    const warbandIndex = state.currentPlayer - 1;

    const fleeingWarriors = currentWarband.warriors.filter(
      w => w.gameStatus === 'fleeing' && !w.hasRecovered
    );
    const stunnedWarriors = currentWarband.warriors.filter(
      w => w.gameStatus === 'stunned' && !w.hasRecovered
    );
    const knockedDownWarriors = currentWarband.warriors.filter(
      w => w.gameStatus === 'knockedDown' && !w.hasRecovered
    );
    const completedRecoveries = currentWarband.warriors
      .filter(w => w.hasRecovered)
      .map(w => w.id);

    return {
      screen: 'RECOVERY_PHASE',
      data: {
        currentPlayer: state.currentPlayer,
        warband: this.toWarbandView(currentWarband),
        fleeingWarriors: fleeingWarriors.map(w => this.toWarriorView(w, warbandIndex)),
        stunnedWarriors: stunnedWarriors.map(w => this.toWarriorView(w, warbandIndex)),
        knockedDownWarriors: knockedDownWarriors.map(w => this.toWarriorView(w, warbandIndex)),
        completedRecoveries,
        selectedWarrior: this.selectedWarriorId
          ? this.toWarriorView(findWarrior(state, this.selectedWarriorId)!.warrior, warbandIndex)
          : null
      },
      availableEvents: ['SELECT_WARRIOR', 'RECOVERY_ACTION', 'ADVANCE_PHASE'],
      turn: state.turn,
      phase: state.phase,
      currentPlayer: state.currentPlayer,
      gameId: state.id
    };
  }

  private buildMovementScreen(): ScreenCommand {
    const state = this.state!;
    const currentWarband = getCurrentWarband(state);
    const opponentWarband = getOpposingWarband(state);
    const warbandIndex = state.currentPlayer - 1;

    const actableWarriors = currentWarband.warriors.filter(w =>
      canWarriorAct(w, 'movement')
    );

    // Get charge targets if a warrior is selected
    let chargeTargets: GameWarrior[] = [];
    let canMove = false;
    let canRun = false;
    let canCharge = false;

    if (this.selectedWarriorId) {
      const result = findWarrior(state, this.selectedWarriorId);
      if (result && canWarriorAct(result.warrior, 'movement')) {
        canMove = true;
        canRun = true;
        // Get valid charge targets from opponent warband
        chargeTargets = opponentWarband.warriors.filter(w =>
          w.gameStatus === 'standing' || w.gameStatus === 'knockedDown'
        );
        canCharge = chargeTargets.length > 0;
      }
    }

    return {
      screen: 'MOVEMENT_PHASE',
      data: {
        currentPlayer: state.currentPlayer,
        warband: this.toWarbandView(currentWarband),
        opponentWarband: this.toWarbandView(opponentWarband),
        actableWarriors: actableWarriors.map(w => this.toWarriorView(w, warbandIndex)),
        selectedWarrior: this.selectedWarriorId
          ? this.toWarriorView(findWarrior(state, this.selectedWarriorId)!.warrior, warbandIndex)
          : null,
        chargeTargets: chargeTargets.map(w => this.toWarriorView(w, warbandIndex === 0 ? 1 : 0)),
        canMove,
        canRun,
        canCharge
      },
      availableEvents: ['SELECT_WARRIOR', 'DESELECT', 'CONFIRM_MOVE', 'CONFIRM_CHARGE', 'ADVANCE_PHASE'],
      turn: state.turn,
      phase: state.phase,
      currentPlayer: state.currentPlayer,
      gameId: state.id
    };
  }

  private buildShootingScreen(): ScreenCommand {
    const state = this.state!;
    const currentWarband = getCurrentWarband(state);
    const opponentWarband = getOpposingWarband(state);
    const warbandIndex = state.currentPlayer - 1;

    const actableWarriors = currentWarband.warriors.filter(w =>
      canWarriorAct(w, 'shooting')
    );

    return {
      screen: 'SHOOTING_PHASE',
      data: {
        currentPlayer: state.currentPlayer,
        warband: this.toWarbandView(currentWarband),
        opponentWarband: this.toWarbandView(opponentWarband),
        actableWarriors: actableWarriors.map(w => this.toWarriorView(w, warbandIndex)),
        selectedWarrior: this.selectedWarriorId
          ? this.toWarriorView(findWarrior(state, this.selectedWarriorId)!.warrior, warbandIndex)
          : null
      },
      availableEvents: ['SELECT_WARRIOR', 'DESELECT', 'SELECT_TARGET', 'ADVANCE_PHASE'],
      turn: state.turn,
      phase: state.phase,
      currentPlayer: state.currentPlayer,
      gameId: state.id
    };
  }

  private buildCombatScreen(): ScreenCommand {
    const state = this.state!;
    const currentWarband = getCurrentWarband(state);
    const opponentWarband = getOpposingWarband(state);

    // Build strike order if not already built
    if (this.strikeOrder.length === 0) {
      this.strikeOrder = buildStrikeOrderLogic(state);
      this.currentFighterIndex = 0;
    }

    // Skip any fighters who are no longer able to fight (killed during combat)
    while (this.currentFighterIndex < this.strikeOrder.length) {
      const entry = this.strikeOrder[this.currentFighterIndex];
      const result = findWarrior(state, entry.warriorId);
      if (result && result.warrior.gameStatus === 'standing' && result.warrior.combatState.inCombat) {
        break; // This fighter can still act
      }
      this.currentFighterIndex++; // Skip this fighter
    }

    // Check if all fighters have completed their attacks
    const allFightersComplete = this.currentFighterIndex >= this.strikeOrder.length;

    // Get current fighter info
    let currentFighter: WarriorView | null = null;
    let meleeTargets: WarriorView[] = [];

    if (!allFightersComplete && this.strikeOrder.length > 0) {
      const fighterEntry = this.strikeOrder[this.currentFighterIndex];
      const fighterResult = findWarrior(state, fighterEntry.warriorId);

      if (fighterResult) {
        currentFighter = this.toWarriorView(fighterResult.warrior, fighterResult.warbandIndex);

        // Get valid melee targets for the current fighter
        const targets = getMeleeTargetsLogic(state, fighterEntry.warriorId);
        meleeTargets = targets.map(t => {
          const targetResult = findWarrior(state, t.targetId);
          if (targetResult) {
            return this.toWarriorView(targetResult.warrior, targetResult.warbandIndex);
          }
          return null;
        }).filter((t): t is WarriorView => t !== null);
      }
    }

    return {
      screen: 'COMBAT_PHASE',
      data: {
        currentPlayer: state.currentPlayer,
        warband: this.toWarbandView(currentWarband),
        opponentWarband: this.toWarbandView(opponentWarband),
        strikeOrder: this.strikeOrder,
        currentFighterIndex: this.currentFighterIndex,
        currentFighter,
        meleeTargets,
        selectedTarget: this.selectedTargetId
          ? meleeTargets.find(t => t.id === this.selectedTargetId) ?? null
          : null,
        allFightersComplete
      },
      availableEvents: allFightersComplete
        ? ['ADVANCE_PHASE']
        : ['SELECT_TARGET', 'CONFIRM_MELEE', 'ADVANCE_PHASE'],
      turn: state.turn,
      phase: state.phase,
      currentPlayer: state.currentPlayer,
      gameId: state.id
    };
  }

  private buildGameOverScreen(): ScreenCommand {
    const state = this.state!;

    return {
      screen: 'GAME_OVER',
      data: {
        winner: state.winner,
        winnerName: state.winner
          ? state.warbands[state.winner - 1].name
          : null,
        reason: (state.endReason as 'rout' | 'objective' | 'elimination' | 'voluntary' | 'draw') ?? 'draw',
        gameLog: state.log,
        statistics: {
          turns: state.turn,
          warband1OutOfAction: state.warbands[0].outOfActionCount,
          warband2OutOfAction: state.warbands[1].outOfActionCount
        }
      },
      availableEvents: [],
      turn: state.turn,
      phase: state.phase,
      currentPlayer: state.currentPlayer,
      gameId: state.id
    };
  }

  private buildCombatResolutionScreen(): ScreenCommand {
    const state = this.state!;
    const resolution = this.pendingResolution!;

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

    return {
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
  }

  private buildRoutTestScreen(): ScreenCommand {
    const state = this.state!;
    const warbandIndex = this.pendingRoutTest!;
    const warband = state.warbands[warbandIndex];

    // Find the leader for leadership value
    const leader = warband.warriors.find(w => w.category === 'hero' && w.type.toLowerCase().includes('captain'));
    const leadershipNeeded = leader?.profile.Ld ?? 7;

    return {
      screen: 'ROUT_TEST',
      data: {
        warbandName: warband.name,
        warbandIndex,
        leadershipNeeded,
        outOfActionCount: warband.outOfActionCount,
        totalWarriors: warband.warriors.length
      },
      availableEvents: ['CONFIRM_ROUT_TEST'],
      turn: state.turn,
      phase: state.phase,
      currentPlayer: state.currentPlayer,
      gameId: state.id
    };
  }

  private buildErrorScreen(message: string): ScreenCommand {
    return {
      screen: 'ERROR',
      data: { message },
      availableEvents: [],
      turn: 0,
      phase: 'setup',
      currentPlayer: 1,
      gameId: ''
    };
  }

  // =====================================
  // VIEW MODEL BUILDERS
  // =====================================

  private toWarriorView(warrior: GameWarrior, warbandIndex: number): WarriorView {
    return {
      id: warrior.id,
      name: warrior.name,
      type: warrior.type,
      category: warrior.category,
      warbandIndex,
      movement: warrior.profile.M,
      weaponSkill: warrior.profile.WS,
      ballisticSkill: warrior.profile.BS,
      strength: warrior.profile.S,
      toughness: warrior.profile.T,
      wounds: warrior.profile.W,
      woundsRemaining: warrior.woundsRemaining,
      initiative: warrior.profile.I,
      attacks: warrior.profile.A,
      leadership: warrior.profile.Ld,
      meleeWeapons: warrior.equipment.melee,
      rangedWeapons: warrior.equipment.ranged,
      armor: warrior.equipment.armor,
      status: warrior.gameStatus,
      hasActed: warrior.hasActed,
      hasMoved: warrior.hasMoved,
      hasRun: warrior.hasRun,
      hasShot: warrior.hasShot,
      hasCharged: warrior.hasCharged,
      inCombat: warrior.combatState.inCombat,
      inCover: warrior.combatState.inCover,
      engagedWith: warrior.combatState.engagedWith
    };
  }

  private toWarbandView(warband: { name: string; typeName: string; player: 1 | 2; warriors: GameWarrior[]; outOfActionCount: number }): WarbandView {
    return {
      name: warband.name,
      typeName: warband.typeName,
      player: warband.player,
      warriors: warband.warriors.map(w => this.toWarriorView(w, warband.player - 1)),
      outOfActionCount: warband.outOfActionCount,
      totalWarriors: warband.warriors.length,
      activeWarriors: warband.warriors.filter(w => w.gameStatus !== 'outOfAction').length
    };
  }

  // =====================================
  // ACCESSORS
  // =====================================

  getState(): GameState | null {
    return this.state;
  }

  getHistory(): GameEvent[] {
    return [...this.history];
  }

  getSelectedWarriorId(): string | null {
    return this.selectedWarriorId;
  }

  getSelectedTargetId(): string | null {
    return this.selectedTargetId;
  }

  getShootingModifiers(): ShootingModifiers {
    return { ...this.shootingModifiers };
  }

  // =====================================
  // SERIALIZATION
  // =====================================

  serialize(): SerializedGame {
    return {
      state: this.state!,
      history: [...this.history],
      selectedWarriorId: this.selectedWarriorId,
      selectedTargetId: this.selectedTargetId,
      shootingModifiers: { ...this.shootingModifiers }
    };
  }

  // =====================================
  // HELPERS
  // =====================================

  private resetShootingModifiers(): void {
    this.shootingModifiers = {
      cover: false,
      longRange: false,
      moved: false,
      largeTarget: false
    };
  }

  private successResult(stateChanged: boolean): ProcessResult {
    return {
      success: true,
      stateChanged,
      screenCommand: this.getCurrentScreen()
    };
  }

  private errorResult(error: string): ProcessResult {
    return {
      success: false,
      error,
      stateChanged: false,
      screenCommand: this.getCurrentScreen()
    };
  }
}
