// Game Play Page

import { Show, For, createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { gameStore, gameState } from '../stores/gameStore';
import { Card, Button } from '../components/common';
import { PhaseIndicator, StatusBadge, DiceRoller } from '../components/game';
import { WarriorCard } from '../components/warband';

export default function GamePlay() {
  const navigate = useNavigate();
  const [showDice, setShowDice] = createSignal(false);

  const game = () => gameState.activeGame;
  const currentWarband = () => gameStore.getCurrentPlayerWarband();
  const opponentWarband = () => gameStore.getOpponentWarband();

  const handleAdvancePhase = () => {
    gameStore.advancePhase();
  };

  const handleEndGame = () => {
    if (confirm('Are you sure you want to end the game?')) {
      gameStore.endGame(null, 'Manual end');
      navigate('/warband/list');
    }
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

        <div class="game-area">
          <Card title={`Your Warband: ${currentWarband()?.name}`}>
            <div class="warriors-in-game">
              <For each={currentWarband()?.warriors}>
                {(warrior) => (
                  <div class="warrior-game-status">
                    <WarriorCard warrior={warrior} compact />
                    <StatusBadge status={warrior.gameStatus} />
                    <div class="wounds-display">
                      Wounds: {warrior.woundsRemaining}/{warrior.profile.W}
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Card>

          <Card title={`Opponent: ${opponentWarband()?.name}`}>
            <div class="warriors-in-game">
              <For each={opponentWarband()?.warriors}>
                {(warrior) => (
                  <div class="warrior-game-status">
                    <WarriorCard warrior={warrior} compact />
                    <StatusBadge status={warrior.gameStatus} />
                  </div>
                )}
              </For>
            </div>
          </Card>
        </div>

        <div class="game-controls">
          <Button onClick={() => setShowDice(true)}>Roll Dice</Button>
          <Button onClick={handleAdvancePhase}>Next Phase</Button>
          <Button variant="danger" onClick={handleEndGame}>End Game</Button>
        </div>

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
