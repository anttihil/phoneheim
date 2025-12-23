// Dice Roller Component

import { createSignal, Show } from 'solid-js';
import { rollD6, roll2D6, rollD66, rollD3 } from '../../logic/gameRules';
import { Button, Modal } from '../common';

export type DiceType = 'D6' | 'D3' | '2D6' | 'D66';

export interface DiceRollResult {
  type: DiceType;
  roll: number;
  target?: number;
  success?: boolean;
  description?: string;
}

export interface DiceRollerProps {
  isOpen: boolean;
  onClose: () => void;
  onResult?: (result: DiceRollResult) => void;
  title?: string;
  diceType?: DiceType;
  target?: number;
  description?: string;
  autoRoll?: boolean;
}

export default function DiceRoller(props: DiceRollerProps) {
  const [result, setResult] = createSignal<DiceRollResult | null>(null);
  const [rolling, setRolling] = createSignal(false);

  const performRoll = () => {
    setRolling(true);

    // Animate for a short time
    setTimeout(() => {
      const type = props.diceType || 'D6';
      let roll: number;

      switch (type) {
        case 'D3':
          roll = rollD3();
          break;
        case '2D6':
          roll = roll2D6();
          break;
        case 'D66':
          roll = rollD66();
          break;
        default:
          roll = rollD6();
      }

      const rollResult: DiceRollResult = {
        type,
        roll,
        target: props.target,
        success: props.target !== undefined ? roll >= props.target : undefined,
        description: props.description
      };

      setResult(rollResult);
      setRolling(false);

      if (props.onResult) {
        props.onResult(rollResult);
      }
    }, 500);
  };

  // Auto roll if specified
  const handleOpen = () => {
    if (props.autoRoll && props.isOpen && !result()) {
      performRoll();
    }
  };

  // Reset when modal closes
  const handleClose = () => {
    setResult(null);
    props.onClose();
  };

  return (
    <Modal isOpen={props.isOpen} onClose={handleClose} title={props.title || 'Roll Dice'} showCloseButton={false}>
      <div class="dice-roller">
        <div class={`dice-display ${rolling() ? 'rolling' : ''}`}>
          <Show when={result()} fallback={<span class="dice-placeholder">?</span>}>
            <span class="dice-value">{result()?.roll}</span>
          </Show>
        </div>

        <Show when={result()}>
          <div class="dice-result">
            <Show when={result()?.target !== undefined}>
              <p class="target-info">
                Target: {result()?.target}+ |
                Result: <span class={result()?.success ? 'success' : 'failure'}>
                  {result()?.success ? 'Success!' : 'Failed'}
                </span>
              </p>
            </Show>
            <Show when={result()?.description}>
              <p class="result-description">{result()?.description}</p>
            </Show>
          </div>
        </Show>

        <div class="dice-actions">
          <Show when={!result()}>
            <Button onClick={performRoll} disabled={rolling()}>
              {rolling() ? 'Rolling...' : `Roll ${props.diceType || 'D6'}`}
            </Button>
          </Show>
          <Show when={result()}>
            <Button onClick={performRoll}>Roll Again</Button>
            <Button variant="secondary" onClick={handleClose}>Done</Button>
          </Show>
        </div>
      </div>
    </Modal>
  );
}
