// Warband Creator UI Module

import { WARBAND_TYPES, WARRIOR_PROFILES, EQUIPMENT_LISTS } from '../data/warbands.js';
import { MELEE_WEAPONS, RANGED_WEAPONS, ARMOR } from '../data/equipment.js';
import { MUTATIONS } from '../data/mutations.js';
import { saveWarband } from '../logic/storage.js';
import { createWarband, addWarrior, validateWarband, calculateWarbandCost } from '../logic/warbandManager.js';

let currentWarband = null;

export function showWarbandCreator(container) {
  container.innerHTML = `
    <div id="warband-creator">
      <h2>Create New Warband</h2>

      <!-- Step 1: Choose Warband Type -->
      <div id="step-type" class="card">
        <div class="card-header">
          <span class="card-title">Step 1: Choose Warband Type</span>
        </div>
        <div class="form-group">
          <select id="warband-type" class="form-control">
            <option value="">-- Select Warband Type --</option>
            ${Object.entries(WARBAND_TYPES).map(([key, wb]) =>
              `<option value="${key}">${wb.name} (${wb.startingGold}gc)</option>`
            ).join('')}
          </select>
        </div>
        <div id="warband-info" class="hidden">
          <p id="warband-description"></p>
          <p><strong>Starting Gold:</strong> <span id="starting-gold"></span>gc</p>
          <p><strong>Max Warriors:</strong> <span id="max-warriors"></span></p>
        </div>
      </div>

      <!-- Step 2: Name Your Warband -->
      <div id="step-name" class="card hidden">
        <div class="card-header">
          <span class="card-title">Step 2: Name Your Warband</span>
        </div>
        <div class="form-group">
          <input type="text" id="warband-name" class="form-control" placeholder="Enter warband name...">
        </div>
      </div>

      <!-- Step 3: Recruit Warriors -->
      <div id="step-warriors" class="card hidden">
        <div class="card-header">
          <span class="card-title">Step 3: Recruit Warriors</span>
          <span class="treasury">Treasury: <span id="treasury" class="treasury-amount">500</span>gc</span>
        </div>

        <div id="available-warriors"></div>

        <div id="recruited-warriors">
          <h3>Recruited Warriors</h3>
          <ul id="warrior-list" class="warrior-list"></ul>
        </div>
      </div>

      <!-- Validation & Save -->
      <div id="step-save" class="card hidden">
        <div id="validation-messages"></div>
        <div class="flex gap-1 mt-2">
          <button id="save-warband" class="btn btn-success" disabled>Save Warband</button>
          <button id="reset-warband" class="btn btn-secondary">Start Over</button>
        </div>
      </div>
    </div>
  `;

  initWarbandCreator();
}

function initWarbandCreator() {
  const typeSelect = document.getElementById('warband-type');
  const nameInput = document.getElementById('warband-name');
  const saveBtn = document.getElementById('save-warband');
  const resetBtn = document.getElementById('reset-warband');

  typeSelect.addEventListener('change', onTypeSelected);
  nameInput.addEventListener('input', onNameChanged);
  saveBtn.addEventListener('click', onSaveWarband);
  resetBtn.addEventListener('click', () => showWarbandCreator(document.getElementById('page-container')));
}

function onTypeSelected(e) {
  const typeKey = e.target.value;

  if (!typeKey) {
    document.getElementById('step-name').classList.add('hidden');
    document.getElementById('step-warriors').classList.add('hidden');
    document.getElementById('step-save').classList.add('hidden');
    currentWarband = null;
    return;
  }

  const warbandType = WARBAND_TYPES[typeKey];
  currentWarband = createWarband(typeKey, '');

  // Show warband info
  document.getElementById('warband-info').classList.remove('hidden');
  document.getElementById('starting-gold').textContent = warbandType.startingGold;
  document.getElementById('max-warriors').textContent = warbandType.maxWarriors;

  // Show next steps
  document.getElementById('step-name').classList.remove('hidden');
  document.getElementById('step-warriors').classList.remove('hidden');
  document.getElementById('step-save').classList.remove('hidden');

  updateTreasury();
  renderAvailableWarriors(warbandType);
  renderRecruitedWarriors();
  validateAndUpdateUI();
}

function onNameChanged(e) {
  if (currentWarband) {
    currentWarband.name = e.target.value;
    validateAndUpdateUI();
  }
}

function renderAvailableWarriors(warbandType) {
  const container = document.getElementById('available-warriors');

  let html = '<h3>Available Heroes</h3>';
  for (const [key, hero] of Object.entries(warbandType.heroes)) {
    html += `
      <div class="warrior-item">
        <div>
          <span class="warrior-name">${formatWarriorName(key)}</span>
          <span class="warrior-type">(${hero.min}-${hero.max === 1 ? '1' : hero.max || '∞'})</span>
        </div>
        <div>
          <span class="warrior-cost">${hero.cost}gc</span>
          <button class="btn" data-type="${key}" data-category="hero">Add</button>
        </div>
      </div>
    `;
  }

  html += '<h3 class="mt-2">Available Henchmen</h3>';
  for (const [key, hench] of Object.entries(warbandType.henchmen)) {
    html += `
      <div class="warrior-item">
        <div>
          <span class="warrior-name">${formatWarriorName(key)}</span>
          <span class="warrior-type">(0-${hench.max || '∞'})</span>
        </div>
        <div>
          <span class="warrior-cost">${hench.cost}gc</span>
          <button class="btn" data-type="${key}" data-category="henchman">Add</button>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;

  // Add click handlers
  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const category = btn.dataset.category;
      onAddWarrior(type, category);
    });
  });
}

function onAddWarrior(type, category) {
  if (!currentWarband) return;

  const warbandType = WARBAND_TYPES[currentWarband.type];
  const warriorDef = category === 'hero' ? warbandType.heroes[type] : warbandType.henchmen[type];

  // Check if we can afford it
  if (currentWarband.treasury < warriorDef.cost) {
    alert('Not enough gold!');
    return;
  }

  // Check limits
  const currentCount = currentWarband.warriors.filter(w => w.type === type).length;
  const max = warriorDef.max;
  if (max && currentCount >= max) {
    alert(`Cannot have more than ${max} ${formatWarriorName(type)}!`);
    return;
  }

  // Add the warrior
  const warrior = addWarrior(currentWarband, type, category, warriorDef);
  currentWarband.treasury -= warriorDef.cost;

  updateTreasury();
  renderRecruitedWarriors();
  validateAndUpdateUI();
}

function renderRecruitedWarriors() {
  const list = document.getElementById('warrior-list');

  if (!currentWarband || currentWarband.warriors.length === 0) {
    list.innerHTML = '<li class="text-muted">No warriors added</li>';
    return;
  }

  list.innerHTML = currentWarband.warriors.map((warrior, index) => `
    <li class="warrior-item">
      <div>
        <input type="text" class="form-control" style="width: auto; display: inline-block"
               value="${warrior.name}" data-index="${index}" placeholder="Name...">
        <span class="warrior-type">${formatWarriorName(warrior.type)}</span>
      </div>
      <div>
        <span class="warrior-cost">${warrior.cost}gc</span>
        <button class="btn btn-secondary" data-index="${index}" data-action="equip">Equip</button>
        <button class="btn btn-danger" data-index="${index}" data-action="remove">X</button>
      </div>
    </li>
  `).join('');

  // Add handlers
  list.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index);
      currentWarband.warriors[index].name = e.target.value;
    });
  });

  list.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      const action = btn.dataset.action;

      if (action === 'remove') {
        const warrior = currentWarband.warriors[index];
        currentWarband.treasury += warrior.cost;
        currentWarband.warriors.splice(index, 1);
        updateTreasury();
        renderRecruitedWarriors();
        validateAndUpdateUI();
      } else if (action === 'equip') {
        showEquipmentModal(index);
      }
    });
  });
}

function showEquipmentModal(warriorIndex) {
  // For now, just show an alert
  // TODO: Implement equipment modal
  alert('Equipment selection coming soon!');
}

function updateTreasury() {
  if (currentWarband) {
    document.getElementById('treasury').textContent = currentWarband.treasury;
  }
}

function validateAndUpdateUI() {
  const validation = validateWarband(currentWarband);
  const messagesDiv = document.getElementById('validation-messages');
  const saveBtn = document.getElementById('save-warband');

  if (validation.valid) {
    messagesDiv.innerHTML = '<p class="status status-standing">Warband is valid!</p>';
    saveBtn.disabled = false;
  } else {
    messagesDiv.innerHTML = validation.errors.map(err =>
      `<p class="status status-stunned">${err}</p>`
    ).join('');
    saveBtn.disabled = true;
  }
}

async function onSaveWarband() {
  if (!currentWarband) return;

  try {
    await saveWarband(currentWarband);
    alert('Warband saved successfully!');
    // Navigate to warband list
    import('./navigation.js').then(nav => nav.navigateTo('warband-list'));
  } catch (error) {
    alert('Failed to save warband: ' + error.message);
  }
}

function formatWarriorName(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/_/g, ' ');
}
