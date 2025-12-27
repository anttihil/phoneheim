// Setup Phase Screen - Position warriors

import { Show, For } from 'solid-js';
import { uiStore } from '../../stores/uiStore';
import { Card, Button } from '../../components/common';

interface SetupScreenProps {
  data: {
    currentPlayer: number;
    warriorsToPosition: Array<{
      id: string;
      name?: string;
      type: string;
    }>;
    selectedWarriorId?: string | null;
  };
}

export default function SetupScreen(props: SetupScreenProps) {
  const handleSelectWarrior = (warriorId: string) => {
    uiStore.selectWarrior(warriorId);
  };

  const handlePositionWarrior = () => {
    uiStore.confirmPosition();
  };

  return (
    <Card title="Setup Phase" class="setup-phase">
      <p>Position your warriors on the battlefield.</p>
      <p class="setup-hint">Player {props.data.currentPlayer}'s turn to position warriors.</p>

      <Show when={props.data.warriorsToPosition?.length > 0}>
        <div class="warriors-to-position">
          <h4>Warriors to Position:</h4>
          <For each={props.data.warriorsToPosition}>
            {(warrior) => (
              <div
                class={`warrior-item ${props.data.selectedWarriorId === warrior.id ? 'selected' : ''}`}
                onClick={() => handleSelectWarrior(warrior.id)}
              >
                <span>{warrior.name || warrior.type}</span>
                <Show when={props.data.selectedWarriorId === warrior.id}>
                  <Button size="small" onClick={handlePositionWarrior}>
                    Confirm Position
                  </Button>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={props.data.warriorsToPosition?.length === 0}>
        <p class="all-positioned">All warriors positioned. Ready to advance.</p>
      </Show>
    </Card>
  );
}
