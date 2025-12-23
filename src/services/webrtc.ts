// WebRTC Module for Peer-to-Peer Communication

import type { GameState } from '../types';

// ICE configuration (using public STUN servers)
const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Message types
export interface WebRTCMessage {
  type: 'gameState' | 'action' | 'chat';
  data: unknown;
  timestamp: number;
}

export interface GameStateMessage extends WebRTCMessage {
  type: 'gameState';
  data: GameState;
}

export interface ActionMessage extends WebRTCMessage {
  type: 'action';
  data: {
    action: string;
    payload?: unknown;
  };
}

// Callback types
type MessageCallback = (message: WebRTCMessage) => void;
type ConnectionCallback = () => void;

let peerConnection: RTCPeerConnection | null = null;
let dataChannel: RTCDataChannel | null = null;
let onMessageCallback: MessageCallback | null = null;
let onConnectedCallback: ConnectionCallback | null = null;
let onDisconnectedCallback: ConnectionCallback | null = null;

// Initialize as host (creates offer)
export async function initAsHost(): Promise<RTCSessionDescriptionInit> {
  cleanup();

  peerConnection = new RTCPeerConnection(ICE_CONFIG);

  // Create data channel
  dataChannel = peerConnection.createDataChannel('gameData', {
    ordered: true
  });

  setupDataChannel(dataChannel);
  setupPeerConnectionHandlers();

  // Create offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  // Wait for ICE gathering to complete
  await waitForICEGathering();

  return peerConnection.localDescription!;
}

// Initialize as guest (receives offer, creates answer)
export async function initAsGuest(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
  cleanup();

  peerConnection = new RTCPeerConnection(ICE_CONFIG);

  setupPeerConnectionHandlers();

  // Handle incoming data channel
  peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    setupDataChannel(dataChannel);
  };

  // Set remote description (the offer)
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

  // Create answer
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  // Wait for ICE gathering to complete
  await waitForICEGathering();

  return peerConnection.localDescription!;
}

// Complete connection (host receives answer)
export async function completeConnection(answer: RTCSessionDescriptionInit): Promise<void> {
  if (peerConnection && peerConnection.signalingState !== 'stable') {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }
}

// Wait for ICE gathering to complete
function waitForICEGathering(): Promise<void> {
  return new Promise((resolve) => {
    if (!peerConnection) {
      resolve();
      return;
    }

    if (peerConnection.iceGatheringState === 'complete') {
      resolve();
      return;
    }

    const checkState = () => {
      if (peerConnection?.iceGatheringState === 'complete') {
        peerConnection.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }
    };

    peerConnection.addEventListener('icegatheringstatechange', checkState);

    // Timeout after 10 seconds
    setTimeout(resolve, 10000);
  });
}

// Setup data channel event handlers
function setupDataChannel(channel: RTCDataChannel): void {
  channel.onopen = () => {
    console.log('Data channel opened');
    if (onConnectedCallback) {
      onConnectedCallback();
    }
  };

  channel.onclose = () => {
    console.log('Data channel closed');
    if (onDisconnectedCallback) {
      onDisconnectedCallback();
    }
  };

  channel.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data) as WebRTCMessage;
      if (onMessageCallback) {
        onMessageCallback(message);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  };

  channel.onerror = (error) => {
    console.error('Data channel error:', error);
  };
}

// Setup peer connection handlers
function setupPeerConnectionHandlers(): void {
  if (!peerConnection) return;

  peerConnection.onconnectionstatechange = () => {
    console.log('Connection state:', peerConnection?.connectionState);

    if (peerConnection?.connectionState === 'connected' && onConnectedCallback) {
      onConnectedCallback();
    }

    if (peerConnection && ['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
      if (onDisconnectedCallback) {
        onDisconnectedCallback();
      }
    }
  };

  peerConnection.onicecandidate = () => {
    // ICE candidates are automatically included in the offer/answer
  };
}

// Send message to peer
export function sendMessage(message: WebRTCMessage): boolean {
  if (dataChannel && dataChannel.readyState === 'open') {
    dataChannel.send(JSON.stringify(message));
    return true;
  }
  return false;
}

// Send game state update
export function sendGameState(gameState: GameState): boolean {
  return sendMessage({
    type: 'gameState',
    data: gameState,
    timestamp: Date.now()
  });
}

// Send action
export function sendAction(action: { action: string; payload?: unknown }): boolean {
  return sendMessage({
    type: 'action',
    data: action,
    timestamp: Date.now()
  });
}

// Set message handler
export function onMessage(callback: MessageCallback): void {
  onMessageCallback = callback;
}

// Set connected handler
export function onConnected(callback: ConnectionCallback): void {
  onConnectedCallback = callback;
}

// Set disconnected handler
export function onDisconnected(callback: ConnectionCallback): void {
  onDisconnectedCallback = callback;
}

// Check if connected
export function isConnected(): boolean {
  return dataChannel !== null && dataChannel.readyState === 'open';
}

// Get connection state
export function getConnectionState(): RTCPeerConnectionState | null {
  return peerConnection?.connectionState || null;
}

// Cleanup connection
export function cleanup(): void {
  if (dataChannel) {
    dataChannel.close();
    dataChannel = null;
  }

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
}

// Generate QR code data for connection offer
export function getOfferAsQRData(offer: RTCSessionDescriptionInit): string {
  // Compress the offer for QR code
  const compressed = {
    type: offer.type,
    sdp: offer.sdp
  };
  return btoa(JSON.stringify(compressed));
}

// Parse QR code data back to offer
export function parseQRData(qrData: string): RTCSessionDescriptionInit | null {
  try {
    const compressed = JSON.parse(atob(qrData));
    return {
      type: compressed.type,
      sdp: compressed.sdp
    };
  } catch (error) {
    console.error('Failed to parse QR data:', error);
    return null;
  }
}
