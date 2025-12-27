// Combat Phase Screen

import { Show, For } from 'solid-js';
import { uiStore } from '../../stores/uiStore';
import { Card, Button } from '../../components/common';

interface CombatScreenProps {
  data: {
    currentFighter?: {
      name?: string;
      type: string;
    } | null;
    meleeTargets?: Array<{
      id: string;
      name?: string;
      type: string;
    }>;
    strikeOrder?: Array<{
      warriorName: string;
      attacksUsed: number;
      attacks: number;
    }>;
    currentFighterIndex?: number;
  };
}

export default function CombatScreen(props: CombatScreenProps) {
  const handleAttack = (targetId: string) => {
    uiStore.confirmMelee(targetId, 'sword');
  };

  return (
    <Card title="Combat Phase">
      <Show when={props.data.currentFighter}>
        <div class="current-fighter">
          <h4>Current Fighter: {props.data.currentFighter!.name || props.data.currentFighter!.type}</h4>
          <Show when={(props.data.meleeTargets?.length ?? 0) > 0}>
            <div class="melee-targets">
              <h5>Attack:</h5>
              <For each={props.data.meleeTargets}>
                {(target) => (
                  <Button
                    size="small"
                    variant="danger"
                    onClick={() => handleAttack(target.id)}
                  >
                    Attack {target.name || target.type}
                  </Button>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>

      <Show when={(props.data.strikeOrder?.length ?? 0) > 0}>
        <div class="strike-order">
          <h4>Strike Order:</h4>
          <For each={props.data.strikeOrder}>
            {(entry, index) => (
              <div class={`strike-entry ${index() === props.data.currentFighterIndex ? 'current' : ''}`}>
                {index() + 1}. {entry.warriorName}
                <Show when={entry.attacksUsed >= entry.attacks}>
                  <span class="struck-badge">Done</span>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={!props.data.currentFighter}>
        <p>No more fighters. Ready to advance.</p>
      </Show>
    </Card>
  );
}
