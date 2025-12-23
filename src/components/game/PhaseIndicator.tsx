// Phase Indicator Component

import { For } from 'solid-js';
import type { GamePhase } from '../../types';
import { TURN_PHASES } from '../../logic/gameRules';

export interface PhaseIndicatorProps {
  currentPhase: GamePhase;
  turn: number;
  currentPlayer: 1 | 2;
}

export default function PhaseIndicator(props: PhaseIndicatorProps) {
  const isActive = (phaseId: string) => props.currentPhase === phaseId;
  const isPast = (phaseId: string) => {
    const currentIndex = TURN_PHASES.findIndex(p => p.id === props.currentPhase);
    const phaseIndex = TURN_PHASES.findIndex(p => p.id === phaseId);
    return phaseIndex < currentIndex;
  };

  return (
    <div class="phase-indicator">
      <div class="turn-info">
        <span class="turn-number">Turn {props.turn}</span>
        <span class="current-player">Player {props.currentPlayer}</span>
      </div>

      <div class="phases">
        <For each={TURN_PHASES}>
          {(phase) => (
            <div
              class={`phase ${isActive(phase.id) ? 'active' : ''} ${isPast(phase.id) ? 'past' : ''}`}
              title={phase.description}
            >
              <span class="phase-name">{phase.name}</span>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
