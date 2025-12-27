// Movement Phase Screen - Move, run, or charge

import { Show, For } from 'solid-js';
import { uiStore } from '../../stores/uiStore';
import { Card, Button } from '../../components/common';

interface MovementScreenProps {
  data: {
    currentPlayer: number;
    actableWarriors?: Array<{
      id: string;
      name?: string;
      type: string;
      profile?: { M?: number };
    }>;
    selectedWarrior?: {
      id: string;
      name?: string;
      type: string;
    } | null;
    chargeTargets?: Array<{
      id: string;
      name?: string;
      type: string;
    }>;
  };
}

export default function MovementScreen(props: MovementScreenProps) {
  const handleSelectWarrior = (warriorId: string) => {
    if (props.data.selectedWarrior?.id === warriorId) {
      uiStore.deselect();
    } else {
      uiStore.selectWarrior(warriorId);
    }
  };

  const handleMove = (moveType: 'move' | 'run') => {
    uiStore.confirmMove(moveType);
  };

  const handleCharge = (targetId: string) => {
    uiStore.confirmCharge(targetId);
  };

  return (
    <div class="movement-phase">
      <Card title="Movement Phase">
        <Show when={(props.data.actableWarriors?.length ?? 0) > 0}>
          <div class="actable-warriors">
            <h4>Warriors that can act:</h4>
            <For each={props.data.actableWarriors}>
              {(warrior) => (
                <div
                  class={`warrior-item ${props.data.selectedWarrior?.id === warrior.id ? 'selected' : ''}`}
                  onClick={() => handleSelectWarrior(warrior.id)}
                >
                  <span>{warrior.name || warrior.type}</span>
                  <span class="warrior-move">M: {warrior.profile?.M ?? 4}</span>
                </div>
              )}
            </For>
          </div>
        </Show>

        <Show when={!props.data.actableWarriors || props.data.actableWarriors.length === 0}>
          <p>No warriors can act. Ready to advance.</p>
        </Show>
      </Card>

      <Show when={props.data.selectedWarrior}>
        <Card title={`Actions: ${props.data.selectedWarrior!.name}`} class="action-panel">
          <div class="action-buttons">
            <Button onClick={() => handleMove('move')}>Move</Button>
            <Button onClick={() => handleMove('run')}>Run</Button>
          </div>

          <Show when={props.data.chargeTargets && props.data.chargeTargets.length > 0}>
            <div class="charge-targets">
              <h4>Charge Targets:</h4>
              <For each={props.data.chargeTargets}>
                {(target) => (
                  <Button
                    size="small"
                    variant="danger"
                    onClick={() => handleCharge(target.id)}
                  >
                    Charge {target.name || target.type}
                  </Button>
                )}
              </For>
            </div>
          </Show>
        </Card>
      </Show>
    </div>
  );
}
