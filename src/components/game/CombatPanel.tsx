// Combat Panel Component - UI for combat phase actions

import { Show, For, createMemo } from 'solid-js';
import { Button, Card } from '../common';
import type { StrikeOrderEntry, MeleeTarget, GameWarrior } from '../../types';

export interface CombatPanelProps {
  strikeOrder: StrikeOrderEntry[];
  currentFighterIndex: number;
  currentFighter: StrikeOrderEntry | null;
  meleeTargets: MeleeTarget[];
  currentPlayerIndex: number;
  onAttack: (targetId: string, weaponKey?: string) => void;
  onNextFighter: () => void;
  getWarriorWeapons: (warriorId: string) => string[];
}

export default function CombatPanel(props: CombatPanelProps) {
  // Get current fighter's weapons for selection
  const availableWeapons = createMemo(() => {
    if (!props.currentFighter) return [];
    return props.getWarriorWeapons(props.currentFighter.warriorId);
  });

  // Determine if current fighter belongs to current player
  const isCurrentPlayerFighter = createMemo(() => {
    if (!props.currentFighter) return false;
    return props.currentFighter.warbandIndex === props.currentPlayerIndex;
  });

  return (
    <Card title="Combat Phase" class="combat-panel">
      <div class="combat-content">
        {/* Strike Order Display */}
        <div class="strike-order-section">
          <h4>Strike Order</h4>
          <div class="strike-order-list">
            <For each={props.strikeOrder}>
              {(fighter, index) => (
                <div
                  class={`strike-order-entry ${index() === props.currentFighterIndex ? 'current' : ''} ${index() < props.currentFighterIndex ? 'completed' : ''}`}
                >
                  <span class="order-number">{index() + 1}.</span>
                  <Show when={fighter.charged}>
                    <span class="order-badge charged" title="Charged this turn">C</span>
                  </Show>
                  <Show when={fighter.stoodUp}>
                    <span class="order-badge stood-up" title="Stood up this turn">L</span>
                  </Show>
                  <span class="fighter-name">{fighter.warriorName}</span>
                  <span class="fighter-stats">
                    I:{fighter.initiative} A:{fighter.attacks}
                  </span>
                  <span class={`player-badge player-${fighter.warbandIndex + 1}`}>
                    P{fighter.warbandIndex + 1}
                  </span>
                  <Show when={index() === props.currentFighterIndex}>
                    <span class="current-marker">CURRENT</span>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </div>

        {/* Current Fighter Actions */}
        <Show when={props.currentFighter}>
          <div class="current-fighter-section">
            <h4>
              {props.currentFighter!.warriorName}'s Turn
              <span class="attacks-remaining">
                ({props.currentFighter!.attacks} attack{props.currentFighter!.attacks > 1 ? 's' : ''})
              </span>
            </h4>

            <Show when={!isCurrentPlayerFighter()}>
              <p class="opponent-turn-notice">
                This is your opponent's fighter. They should select their target.
              </p>
            </Show>

            {/* Melee Targets */}
            <Show when={props.meleeTargets.length > 0}>
              <div class="melee-targets">
                <h5>Engaged Enemies</h5>
                <For each={props.meleeTargets}>
                  {(target) => (
                    <div class="melee-target-card">
                      <div class="target-info">
                        <span class="target-name">{target.targetName}</span>
                        <Show when={target.targetStatus === 'knockedDown'}>
                          <span class="target-badge knocked-down">Knocked Down (Auto-hit)</span>
                        </Show>
                        <Show when={target.targetStatus === 'stunned'}>
                          <span class="target-badge stunned">Stunned (Auto OOA)</span>
                        </Show>
                      </div>
                      <div class="target-actions">
                        <Show when={availableWeapons().length > 1}>
                          <For each={availableWeapons()}>
                            {(weapon) => (
                              <Button
                                size="small"
                                onClick={() => props.onAttack(target.targetId, weapon)}
                              >
                                Attack ({weapon})
                              </Button>
                            )}
                          </For>
                        </Show>
                        <Show when={availableWeapons().length <= 1}>
                          <Button
                            size="small"
                            onClick={() => props.onAttack(target.targetId, availableWeapons()[0] || 'sword')}
                          >
                            Attack
                          </Button>
                        </Show>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>

            <Show when={props.meleeTargets.length === 0}>
              <p class="no-targets">No engaged enemies (combat may have ended)</p>
              <Button onClick={props.onNextFighter}>
                Continue to Next Fighter
              </Button>
            </Show>
          </div>
        </Show>

        {/* Combat Complete */}
        <Show when={props.currentFighterIndex >= props.strikeOrder.length}>
          <div class="combat-complete">
            <p>All combat resolved. Ready to advance to next phase.</p>
          </div>
        </Show>

        {/* No Combat */}
        <Show when={props.strikeOrder.length === 0}>
          <p class="no-combat">No warriors in combat. Ready to advance.</p>
        </Show>
      </div>
    </Card>
  );
}
