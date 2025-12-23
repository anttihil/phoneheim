// Multiplayer Page

import { createSignal, Show } from 'solid-js';
import { multiplayerStore, multiplayerState } from '../stores/multiplayerStore';
import { Card, Button, FormControl } from '../components/common';

export default function Multiplayer() {
  const [mode, setMode] = createSignal<'none' | 'host' | 'guest'>('none');
  const [guestCode, setGuestCode] = createSignal('');

  const handleHost = async () => {
    setMode('host');
    try {
      await multiplayerStore.hostGame();
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoin = async () => {
    if (!guestCode()) {
      alert('Please enter the host code');
      return;
    }
    setMode('guest');
    try {
      await multiplayerStore.joinGame(guestCode());
    } catch (e) {
      alert('Failed to join: ' + (e as Error).message);
    }
  };

  const handleComplete = async (answerCode: string) => {
    try {
      await multiplayerStore.completeHostConnection(answerCode);
    } catch (e) {
      alert('Failed to connect: ' + (e as Error).message);
    }
  };

  const handleDisconnect = () => {
    multiplayerStore.disconnect();
    setMode('none');
    setGuestCode('');
  };

  return (
    <div class="page multiplayer">
      <h2>Multiplayer</h2>

      <Show when={multiplayerState.status === 'connected'}>
        <Card title="Connected!">
          <p>You are connected as {multiplayerState.role}.</p>
          <Button variant="danger" onClick={handleDisconnect}>Disconnect</Button>
        </Card>
      </Show>

      <Show when={multiplayerState.status !== 'connected'}>
        <Show when={mode() === 'none'}>
          <Card title="Choose Mode">
            <div class="mode-buttons">
              <Button onClick={handleHost} fullWidth>Host Game</Button>
              <Button onClick={() => setMode('guest')} variant="secondary" fullWidth>
                Join Game
              </Button>
            </div>
          </Card>
        </Show>

        <Show when={mode() === 'host'}>
          <Card title="Host Game">
            <Show when={multiplayerState.status === 'connecting'}>
              <p>Generating connection code...</p>
            </Show>
            <Show when={multiplayerState.offer}>
              <div class="connection-code">
                <p>Share this code with your opponent:</p>
                <code class="offer-code">{multiplayerState.offer}</code>
                <FormControl
                  type="text"
                  label="Enter opponent's answer code"
                  value=""
                  onChange={(val) => handleComplete(val)}
                  placeholder="Paste answer code here..."
                />
              </div>
            </Show>
            <Button variant="secondary" onClick={() => setMode('none')}>Cancel</Button>
          </Card>
        </Show>

        <Show when={mode() === 'guest'}>
          <Card title="Join Game">
            <FormControl
              type="text"
              label="Enter host's code"
              value={guestCode()}
              onChange={setGuestCode}
              placeholder="Paste host code here..."
            />
            <Show when={multiplayerState.answer}>
              <div class="connection-code">
                <p>Share this code with the host:</p>
                <code class="answer-code">{multiplayerState.answer}</code>
              </div>
            </Show>
            <div class="join-actions">
              <Button onClick={handleJoin} disabled={!guestCode()}>Connect</Button>
              <Button variant="secondary" onClick={() => setMode('none')}>Cancel</Button>
            </div>
          </Card>
        </Show>

        <Show when={multiplayerState.error}>
          <p class="error">{multiplayerState.error}</p>
        </Show>
      </Show>
    </div>
  );
}
