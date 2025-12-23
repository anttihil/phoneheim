// Combat Resolution Modal - Shows step-by-step dice results

import { Show } from 'solid-js';
import { Button, Card } from '../common';
import type { CombatResolution } from '../../types';

export interface CombatResolutionModalProps {
  isOpen: boolean;
  resolution: CombatResolution | null;
  onClose: () => void;
}

export default function CombatResolutionModal(props: CombatResolutionModalProps) {
  // Get outcome display text
  const getOutcomeText = (outcome: CombatResolution['finalOutcome']): string => {
    switch (outcome) {
      case 'miss': return 'MISSED!';
      case 'parried': return 'PARRIED!';
      case 'noWound': return 'NO WOUND';
      case 'saved': return 'ARMOR SAVED';
      case 'knockedDown': return 'KNOCKED DOWN!';
      case 'stunned': return 'STUNNED!';
      case 'outOfAction': return 'OUT OF ACTION!';
      default: return outcome;
    }
  };

  // Get outcome class for styling
  const getOutcomeClass = (outcome: CombatResolution['finalOutcome']): string => {
    switch (outcome) {
      case 'miss':
      case 'parried':
      case 'noWound':
      case 'saved':
        return 'outcome-neutral';
      case 'knockedDown':
      case 'stunned':
        return 'outcome-wounded';
      case 'outOfAction':
        return 'outcome-critical';
      default:
        return '';
    }
  };

  return (
    <Show when={props.isOpen && props.resolution}>
      <div class="modal-overlay">
        <Card title="Attack Resolution" class="resolution-modal">
          <div class="resolution-content">
            {/* Header */}
            <div class="resolution-header">
              <span class="attacker-name">{props.resolution!.attackerName}</span>
              <span class="attack-arrow">vs</span>
              <span class="defender-name">{props.resolution!.defenderName}</span>
            </div>
            <div class="weapon-info">
              Weapon: {props.resolution!.weapon} (S{props.resolution!.weaponStrength})
            </div>

            {/* To Hit */}
            <div class="resolution-step">
              <span class="step-icon">D6</span>
              <span class="step-label">TO HIT:</span>
              <Show when={props.resolution!.autoHit}>
                <span class="step-result auto-hit">AUTO-HIT (target down)</span>
              </Show>
              <Show when={!props.resolution!.autoHit}>
                <span class="step-roll">
                  Rolled [{props.resolution!.toHitRoll}]
                </span>
                <span class="step-needed">Need {props.resolution!.toHitNeeded}+</span>
                <span class={`step-result ${props.resolution!.hit ? 'success' : 'fail'}`}>
                  {props.resolution!.hit ? 'HIT!' : 'MISS'}
                </span>
              </Show>
            </div>

            {/* Parry (if attempted) */}
            <Show when={props.resolution!.parryAttempted}>
              <div class="resolution-step parry-step">
                <span class="step-icon">P</span>
                <span class="step-label">PARRY:</span>
                <span class="step-roll">
                  Rolled [{props.resolution!.parryRoll}] vs [{props.resolution!.toHitRoll}]
                </span>
                <span class={`step-result ${props.resolution!.parrySuccess ? 'success' : 'fail'}`}>
                  {props.resolution!.parrySuccess ? 'PARRIED!' : 'Failed'}
                </span>
              </div>
            </Show>

            {/* To Wound (if hit) */}
            <Show when={props.resolution!.hit && !props.resolution!.parrySuccess}>
              <div class="resolution-step">
                <span class="step-icon">W</span>
                <span class="step-label">TO WOUND:</span>
                <span class="step-roll">
                  Rolled [{props.resolution!.toWoundRoll}]
                </span>
                <span class="step-needed">Need {props.resolution!.toWoundNeeded}+</span>
                <span class={`step-result ${props.resolution!.wounded ? 'success' : 'fail'}`}>
                  {props.resolution!.wounded ? 'WOUNDED!' : 'No wound'}
                </span>
                <Show when={props.resolution!.criticalHit}>
                  <span class="critical-hit">CRITICAL HIT!</span>
                </Show>
              </div>
            </Show>

            {/* Critical Hit Details */}
            <Show when={props.resolution!.criticalHit && props.resolution!.criticalDescription}>
              <div class="resolution-step critical-step">
                <span class="step-icon">!</span>
                <span class="step-label">CRITICAL:</span>
                <span class="critical-type">{props.resolution!.criticalDescription}</span>
              </div>
            </Show>

            {/* Armor Save (if wounded) */}
            <Show when={props.resolution!.wounded && !props.resolution!.noArmorSave && props.resolution!.armorSaveRoll !== undefined}>
              <div class="resolution-step">
                <span class="step-icon">A</span>
                <span class="step-label">ARMOR SAVE:</span>
                <span class="step-roll">
                  Rolled [{props.resolution!.armorSaveRoll}]
                </span>
                <span class="step-needed">Need {props.resolution!.armorSaveNeeded}+</span>
                <span class={`step-result ${props.resolution!.armorSaved ? 'success' : 'fail'}`}>
                  {props.resolution!.armorSaved ? 'SAVED!' : 'Failed'}
                </span>
              </div>
            </Show>

            <Show when={props.resolution!.noArmorSave}>
              <div class="resolution-step">
                <span class="step-icon">A</span>
                <span class="step-label">ARMOR SAVE:</span>
                <span class="step-result no-save">No save allowed!</span>
              </div>
            </Show>

            {/* Injury Roll */}
            <Show when={props.resolution!.injuryRoll !== undefined}>
              <div class="resolution-step">
                <span class="step-icon">I</span>
                <span class="step-label">INJURY:</span>
                <span class="step-roll">
                  Rolled [{props.resolution!.injuryRoll}]
                </span>
                <span class={`step-result injury-${props.resolution!.injuryResult}`}>
                  {props.resolution!.injuryResult === 'knockedDown' && 'Knocked Down (1-2)'}
                  {props.resolution!.injuryResult === 'stunned' && 'Stunned (3-4)'}
                  {props.resolution!.injuryResult === 'outOfAction' && 'OUT OF ACTION (5-6)'}
                </span>
              </div>
            </Show>

            {/* Final Outcome */}
            <div class={`resolution-outcome ${getOutcomeClass(props.resolution!.finalOutcome)}`}>
              <span class="outcome-label">Result:</span>
              <span class="outcome-text">{getOutcomeText(props.resolution!.finalOutcome)}</span>
              <span class="outcome-target">
                {props.resolution!.defenderName}
                {props.resolution!.finalOutcome === 'knockedDown' && ' is knocked down!'}
                {props.resolution!.finalOutcome === 'stunned' && ' is stunned!'}
                {props.resolution!.finalOutcome === 'outOfAction' && ' is out of action!'}
              </span>
            </div>

            {/* Close Button */}
            <div class="resolution-actions">
              <Button onClick={props.onClose}>OK</Button>
            </div>
          </div>
        </Card>
      </div>
    </Show>
  );
}
