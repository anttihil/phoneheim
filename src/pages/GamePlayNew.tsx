// Game Play Page - Event-Driven Architecture Version
//
// This page renders based on screen commands from the game engine.
// It does not access raw game state directly - all data comes from
// the screen command, making it a pure renderer.

import { Show, For, Switch, Match, createMemo, createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { uiStore, uiState } from '../stores/uiStore';
import { Card, Button } from '../components/common';
import {
  PhaseIndicator,
  StatusBadge,
  DiceRoller,
  CombatResolutionModal,
  RoutTestModal
} from '../components/game';
import { WarriorCard } from '../components/warband';
import type { ScreenCommand } from '../engine/types/screens';

// =====================================
// SCREEN-SPECIFIC COMPONENTS
// =====================================

/**
 * Setup Phase Screen - Position warriors
 */
function SetupPhaseScreen(props: { data: any }) {
  const handleSelectWarrior = (warriorId: string) => {
    uiStore.selectWarrior(warriorId);
  };

  const handlePositionWarrior = () => {
    uiStore.confirmPosition();
  };

  return (
    <Card title="Setup Phase" class="setup-phase">
      <p>Position your warriors on the battlefield.</p>
      <p class="setup-hint">Player {props.data.currentPlayer}'s turn to position warriors.</p>

      <Show when={props.data.warriorsToPosition?.length > 0}>
        <div class="warriors-to-position">
          <h4>Warriors to Position:</h4>
          <For each={props.data.warriorsToPosition}>
            {(warrior: any) => (
              <div
                class={`warrior-item ${props.data.selectedWarriorId === warrior.id ? 'selected' : ''}`}
                onClick={() => handleSelectWarrior(warrior.id)}
              >
                <span>{warrior.name || warrior.type}</span>
                <Show when={props.data.selectedWarriorId === warrior.id}>
                  <Button size="small" onClick={handlePositionWarrior}>
                    Confirm Position
                  </Button>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={props.data.warriorsToPosition?.length === 0}>
        <p class="all-positioned">All warriors positioned. Ready to advance.</p>
      </Show>
    </Card>
  );
}

/**
 * Recovery Phase Screen - Rally fleeing, recover stunned, stand up
 */
function RecoveryPhaseScreen(props: { data: any }) {
  const [lastRallyResult, setLastRallyResult] = createSignal<any>(null);

  const handleRecoveryAction = (action: 'rally' | 'recoverFromStunned' | 'standUp', warriorId: string) => {
    uiStore.recoveryAction(action, warriorId);
  };

  return (
    <Card title="Recovery Phase" class="recovery-phase">
      <Show when={props.data.fleeingWarriors?.length > 0}>
        <div class="recovery-section">
          <h4>Fleeing Warriors (Rally Test)</h4>
          <For each={props.data.fleeingWarriors}>
            {(warrior: any) => (
              <div class="recovery-warrior">
                <span>{warrior.name || warrior.type}</span>
                <span class="recovery-info">Ld: {warrior.profile?.Ld ?? '?'}</span>
                <Button
                  onClick={() => handleRecoveryAction('rally', warrior.id)}
                  size="small"
                >
                  Rally
                </Button>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={props.data.stunnedWarriors?.length > 0}>
        <div class="recovery-section">
          <h4>Stunned Warriors</h4>
          <For each={props.data.stunnedWarriors}>
            {(warrior: any) => (
              <div class="recovery-warrior">
                <span>{warrior.name || warrior.type}</span>
                <Button
                  onClick={() => handleRecoveryAction('recoverFromStunned', warrior.id)}
                  size="small"
                >
                  Recover (auto)
                </Button>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={props.data.knockedDownWarriors?.length > 0}>
        <div class="recovery-section">
          <h4>Knocked Down Warriors</h4>
          <For each={props.data.knockedDownWarriors}>
            {(warrior: any) => (
              <div class="recovery-warrior">
                <span>{warrior.name || warrior.type}</span>
                <Show when={!warrior.combatState?.inCombat}>
                  <Button
                    onClick={() => handleRecoveryAction('standUp', warrior.id)}
                    size="small"
                  >
                    Stand Up
                  </Button>
                </Show>
                <Show when={warrior.combatState?.inCombat}>
                  <span class="recovery-info">(In combat - cannot stand freely)</span>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={
        (!props.data.fleeingWarriors || props.data.fleeingWarriors.length === 0) &&
        (!props.data.stunnedWarriors || props.data.stunnedWarriors.length === 0) &&
        (!props.data.knockedDownWarriors || props.data.knockedDownWarriors.length === 0)
      }>
        <p class="recovery-complete">All warriors recovered. Ready to advance.</p>
      </Show>
    </Card>
  );
}

/**
 * Movement Phase Screen - Move, run, or charge
 */
function MovementPhaseScreen(props: { data: any }) {
  const handleSelectWarrior = (warriorId: string) => {
    if (props.data.selectedWarrior?.id === warriorId) {
      uiStore.deselect();
    } else {
      uiStore.selectWarrior(warriorId);
    }
  };

  const handleMove = (moveType: 'move' | 'run') => {
    uiStore.confirmMove(moveType);
  };

  const handleCharge = (targetId: string) => {
    uiStore.confirmCharge(targetId);
  };

  return (
    <div class="movement-phase">
      <Card title="Movement Phase">
        <Show when={props.data.actableWarriors?.length > 0}>
          <div class="actable-warriors">
            <h4>Warriors that can act:</h4>
            <For each={props.data.actableWarriors}>
              {(warrior: any) => (
                <div
                  class={`warrior-item ${props.data.selectedWarrior?.id === warrior.id ? 'selected' : ''}`}
                  onClick={() => handleSelectWarrior(warrior.id)}
                >
                  <span>{warrior.name || warrior.type}</span>
                  <span class="warrior-move">M: {warrior.profile?.M ?? 4}</span>
                </div>
              )}
            </For>
          </div>
        </Show>

        <Show when={!props.data.actableWarriors || props.data.actableWarriors.length === 0}>
          <p>No warriors can act. Ready to advance.</p>
        </Show>
      </Card>

      <Show when={props.data.selectedWarrior}>
        <Card title={`Actions: ${props.data.selectedWarrior.name}`} class="action-panel">
          <div class="action-buttons">
            <Button onClick={() => handleMove('move')}>Move</Button>
            <Button onClick={() => handleMove('run')}>Run</Button>
          </div>

          <Show when={props.data.chargeTargets && props.data.chargeTargets.length > 0}>
            <div class="charge-targets">
              <h4>Charge Targets:</h4>
              <For each={props.data.chargeTargets}>
                {(target: any) => (
                  <Button
                    size="small"
                    variant="danger"
                    onClick={() => handleCharge(target.id)}
                  >
                    Charge {target.name || target.type}
                  </Button>
                )}
              </For>
            </div>
          </Show>
        </Card>
      </Show>
    </div>
  );
}

/**
 * Shooting Phase Screen - Select shooters
 */
function ShootingPhaseScreen(props: { data: any }) {
  const handleSelectWarrior = (warriorId: string) => {
    uiStore.selectWarrior(warriorId);
  };

  return (
    <Card title="Shooting Phase">
      <Show when={props.data.actableWarriors?.length > 0}>
        <div class="shooting-warriors">
          <h4>Warriors that can shoot:</h4>
          <For each={props.data.actableWarriors}>
            {(warrior: any) => (
              <div
                class="warrior-item"
                onClick={() => handleSelectWarrior(warrior.id)}
              >
                <span>{warrior.name || warrior.type}</span>
                <span class="warrior-bs">BS: {warrior.profile?.BS ?? 3}</span>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={!props.data.actableWarriors || props.data.actableWarriors.length === 0}>
        <p>No warriors can shoot. Ready to advance.</p>
      </Show>
    </Card>
  );
}

/**
 * Shooting Target Select Screen
 */
function ShootingTargetSelectScreen(props: { data: any }) {
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
          {(target: any) => (
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

/**
 * Shooting Confirm Screen
 */
function ShootingConfirmScreen(props: { data: any }) {
  const handleConfirmShot = () => {
    if (props.data.target) {
      uiStore.confirmShot(props.data.target.id);
    }
  };

  const handleDeselect = () => {
    uiStore.deselect();
  };

  return (
    <Card title="Confirm Shot">
      <p>Shooter: {props.data.shooter?.name}</p>
      <p>Target: {props.data.target?.name}</p>
      <p>To Hit Needed: {props.data.toHitNeeded ?? '?'}+</p>

      <div class="confirm-actions">
        <Button onClick={handleConfirmShot}>
          Fire!
        </Button>
        <Button variant="secondary" onClick={handleDeselect}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

/**
 * Combat Phase Screen
 */
function CombatPhaseScreen(props: { data: any }) {
  const handleAttack = (targetId: string) => {
    uiStore.confirmMelee(targetId, 'sword');
  };

  return (
    <Card title="Combat Phase">
      <Show when={props.data.currentFighter}>
        <div class="current-fighter">
          <h4>Current Fighter: {props.data.currentFighter.name}</h4>
          <Show when={props.data.meleeTargets?.length > 0}>
            <div class="melee-targets">
              <h5>Attack:</h5>
              <For each={props.data.meleeTargets}>
                {(target: any) => (
                  <Button
                    size="small"
                    variant="danger"
                    onClick={() => handleAttack(target.id)}
                  >
                    Attack {target.name || target.type}
                  </Button>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>

      <Show when={props.data.strikeOrder?.length > 0}>
        <div class="strike-order">
          <h4>Strike Order:</h4>
          <For each={props.data.strikeOrder}>
            {(entry: any, index) => (
              <div class={`strike-entry ${index() === props.data.currentFighterIndex ? 'current' : ''}`}>
                {index() + 1}. {entry.name}
                <Show when={entry.hasStruck}>
                  <span class="struck-badge">Done</span>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={!props.data.currentFighter}>
        <p>No more fighters. Ready to advance.</p>
      </Show>
    </Card>
  );
}

/**
 * Rout Test Screen
 */
function RoutTestScreen(props: { data: any }) {
  const handleConfirmRoutTest = () => {
    uiStore.confirmRoutTest();
  };

  return (
    <Card title="Rout Test Required">
      <p>Warband: {props.data.warbandName}</p>
      <p>Out of Action: {props.data.outOfActionCount} / {props.data.totalWarriors}</p>
      <p>Leadership Needed: {props.data.leadershipNeeded}</p>

      <Button onClick={handleConfirmRoutTest}>
        Roll Rout Test
      </Button>
    </Card>
  );
}

/**
 * Game Over Screen
 */
function GameOverScreen(props: { data: any }) {
  const navigate = useNavigate();

  const handleExit = () => {
    uiStore.endGame();
    navigate('/warband/list');
  };

  return (
    <Card title="Game Over" class="game-over">
      <Show when={props.data.winner}>
        <h2>Player {props.data.winner} Wins!</h2>
        <p>Winner: {props.data.winnerName}</p>
      </Show>
      <Show when={!props.data.winner}>
        <h2>Draw</h2>
      </Show>

      <p>Reason: {props.data.reason}</p>

      <Show when={props.data.statistics}>
        <div class="game-statistics">
          <h4>Statistics:</h4>
          <p>Turns: {props.data.statistics.turns}</p>
        </div>
      </Show>

      <div class="game-over-actions">
        <Button onClick={handleExit}>
          Exit to Warband List
        </Button>
      </div>
    </Card>
  );
}

// =====================================
// MAIN PAGE COMPONENT
// =====================================

export default function GamePlayNew() {
  const navigate = useNavigate();
  const [showDice, setShowDice] = createSignal(false);

  // Get current screen from store
  const screen = () => uiState.screen;
  const screenType = () => uiState.screenType;
  const isMyTurn = () => uiState.isMyTurn;
  const lastError = () => uiState.lastError;

  const handleAdvancePhase = () => {
    uiStore.advancePhase();
  };

  const handleUndo = () => {
    uiStore.undoLast();
  };

  const handleEndGame = () => {
    if (confirm('Are you sure you want to end the game?')) {
      uiStore.endGame();
      navigate('/warband/list');
    }
  };

  const handleAcknowledge = () => {
    uiStore.acknowledge();
  };

  return (
    <div class="page game-play-new">
      <Show when={!screen()}>
        <Card>
          <p>No active game. Please set up a game first.</p>
          <Button onClick={() => navigate('/game/setup')}>Go to Setup</Button>
        </Card>
      </Show>

      <Show when={screen()}>
        {/* Phase Indicator */}
        <PhaseIndicator
          currentPhase={screen()!.phase ?? 'setup'}
          turn={screen()!.turn ?? 1}
          currentPlayer={screen()!.currentPlayer ?? 1}
        />

        {/* Turn indicator */}
        <Show when={!isMyTurn()}>
          <Card class="waiting-indicator">
            <p>Waiting for opponent...</p>
          </Card>
        </Show>

        {/* Error display */}
        <Show when={lastError()}>
          <Card class="error-card">
            <p class="error-message">{lastError()}</p>
            <Button size="small" onClick={() => uiStore.clearError()}>
              Dismiss
            </Button>
          </Card>
        </Show>

        {/* Screen-based rendering */}
        <Switch>
          <Match when={screenType() === 'GAME_SETUP'}>
            <SetupPhaseScreen data={screen()!.data} />
          </Match>

          <Match when={screenType() === 'RECOVERY_PHASE'}>
            <RecoveryPhaseScreen data={screen()!.data} />
          </Match>

          <Match when={screenType() === 'MOVEMENT_PHASE'}>
            <MovementPhaseScreen data={screen()!.data} />
          </Match>

          <Match when={screenType() === 'SHOOTING_PHASE'}>
            <ShootingPhaseScreen data={screen()!.data} />
          </Match>

          <Match when={screenType() === 'SHOOTING_TARGET_SELECT'}>
            <ShootingTargetSelectScreen data={screen()!.data} />
          </Match>

          <Match when={screenType() === 'SHOOTING_CONFIRM'}>
            <ShootingConfirmScreen data={screen()!.data} />
          </Match>

          <Match when={screenType() === 'COMBAT_PHASE'}>
            <CombatPhaseScreen data={screen()!.data} />
          </Match>

          <Match when={screenType() === 'COMBAT_RESOLUTION'}>
            <CombatResolutionModal
              isOpen={true}
              resolution={screen()!.data}
              onClose={handleAcknowledge}
            />
          </Match>

          <Match when={screenType() === 'ROUT_TEST'}>
            <RoutTestScreen data={screen()!.data} />
          </Match>

          <Match when={screenType() === 'ROUT_TEST_RESULT'}>
            <Card title="Rout Test Result">
              <p>Roll: {(screen()!.data as any).roll} vs {(screen()!.data as any).needed}+</p>
              <p>{(screen()!.data as any).passed ? 'Passed!' : 'Failed - Warband routes!'}</p>
              <Button onClick={handleAcknowledge}>Continue</Button>
            </Card>
          </Match>

          <Match when={screenType() === 'GAME_OVER'}>
            <GameOverScreen data={screen()!.data} />
          </Match>

          <Match when={screenType() === 'ERROR'}>
            <Card title="Error">
              <p>{(screen()!.data as any).message}</p>
            </Card>
          </Match>
        </Switch>

        {/* Game controls - always visible */}
        <Show when={screenType() !== 'GAME_OVER'}>
          <div class="game-controls">
            <Button onClick={() => setShowDice(true)}>Roll Dice</Button>

            <Show when={uiStore.isEventAvailable('ADVANCE_PHASE')}>
              <Button onClick={handleAdvancePhase}>Next Phase</Button>
            </Show>

            <Button
              variant="secondary"
              onClick={handleUndo}
              disabled={!uiStore.canUndo()}
            >
              Undo
            </Button>

            <Button variant="danger" onClick={handleEndGame}>
              End Game
            </Button>
          </div>
        </Show>

        {/* Dice roller modal */}
        <DiceRoller
          isOpen={showDice()}
          onClose={() => setShowDice(false)}
          title="Roll Dice"
        />
      </Show>
    </div>
  );
}
