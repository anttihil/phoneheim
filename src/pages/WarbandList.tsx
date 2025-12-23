// Warband List Page

import { onMount, For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { warbandStore, warbandState } from '../stores/warbandStore';
import { Card, Button } from '../components/common';
import { exportWarband } from '../services/storage';

export default function WarbandList() {
  onMount(() => {
    warbandStore.loadWarbands();
  });

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this warband?')) {
      await warbandStore.deleteWarband(id);
    }
  };

  const handleExport = (warband: typeof warbandState.warbands[0]) => {
    exportWarband(warband);
  };

  return (
    <div class="page warband-list">
      <h2>My Warbands</h2>

      <Show when={warbandState.loading}>
        <p>Loading...</p>
      </Show>

      <Show when={warbandState.error}>
        <p class="error">{warbandState.error}</p>
      </Show>

      <Show when={!warbandState.loading && warbandState.warbands.length === 0}>
        <Card>
          <p>No warbands yet. Create your first warband!</p>
          <A href="/warband/create">
            <Button variant="primary">Create Warband</Button>
          </A>
        </Card>
      </Show>

      <div class="warbands-grid">
        <For each={warbandState.warbands}>
          {(warband) => (
            <Card class="warband-card">
              <h3>{warband.name}</h3>
              <p class="warband-type">{warband.typeName}</p>
              <div class="warband-stats">
                <span>Warriors: {warband.warriors.length}</span>
                <span>Rating: {warband.rating}</span>
                <span>Treasury: {warband.treasury}gc</span>
              </div>
              <div class="warband-record">
                <span>Games: {warband.gamesPlayed}</span>
                <span>Wins: {warband.wins}</span>
              </div>
              <div class="warband-actions">
                <A href={`/warband/${warband.id}`}>
                  <Button size="small">View</Button>
                </A>
                <Button size="small" variant="secondary" onClick={() => handleExport(warband)}>
                  Export
                </Button>
                <Button size="small" variant="danger" onClick={() => handleDelete(warband.id!)}>
                  Delete
                </Button>
              </div>
            </Card>
          )}
        </For>
      </div>
    </div>
  );
}
