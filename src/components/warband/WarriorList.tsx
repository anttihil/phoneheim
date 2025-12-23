// Warrior List Component

import { For, Show } from 'solid-js';
import type { Warrior } from '../../types';
import WarriorCard from './WarriorCard';

export interface WarriorListProps {
  warriors: Warrior[];
  compact?: boolean;
  showActions?: boolean;
  onEdit?: (warrior: Warrior) => void;
  onRemove?: (warrior: Warrior) => void;
  emptyMessage?: string;
}

export default function WarriorList(props: WarriorListProps) {
  const heroes = () => props.warriors.filter(w => w.category === 'hero');
  const henchmen = () => props.warriors.filter(w => w.category === 'henchman');

  return (
    <div class="warrior-list">
      <Show when={props.warriors.length === 0}>
        <p class="empty-message">{props.emptyMessage || 'No warriors recruited yet'}</p>
      </Show>

      <Show when={heroes().length > 0}>
        <div class="warrior-section">
          <h4 class="section-title">Heroes ({heroes().length})</h4>
          <div class="warriors-grid">
            <For each={heroes()}>
              {(warrior) => (
                <WarriorCard
                  warrior={warrior}
                  compact={props.compact}
                  showActions={props.showActions}
                  onEdit={props.onEdit}
                  onRemove={props.onRemove}
                />
              )}
            </For>
          </div>
        </div>
      </Show>

      <Show when={henchmen().length > 0}>
        <div class="warrior-section">
          <h4 class="section-title">Henchmen ({henchmen().length})</h4>
          <div class="warriors-grid">
            <For each={henchmen()}>
              {(warrior) => (
                <WarriorCard
                  warrior={warrior}
                  compact={props.compact}
                  showActions={props.showActions}
                  onEdit={props.onEdit}
                  onRemove={props.onRemove}
                />
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
