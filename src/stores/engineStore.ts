// Engine Store - SolidJS state management backed by GameEngine
//
// This store wraps the GameEngine and InputMediator to provide
// reactive state updates for SolidJS components.
//
// Migration strategy: Components can gradually switch from gameStore
// to engineStore. Both can coexist during migration.

import { createStore, reconcile } from 'solid-js/store';
import { createSignal, batch } from 'solid-js';
import { InputMediator, createMediator, type PlayerIdentity } from '../mediator';
import type { ScreenCommand } from '../engine/types/screens';
import type { GameEvent } from '../engine/types/events';
import type { GameState, ShootingModifiers } from '../types/game';
import type { Warband } from '../types/warband';

// Store state interface - derived from screen commands
interface EngineStoreState {
  // Current screen command from engine
  screen: ScreenCommand | null;
  // Game metadata
  isPlaying: boolean;
  // Error state
  lastError: string | null;
  // Local player info
  localPlayer: PlayerIdentity | null;
}

// Create the reactive store
const [state, setState] = createStore<EngineStoreState>({
  screen: null,
  isPlaying: false,
  lastError: null,
  localPlayer: null
});

// Signal for forcing reactivity updates
const [updateTrigger, setUpdateTrigger] = createSignal(0);

// The mediator instance (created on first game start)
let mediator: InputMediator | null = null;

// Get or create mediator
function getMediator(): InputMediator {
  if (!mediator) {
    mediator = createMediator();

    // Subscribe to screen updates
    mediator.onScreenCommand((screen) => {
      batch(() => {
        setState('screen', reconcile(screen));
        setState('lastError', null);
        setUpdateTrigger(t => t + 1);
      });
    });

    // Subscribe to errors
    mediator.onError((error) => {
      setState('lastError', error);
    });
  }
  return mediator;
}

// =====================================
// GAME LIFECYCLE
// =====================================

function startGame(
  warband1: Warband,
  warband2: Warband,
  scenarioKey: string,
  localPlayerNumber: 1 | 2 = 1
): ScreenCommand {
  const m = getMediator();

  const localPlayer: PlayerIdentity = {
    playerId: `player${localPlayerNumber}`,
    playerNumber: localPlayerNumber
  };

  const screen = m.createGame(warband1, warband2, scenarioKey, localPlayer);

  batch(() => {
    setState('screen', reconcile(screen));
    setState('isPlaying', true);
    setState('localPlayer', localPlayer);
    setState('lastError', null);
  });

  return screen;
}

function loadGame(
  savedState: GameState,
  history: GameEvent[],
  localPlayerNumber: 1 | 2 = 1
): ScreenCommand {
  const m = getMediator();

  const localPlayer: PlayerIdentity = {
    playerId: `player${localPlayerNumber}`,
    playerNumber: localPlayerNumber
  };

  const screen = m.loadGame(savedState, history, localPlayer);

  batch(() => {
    setState('screen', reconcile(screen));
    setState('isPlaying', true);
    setState('localPlayer', localPlayer);
    setState('lastError', null);
  });

  return screen;
}

function clearGame(): void {
  mediator = null;
  batch(() => {
    setState('screen', null);
    setState('isPlaying', false);
    setState('localPlayer', null);
    setState('lastError', null);
  });
}

// =====================================
// EVENT SUBMISSION - Main action API
// =====================================

function selectWarrior(warriorId: string): boolean {
  const m = getMediator();
  const result = m.submitEvent({
    type: 'SELECT_WARRIOR',
    payload: { warriorId }
  });
  return result.success;
}

function deselect(): boolean {
  const m = getMediator();
  const result = m.submitEvent({
    type: 'DESELECT',
    payload: {}
  });
  return result.success;
}

function selectTarget(targetId: string): boolean {
  const m = getMediator();
  const result = m.submitEvent({
    type: 'SELECT_TARGET',
    payload: { targetId }
  });
  return result.success;
}

function confirmMove(moveType: 'move' | 'run'): boolean {
  const m = getMediator();
  const result = m.submitEvent({
    type: 'CONFIRM_MOVE',
    payload: { moveType }
  });
  return result.success;
}

function confirmCharge(targetId: string): boolean {
  const m = getMediator();
  const result = m.submitEvent({
    type: 'CONFIRM_CHARGE',
    payload: { targetId }
  });
  return result.success;
}

function confirmPosition(): boolean {
  const m = getMediator();
  const result = m.submitEvent({
    type: 'CONFIRM_POSITION',
    payload: {}
  });
  return result.success;
}

function advancePhase(): boolean {
  const m = getMediator();
  const result = m.submitEvent({
    type: 'ADVANCE_PHASE',
    payload: {}
  });
  return result.success;
}

function recoveryAction(action: 'rally' | 'recoverFromStunned' | 'standUp', warriorId: string): boolean {
  const m = getMediator();
  const result = m.submitEvent({
    type: 'RECOVERY_ACTION',
    payload: { action, warriorId }
  });
  return result.success;
}

function setShootingModifier(modifier: keyof ShootingModifiers, value: boolean): boolean {
  const m = getMediator();
  const result = m.submitEvent({
    type: 'SET_MODIFIER',
    payload: { category: 'shooting', modifier, value }
  });
  return result.success;
}

function confirmShot(targetId: string): boolean {
  const m = getMediator();
  const result = m.submitEvent({
    type: 'CONFIRM_SHOT',
    payload: { targetId }
  });
  return result.success;
}

function confirmMelee(targetId: string, weaponKey: string = 'sword'): boolean {
  const m = getMediator();
  const result = m.submitEvent({
    type: 'CONFIRM_MELEE',
    payload: { targetId, weaponKey }
  });
  return result.success;
}

function acknowledge(): boolean {
  const m = getMediator();
  const result = m.submitEvent({
    type: 'ACKNOWLEDGE',
    payload: {}
  });
  return result.success;
}

// =====================================
// UNDO OPERATIONS
// =====================================

function undoLast(): boolean {
  const m = getMediator();
  const result = m.undoLastEvents(1);
  return result.success;
}

function undoToEvent(eventId: string): boolean {
  const m = getMediator();
  const result = m.undoToEvent(eventId);
  return result.success;
}

function resetGame(): boolean {
  const m = getMediator();
  const result = m.resetGame();
  return result.success;
}

// =====================================
// ACCESSORS
// =====================================

function getScreen(): ScreenCommand | null {
  return state.screen;
}

function getGameState(): GameState | null {
  if (!mediator) return null;
  return mediator.getState();
}

function getHistory(): GameEvent[] {
  if (!mediator) return [];
  return mediator.getHistory();
}

function isLocalPlayerTurn(): boolean {
  if (!mediator) return false;
  return mediator.isLocalPlayerTurn();
}

function getAvailableEvents(): string[] {
  if (!state.screen) return [];
  return state.screen.availableEvents;
}

function canUndo(): boolean {
  if (!mediator) return false;
  return mediator.getHistory().length > 0;
}

function getLastError(): string | null {
  return state.lastError;
}

function clearError(): void {
  setState('lastError', null);
}

// =====================================
// SERIALIZATION
// =====================================

function serialize(): { state: GameState; history: GameEvent[] } | null {
  if (!mediator) return null;
  return mediator.serialize();
}

// =====================================
// HELPER ACCESSORS (derived from screen)
// =====================================

function getCurrentPhase(): string | null {
  return state.screen?.phase ?? null;
}

function getCurrentPlayer(): 1 | 2 | null {
  return state.screen?.currentPlayer ?? null;
}

function getTurn(): number | null {
  return state.screen?.turn ?? null;
}

function getScreenType(): string | null {
  return state.screen?.screen ?? null;
}

// =====================================
// EXPORT
// =====================================

export const engineStore = {
  // State (readonly reactive access)
  get state() { return state; },
  get updateTrigger() { return updateTrigger; },

  // Game Lifecycle
  startGame,
  loadGame,
  clearGame,

  // Event Submission (main action API)
  selectWarrior,
  deselect,
  selectTarget,
  confirmMove,
  confirmCharge,
  confirmPosition,
  advancePhase,
  recoveryAction,
  setShootingModifier,
  confirmShot,
  confirmMelee,
  acknowledge,

  // Undo
  undoLast,
  undoToEvent,
  resetGame,

  // Accessors
  getScreen,
  getGameState,
  getHistory,
  isLocalPlayerTurn,
  getAvailableEvents,
  canUndo,
  getLastError,
  clearError,
  serialize,

  // Helper accessors
  getCurrentPhase,
  getCurrentPlayer,
  getTurn,
  getScreenType
};

// Direct state access for components
export { state as engineState };
