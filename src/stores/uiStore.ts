// UI Store - Simplified SolidJS state management for UI
//
// This store provides a clean, minimal interface for UI components,
// consuming screen commands from the engine and providing:
// - Current screen state
// - Connection status
// - Local player info
// - Simple derived values
//
// This is the target store for the event-driven architecture.
// Components should render based on screen commands, not raw game state.

import { createStore, reconcile } from 'solid-js/store';
import { createSignal, createMemo, batch } from 'solid-js';
import { InputMediator, createMediator, type PlayerIdentity } from '../mediator';
import { NetworkAdapter, getNetworkAdapter, type ConnectionStatus } from '../mediator/NetworkAdapter';
import type { ScreenCommand, ScreenType } from '../phases/types/screens';
import type { GameEvent, EventType } from '../phases/types/events';
import type { GameState } from '../types/game';
import type { Warband } from '../types/warband';

// UI Store state - minimal and focused on what UI needs
export interface UIStoreState {
  // Current screen from engine
  screen: ScreenCommand | null;
  // Screen type for easy matching
  screenType: ScreenType | null;
  // Available events for current screen
  availableEvents: EventType[];
  // Connection status for multiplayer
  connectionStatus: ConnectionStatus;
  // Local player info
  localPlayer: PlayerIdentity | null;
  // Whether game is active
  isPlaying: boolean;
  // Last error (for error display)
  lastError: string | null;
  // Whether it's local player's turn
  isMyTurn: boolean;
  // Whether in hotseat mode (local player controls both sides)
  isHotseatMode: boolean;
}

// Create the reactive store
const [state, setState] = createStore<UIStoreState>({
  screen: null,
  screenType: null,
  availableEvents: [],
  connectionStatus: 'disconnected',
  localPlayer: null,
  isPlaying: false,
  lastError: null,
  isMyTurn: false,
  isHotseatMode: false
});

// Signal for screen updates (for fine-grained reactivity)
const [screenVersion, setScreenVersion] = createSignal(0);

// Internal instances
let mediator: InputMediator | null = null;
let networkAdapter: NetworkAdapter | null = null;

// =====================================
// INITIALIZATION
// =====================================

function initializeMediator(): InputMediator {
  if (!mediator) {
    mediator = createMediator();

    // Subscribe to screen updates
    mediator.onScreenCommand((screen) => {
      updateScreen(screen);
    });

    // Subscribe to errors
    mediator.onError((error) => {
      setState('lastError', error);
    });
  }
  return mediator;
}

function updateScreen(screen: ScreenCommand): void {
  batch(() => {
    setState('screen', reconcile(screen));
    setState('screenType', screen.screen);
    setState('availableEvents', [...screen.availableEvents]);
    setState('lastError', null);

    // Update isMyTurn based on current player (always true in hotseat mode)
    if (state.isHotseatMode) {
      setState('isMyTurn', true);
    } else if (mediator && state.localPlayer) {
      setState('isMyTurn', screen.currentPlayer === state.localPlayer.playerNumber);
    }

    setScreenVersion(v => v + 1);
  });
}

// =====================================
// GAME LIFECYCLE
// =====================================

function startGame(
  warband1: Warband,
  warband2: Warband,
  scenarioKey: string,
  mode: 'hotseat' | 'multiplayer' = 'hotseat',
  localPlayerNumber: 1 | 2 = 1
): ScreenCommand {
  const m = initializeMediator();

  const localPlayer: PlayerIdentity = {
    playerId: `player${localPlayerNumber}`,
    playerNumber: localPlayerNumber
  };

  // In hotseat mode, disable turn validation so both players can be controlled
  const isHotseat = mode === 'hotseat';
  if (isHotseat) {
    m.setTurnValidation(false);
  }

  const screen = m.createGame(warband1, warband2, scenarioKey, localPlayer);

  batch(() => {
    setState('screen', reconcile(screen));
    setState('screenType', screen.screen);
    setState('availableEvents', [...screen.availableEvents]);
    setState('isPlaying', true);
    setState('localPlayer', localPlayer);
    setState('isHotseatMode', isHotseat);
    // In hotseat mode, it's always "your turn" since you control both players
    setState('isMyTurn', isHotseat || screen.currentPlayer === localPlayerNumber);
    setState('lastError', null);
  });

  return screen;
}

function loadGame(
  savedState: GameState,
  history: GameEvent[],
  localPlayerNumber: 1 | 2 = 1
): ScreenCommand {
  const m = initializeMediator();

  const localPlayer: PlayerIdentity = {
    playerId: `player${localPlayerNumber}`,
    playerNumber: localPlayerNumber
  };

  const screen = m.loadGame(savedState, history, localPlayer);

  batch(() => {
    setState('screen', reconcile(screen));
    setState('screenType', screen.screen);
    setState('availableEvents', [...screen.availableEvents]);
    setState('isPlaying', true);
    setState('localPlayer', localPlayer);
    setState('isMyTurn', screen.currentPlayer === localPlayerNumber);
    setState('lastError', null);
  });

  return screen;
}

function endGame(): void {
  if (mediator) {
    mediator.disconnect();
  }
  mediator = null;

  batch(() => {
    setState('screen', null);
    setState('screenType', null);
    setState('availableEvents', []);
    setState('isPlaying', false);
    setState('localPlayer', null);
    setState('isMyTurn', false);
    setState('isHotseatMode', false);
    setState('lastError', null);
    setState('connectionStatus', 'disconnected');
  });
}

// =====================================
// EVENT SUBMISSION
// =====================================

function submitEvent(type: EventType, payload: unknown): boolean {
  if (!mediator) return false;

  const result = mediator.submitEvent({ type, payload } as any);
  return result.success;
}

// Convenience methods for common events
function selectWarrior(warriorId: string): boolean {
  return submitEvent('SELECT_WARRIOR', { warriorId });
}

function deselect(): boolean {
  return submitEvent('DESELECT', {});
}

function selectTarget(targetId: string): boolean {
  return submitEvent('SELECT_TARGET', { targetId });
}

function confirmMove(moveType: 'move' | 'run'): boolean {
  return submitEvent('CONFIRM_MOVE', { moveType });
}

function confirmCharge(targetId: string): boolean {
  return submitEvent('CONFIRM_CHARGE', { targetId });
}

function confirmPosition(): boolean {
  return submitEvent('CONFIRM_POSITION', {});
}

function advancePhase(): boolean {
  return submitEvent('ADVANCE_PHASE', {});
}

function recoveryAction(action: 'rally' | 'recoverFromStunned' | 'standUp', warriorId: string): boolean {
  return submitEvent('RECOVERY_ACTION', { action, warriorId });
}

function setModifier(category: 'shooting' | 'combat', modifier: string, value: boolean): boolean {
  return submitEvent('SET_MODIFIER', { category, modifier, value });
}

function confirmShot(targetId: string): boolean {
  return submitEvent('CONFIRM_SHOT', { targetId });
}

function confirmMelee(targetId: string, weaponKey: string = 'sword'): boolean {
  return submitEvent('CONFIRM_MELEE', { targetId, weaponKey });
}

function acknowledge(): boolean {
  return submitEvent('ACKNOWLEDGE', {});
}

function confirmRoutTest(): boolean {
  return submitEvent('CONFIRM_ROUT_TEST', {});
}

// =====================================
// UNDO OPERATIONS
// =====================================

function undoLast(): boolean {
  if (!mediator) return false;
  const result = mediator.undoLastEvents(1);
  return result.success;
}

function undoToEvent(eventId: string): boolean {
  if (!mediator) return false;
  const result = mediator.undoToEvent(eventId);
  return result.success;
}

function resetGame(): boolean {
  if (!mediator) return false;
  const result = mediator.resetGame();
  return result.success;
}

// =====================================
// MULTIPLAYER
// =====================================

async function hostGame(): Promise<string> {
  networkAdapter = getNetworkAdapter();

  networkAdapter.onStatusChange((status) => {
    setState('connectionStatus', status);
  });

  if (mediator) {
    mediator.connect(networkAdapter);
  }

  return networkAdapter.initAsHost();
}

async function joinGame(offerData: string): Promise<string> {
  networkAdapter = getNetworkAdapter();

  networkAdapter.onStatusChange((status) => {
    setState('connectionStatus', status);
  });

  if (mediator) {
    mediator.connect(networkAdapter);
  }

  return networkAdapter.initAsGuest(offerData);
}

async function completeConnection(answerData: string): Promise<void> {
  if (!networkAdapter) return;
  await networkAdapter.completeConnection(answerData);
}

function disconnectMultiplayer(): void {
  if (mediator) {
    mediator.disconnect();
  }
  setState('connectionStatus', 'disconnected');
}

// =====================================
// AI
// =====================================

function enableAI(playerNumber: 1 | 2 = 2): void {
  if (mediator) {
    mediator.enableAI(undefined, playerNumber);
  }
}

function disableAI(): void {
  if (mediator) {
    mediator.disableAI();
  }
}

// =====================================
// ACCESSORS
// =====================================

function getScreen(): ScreenCommand | null {
  return state.screen;
}

function getScreenType(): ScreenType | null {
  return state.screenType;
}

function isEventAvailable(eventType: EventType): boolean {
  return state.availableEvents.includes(eventType);
}

function getGameState(): GameState | null {
  if (!mediator) return null;
  return mediator.getState();
}

function getHistory(): GameEvent[] {
  if (!mediator) return [];
  return mediator.getHistory();
}

function canUndo(): boolean {
  if (!mediator) return false;
  return mediator.getHistory().length > 0;
}

function clearError(): void {
  setState('lastError', null);
}

function serialize(): { state: GameState; history: GameEvent[] } | null {
  if (!mediator) return null;
  return mediator.serialize();
}

// =====================================
// EXPORT
// =====================================

export const uiStore = {
  // State (readonly reactive access)
  get state() { return state; },
  get screenVersion() { return screenVersion; },

  // Game Lifecycle
  startGame,
  loadGame,
  endGame,

  // Event Submission
  submitEvent,
  selectWarrior,
  deselect,
  selectTarget,
  confirmMove,
  confirmCharge,
  confirmPosition,
  advancePhase,
  recoveryAction,
  setModifier,
  confirmShot,
  confirmMelee,
  acknowledge,
  confirmRoutTest,

  // Undo
  undoLast,
  undoToEvent,
  resetGame,

  // Multiplayer
  hostGame,
  joinGame,
  completeConnection,
  disconnectMultiplayer,

  // AI
  enableAI,
  disableAI,

  // Accessors
  getScreen,
  getScreenType,
  isEventAvailable,
  getGameState,
  getHistory,
  canUndo,
  clearError,
  serialize
};

// Direct state access for components
export { state as uiState };
