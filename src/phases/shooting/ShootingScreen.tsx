// Shooting Phase Screen - Select shooters

import { Show, For } from 'solid-js';
import { uiStore } from '../../stores/uiStore';
import { Card, Button } from '../../components/common';

interface ShootingScreenProps {
  data: {
    currentPlayer: number;
    actableWarriors?: Array<{
      id: string;
      name?: string;
      type: string;
      profile?: { BS?: number };
    }>;
  };
}

export default function ShootingScreen(props: ShootingScreenProps) {
  const handleSelectWarrior = (warriorId: string) => {
    uiStore.selectWarrior(warriorId);
  };

  return (
    <Card title="Shooting Phase">
      <Show when={(props.data.actableWarriors?.length ?? 0) > 0}>
        <div class="shooting-warriors">
          <h4>Warriors that can shoot:</h4>
          <For each={props.data.actableWarriors}>
            {(warrior) => (
              <div
                class="warrior-item"
                onClick={() => handleSelectWarrior(warrior.id)}
              >
                <span>{warrior.name || warrior.type}</span>
                <span class="warrior-bs">BS: {warrior.profile?.BS ?? 3}</span>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={!props.data.actableWarriors || props.data.actableWarriors.length === 0}>
        <p>No warriors can shoot. Ready to advance.</p>
      </Show>
    </Card>
  );
}
