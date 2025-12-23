// Stats Grid Component - Displays warrior characteristics

import { For } from 'solid-js';
import type { Profile, CharacteristicKey } from '../../types';

export interface StatsGridProps {
  profile: Profile;
  compact?: boolean;
}

const STAT_ORDER: CharacteristicKey[] = ['M', 'WS', 'BS', 'S', 'T', 'W', 'I', 'A', 'Ld'];

export default function StatsGrid(props: StatsGridProps) {
  return (
    <div class={`stats-grid ${props.compact ? 'compact' : ''}`}>
      <For each={STAT_ORDER}>
        {(stat) => (
          <div class="stat">
            <span class="stat-label">{stat}</span>
            <span class="stat-value">{props.profile[stat]}</span>
          </div>
        )}
      </For>
    </div>
  );
}
