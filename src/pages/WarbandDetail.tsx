// Warband Detail Page

import { onMount, Show } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { warbandStore, warbandState } from '../stores/warbandStore';
import { Card, Button } from '../components/common';
import { WarriorList, TreasuryDisplay } from '../components/warband';

export default function WarbandDetail() {
  const params = useParams();
  const navigate = useNavigate();

  onMount(() => {
    if (params.id) {
      warbandStore.loadWarband(params.id);
    }
  });

  const warband = () => warbandState.currentWarband;

  return (
    <div class="page warband-detail">
      <Show when={warbandState.loading}>
        <p>Loading...</p>
      </Show>

      <Show when={warbandState.error}>
        <p class="error">{warbandState.error}</p>
      </Show>

      <Show when={warband()}>
        <div class="warband-header">
          <div>
            <h2>{warband()?.name}</h2>
            <p class="warband-type">{warband()?.typeName}</p>
          </div>
          <TreasuryDisplay amount={warband()?.treasury || 0} />
        </div>

        <div class="warband-info">
          <Card title="Statistics">
            <div class="stats-row">
              <div class="stat-item">
                <span class="label">Rating</span>
                <span class="value">{warband()?.rating}</span>
              </div>
              <div class="stat-item">
                <span class="label">Games Played</span>
                <span class="value">{warband()?.gamesPlayed}</span>
              </div>
              <div class="stat-item">
                <span class="label">Wins</span>
                <span class="value">{warband()?.wins}</span>
              </div>
              <div class="stat-item">
                <span class="label">Warriors</span>
                <span class="value">{warband()?.warriors.length}</span>
              </div>
            </div>
          </Card>
        </div>

        <Card title="Warriors">
          <WarriorList warriors={warband()?.warriors || []} />
        </Card>

        <div class="warband-actions">
          <Button variant="secondary" onClick={() => navigate('/warband/list')}>
            Back to List
          </Button>
        </div>
      </Show>
    </div>
  );
}
