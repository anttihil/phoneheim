// Game Store - SolidJS state management for active game

import { createStore, produce } from 'solid-js/store';
import type { GameState, GamePhase, GameWarband, GameWarrior, Warband, GameAction, WarriorCombatState } from '../types';
import {
  createGameState,
  advancePhase as advanceGamePhase,
  setWarriorStatus as setGameWarriorStatus,
  applyWound as applyGameWound,
  endGame as endActiveGame,
  addLog as addGameLog,
  getCurrentWarband,
  getOpposingWarband,
  isRoutTestRequired,
  // Recovery phase functions
  getWarriorsNeedingRecovery,
  isRecoveryPhaseComplete,
  rallyWarrior as rallyWarriorLogic,
  recoverFromStunned as recoverFromStunnedLogic,
  standUpWarrior as standUpWarriorLogic,
  // Combat state functions
  setWarriorCombatState as setWarriorCombatStateLogic,
  engageWarriors as engageWarriorsLogic,
  disengageWarrior as disengageWarriorLogic,
  setWarriorCover as setWarriorCoverLogic,
  // Action tracking functions
  canWarriorAct,
  getAvailableActions,
  markWarriorActed as markWarriorActedLogic,
  getWarriorsForPhase,
  findWarrior,
  // Undo functions
  getLastUndoableAction,
  undoLastAction as undoLastActionLogic,
  type RallyResult,
  type AvailableAction
} from '../logic/gameState';

// Store state interface
interface GameStoreState {
  activeGame: GameState | null;
  isPlaying: boolean;
  selectedWarrior: string | null;
  selectedTarget: string | null;
  pendingUndo: boolean; // When true, waiting for user confirmation
}

// Create the store
const [state, setState] = createStore<GameStoreState>({
  activeGame: null,
  isPlaying: false,
  selectedWarrior: null,
  selectedTarget: null,
  pendingUndo: false
});

// Actions
function startGame(warband1: Warband, warband2: Warband, scenarioKey: string): GameState {
  const gameState = createGameState(warband1, warband2, scenarioKey);
  setState({
    activeGame: gameState,
    isPlaying: true,
    selectedWarrior: null
  });
  return gameState;
}

function advancePhase(): void {
  setState(produce((s) => {
    if (s.activeGame) {
      advanceGamePhase(s.activeGame);
    }
  }));
}

function setWarriorStatus(warbandIndex: number, warriorId: string, status: GameWarrior['gameStatus']): void {
  setState(produce((s) => {
    if (s.activeGame) {
      setGameWarriorStatus(s.activeGame, warbandIndex, warriorId, status);
    }
  }));
}

function applyWound(warbandIndex: number, warriorId: string, wounds: number = 1): boolean {
  let needsInjuryRoll = false;
  setState(produce((s) => {
    if (s.activeGame) {
      needsInjuryRoll = applyGameWound(s.activeGame, warbandIndex, warriorId, wounds);
    }
  }));
  return needsInjuryRoll;
}

function endGame(winner: 1 | 2 | null, reason: string): void {
  setState(produce((s) => {
    if (s.activeGame) {
      endActiveGame(s.activeGame, winner, reason);
    }
    s.isPlaying = false;
  }));
}

function addLog(message: string): void {
  setState(produce((s) => {
    if (s.activeGame) {
      addGameLog(s.activeGame, message);
    }
  }));
}

function selectWarrior(warriorId: string | null): void {
  setState('selectedWarrior', warriorId);
}

function setWarriorActed(warbandIndex: number, warriorId: string): void {
  setState(produce((s) => {
    if (s.activeGame) {
      const warband = s.activeGame.warbands[warbandIndex];
      const warrior = warband.warriors.find(w => w.id === warriorId);
      if (warrior) {
        warrior.hasActed = true;
      }
    }
  }));
}

function setWarriorMoved(warbandIndex: number, warriorId: string): void {
  setState(produce((s) => {
    if (s.activeGame) {
      const warband = s.activeGame.warbands[warbandIndex];
      const warrior = warband.warriors.find(w => w.id === warriorId);
      if (warrior) {
        warrior.hasMoved = true;
      }
    }
  }));
}

function setWarriorShot(warbandIndex: number, warriorId: string): void {
  setState(produce((s) => {
    if (s.activeGame) {
      const warband = s.activeGame.warbands[warbandIndex];
      const warrior = warband.warriors.find(w => w.id === warriorId);
      if (warrior) {
        warrior.hasShot = true;
      }
    }
  }));
}

function setWarriorCharged(warbandIndex: number, warriorId: string): void {
  setState(produce((s) => {
    if (s.activeGame) {
      const warband = s.activeGame.warbands[warbandIndex];
      const warrior = warband.warriors.find(w => w.id === warriorId);
      if (warrior) {
        warrior.hasCharged = true;
      }
    }
  }));
}

function clearGame(): void {
  setState({
    activeGame: null,
    isPlaying: false,
    selectedWarrior: null,
    selectedTarget: null,
    pendingUndo: false
  });
}

// =====================================
// RECOVERY PHASE ACTIONS
// =====================================

function getRecoveryWarriors(): { fleeing: GameWarrior[]; stunned: GameWarrior[]; knockedDown: GameWarrior[] } {
  if (!state.activeGame) return { fleeing: [], stunned: [], knockedDown: [] };
  const warband = getCurrentWarband(state.activeGame);
  return getWarriorsNeedingRecovery(warband);
}

function checkRecoveryComplete(): boolean {
  if (!state.activeGame) return true;
  const warband = getCurrentWarband(state.activeGame);
  return isRecoveryPhaseComplete(warband);
}

function rallyWarrior(warriorId: string): RallyResult | null {
  let result: RallyResult | null = null;
  setState(produce((s) => {
    if (s.activeGame) {
      const warbandIndex = s.activeGame.currentPlayer - 1;
      result = rallyWarriorLogic(s.activeGame, warbandIndex, warriorId);
    }
  }));
  return result;
}

function recoverFromStunned(warriorId: string): GameAction | null {
  let action: GameAction | null = null;
  setState(produce((s) => {
    if (s.activeGame) {
      const warbandIndex = s.activeGame.currentPlayer - 1;
      action = recoverFromStunnedLogic(s.activeGame, warbandIndex, warriorId);
    }
  }));
  return action;
}

function standUpWarrior(warriorId: string): GameAction | null {
  let action: GameAction | null = null;
  setState(produce((s) => {
    if (s.activeGame) {
      const warbandIndex = s.activeGame.currentPlayer - 1;
      action = standUpWarriorLogic(s.activeGame, warbandIndex, warriorId);
    }
  }));
  return action;
}

// =====================================
// COMBAT STATE ACTIONS
// =====================================

function setWarriorCombatState(warbandIndex: number, warriorId: string, combatState: Partial<WarriorCombatState>): void {
  setState(produce((s) => {
    if (s.activeGame) {
      setWarriorCombatStateLogic(s.activeGame, warbandIndex, warriorId, combatState);
    }
  }));
}

function engageWarriors(attackerWarbandIndex: number, attackerId: string, defenderWarbandIndex: number, defenderId: string): void {
  setState(produce((s) => {
    if (s.activeGame) {
      engageWarriorsLogic(s.activeGame, attackerWarbandIndex, attackerId, defenderWarbandIndex, defenderId);
    }
  }));
}

function disengageWarrior(warbandIndex: number, warriorId: string): void {
  setState(produce((s) => {
    if (s.activeGame) {
      disengageWarriorLogic(s.activeGame, warbandIndex, warriorId);
    }
  }));
}

function setWarriorCover(warbandIndex: number, warriorId: string, inCover: boolean): void {
  setState(produce((s) => {
    if (s.activeGame) {
      setWarriorCoverLogic(s.activeGame, warbandIndex, warriorId, inCover);
    }
  }));
}

// =====================================
// WARRIOR SELECTION ACTIONS
// =====================================

function selectTarget(targetId: string | null): void {
  setState('selectedTarget', targetId);
}

function getActableWarriorsForPhase(): GameWarrior[] {
  if (!state.activeGame) return [];
  return getWarriorsForPhase(state.activeGame);
}

function checkWarriorCanAct(warrior: GameWarrior): boolean {
  if (!state.activeGame) return false;
  return canWarriorAct(warrior, state.activeGame.phase);
}

function getWarriorActions(warrior: GameWarrior): AvailableAction[] {
  if (!state.activeGame) return [];
  return getAvailableActions(warrior, state.activeGame.phase, state.activeGame);
}

function getWarriorById(warriorId: string): { warrior: GameWarrior; warbandIndex: number } | null {
  if (!state.activeGame) return null;
  return findWarrior(state.activeGame, warriorId);
}

function markWarriorActed(warbandIndex: number, warriorId: string, actionType: 'moved' | 'shot' | 'charged' | 'acted'): void {
  setState(produce((s) => {
    if (s.activeGame) {
      markWarriorActedLogic(s.activeGame, warbandIndex, warriorId, actionType);
    }
  }));
}

// =====================================
// UNDO ACTIONS
// =====================================

function requestUndo(): void {
  setState('pendingUndo', true);
}

function cancelUndo(): void {
  setState('pendingUndo', false);
}

function confirmUndo(): GameAction | null {
  let undoneAction: GameAction | null = null;
  setState(produce((s) => {
    if (s.activeGame) {
      undoneAction = undoLastActionLogic(s.activeGame);
    }
    s.pendingUndo = false;
  }));
  return undoneAction;
}

function getLastAction(): GameAction | null {
  if (!state.activeGame) return null;
  return getLastUndoableAction(state.activeGame);
}

function canUndo(): boolean {
  if (!state.activeGame) return false;
  return state.activeGame.actionHistory.length > 0;
}

// Derived getters
function getCurrentPlayerWarband(): GameWarband | null {
  if (!state.activeGame) return null;
  return getCurrentWarband(state.activeGame);
}

function getOpponentWarband(): GameWarband | null {
  if (!state.activeGame) return null;
  return getOpposingWarband(state.activeGame);
}

function checkRoutRequired(warbandIndex: number): boolean {
  if (!state.activeGame) return false;
  return isRoutTestRequired(state.activeGame.warbands[warbandIndex]);
}

// Export store and actions
export const gameStore = {
  // State (readonly access)
  get state() { return state; },

  // Basic Actions
  startGame,
  advancePhase,
  setWarriorStatus,
  applyWound,
  endGame,
  addLog,
  clearGame,

  // Warrior Selection
  selectWarrior,
  selectTarget,
  getWarriorById,

  // Legacy action tracking (still used by some components)
  setWarriorActed,
  setWarriorMoved,
  setWarriorShot,
  setWarriorCharged,

  // Recovery Phase
  getRecoveryWarriors,
  checkRecoveryComplete,
  rallyWarrior,
  recoverFromStunned,
  standUpWarrior,

  // Combat State
  setWarriorCombatState,
  engageWarriors,
  disengageWarrior,
  setWarriorCover,

  // Warrior Action Tracking
  getActableWarriorsForPhase,
  checkWarriorCanAct,
  getWarriorActions,
  markWarriorActed,

  // Undo
  requestUndo,
  cancelUndo,
  confirmUndo,
  getLastAction,
  canUndo,

  // Derived getters
  getCurrentPlayerWarband,
  getOpponentWarband,
  checkRoutRequired
};

// For direct state access in components
export { state as gameState };
