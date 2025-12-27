// Game Play Page - Event-Driven Architecture Version
//
// This page renders based on screen commands from the game engine.
// It does not access raw game state directly - all data comes from
// the screen command, making it a pure renderer.

import { Show, Switch, Match, createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { uiStore, uiState } from '../stores/uiStore';
import { Card, Button } from '../components/common';
import { PhaseIndicator, DiceRoller } from '../components/game';
import type { CombatResolutionData } from '../engine/types/screens';

// Phase screens from co-located phase modules
import { SetupScreen } from '../phases/setup';
import { RecoveryScreen } from '../phases/recovery';
import { MovementScreen } from '../phases/movement';
import { ShootingScreen, TargetSelectScreen, ConfirmScreen as ShootingConfirmScreen } from '../phases/shooting';
import { CombatScreen, CombatResolutionModal } from '../phases/combat';
import { GameOverScreen } from '../phases/gameOver';

// =====================================
// ROUT TEST SCREEN (inline - small component)
// =====================================

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

        {/* Turn indicator - only show in multiplayer mode */}
        <Show when={!isMyTurn() && !uiState.isHotseatMode}>
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
            <SetupScreen data={screen()!.data as any} />
          </Match>

          <Match when={screenType() === 'RECOVERY_PHASE'}>
            <RecoveryScreen data={screen()!.data as any} />
          </Match>

          <Match when={screenType() === 'MOVEMENT_PHASE'}>
            <MovementScreen data={screen()!.data as any} />
          </Match>

          <Match when={screenType() === 'SHOOTING_PHASE'}>
            <ShootingScreen data={screen()!.data as any} />
          </Match>

          <Match when={screenType() === 'SHOOTING_TARGET_SELECT'}>
            <TargetSelectScreen data={screen()!.data as any} />
          </Match>

          <Match when={screenType() === 'SHOOTING_CONFIRM'}>
            <ShootingConfirmScreen data={screen()!.data as any} />
          </Match>

          <Match when={screenType() === 'COMBAT_PHASE'}>
            <CombatScreen data={screen()!.data as any} />
          </Match>

          <Match when={screenType() === 'COMBAT_RESOLUTION'}>
            <CombatResolutionModal
              isOpen={true}
              resolution={screen()!.data as CombatResolutionData}
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
            <GameOverScreen data={screen()!.data as any} />
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
