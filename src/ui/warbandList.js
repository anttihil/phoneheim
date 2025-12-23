// Warband List UI Module

import { getAllWarbands, deleteWarband, exportWarband } from '../logic/storage.js';
import { getWarbandSummary } from '../logic/warbandManager.js';
import { navigateTo } from './navigation.js';

export async function showWarbandList(container) {
  container.innerHTML = '<p class="text-center">Loading warbands...</p>';

  try {
    const warbands = await getAllWarbands();

    if (warbands.length === 0) {
      container.innerHTML = `
        <div class="card">
          <h2>My Warbands</h2>
          <p class="text-muted">No warbands yet. Create your first warband!</p>
          <button class="btn mt-2" onclick="window.location.hash='create'">Create Warband</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div id="warband-list-page">
        <h2>My Warbands</h2>
        <div id="warbands-container">
          ${warbands.map(wb => renderWarbandCard(wb)).join('')}
        </div>
      </div>
    `;

    // Add event handlers
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        switch (action) {
          case 'view':
            showWarbandDetail(id);
            break;
          case 'delete':
            if (confirm('Delete this warband? This cannot be undone.')) {
              await deleteWarband(id);
              showWarbandList(container);
            }
            break;
          case 'export':
            const wb = warbands.find(w => w.id === id);
            if (wb) exportWarband(wb);
            break;
        }
      });
    });
  } catch (error) {
    container.innerHTML = `<p class="text-center">Error loading warbands: ${error.message}</p>`;
  }
}

function renderWarbandCard(warband) {
  const summary = getWarbandSummary(warband);

  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title">${summary.name || 'Unnamed Warband'}</span>
        <span class="text-muted">${summary.type}</span>
      </div>
      <div class="flex flex-between mb-1">
        <span>Warriors: ${summary.warriors}</span>
        <span>Rating: ${summary.rating}</span>
      </div>
      <div class="flex flex-between mb-1">
        <span>Treasury: ${summary.treasury}gc</span>
        <span>Games: ${summary.gamesPlayed} (${summary.wins} wins)</span>
      </div>
      <div class="flex gap-1 mt-2">
        <button class="btn" data-action="view" data-id="${warband.id}">View</button>
        <button class="btn btn-secondary" data-action="export" data-id="${warband.id}">Export</button>
        <button class="btn btn-danger" data-action="delete" data-id="${warband.id}">Delete</button>
      </div>
    </div>
  `;
}

function showWarbandDetail(id) {
  // TODO: Implement detailed warband view
  alert('Warband detail view coming soon!');
}
