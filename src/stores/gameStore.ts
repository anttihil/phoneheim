// Game Store - SolidJS state management for active game

import { createStore, produce } from 'solid-js/store';
import type { GameState, GamePhase, GameWarband, GameWarrior, Warband } from '../types';
import {
  createGameState,
  advancePhase as advanceGamePhase,
  setWarriorStatus as setGameWarriorStatus,
  applyWound as applyGameWound,
  endGame as endActiveGame,
  addLog as addGameLog,
  getCurrentWarband,
  getOpposingWarband,
  isRoutTestRequired
} from '../logic/gameState';

// Store state interface
interface GameStoreState {
  activeGame: GameState | null;
  isPlaying: boolean;
  selectedWarrior: string | null;
}

// Create the store
const [state, setState] = createStore<GameStoreState>({
  activeGame: null,
  isPlaying: false,
  selectedWarrior: null
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
    selectedWarrior: null
  });
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

  // Actions
  startGame,
  advancePhase,
  setWarriorStatus,
  applyWound,
  endGame,
  addLog,
  selectWarrior,
  setWarriorActed,
  setWarriorMoved,
  setWarriorShot,
  setWarriorCharged,
  clearGame,

  // Derived getters
  getCurrentPlayerWarband,
  getOpponentWarband,
  checkRoutRequired
};

// For direct state access in components
export { state as gameState };
