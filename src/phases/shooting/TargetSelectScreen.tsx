// Shooting Target Select Screen

import { Show, For } from 'solid-js';
import { uiStore } from '../../stores/uiStore';
import { Card, Button } from '../../components/common';

interface TargetSelectScreenProps {
  data: {
    shooter?: {
      name?: string;
      type?: string;
    } | null;
    modifiers?: {
      cover?: boolean;
      longRange?: boolean;
      moved?: boolean;
    };
    validTargets?: Array<{
      id: string;
      name?: string;
      type: string;
    }>;
  };
}

export default function TargetSelectScreen(props: TargetSelectScreenProps) {
  const handleSelectTarget = (targetId: string) => {
    uiStore.selectTarget(targetId);
  };

  const handleToggleModifier = (modifier: string, currentValue: boolean) => {
    uiStore.setModifier('shooting', modifier, !currentValue);
  };

  const handleDeselect = () => {
    uiStore.deselect();
  };

  return (
    <Card title={`Select Target for ${props.data.shooter?.name ?? 'Shooter'}`}>
      <div class="shooting-modifiers">
        <label>
          <input
            type="checkbox"
            checked={props.data.modifiers?.cover ?? false}
            onChange={() => handleToggleModifier('cover', props.data.modifiers?.cover ?? false)}
          />
          Target in Cover
        </label>
        <label>
          <input
            type="checkbox"
            checked={props.data.modifiers?.longRange ?? false}
            onChange={() => handleToggleModifier('longRange', props.data.modifiers?.longRange ?? false)}
          />
          Long Range
        </label>
        <label>
          <input
            type="checkbox"
            checked={props.data.modifiers?.moved ?? false}
            onChange={() => handleToggleModifier('moved', props.data.modifiers?.moved ?? false)}
          />
          Shooter Moved
        </label>
      </div>

      <div class="valid-targets">
        <h4>Valid Targets:</h4>
        <For each={props.data.validTargets ?? []}>
          {(target) => (
            <Button
              size="small"
              onClick={() => handleSelectTarget(target.id)}
            >
              {target.name || target.type}
            </Button>
          )}
        </For>
      </div>

      <Button variant="secondary" onClick={handleDeselect}>
        Cancel
      </Button>
    </Card>
  );
}
