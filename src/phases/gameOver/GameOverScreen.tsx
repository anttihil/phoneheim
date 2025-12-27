// Game Over Screen

import { Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { uiStore } from '../../stores/uiStore';
import { Card, Button } from '../../components/common';

interface GameOverScreenProps {
  data: {
    winner?: number | null;
    winnerName?: string | null;
    reason?: string;
    statistics?: {
      turns?: number;
    };
  };
}

export default function GameOverScreen(props: GameOverScreenProps) {
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
          <p>Turns: {props.data.statistics!.turns}</p>
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
