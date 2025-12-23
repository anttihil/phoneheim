// Multiplayer Store - SolidJS state management for WebRTC connections

import { createStore, produce } from 'solid-js/store';
import * as webrtc from '../services/webrtc';
import type { GameState } from '../types';

// Connection status
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type PlayerRole = 'host' | 'guest' | null;

// Store state interface
interface MultiplayerStoreState {
  status: ConnectionStatus;
  role: PlayerRole;
  offer: string | null;
  answer: string | null;
  error: string | null;
  lastMessage: webrtc.WebRTCMessage | null;
}

// Create the store
const [state, setState] = createStore<MultiplayerStoreState>({
  status: 'disconnected',
  role: null,
  offer: null,
  answer: null,
  error: null,
  lastMessage: null
});

// Setup message handler
webrtc.onMessage((message) => {
  setState('lastMessage', message);
});

// Setup connection handlers
webrtc.onConnected(() => {
  setState('status', 'connected');
  setState('error', null);
});

webrtc.onDisconnected(() => {
  setState('status', 'disconnected');
});

// Actions
async function hostGame(): Promise<string> {
  setState('status', 'connecting');
  setState('role', 'host');
  setState('error', null);

  try {
    const offer = await webrtc.initAsHost();
    const offerData = webrtc.getOfferAsQRData(offer);
    setState('offer', offerData);
    return offerData;
  } catch (e) {
    setState('status', 'error');
    setState('error', (e as Error).message);
    throw e;
  }
}

async function joinGame(offerData: string): Promise<string> {
  setState('status', 'connecting');
  setState('role', 'guest');
  setState('error', null);

  try {
    const offer = webrtc.parseQRData(offerData);
    if (!offer) {
      throw new Error('Invalid connection code');
    }

    const answer = await webrtc.initAsGuest(offer);
    const answerData = webrtc.getOfferAsQRData(answer);
    setState('answer', answerData);
    return answerData;
  } catch (e) {
    setState('status', 'error');
    setState('error', (e as Error).message);
    throw e;
  }
}

async function completeHostConnection(answerData: string): Promise<void> {
  try {
    const answer = webrtc.parseQRData(answerData);
    if (!answer) {
      throw new Error('Invalid answer code');
    }

    await webrtc.completeConnection(answer);
  } catch (e) {
    setState('status', 'error');
    setState('error', (e as Error).message);
    throw e;
  }
}

function sendGameState(gameState: GameState): boolean {
  return webrtc.sendGameState(gameState);
}

function sendAction(action: { action: string; payload?: unknown }): boolean {
  return webrtc.sendAction(action);
}

function disconnect(): void {
  webrtc.cleanup();
  setState({
    status: 'disconnected',
    role: null,
    offer: null,
    answer: null,
    error: null,
    lastMessage: null
  });
}

function clearError(): void {
  setState('error', null);
}

function isConnected(): boolean {
  return webrtc.isConnected();
}

// Export store and actions
export const multiplayerStore = {
  // State (readonly access)
  get state() { return state; },

  // Actions
  hostGame,
  joinGame,
  completeHostConnection,
  sendGameState,
  sendAction,
  disconnect,
  clearError,
  isConnected
};

// For direct state access in components
export { state as multiplayerState };
