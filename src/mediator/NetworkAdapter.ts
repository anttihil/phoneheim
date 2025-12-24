// NetworkAdapter - WebRTC integration for multiplayer games
//
// Wraps the existing webrtc.ts module to provide:
// - Game state broadcasting
// - Event synchronization
// - Connection lifecycle management
// - Spectator event streaming

import * as webrtc from '../services/webrtc';
import type { GameEvent } from '../engine/types/events';
import type { GameState } from '../types/game';

// Message types for game synchronization
export interface StateMessage {
  type: 'state';
  state: GameState;
  history: GameEvent[];
  timestamp: number;
}

export interface EventMessage {
  type: 'event';
  event: GameEvent;
  timestamp: number;
}

export interface RequestStateMessage {
  type: 'request_state';
  timestamp: number;
}

export type GameNetworkMessage = StateMessage | EventMessage | RequestStateMessage;

// Connection status
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Callback types
export type StateCallback = (state: GameState, history: GameEvent[]) => void;
export type EventCallback = (event: GameEvent) => void;
export type ConnectionStatusCallback = (status: ConnectionStatus) => void;
export type ErrorCallback = (error: string) => void;

/**
 * NetworkAdapter provides game-level multiplayer functionality
 * built on top of the raw WebRTC module.
 */
export class NetworkAdapter {
  private stateCallbacks: Set<StateCallback> = new Set();
  private eventCallbacks: Set<EventCallback> = new Set();
  private statusCallbacks: Set<ConnectionStatusCallback> = new Set();
  private errorCallbacks: Set<ErrorCallback> = new Set();
  private currentStatus: ConnectionStatus = 'disconnected';
  private isHost: boolean = false;
  private requestStateCallback: (() => { state: GameState; history: GameEvent[] } | null) | null = null;

  constructor() {
    this.setupWebRTCHandlers();
  }

  // =====================================
  // CONNECTION LIFECYCLE
  // =====================================

  /**
   * Initialize as game host.
   * Creates a WebRTC offer to share with the guest.
   */
  async initAsHost(): Promise<string> {
    this.isHost = true;
    this.setStatus('connecting');

    try {
      const offer = await webrtc.initAsHost();
      return webrtc.getOfferAsQRData(offer);
    } catch (error) {
      this.setStatus('error');
      this.notifyError(`Failed to create host offer: ${error}`);
      throw error;
    }
  }

  /**
   * Initialize as game guest.
   * Accepts the host's offer and creates an answer.
   */
  async initAsGuest(offerData: string): Promise<string> {
    this.isHost = false;
    this.setStatus('connecting');

    try {
      const offer = webrtc.parseQRData(offerData);
      if (!offer) {
        throw new Error('Invalid offer data');
      }
      const answer = await webrtc.initAsGuest(offer);
      return webrtc.getOfferAsQRData(answer);
    } catch (error) {
      this.setStatus('error');
      this.notifyError(`Failed to join as guest: ${error}`);
      throw error;
    }
  }

  /**
   * Complete the connection (host receives guest's answer).
   */
  async completeConnection(answerData: string): Promise<void> {
    try {
      const answer = webrtc.parseQRData(answerData);
      if (!answer) {
        throw new Error('Invalid answer data');
      }
      await webrtc.completeConnection(answer);
    } catch (error) {
      this.setStatus('error');
      this.notifyError(`Failed to complete connection: ${error}`);
      throw error;
    }
  }

  /**
   * Disconnect from the current game.
   */
  disconnect(): void {
    webrtc.cleanup();
    this.setStatus('disconnected');
  }

  /**
   * Check if currently connected.
   */
  isConnected(): boolean {
    return webrtc.isConnected();
  }

  /**
   * Get the current connection status.
   */
  getStatus(): ConnectionStatus {
    return this.currentStatus;
  }

  /**
   * Check if this adapter is the host.
   */
  getIsHost(): boolean {
    return this.isHost;
  }

  // =====================================
  // GAME STATE SYNCHRONIZATION
  // =====================================

  /**
   * Broadcast the current game state to the connected peer.
   * Used when it's your turn and you've made a move.
   */
  broadcastState(state: GameState, history: GameEvent[]): boolean {
    if (!webrtc.isConnected()) {
      return false;
    }

    const message: StateMessage = {
      type: 'state',
      state,
      history,
      timestamp: Date.now()
    };

    return webrtc.sendMessage({
      type: 'gameState',
      data: message,
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast an individual event (for spectators).
   */
  broadcastEvent(event: GameEvent): boolean {
    if (!webrtc.isConnected()) {
      return false;
    }

    const message: EventMessage = {
      type: 'event',
      event,
      timestamp: Date.now()
    };

    return webrtc.sendMessage({
      type: 'action',
      data: message,
      timestamp: Date.now()
    });
  }

  /**
   * Request the current game state from the peer.
   * Used when reconnecting to an ongoing game.
   */
  requestState(): boolean {
    if (!webrtc.isConnected()) {
      return false;
    }

    const message: RequestStateMessage = {
      type: 'request_state',
      timestamp: Date.now()
    };

    return webrtc.sendMessage({
      type: 'action',
      data: message,
      timestamp: Date.now()
    });
  }

  /**
   * Set a callback to provide current state when requested.
   */
  setStateProvider(callback: () => { state: GameState; history: GameEvent[] } | null): void {
    this.requestStateCallback = callback;
  }

  // =====================================
  // SUBSCRIPTIONS
  // =====================================

  /**
   * Subscribe to remote state updates.
   * Called when the opponent sends their game state.
   */
  onRemoteState(callback: StateCallback): () => void {
    this.stateCallbacks.add(callback);
    return () => this.stateCallbacks.delete(callback);
  }

  /**
   * Subscribe to remote events (for spectator mode).
   */
  onRemoteEvent(callback: EventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  /**
   * Subscribe to connection status changes.
   */
  onStatusChange(callback: ConnectionStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  /**
   * Subscribe to error notifications.
   */
  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  // =====================================
  // PRIVATE HELPERS
  // =====================================

  private setupWebRTCHandlers(): void {
    // Handle incoming messages
    webrtc.onMessage((message) => {
      this.handleMessage(message);
    });

    // Handle connection state changes
    webrtc.onConnected(() => {
      this.setStatus('connected');
    });

    webrtc.onDisconnected(() => {
      this.setStatus('disconnected');
    });
  }

  private handleMessage(message: webrtc.WebRTCMessage): void {
    try {
      // Parse the game-specific message from the WebRTC wrapper
      if (message.type === 'gameState') {
        const gameMessage = message.data as StateMessage;
        if (gameMessage.type === 'state') {
          this.notifyState(gameMessage.state, gameMessage.history);
        }
      } else if (message.type === 'action') {
        const actionData = message.data as GameNetworkMessage;
        if (actionData.type === 'event') {
          this.notifyEvent(actionData.event);
        } else if (actionData.type === 'request_state') {
          this.handleStateRequest();
        }
      }
    } catch (error) {
      console.error('Failed to handle message:', error);
    }
  }

  private handleStateRequest(): void {
    if (this.requestStateCallback) {
      const result = this.requestStateCallback();
      if (result) {
        this.broadcastState(result.state, result.history);
      }
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.currentStatus !== status) {
      this.currentStatus = status;
      this.notifyStatus(status);
    }
  }

  private notifyState(state: GameState, history: GameEvent[]): void {
    for (const callback of this.stateCallbacks) {
      try {
        callback(state, history);
      } catch (error) {
        console.error('Error in state callback:', error);
      }
    }
  }

  private notifyEvent(event: GameEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in event callback:', error);
      }
    }
  }

  private notifyStatus(status: ConnectionStatus): void {
    for (const callback of this.statusCallbacks) {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in status callback:', error);
      }
    }
  }

  private notifyError(error: string): void {
    for (const callback of this.errorCallbacks) {
      try {
        callback(error);
      } catch (err) {
        console.error('Error in error callback:', err);
      }
    }
  }
}

// Singleton instance for the application
let networkAdapterInstance: NetworkAdapter | null = null;

/**
 * Get the singleton NetworkAdapter instance.
 */
export function getNetworkAdapter(): NetworkAdapter {
  if (!networkAdapterInstance) {
    networkAdapterInstance = new NetworkAdapter();
  }
  return networkAdapterInstance;
}

/**
 * Create a new NetworkAdapter instance (for testing).
 */
export function createNetworkAdapter(): NetworkAdapter {
  return new NetworkAdapter();
}
