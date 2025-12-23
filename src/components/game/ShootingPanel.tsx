// Shooting Panel Component - UI for shooting phase actions

import { Show, For, createMemo } from 'solid-js';
import { Button, Card } from '../common';
import type { GameWarrior, ShootingTarget, ShootingModifiers } from '../../types';

export interface ShootingPanelProps {
  warriors: GameWarrior[];
  selectedWarrior: GameWarrior | null;
  targets: ShootingTarget[];
  modifiers: ShootingModifiers;
  onSelectWarrior: (warriorId: string) => void;
  onSelectTarget: (targetId: string) => void;
  onToggleModifier: (key: keyof ShootingModifiers) => void;
  onSkipShooting: (warriorId: string) => void;
}

export default function ShootingPanel(props: ShootingPanelProps) {
  // Get shooters that can still act
  const readyShooters = createMemo(() =>
    props.warriors.filter(w => !w.hasShot && !w.hasRun && !w.hasCharged && !w.combatState.inCombat)
  );

  // Get shooters that have already shot or cannot shoot
  const unavailableShooters = createMemo(() =>
    props.warriors.filter(w => w.hasShot || w.hasRun || w.hasCharged || w.combatState.inCombat)
  );

  // Get selected warrior's ranged weapon
  const selectedWeapon = createMemo(() => {
    if (!props.selectedWarrior?.equipment?.ranged) return null;
    return props.selectedWarrior.equipment.ranged[0] || null;
  });

  return (
    <Card title="Shooting Phase" class="shooting-panel">
      <div class="shooting-content">
        {/* Warriors Ready to Shoot */}
        <Show when={readyShooters().length > 0}>
          <div class="shooting-section">
            <h4>Warriors Ready to Shoot</h4>
            <div class="shooter-list">
              <For each={readyShooters()}>
                {(warrior) => (
                  <div
                    class={`shooter-card ${props.selectedWarrior?.id === warrior.id ? 'selected' : ''}`}
                    onClick={() => props.onSelectWarrior(warrior.id)}
                  >
                    <div class="shooter-info">
                      <span class="shooter-name">{warrior.name || warrior.type}</span>
                      <span class="shooter-weapon">
                        {warrior.equipment?.ranged?.[0] || 'No ranged weapon'}
                      </span>
                      <span class="shooter-bs">BS: {warrior.profile.BS}</span>
                    </div>
                    <div class="shooter-actions">
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          props.onSkipShooting(warrior.id);
                        }}
                      >
                        Skip
                      </Button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Selected Warrior - Modifiers and Targets */}
        <Show when={props.selectedWarrior && selectedWeapon()}>
          <div class="shooting-section">
            <h4>Shooting: {props.selectedWarrior!.name || props.selectedWarrior!.type}</h4>

            {/* Modifiers */}
            <div class="modifiers-row">
              <label class="modifier-toggle">
                <input
                  type="checkbox"
                  checked={props.modifiers.cover}
                  onChange={() => props.onToggleModifier('cover')}
                />
                <span>Target in Cover (-1)</span>
              </label>
              <label class="modifier-toggle">
                <input
                  type="checkbox"
                  checked={props.modifiers.longRange}
                  onChange={() => props.onToggleModifier('longRange')}
                />
                <span>Long Range (-1)</span>
              </label>
              <label class="modifier-toggle">
                <input
                  type="checkbox"
                  checked={props.modifiers.moved}
                  onChange={() => props.onToggleModifier('moved')}
                />
                <span>Shooter Moved (-1)</span>
              </label>
              <label class="modifier-toggle">
                <input
                  type="checkbox"
                  checked={props.modifiers.largeTarget}
                  onChange={() => props.onToggleModifier('largeTarget')}
                />
                <span>Large Target (+1)</span>
              </label>
            </div>

            {/* Targets */}
            <Show when={props.targets.length > 0}>
              <div class="target-list">
                <h5>Available Targets</h5>
                <For each={props.targets}>
                  {(target) => (
                    <div
                      class="target-card"
                      onClick={() => props.onSelectTarget(target.targetId)}
                    >
                      <div class="target-info">
                        <span class="target-name">{target.targetName}</span>
                        <Show when={target.inCover}>
                          <span class="target-badge cover">In Cover</span>
                        </Show>
                        <Show when={target.targetStatus === 'knockedDown'}>
                          <span class="target-badge knocked-down">Knocked Down</span>
                        </Show>
                      </div>
                      <div class="target-hit">
                        <span class="hit-needed">Need {target.toHitNeeded}+</span>
                        <Button size="small">Shoot</Button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>

            <Show when={props.targets.length === 0}>
              <p class="no-targets">No valid targets available</p>
            </Show>
          </div>
        </Show>

        {/* Already Shot / Cannot Shoot */}
        <Show when={unavailableShooters().length > 0}>
          <div class="shooting-section unavailable">
            <h4>Cannot Shoot</h4>
            <div class="unavailable-list">
              <For each={unavailableShooters()}>
                {(warrior) => (
                  <div class="unavailable-warrior">
                    <span class="warrior-name">{warrior.name || warrior.type}</span>
                    <span class="reason">
                      <Show when={warrior.hasShot}>(Already shot)</Show>
                      <Show when={warrior.hasRun}>(Ran this turn)</Show>
                      <Show when={warrior.hasCharged}>(Charged this turn)</Show>
                      <Show when={warrior.combatState.inCombat}>(In combat)</Show>
                      <Show when={!warrior.equipment?.ranged?.length}>(No ranged weapon)</Show>
                    </span>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>

        <Show when={readyShooters().length === 0}>
          <p class="all-done">All shooting complete. Ready to advance.</p>
        </Show>
      </div>
    </Card>
  );
}
