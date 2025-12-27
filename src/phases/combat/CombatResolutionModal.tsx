// Combat Resolution Modal - Shows step-by-step dice results

import { Show } from 'solid-js';
import { Button, Card } from '../../components/common';
import type { CombatResolutionData } from '../../engine/types/screens';

export interface CombatResolutionModalProps {
  isOpen: boolean;
  resolution: CombatResolutionData | null;
  onClose: () => void;
}

export default function CombatResolutionModal(props: CombatResolutionModalProps) {
  // Get outcome display text
  const getOutcomeText = (outcome: CombatResolutionData['outcome']): string => {
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
  const getOutcomeClass = (outcome: CombatResolutionData['outcome']): string => {
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
              Weapon: {props.resolution!.weapon}
            </div>

            {/* To Hit */}
            <Show when={props.resolution!.rolls.toHit}>
              <div class="resolution-step">
                <span class="step-icon">D6</span>
                <span class="step-label">TO HIT:</span>
                <span class="step-roll">
                  Rolled [{props.resolution!.rolls.toHit!.roll}]
                </span>
                <span class="step-needed">Need {props.resolution!.rolls.toHit!.needed}+</span>
                <span class={`step-result ${props.resolution!.rolls.toHit!.success ? 'success' : 'fail'}`}>
                  {props.resolution!.rolls.toHit!.success ? 'HIT!' : 'MISS'}
                </span>
              </div>
            </Show>

            {/* Parry (if attempted) */}
            <Show when={props.resolution!.rolls.parry}>
              <div class="resolution-step parry-step">
                <span class="step-icon">P</span>
                <span class="step-label">PARRY:</span>
                <span class="step-roll">
                  Rolled [{props.resolution!.rolls.parry!.roll}] vs [{props.resolution!.rolls.parry!.opponentRoll}]
                </span>
                <span class={`step-result ${props.resolution!.rolls.parry!.success ? 'success' : 'fail'}`}>
                  {props.resolution!.rolls.parry!.success ? 'PARRIED!' : 'Failed'}
                </span>
              </div>
            </Show>

            {/* To Wound (if hit) */}
            <Show when={props.resolution!.rolls.toWound}>
              <div class="resolution-step">
                <span class="step-icon">W</span>
                <span class="step-label">TO WOUND:</span>
                <span class="step-roll">
                  Rolled [{props.resolution!.rolls.toWound!.roll}]
                </span>
                <span class="step-needed">Need {props.resolution!.rolls.toWound!.needed}+</span>
                <span class={`step-result ${props.resolution!.rolls.toWound!.success ? 'success' : 'fail'}`}>
                  {props.resolution!.rolls.toWound!.success ? 'WOUNDED!' : 'No wound'}
                </span>
              </div>
            </Show>

            {/* Critical Hit Details */}
            <Show when={props.resolution!.rolls.critical}>
              <div class="resolution-step critical-step">
                <span class="step-icon">!</span>
                <span class="step-label">CRITICAL:</span>
                <span class="critical-type">{props.resolution!.rolls.critical!.description}</span>
                <span class="critical-hit">CRITICAL HIT!</span>
              </div>
            </Show>

            {/* Armor Save (if wounded) */}
            <Show when={props.resolution!.rolls.armorSave && !props.resolution!.rolls.armorSave.noSave}>
              <div class="resolution-step">
                <span class="step-icon">A</span>
                <span class="step-label">ARMOR SAVE:</span>
                <span class="step-roll">
                  Rolled [{props.resolution!.rolls.armorSave!.roll}]
                </span>
                <span class="step-needed">Need {props.resolution!.rolls.armorSave!.needed}+</span>
                <span class={`step-result ${props.resolution!.rolls.armorSave!.success ? 'success' : 'fail'}`}>
                  {props.resolution!.rolls.armorSave!.success ? 'SAVED!' : 'Failed'}
                </span>
              </div>
            </Show>

            <Show when={props.resolution!.rolls.armorSave?.noSave}>
              <div class="resolution-step">
                <span class="step-icon">A</span>
                <span class="step-label">ARMOR SAVE:</span>
                <span class="step-result no-save">No save allowed!</span>
              </div>
            </Show>

            {/* Injury Roll */}
            <Show when={props.resolution!.rolls.injury}>
              <div class="resolution-step">
                <span class="step-icon">I</span>
                <span class="step-label">INJURY:</span>
                <span class="step-roll">
                  Rolled [{props.resolution!.rolls.injury!.roll}]
                </span>
                <span class={`step-result injury-${props.resolution!.rolls.injury!.result}`}>
                  {props.resolution!.rolls.injury!.result === 'knockedDown' && 'Knocked Down (1-2)'}
                  {props.resolution!.rolls.injury!.result === 'stunned' && 'Stunned (3-4)'}
                  {props.resolution!.rolls.injury!.result === 'outOfAction' && 'OUT OF ACTION (5-6)'}
                </span>
              </div>
            </Show>

            {/* Final Outcome */}
            <div class={`resolution-outcome ${getOutcomeClass(props.resolution!.outcome)}`}>
              <span class="outcome-label">Result:</span>
              <span class="outcome-text">{getOutcomeText(props.resolution!.outcome)}</span>
              <span class="outcome-target">
                {props.resolution!.defenderName}
                {props.resolution!.outcome === 'knockedDown' && ' is knocked down!'}
                {props.resolution!.outcome === 'stunned' && ' is stunned!'}
                {props.resolution!.outcome === 'outOfAction' && ' is out of action!'}
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
