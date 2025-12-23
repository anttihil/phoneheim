// Game Play Page

import { Show, For, createSignal, createMemo } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { gameStore, gameState } from '../stores/gameStore';
import { Card, Button } from '../components/common';
import { PhaseIndicator, StatusBadge, DiceRoller } from '../components/game';
import { WarriorCard } from '../components/warband';
import type { GameWarrior, AvailableAction } from '../types';

export default function GamePlay() {
  const navigate = useNavigate();
  const [showDice, setShowDice] = createSignal(false);
  const [lastRallyResult, setLastRallyResult] = createSignal<{ success: boolean; roll: number; needed: number } | null>(null);
  const [showAllWarriors, setShowAllWarriors] = createSignal(false);

  const game = () => gameState.activeGame;
  const currentWarband = () => gameStore.getCurrentPlayerWarband();
  const opponentWarband = () => gameStore.getOpponentWarband();
  const selectedWarriorId = () => gameState.selectedWarrior;
  const pendingUndo = () => gameState.pendingUndo;
  const pendingAction = () => gameState.pendingAction;

  // Get selected warrior object
  const selectedWarrior = createMemo(() => {
    const id = selectedWarriorId();
    if (!id) return null;
    const result = gameStore.getWarriorById(id);
    return result?.warrior ?? null;
  });

  // Get available actions for selected warrior
  const availableActions = createMemo(() => {
    const warrior = selectedWarrior();
    if (!warrior) return [];
    return gameStore.getWarriorActions(warrior);
  });

  // Get warriors needing recovery
  const recoveryWarriors = createMemo(() => {
    return gameStore.getRecoveryWarriors();
  });

  // Check if recovery phase is complete
  const isRecoveryComplete = createMemo(() => {
    return gameStore.checkRecoveryComplete();
  });

  // Check if warrior can act in current phase
  const canWarriorAct = (warrior: GameWarrior) => {
    return gameStore.checkWarriorCanAct(warrior);
  };

  // Filter warriors to show only those who can act (unless toggle is on)
  const displayedWarriors = createMemo(() => {
    const warriors = currentWarband()?.warriors ?? [];
    if (showAllWarriors()) return warriors;
    return warriors.filter(w => canWarriorAct(w) || w.gameStatus === 'outOfAction');
  });

  // Check if a target is valid for the pending action
  const isValidTarget = (warriorId: string) => {
    const action = pendingAction();
    if (!action || !action.validTargets) return false;
    return action.validTargets.includes(warriorId);
  };

  const handleSelectWarrior = (warriorId: string) => {
    if (selectedWarriorId() === warriorId) {
      gameStore.selectWarrior(null);
    } else {
      gameStore.selectWarrior(warriorId);
    }
    setLastRallyResult(null);
  };

  const handleAdvancePhase = () => {
    gameStore.selectWarrior(null);
    setLastRallyResult(null);
    gameStore.advancePhase();
  };

  const handleEndGame = () => {
    if (confirm('Are you sure you want to end the game?')) {
      gameStore.endGame(null, 'Manual end');
      navigate('/warband/list');
    }
  };

  // Recovery phase actions
  const handleRally = (warriorId: string) => {
    const result = gameStore.rallyWarrior(warriorId);
    if (result) {
      setLastRallyResult({ success: result.success, roll: result.roll, needed: result.leadershipNeeded });
    }
  };

  const handleRecoverFromStunned = (warriorId: string) => {
    gameStore.recoverFromStunned(warriorId);
  };

  const handleStandUp = (warriorId: string) => {
    gameStore.standUpWarrior(warriorId);
  };

  // Undo functionality
  const handleRequestUndo = () => {
    gameStore.requestUndo();
  };

  const handleConfirmUndo = () => {
    gameStore.confirmUndo();
  };

  const handleCancelUndo = () => {
    gameStore.cancelUndo();
  };

  // Combat state toggles
  const handleToggleCover = (warriorId: string, warbandIndex: number, currentInCover: boolean) => {
    gameStore.setWarriorCover(warbandIndex, warriorId, !currentInCover);
  };

  // Execute an action based on its type
  const handleAction = (action: AvailableAction) => {
    const warriorId = selectedWarriorId();
    if (!warriorId) return;

    if (action.requiresTarget) {
      // Enter target selection mode
      gameStore.setPendingAction(action);
    } else {
      // Execute immediately
      switch (action.type) {
        case 'move':
          gameStore.moveWarrior(warriorId);
          break;
        case 'run':
          gameStore.runWarrior(warriorId);
          break;
        case 'position':
          gameStore.positionWarrior(warriorId);
          break;
        case 'rally':
          handleRally(warriorId);
          break;
        case 'recoverFromStunned':
          handleRecoverFromStunned(warriorId);
          break;
        case 'standUp':
          handleStandUp(warriorId);
          break;
      }
    }
  };

  // Handle clicking on an opponent warrior (for target selection)
  const handleSelectTarget = (targetId: string) => {
    const action = pendingAction();
    if (!action) return;

    // Execute the pending action with the target
    gameStore.executePendingAction(targetId);
  };

  // Cancel target selection
  const handleCancelTargetSelection = () => {
    gameStore.clearPendingAction();
  };

  return (
    <div class="page game-play">
      <Show when={!game()}>
        <Card>
          <p>No active game. Please set up a game first.</p>
          <Button onClick={() => navigate('/game/setup')}>Go to Setup</Button>
        </Card>
      </Show>

      <Show when={game()}>
        <PhaseIndicator
          currentPhase={game()!.phase}
          turn={game()!.turn}
          currentPlayer={game()!.currentPlayer}
        />

        {/* Setup Phase Actions */}
        <Show when={game()!.phase === 'setup'}>
          <Card title="Setup Phase" class="setup-actions">
            <p>Position your warriors on the battlefield.</p>
            <p>Click each warrior and mark them as positioned when ready.</p>
            <p class="setup-hint">Player {game()!.currentPlayer}'s turn to position warriors.</p>
          </Card>
        </Show>

        {/* Target Selection Banner */}
        <Show when={pendingAction()}>
          <Card class="target-selection-banner">
            <div class="target-selection-info">
              <span>Select a target for: <strong>{pendingAction()!.description}</strong></span>
              <Button size="small" variant="secondary" onClick={handleCancelTargetSelection}>
                Cancel
              </Button>
            </div>
          </Card>
        </Show>

        {/* Recovery Phase Actions */}
        <Show when={game()!.phase === 'recovery'}>
          <Card title="Recovery Phase Actions" class="recovery-actions">
            <Show when={recoveryWarriors().fleeing.length > 0}>
              <div class="recovery-section">
                <h4>Fleeing Warriors (Rally Test)</h4>
                <For each={recoveryWarriors().fleeing}>
                  {(warrior) => (
                    <div class="recovery-warrior">
                      <span>{warrior.name || warrior.type}</span>
                      <span class="recovery-info">Ld: {warrior.profile.Ld}</span>
                      <Button onClick={() => handleRally(warrior.id)} size="small">
                        Rally (2D6 ≤ {warrior.profile.Ld})
                      </Button>
                    </div>
                  )}
                </For>
              </div>
            </Show>

            <Show when={recoveryWarriors().stunned.length > 0}>
              <div class="recovery-section">
                <h4>Stunned Warriors</h4>
                <For each={recoveryWarriors().stunned}>
                  {(warrior) => (
                    <div class="recovery-warrior">
                      <span>{warrior.name || warrior.type}</span>
                      <Button onClick={() => handleRecoverFromStunned(warrior.id)} size="small">
                        Recover (auto)
                      </Button>
                    </div>
                  )}
                </For>
              </div>
            </Show>

            <Show when={recoveryWarriors().knockedDown.length > 0}>
              <div class="recovery-section">
                <h4>Knocked Down Warriors</h4>
                <For each={recoveryWarriors().knockedDown}>
                  {(warrior) => (
                    <div class="recovery-warrior">
                      <span>{warrior.name || warrior.type}</span>
                      <Show when={!warrior.combatState.inCombat}>
                        <Button onClick={() => handleStandUp(warrior.id)} size="small">
                          Stand Up
                        </Button>
                      </Show>
                      <Show when={warrior.combatState.inCombat}>
                        <span class="recovery-info">(In combat - cannot stand freely)</span>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </Show>

            <Show when={isRecoveryComplete()}>
              <p class="recovery-complete">All warriors recovered. Ready to advance.</p>
            </Show>

            <Show when={lastRallyResult()}>
              <div class={`rally-result ${lastRallyResult()!.success ? 'success' : 'failure'}`}>
                Rally: Rolled {lastRallyResult()!.roll} vs Ld {lastRallyResult()!.needed}
                - {lastRallyResult()!.success ? 'Success!' : 'Failed!'}
              </div>
            </Show>
          </Card>
        </Show>

        <div class="game-area">
          <Card title={`Your Warband: ${currentWarband()?.name}`}>
            <div class="warband-header">
              <Button
                size="small"
                variant="secondary"
                onClick={() => setShowAllWarriors(!showAllWarriors())}
              >
                {showAllWarriors() ? 'Show Actionable Only' : 'Show All Warriors'}
              </Button>
            </div>
            <div class="warriors-in-game">
              <For each={displayedWarriors()}>
                {(warrior) => (
                  <div
                    class={`warrior-game-status ${selectedWarriorId() === warrior.id ? 'selected' : ''} ${canWarriorAct(warrior) ? 'can-act' : ''}`}
                    onClick={() => handleSelectWarrior(warrior.id)}
                  >
                    <WarriorCard warrior={warrior} compact />
                    <StatusBadge status={warrior.gameStatus} />
                    <div class="wounds-display">
                      Wounds: {warrior.woundsRemaining}/{warrior.profile.W}
                    </div>
                    <div class="combat-state-display">
                      <Show when={warrior.combatState.inCombat}>
                        <span class="combat-badge in-combat">In Combat</span>
                      </Show>
                      <Show when={warrior.combatState.inCover}>
                        <span class="combat-badge in-cover">In Cover</span>
                      </Show>
                      <Show when={warrior.halfMovement}>
                        <span class="combat-badge half-move">Half Move</span>
                      </Show>
                      <Show when={warrior.strikesLast}>
                        <span class="combat-badge strikes-last">Strikes Last</span>
                      </Show>
                    </div>
                    <Show when={warrior.hasActed || warrior.hasMoved || warrior.hasShot}>
                      <div class="action-status">
                        <Show when={warrior.hasMoved}><span class="acted-badge">Moved</span></Show>
                        <Show when={warrior.hasRun}><span class="acted-badge">Ran</span></Show>
                        <Show when={warrior.hasShot}><span class="acted-badge">Shot</span></Show>
                        <Show when={warrior.hasCharged}><span class="acted-badge">Charged</span></Show>
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </Card>

          {/* Action Panel for Selected Warrior */}
          <Show when={selectedWarrior() && availableActions().length > 0 && !pendingAction()}>
            <Card title={`Actions: ${selectedWarrior()!.name || selectedWarrior()!.type}`} class="action-panel">
              <For each={availableActions()}>
                {(action) => (
                  <div class="action-option">
                    <Button
                      size="small"
                      onClick={() => handleAction(action)}
                    >
                      {action.description}
                    </Button>
                    <Show when={action.requiresTarget}>
                      <span class="target-hint">(Select target after clicking)</span>
                    </Show>
                  </div>
                )}
              </For>

              {/* Cover toggle - only show in movement phase */}
              <Show when={game()!.phase === 'movement'}>
                <div class="action-option">
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => {
                      const warrior = selectedWarrior()!;
                      const result = gameStore.getWarriorById(warrior.id);
                      if (result) {
                        handleToggleCover(warrior.id, result.warbandIndex, warrior.combatState.inCover);
                      }
                    }}
                  >
                    {selectedWarrior()!.combatState.inCover ? 'Leave Cover' : 'Take Cover'}
                  </Button>
                </div>
              </Show>
            </Card>
          </Show>

          {/* Show opponent warband when in target selection mode or when showAllWarriors is enabled */}
          <Show when={pendingAction() || showAllWarriors()}>
            <Card title={`Opponent: ${opponentWarband()?.name}`} class={pendingAction() ? 'target-selection-active' : ''}>
              <Show when={pendingAction()}>
                <p class="target-instruction">Click a valid target (highlighted) to execute action</p>
              </Show>
              <div class="warriors-in-game">
                <For each={opponentWarband()?.warriors}>
                  {(warrior) => (
                    <div
                      class={`warrior-game-status opponent ${isValidTarget(warrior.id) ? 'valid-target' : ''} ${pendingAction() && !isValidTarget(warrior.id) ? 'invalid-target' : ''}`}
                      onClick={() => {
                        if (pendingAction() && isValidTarget(warrior.id)) {
                          handleSelectTarget(warrior.id);
                        }
                      }}
                    >
                      <WarriorCard warrior={warrior} compact />
                      <StatusBadge status={warrior.gameStatus} />
                      <Show when={warrior.combatState.inCombat}>
                        <span class="combat-badge in-combat">In Combat</span>
                      </Show>
                      <Show when={warrior.combatState.inCover}>
                        <span class="combat-badge in-cover">In Cover</span>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </Card>
          </Show>
        </div>

        <div class="game-controls">
          <Button onClick={() => setShowDice(true)}>Roll Dice</Button>
          <Button onClick={handleAdvancePhase}>Next Phase</Button>
          <Button
            variant="secondary"
            onClick={handleRequestUndo}
            disabled={!gameStore.canUndo()}
          >
            Undo
          </Button>
          <Button variant="danger" onClick={handleEndGame}>End Game</Button>
        </div>

        {/* Undo Confirmation Modal */}
        <Show when={pendingUndo()}>
          <div class="modal-overlay">
            <Card title="Confirm Undo" class="undo-modal">
              <p>Are you sure you want to undo the last action?</p>
              <Show when={gameStore.getLastAction()}>
                <p class="undo-action-desc">{gameStore.getLastAction()!.description}</p>
              </Show>
              <div class="modal-actions">
                <Button variant="secondary" onClick={handleCancelUndo}>Cancel</Button>
                <Button variant="danger" onClick={handleConfirmUndo}>Confirm Undo</Button>
              </div>
            </Card>
          </div>
        </Show>

        <Card title="Game Log">
          <div class="game-log">
            <For each={game()!.log.slice(-10)}>
              {(entry) => (
                <div class="log-entry">
                  <span class="log-time">T{entry.turn} {entry.phase}</span>
                  <span class="log-message">{entry.message}</span>
                </div>
              )}
            </For>
          </div>
        </Card>

        <DiceRoller
          isOpen={showDice()}
          onClose={() => setShowDice(false)}
          title="Roll Dice"
        />
      </Show>
    </div>
  );
}
