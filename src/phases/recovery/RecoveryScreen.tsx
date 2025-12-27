// Recovery Phase Screen - Rally fleeing, recover stunned, stand up

import { Show, For } from 'solid-js';
import { uiStore } from '../../stores/uiStore';
import { Card, Button } from '../../components/common';

interface RecoveryScreenProps {
  data: {
    currentPlayer: number;
    fleeingWarriors?: Array<{
      id: string;
      name?: string;
      type: string;
      profile?: { Ld?: number };
    }>;
    stunnedWarriors?: Array<{
      id: string;
      name?: string;
      type: string;
    }>;
    knockedDownWarriors?: Array<{
      id: string;
      name?: string;
      type: string;
      combatState?: { inCombat?: boolean };
    }>;
  };
}

export default function RecoveryScreen(props: RecoveryScreenProps) {
  const handleRecoveryAction = (action: 'rally' | 'recoverFromStunned' | 'standUp', warriorId: string) => {
    uiStore.recoveryAction(action, warriorId);
  };

  return (
    <Card title="Recovery Phase" class="recovery-phase">
      <Show when={(props.data.fleeingWarriors?.length ?? 0) > 0}>
        <div class="recovery-section">
          <h4>Fleeing Warriors (Rally Test)</h4>
          <For each={props.data.fleeingWarriors}>
            {(warrior) => (
              <div class="recovery-warrior">
                <span>{warrior.name || warrior.type}</span>
                <span class="recovery-info">Ld: {warrior.profile?.Ld ?? '?'}</span>
                <Button
                  onClick={() => handleRecoveryAction('rally', warrior.id)}
                  size="small"
                >
                  Rally
                </Button>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={(props.data.stunnedWarriors?.length ?? 0) > 0}>
        <div class="recovery-section">
          <h4>Stunned Warriors</h4>
          <For each={props.data.stunnedWarriors}>
            {(warrior) => (
              <div class="recovery-warrior">
                <span>{warrior.name || warrior.type}</span>
                <Button
                  onClick={() => handleRecoveryAction('recoverFromStunned', warrior.id)}
                  size="small"
                >
                  Recover (auto)
                </Button>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={(props.data.knockedDownWarriors?.length ?? 0) > 0}>
        <div class="recovery-section">
          <h4>Knocked Down Warriors</h4>
          <For each={props.data.knockedDownWarriors}>
            {(warrior) => (
              <div class="recovery-warrior">
                <span>{warrior.name || warrior.type}</span>
                <Show when={!warrior.combatState?.inCombat}>
                  <Button
                    onClick={() => handleRecoveryAction('standUp', warrior.id)}
                    size="small"
                  >
                    Stand Up
                  </Button>
                </Show>
                <Show when={warrior.combatState?.inCombat}>
                  <span class="recovery-info">(In combat - cannot stand freely)</span>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={
        (!props.data.fleeingWarriors || props.data.fleeingWarriors.length === 0) &&
        (!props.data.stunnedWarriors || props.data.stunnedWarriors.length === 0) &&
        (!props.data.knockedDownWarriors || props.data.knockedDownWarriors.length === 0)
      }>
        <p class="recovery-complete">All warriors recovered. Ready to advance.</p>
      </Show>
    </Card>
  );
}
