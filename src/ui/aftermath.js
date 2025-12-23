// Aftermath Resolution UI Module

import { rollD6, roll2D6, rollD66 } from '../logic/gameRules.js';
import {
  HERO_SERIOUS_INJURIES,
  HENCHMAN_SERIOUS_INJURY,
  EXPERIENCE_THRESHOLDS,
  HERO_ADVANCE_TABLE,
  HENCHMAN_ADVANCE_TABLE
} from '../data/injuries.js';
import {
  WYRDSTONE_FOUND,
  WYRDSTONE_PRICE,
  EXPLORATION_DOUBLES,
  EXPLORATION_TRIPLES,
  EXPLORATION_QUADS,
  EXPLORATION_FIVE,
  EXPLORATION_SIX,
  POST_BATTLE_SEQUENCE
} from '../data/exploration.js';
import { getWarband, saveWarband } from '../logic/storage.js';

let currentWarband = null;
let currentStep = 0;
let outOfActionWarriors = [];
let injuryResults = [];
let experienceGains = [];
let explorationResults = null;

export async function showAftermath(container, warbandId, battleResult) {
  currentWarband = await getWarband(warbandId);
  currentStep = 0;
  outOfActionWarriors = [];
  injuryResults = [];
  experienceGains = [];
  explorationResults = null;

  renderAftermath(container, battleResult);
}

function renderAftermath(container, battleResult) {
  container.innerHTML = `
    <div id="aftermath">
      <h2>Post-Battle Sequence</h2>

      <div class="phase-indicator">
        <span id="current-step">${POST_BATTLE_SEQUENCE[currentStep].name}</span>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">${currentWarband.name}</span>
          <span class="text-muted">Step ${currentStep + 1} of ${POST_BATTLE_SEQUENCE.length}</span>
        </div>

        <div id="step-progress" class="mb-2">
          ${POST_BATTLE_SEQUENCE.map((step, i) => `
            <span class="step-dot ${i < currentStep ? 'completed' : ''} ${i === currentStep ? 'active' : ''}"></span>
          `).join('')}
        </div>
      </div>

      <div id="step-content" class="card">
        <!-- Step content loaded dynamically -->
      </div>

      <div class="action-options mt-2">
        <button id="prev-step" class="btn btn-secondary" ${currentStep === 0 ? 'disabled' : ''}>Previous</button>
        <button id="next-step" class="btn">Next Step</button>
        <button id="finish-aftermath" class="btn btn-success hidden">Complete</button>
      </div>
    </div>
  `;

  renderCurrentStep();

  document.getElementById('prev-step').addEventListener('click', () => {
    if (currentStep > 0) {
      currentStep--;
      renderAftermath(container, battleResult);
    }
  });

  document.getElementById('next-step').addEventListener('click', () => {
    if (currentStep < POST_BATTLE_SEQUENCE.length - 1) {
      currentStep++;
      renderAftermath(container, battleResult);
    } else {
      document.getElementById('next-step').classList.add('hidden');
      document.getElementById('finish-aftermath').classList.remove('hidden');
    }
  });

  document.getElementById('finish-aftermath').addEventListener('click', async () => {
    await saveWarband(currentWarband);
    alert('Post-battle sequence complete! Warband saved.');
    window.location.reload();
  });
}

function renderCurrentStep() {
  const content = document.getElementById('step-content');
  const step = POST_BATTLE_SEQUENCE[currentStep];

  switch (step.step) {
    case 1:
      renderInjuryStep(content);
      break;
    case 2:
      renderExperienceStep(content);
      break;
    case 3:
      renderExplorationStep(content);
      break;
    case 4:
      renderSellWyrdstoneStep(content);
      break;
    case 5:
      renderVeteransStep(content);
      break;
    case 6:
      renderRareItemsStep(content);
      break;
    case 7:
      renderDramatisStep(content);
      break;
    case 8:
      renderRecruitsStep(content);
      break;
    case 9:
      renderEquipmentStep(content);
      break;
    case 10:
      renderRatingStep(content);
      break;
    default:
      content.innerHTML = `<p>${step.description}</p>`;
  }
}

function renderInjuryStep(content) {
  content.innerHTML = `
    <h3>Step 1: Injuries</h3>
    <p>Roll for serious injuries for all Out of Action warriors.</p>

    <div class="form-group">
      <label>Select warriors that went Out of Action:</label>
      <div id="ooa-warriors">
        ${currentWarband.warriors.map(w => `
          <div class="flex gap-1 mb-1">
            <input type="checkbox" id="ooa-${w.id}" data-warrior="${w.id}" data-category="${w.category}">
            <label for="ooa-${w.id}">${w.name || formatTypeName(w.type)} (${w.category})</label>
          </div>
        `).join('')}
      </div>
    </div>

    <button id="roll-injuries" class="btn">Roll for Injuries</button>

    <div id="injury-results" class="mt-2"></div>
  `;

  document.getElementById('roll-injuries').addEventListener('click', rollInjuries);
}

function rollInjuries() {
  const checkboxes = document.querySelectorAll('#ooa-warriors input:checked');
  const resultsDiv = document.getElementById('injury-results');
  let html = '<h4>Injury Results</h4>';

  checkboxes.forEach(cb => {
    const warriorId = cb.dataset.warrior;
    const category = cb.dataset.category;
    const warrior = currentWarband.warriors.find(w => w.id === warriorId);

    if (category === 'hero') {
      // Roll D66 for heroes
      const roll = rollD66();
      const injury = HERO_SERIOUS_INJURIES[roll];

      html += `
        <div class="card mb-1">
          <strong>${warrior.name || formatTypeName(warrior.type)}</strong><br>
          Roll: ${roll} - <span class="status status-${roll <= 21 ? 'outOfAction' : roll >= 41 && roll <= 55 ? 'standing' : 'stunned'}">
            ${injury.name}
          </span><br>
          ${injury.description}
        </div>
      `;

      // Apply effects if any
      if (injury.effect) {
        warrior.profile[injury.effect.characteristic] += injury.effect.modifier;
      }

      if (roll <= 15) {
        // Dead - mark for removal
        warrior.status = 'dead';
      } else if ([35, 23, 25].includes(roll)) {
        warrior.status = 'missNextGame';
      }
    } else {
      // Roll D6 for henchmen
      const roll = rollD6();
      const result = HENCHMAN_SERIOUS_INJURY[roll];

      html += `
        <div class="card mb-1">
          <strong>${warrior.name || formatTypeName(warrior.type)}</strong><br>
          Roll: ${roll} - <span class="status status-${result.result === 'dead' ? 'outOfAction' : 'standing'}">
            ${result.result === 'dead' ? 'Dead' : 'Survives'}
          </span><br>
          ${result.description}
        </div>
      `;

      if (result.result === 'dead') {
        warrior.status = 'dead';
      }
    }
  });

  resultsDiv.innerHTML = html;
}

function renderExperienceStep(content) {
  content.innerHTML = `
    <h3>Step 2: Experience</h3>
    <p>Allocate experience points to your warriors.</p>

    <div class="mb-2">
      <strong>Experience Awards:</strong>
      <ul>
        <li>+1 XP: Surviving the battle</li>
        <li>+1 XP: Putting enemy Out of Action (per enemy)</li>
        <li>+1 XP: Winning Leader Bonus</li>
        <li>+D6 XP: Finding wyrdstone (Heroes only)</li>
      </ul>
    </div>

    <div id="xp-list">
      ${currentWarband.warriors.filter(w => w.status !== 'dead').map(w => `
        <div class="warrior-item mb-1">
          <span>${w.name || formatTypeName(w.type)} (${w.experience} XP)</span>
          <div class="flex gap-1">
            <input type="number" id="xp-${w.id}" value="1" min="0" max="20" style="width: 60px" class="form-control">
            <button class="btn" data-warrior="${w.id}">Add XP</button>
          </div>
        </div>
      `).join('')}
    </div>

    <div id="advance-results" class="mt-2"></div>
  `;

  content.querySelectorAll('button[data-warrior]').forEach(btn => {
    btn.addEventListener('click', () => {
      const warriorId = btn.dataset.warrior;
      const xpInput = document.getElementById(`xp-${warriorId}`);
      const xp = parseInt(xpInput.value) || 0;
      addExperience(warriorId, xp);
    });
  });
}

function addExperience(warriorId, xp) {
  const warrior = currentWarband.warriors.find(w => w.id === warriorId);
  if (!warrior) return;

  const oldXp = warrior.experience;
  warrior.experience += xp;

  // Check for advances
  const thresholds = warrior.category === 'hero' ? EXPERIENCE_THRESHOLDS.hero : EXPERIENCE_THRESHOLDS.henchman;
  const advanceTable = warrior.category === 'hero' ? HERO_ADVANCE_TABLE : HENCHMAN_ADVANCE_TABLE;

  let advances = 0;
  for (const threshold of thresholds) {
    if (oldXp < threshold && warrior.experience >= threshold) {
      advances++;
    }
  }

  const resultsDiv = document.getElementById('advance-results');
  if (advances > 0) {
    let html = resultsDiv.innerHTML;
    for (let i = 0; i < advances; i++) {
      const roll = roll2D6();
      const advance = advanceTable[roll];

      html += `
        <div class="card mb-1">
          <strong>${warrior.name || formatTypeName(warrior.type)}</strong> gained an advance!<br>
          Roll: ${roll} - ${advance.type === 'skill' ? 'New Skill' : advance.type === 'promotion' ? 'Promoted to Hero!' : `Characteristic increase`}
        </div>
      `;
    }
    resultsDiv.innerHTML = html;
  }
}

function renderExplorationStep(content) {
  const heroCount = currentWarband.warriors.filter(w => w.category === 'hero' && w.status !== 'dead').length;

  content.innerHTML = `
    <h3>Step 3: Exploration</h3>
    <p>Roll ${heroCount} dice (one per surviving Hero) to explore the ruins.</p>

    <button id="roll-exploration" class="btn">Roll Exploration (${heroCount} dice)</button>

    <div id="exploration-results" class="mt-2"></div>
  `;

  document.getElementById('roll-exploration').addEventListener('click', () => {
    rollExploration(heroCount);
  });
}

function rollExploration(diceCount) {
  const rolls = [];
  for (let i = 0; i < diceCount; i++) {
    rolls.push(rollD6());
  }

  // Sort for finding multiples
  rolls.sort((a, b) => a - b);
  const total = rolls.reduce((sum, r) => sum + r, 0);

  // Find wyrdstone based on total
  let wyrdstone = 1;
  for (const range of WYRDSTONE_FOUND) {
    if (total >= range.min && total <= range.max) {
      wyrdstone = range.shards;
      break;
    }
  }

  // Check for multiples (doubles, triples, etc.)
  const counts = {};
  rolls.forEach(r => counts[r] = (counts[r] || 0) + 1);

  let specialLocation = null;
  for (const [value, count] of Object.entries(counts)) {
    const key = value.repeat(count);
    if (count === 2 && EXPLORATION_DOUBLES[key]) {
      specialLocation = EXPLORATION_DOUBLES[key];
    } else if (count === 3 && EXPLORATION_TRIPLES[key]) {
      specialLocation = EXPLORATION_TRIPLES[key];
    } else if (count === 4 && EXPLORATION_QUADS[key]) {
      specialLocation = EXPLORATION_QUADS[key];
    } else if (count === 5 && EXPLORATION_FIVE[key]) {
      specialLocation = EXPLORATION_FIVE[key];
    } else if (count === 6 && EXPLORATION_SIX[key]) {
      specialLocation = EXPLORATION_SIX[key];
    }
  }

  currentWarband.wyrdstone = (currentWarband.wyrdstone || 0) + wyrdstone;

  const resultsDiv = document.getElementById('exploration-results');
  resultsDiv.innerHTML = `
    <div class="card">
      <h4>Exploration Results</h4>
      <div class="dice-display mb-2">
        ${rolls.map(r => `<div class="die">${r}</div>`).join('')}
      </div>
      <p>Total: ${total}</p>
      <p><strong>Wyrdstone Found:</strong> ${wyrdstone} shards</p>
      <p>Current Wyrdstone Stash: ${currentWarband.wyrdstone} shards</p>
      ${specialLocation ? `
        <div class="mt-2">
          <h4>Special Location Found!</h4>
          <p><strong>${specialLocation.name}</strong></p>
          <p>${specialLocation.description}</p>
          <p><em>${specialLocation.reward}</em></p>
        </div>
      ` : ''}
    </div>
  `;
}

function renderSellWyrdstoneStep(content) {
  const wyrdstone = currentWarband.wyrdstone || 0;

  content.innerHTML = `
    <h3>Step 4: Sell Wyrdstone</h3>
    <p>Wyrdstone can be sold for ${WYRDSTONE_PRICE}gc per shard.</p>

    <div class="card">
      <p><strong>Current Stash:</strong> ${wyrdstone} shards</p>
      <p><strong>Treasury:</strong> ${currentWarband.treasury}gc</p>

      <div class="form-group">
        <label>Shards to sell:</label>
        <input type="number" id="shards-to-sell" value="0" min="0" max="${wyrdstone}" class="form-control" style="width: 100px">
        <span id="sale-value">= 0gc</span>
      </div>

      <button id="sell-wyrdstone" class="btn">Sell Wyrdstone</button>
    </div>
  `;

  const input = document.getElementById('shards-to-sell');
  const valueSpan = document.getElementById('sale-value');

  input.addEventListener('input', () => {
    const shards = parseInt(input.value) || 0;
    valueSpan.textContent = `= ${shards * WYRDSTONE_PRICE}gc`;
  });

  document.getElementById('sell-wyrdstone').addEventListener('click', () => {
    const shards = parseInt(input.value) || 0;
    if (shards > 0 && shards <= currentWarband.wyrdstone) {
      currentWarband.wyrdstone -= shards;
      currentWarband.treasury += shards * WYRDSTONE_PRICE;
      renderSellWyrdstoneStep(content);
    }
  });
}

function renderVeteransStep(content) {
  content.innerHTML = `
    <h3>Step 5: Check Available Veterans</h3>
    <p>Roll to see what experienced warriors are available for hire.</p>
    <p class="text-muted">This step is optional and depends on your campaign rules.</p>
    <button id="skip-veterans" class="btn btn-secondary">Skip This Step</button>
  `;

  document.getElementById('skip-veterans').addEventListener('click', () => {
    currentStep++;
    renderAftermath(document.getElementById('page-container'));
  });
}

function renderRareItemsStep(content) {
  content.innerHTML = `
    <h3>Step 6: Rare Items</h3>
    <p>Search for rare items in the trading post.</p>
    <p>Roll 2D6 + warband size bonus. If equal or higher than rarity, item is available.</p>

    <div class="card">
      <p><strong>Treasury:</strong> ${currentWarband.treasury}gc</p>
      <p><strong>Warband Size Bonus:</strong> +${Math.floor(currentWarband.warriors.length / 5)}</p>

      <div class="form-group">
        <label>Item Rarity:</label>
        <input type="number" id="item-rarity" value="7" min="5" max="12" class="form-control" style="width: 100px">
      </div>

      <button id="roll-availability" class="btn">Roll Availability</button>
      <p id="availability-result" class="mt-2"></p>
    </div>
  `;

  document.getElementById('roll-availability').addEventListener('click', () => {
    const rarity = parseInt(document.getElementById('item-rarity').value) || 7;
    const bonus = Math.floor(currentWarband.warriors.length / 5);
    const roll = roll2D6();
    const total = roll + bonus;
    const available = total >= rarity;

    document.getElementById('availability-result').innerHTML = `
      Roll: ${roll} + ${bonus} = ${total} vs Rarity ${rarity}
      <br><strong>${available ? 'Item is AVAILABLE!' : 'Item not found.'}</strong>
    `;
  });
}

function renderDramatisStep(content) {
  content.innerHTML = `
    <h3>Step 7: Dramatis Personae</h3>
    <p>Check if any special characters (Hired Swords) are available.</p>
    <p class="text-muted">This step is optional and depends on your campaign.</p>
    <button id="skip-dramatis" class="btn btn-secondary">Skip This Step</button>
  `;

  document.getElementById('skip-dramatis').addEventListener('click', () => {
    currentStep++;
    renderAftermath(document.getElementById('page-container'));
  });
}

function renderRecruitsStep(content) {
  content.innerHTML = `
    <h3>Step 8: Recruits</h3>
    <p>Hire new warriors and buy common equipment.</p>

    <div class="card">
      <p><strong>Treasury:</strong> ${currentWarband.treasury}gc</p>
      <p><strong>Current Warriors:</strong> ${currentWarband.warriors.length}</p>
      <p class="text-muted">Use the Warband Creator to add new warriors to your roster.</p>
    </div>
  `;
}

function renderEquipmentStep(content) {
  content.innerHTML = `
    <h3>Step 9: Reallocate Equipment</h3>
    <p>Move weapons and armor between warriors as needed.</p>
    <p class="text-muted">Equipment management will be available in the warband view.</p>
  `;
}

function renderRatingStep(content) {
  // Calculate new rating
  let rating = 0;
  for (const warrior of currentWarband.warriors) {
    if (warrior.status !== 'dead') {
      const isLarge = warrior.largeCreature || warrior.type === 'ratOgre';
      rating += (isLarge ? 20 : 5) + (warrior.experience || 0);
    }
  }
  currentWarband.rating = rating;

  // Remove dead warriors
  const deadCount = currentWarband.warriors.filter(w => w.status === 'dead').length;
  currentWarband.warriors = currentWarband.warriors.filter(w => w.status !== 'dead');

  content.innerHTML = `
    <h3>Step 10: Update Rating</h3>

    <div class="card">
      <p><strong>New Warband Rating:</strong> ${rating}</p>
      <p><strong>Warriors:</strong> ${currentWarband.warriors.length}</p>
      <p><strong>Treasury:</strong> ${currentWarband.treasury}gc</p>
      <p><strong>Wyrdstone Stash:</strong> ${currentWarband.wyrdstone || 0} shards</p>
      ${deadCount > 0 ? `<p class="text-muted">${deadCount} warrior(s) removed from roster.</p>` : ''}
    </div>

    <p class="mt-2">Click "Complete" to save your warband and finish the post-battle sequence.</p>
  `;
}

function formatTypeName(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/_/g, ' ');
}
