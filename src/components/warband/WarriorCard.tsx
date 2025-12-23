// Warrior Card Component

import { Show, For } from 'solid-js';
import type { Warrior } from '../../types';
import { MELEE_WEAPONS, RANGED_WEAPONS, ARMOR } from '../../data/equipment';
import StatsGrid from './StatsGrid';
import { Button } from '../common';

export interface WarriorCardProps {
  warrior: Warrior;
  compact?: boolean;
  showActions?: boolean;
  onEdit?: (warrior: Warrior) => void;
  onRemove?: (warrior: Warrior) => void;
}

export default function WarriorCard(props: WarriorCardProps) {
  const getEquipmentName = (key: string, type: 'melee' | 'ranged' | 'armor'): string => {
    if (type === 'melee') return MELEE_WEAPONS[key]?.name || key;
    if (type === 'ranged') return RANGED_WEAPONS[key]?.name || key;
    return ARMOR[key]?.name || key;
  };

  return (
    <div class={`warrior-card ${props.compact ? 'compact' : ''} ${props.warrior.category}`}>
      <div class="warrior-header">
        <span class="warrior-type">{props.warrior.type}</span>
        <Show when={props.warrior.name}>
          <span class="warrior-name">{props.warrior.name}</span>
        </Show>
        <span class="warrior-category">{props.warrior.category}</span>
      </div>

      <StatsGrid profile={props.warrior.profile} compact={props.compact} />

      <Show when={!props.compact}>
        <div class="warrior-equipment">
          <Show when={props.warrior.equipment.melee.length > 0}>
            <div class="equipment-slot">
              <span class="slot-label">Melee:</span>
              <For each={props.warrior.equipment.melee}>
                {(item) => <span class="equipment-tag">{getEquipmentName(item, 'melee')}</span>}
              </For>
            </div>
          </Show>

          <Show when={props.warrior.equipment.ranged.length > 0}>
            <div class="equipment-slot">
              <span class="slot-label">Ranged:</span>
              <For each={props.warrior.equipment.ranged}>
                {(item) => <span class="equipment-tag">{getEquipmentName(item, 'ranged')}</span>}
              </For>
            </div>
          </Show>

          <Show when={props.warrior.equipment.armor.length > 0}>
            <div class="equipment-slot">
              <span class="slot-label">Armor:</span>
              <For each={props.warrior.equipment.armor}>
                {(item) => <span class="equipment-tag">{getEquipmentName(item, 'armor')}</span>}
              </For>
            </div>
          </Show>
        </div>

        <Show when={props.warrior.skills.length > 0}>
          <div class="warrior-skills">
            <span class="skills-label">Skills:</span>
            <For each={props.warrior.skills}>
              {(skill) => <span class="skill-tag">{skill}</span>}
            </For>
          </div>
        </Show>
      </Show>

      <div class="warrior-footer">
        <span class="warrior-cost">{props.warrior.cost}gc</span>
        <span class="warrior-exp">XP: {props.warrior.experience}</span>
      </div>

      <Show when={props.showActions}>
        <div class="warrior-actions">
          <Show when={props.onEdit}>
            <Button size="small" onClick={() => props.onEdit?.(props.warrior)}>
              Edit
            </Button>
          </Show>
          <Show when={props.onRemove}>
            <Button size="small" variant="danger" onClick={() => props.onRemove?.(props.warrior)}>
              Remove
            </Button>
          </Show>
        </div>
      </Show>
    </div>
  );
}
