// Rout Test Modal - Shows rout test trigger and result

import { Show, createSignal } from 'solid-js';
import { Button, Card } from '../../components/common';
import type { RoutTestResult, GameWarband } from '../../types';

export interface RoutTestModalProps {
  isOpen: boolean;
  warband: GameWarband | null;
  onRollTest: () => RoutTestResult | null;
  onClose: () => void;
}

export default function RoutTestModal(props: RoutTestModalProps) {
  const [result, setResult] = createSignal<RoutTestResult | null>(null);
  const [hasRolled, setHasRolled] = createSignal(false);

  const handleRoll = () => {
    const testResult = props.onRollTest();
    setResult(testResult);
    setHasRolled(true);
  };

  const handleClose = () => {
    setResult(null);
    setHasRolled(false);
    props.onClose();
  };

  // Calculate casualty info
  const getCasualtyInfo = () => {
    if (!props.warband) return { total: 0, outOfAction: 0, threshold: 0 };
    const total = props.warband.warriors.length;
    const outOfAction = props.warband.outOfActionCount;
    const threshold = Math.ceil(total / 4);
    return { total, outOfAction, threshold };
  };

  // Get leader's leadership
  const getLeadership = () => {
    if (!props.warband) return 7;
    const leader = props.warband.warriors.find(w =>
      w.type.toLowerCase().includes('captain') ||
      w.type.toLowerCase().includes('leader') ||
      w.type.toLowerCase().includes('chieftain') ||
      w.type.toLowerCase().includes('magister')
    ) || props.warband.warriors[0];
    return leader?.profile.Ld ?? 7;
  };

  return (
    <Show when={props.isOpen && props.warband}>
      <div class="modal-overlay">
        <Card title="Rout Test Required!" class="rout-modal">
          <div class="rout-content">
            {/* Warband Info */}
            <div class="rout-warband-info">
              <span class="warband-name">{props.warband!.name}</span>
              <span class="warband-type">({props.warband!.type})</span>
            </div>

            {/* Casualty Info */}
            <div class="rout-casualty-info">
              <div class="casualty-stat">
                <span class="stat-label">Out of Action:</span>
                <span class="stat-value critical">{getCasualtyInfo().outOfAction}</span>
              </div>
              <div class="casualty-stat">
                <span class="stat-label">Total Warriors:</span>
                <span class="stat-value">{getCasualtyInfo().total}</span>
              </div>
              <div class="casualty-stat">
                <span class="stat-label">Threshold (25%):</span>
                <span class="stat-value">{getCasualtyInfo().threshold}</span>
              </div>
            </div>

            <p class="rout-explanation">
              Your warband has lost 25% or more of its warriors! You must pass a Leadership test or your warband will rout and flee the battle.
            </p>

            {/* Test Info */}
            <div class="rout-test-info">
              <span class="test-label">Leadership Test:</span>
              <span class="test-value">Roll 2D6 ≤ {getLeadership()}</span>
            </div>

            {/* Roll Button / Result */}
            <Show when={!hasRolled()}>
              <div class="rout-actions">
                <Button onClick={handleRoll}>Roll Leadership Test</Button>
              </div>
            </Show>

            <Show when={hasRolled() && result()}>
              <div class={`rout-result ${result()!.passed ? 'passed' : 'failed'}`}>
                <div class="result-dice">
                  <span class="dice-label">Rolled:</span>
                  <span class="dice-value">{result()!.roll}</span>
                  <span class="dice-vs">vs</span>
                  <span class="dice-needed">Ld {result()!.needed}</span>
                </div>
                <div class="result-outcome">
                  <Show when={result()!.passed}>
                    <span class="outcome-passed">TEST PASSED!</span>
                    <p class="outcome-text">Your warband holds firm and continues fighting!</p>
                  </Show>
                  <Show when={!result()!.passed}>
                    <span class="outcome-failed">TEST FAILED!</span>
                    <p class="outcome-text">Your warband breaks and flees the battle! The enemy is victorious!</p>
                  </Show>
                </div>
                <div class="rout-actions">
                  <Button onClick={handleClose}>
                    {result()!.passed ? 'Continue Battle' : 'End Game'}
                  </Button>
                </div>
              </div>
            </Show>
          </div>
        </Card>
      </div>
    </Show>
  );
}
