// Navigation Module

import { showWarbandCreator } from './warbandCreator.js';
import { showWarbandList } from './warbandList.js';
import { showGameSetup } from './gamePlay.js';
import { showRulesReference } from './rulesReference.js';
import { showAftermath } from './aftermath.js';
import { showMultiplayerSetup } from './multiplayer.js';

const pages = {
  'warband-create': showWarbandCreator,
  'warband-list': showWarbandList,
  'play-game': showGameSetup,
  'rules': showRulesReference,
  'aftermath': showAftermath,
  'multiplayer': showMultiplayerSetup
};

export function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      navigateTo(page);
    });
  });
}

export function navigateTo(page) {
  // Update active button
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  // Load page content
  const container = document.getElementById('page-container');

  if (pages[page]) {
    pages[page](container);
  } else {
    container.innerHTML = '<p class="text-center">Page not found</p>';
  }
}

export function showMainMenu() {
  const container = document.getElementById('page-container');
  container.innerHTML = '';

  // Deactivate all nav buttons
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => btn.classList.remove('active'));
}
