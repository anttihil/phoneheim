// Multiplayer UI Module

import {
  initAsHost,
  initAsGuest,
  completeConnection,
  getOfferAsQRData,
  parseQRData,
  onMessage,
  onConnected,
  onDisconnected,
  sendGameState,
  sendAction,
  isConnected
} from '../logic/webrtc.js';

let connectionOffer = null;

export function showMultiplayerSetup(container) {
  container.innerHTML = `
    <div id="multiplayer-setup">
      <h2>Multiplayer Game</h2>

      <div class="card">
        <h3>Connect with another player</h3>
        <p class="text-muted">Use WebRTC peer-to-peer connection to play with a friend.</p>

        <div class="action-options">
          <button class="btn" id="host-game">Host Game</button>
          <button class="btn btn-secondary" id="join-game">Join Game</button>
        </div>
      </div>

      <div id="connection-status" class="card hidden">
        <h3>Connection Status</h3>
        <p id="status-message">Not connected</p>
      </div>

      <div id="host-panel" class="card hidden">
        <h3>Host Game</h3>
        <p>Share this connection code with your opponent:</p>

        <div id="qr-container" class="text-center mb-2">
          <!-- QR code will be displayed here -->
        </div>

        <div class="form-group">
          <label>Connection Code:</label>
          <textarea id="offer-code" class="form-control" readonly rows="4"></textarea>
          <button class="btn btn-secondary mt-1" id="copy-offer">Copy Code</button>
        </div>

        <div class="form-group mt-2">
          <label>Paste opponent's response code:</label>
          <textarea id="answer-code" class="form-control" rows="4" placeholder="Paste answer code here..."></textarea>
          <button class="btn mt-1" id="submit-answer">Connect</button>
        </div>
      </div>

      <div id="join-panel" class="card hidden">
        <h3>Join Game</h3>

        <div class="form-group">
          <label>Paste host's connection code:</label>
          <textarea id="host-offer-code" class="form-control" rows="4" placeholder="Paste offer code here..."></textarea>
          <button class="btn mt-1" id="process-offer">Generate Response</button>
        </div>

        <div id="guest-response" class="hidden">
          <div class="form-group">
            <label>Send this response code to the host:</label>
            <textarea id="guest-answer-code" class="form-control" readonly rows="4"></textarea>
            <button class="btn btn-secondary mt-1" id="copy-answer">Copy Response</button>
          </div>
          <p class="text-muted">Waiting for host to complete connection...</p>
        </div>
      </div>

      <div id="connected-panel" class="card hidden">
        <h3>Connected!</h3>
        <p>You are now connected to your opponent.</p>
        <button class="btn btn-success" id="start-multiplayer-game">Start Game</button>
      </div>
    </div>
  `;

  // Set up event handlers
  document.getElementById('host-game').addEventListener('click', startHosting);
  document.getElementById('join-game').addEventListener('click', startJoining);

  // Set up connection callbacks
  onConnected(() => {
    updateStatus('Connected!');
    showConnectedPanel();
  });

  onDisconnected(() => {
    updateStatus('Disconnected');
    hideAllPanels();
  });

  onMessage((message) => {
    handlePeerMessage(message);
  });
}

async function startHosting() {
  try {
    updateStatus('Creating connection offer...');
    showPanel('host-panel');

    const offer = await initAsHost();
    connectionOffer = offer;

    const offerCode = getOfferAsQRData(offer);
    document.getElementById('offer-code').value = offerCode;

    // Generate simple QR representation (text-based for now)
    const qrContainer = document.getElementById('qr-container');
    qrContainer.innerHTML = `
      <div style="padding: 1rem; background: white; color: black; display: inline-block; border-radius: 4px;">
        <p style="margin: 0; font-size: 0.8rem;">Connection Code</p>
        <p style="margin: 0.5rem 0; font-size: 1.2rem; font-family: monospace;">${offerCode.substring(0, 20)}...</p>
      </div>
    `;

    updateStatus('Waiting for opponent to connect...');

    // Set up answer handling
    document.getElementById('copy-offer').addEventListener('click', () => {
      navigator.clipboard.writeText(offerCode);
      alert('Code copied to clipboard!');
    });

    document.getElementById('submit-answer').addEventListener('click', async () => {
      const answerCode = document.getElementById('answer-code').value.trim();
      if (!answerCode) {
        alert('Please paste the answer code');
        return;
      }

      try {
        const answer = parseQRData(answerCode);
        if (!answer) {
          alert('Invalid answer code');
          return;
        }

        await completeConnection(answer);
        updateStatus('Connection established!');
      } catch (error) {
        alert('Failed to connect: ' + error.message);
      }
    });
  } catch (error) {
    updateStatus('Error: ' + error.message);
  }
}

async function startJoining() {
  showPanel('join-panel');
  updateStatus('Ready to join...');

  document.getElementById('process-offer').addEventListener('click', async () => {
    const offerCode = document.getElementById('host-offer-code').value.trim();
    if (!offerCode) {
      alert('Please paste the host\'s connection code');
      return;
    }

    try {
      const offer = parseQRData(offerCode);
      if (!offer) {
        alert('Invalid connection code');
        return;
      }

      updateStatus('Generating response...');
      const answer = await initAsGuest(offer);
      const answerCode = getOfferAsQRData(answer);

      document.getElementById('guest-answer-code').value = answerCode;
      document.getElementById('guest-response').classList.remove('hidden');

      document.getElementById('copy-answer').addEventListener('click', () => {
        navigator.clipboard.writeText(answerCode);
        alert('Response copied to clipboard!');
      });

      updateStatus('Waiting for host to complete connection...');
    } catch (error) {
      alert('Failed to process offer: ' + error.message);
    }
  });
}

function showPanel(panelId) {
  hideAllPanels();
  document.getElementById(panelId).classList.remove('hidden');
  document.getElementById('connection-status').classList.remove('hidden');
}

function hideAllPanels() {
  document.getElementById('host-panel').classList.add('hidden');
  document.getElementById('join-panel').classList.add('hidden');
  document.getElementById('connected-panel').classList.add('hidden');
}

function showConnectedPanel() {
  hideAllPanels();
  document.getElementById('connected-panel').classList.remove('hidden');

  document.getElementById('start-multiplayer-game').addEventListener('click', () => {
    // Navigate to game setup with multiplayer flag
    import('./gamePlay.js').then(module => {
      const container = document.getElementById('page-container');
      module.showGameSetup(container);
    });
  });
}

function updateStatus(message) {
  const statusEl = document.getElementById('status-message');
  if (statusEl) {
    statusEl.textContent = message;
  }
}

function handlePeerMessage(message) {
  console.log('Received message:', message);

  switch (message.type) {
    case 'gameState':
      // Update local game state
      handleGameStateUpdate(message.data);
      break;
    case 'action':
      // Handle opponent action
      handleOpponentAction(message.data);
      break;
    case 'chat':
      // Display chat message
      displayChatMessage(message.data);
      break;
  }
}

function handleGameStateUpdate(state) {
  // Store received game state
  sessionStorage.setItem('peerGameState', JSON.stringify(state));
  console.log('Game state updated from peer');
}

function handleOpponentAction(action) {
  // Process opponent's action
  console.log('Opponent action:', action);
}

function displayChatMessage(data) {
  console.log('Chat message:', data.message);
}

// Export sync function for use in game
export function syncGameState(gameState) {
  if (isConnected()) {
    sendGameState(gameState);
    return true;
  }
  return false;
}

export function broadcastAction(action) {
  if (isConnected()) {
    sendAction(action);
    return true;
  }
  return false;
}
