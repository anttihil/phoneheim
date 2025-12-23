// Phoneheim Main Application

import { initNavigation } from './ui/navigation.js';
import { initStorage } from './logic/storage.js';

// Application state
export const appState = {
  currentPage: 'main-menu',
  currentWarband: null,
  gameState: null,
  warbands: []
};

// Initialize the application
async function init() {
  console.log('Phoneheim initializing...');

  // Initialize IndexedDB
  await initStorage();

  // Initialize navigation
  initNavigation();

  console.log('Phoneheim ready!');
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
