// Game Play UI Module

import { getAllWarbands } from '../logic/storage.js';
import { SCENARIOS, SCENARIO_TABLE } from '../data/scenarios.js';
import { rollD6, roll2D6 } from '../logic/gameRules.js';

export async function showGameSetup(container) {
  container.innerHTML = `
    <div id="game-setup">
      <h2>Start a Game</h2>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Select Warbands</span>
        </div>

        <div class="form-group">
          <label>Player 1 Warband</label>
          <select id="warband-1" class="form-control">
            <option value="">-- Select Warband --</option>
          </select>
        </div>

        <div class="form-group">
          <label>Player 2 Warband</label>
          <select id="warband-2" class="form-control">
            <option value="">-- Select Warband --</option>
          </select>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Scenario</span>
        </div>

        <div class="form-group">
          <label>Scenario Selection</label>
          <select id="scenario-method" class="form-control">
            <option value="random">Random (roll 2D6)</option>
            <option value="choose">Choose Manually</option>
          </select>
        </div>

        <div id="scenario-select" class="form-group hidden">
          <label>Select Scenario</label>
          <select id="scenario" class="form-control">
            ${Object.entries(SCENARIOS).map(([key, scenario]) =>
              `<option value="${key}">${scenario.name}</option>`
            ).join('')}
          </select>
        </div>

        <div id="scenario-roll" class="text-center hidden">
          <button id="roll-scenario" class="btn">Roll for Scenario</button>
          <p id="scenario-result" class="mt-2"></p>
        </div>
      </div>

      <div class="card hidden" id="game-start-section">
        <button id="start-game" class="btn btn-success" style="width: 100%">Start Game</button>
      </div>
    </div>
  `;

  await initGameSetup();
}

async function initGameSetup() {
  // Load warbands
  const warbands = await getAllWarbands();

  const select1 = document.getElementById('warband-1');
  const select2 = document.getElementById('warband-2');

  warbands.forEach(wb => {
    const option1 = document.createElement('option');
    option1.value = wb.id;
    option1.textContent = `${wb.name} (${wb.typeName}) - Rating: ${wb.rating}`;
    select1.appendChild(option1);

    const option2 = option1.cloneNode(true);
    select2.appendChild(option2);
  });

  // Scenario method change
  const methodSelect = document.getElementById('scenario-method');
  methodSelect.addEventListener('change', () => {
    const method = methodSelect.value;
    document.getElementById('scenario-select').classList.toggle('hidden', method === 'random');
    document.getElementById('scenario-roll').classList.toggle('hidden', method !== 'random');
  });

  // Initialize with random selected
  document.getElementById('scenario-roll').classList.remove('hidden');

  // Roll scenario button
  document.getElementById('roll-scenario').addEventListener('click', rollForScenario);

  // Warband selection change
  select1.addEventListener('change', checkCanStart);
  select2.addEventListener('change', checkCanStart);

  // Start game button
  document.getElementById('start-game').addEventListener('click', startGame);
}

function rollForScenario() {
  const die1 = rollD6();
  const die2 = rollD6();
  const total = die1 + die2;

  const scenarioKey = SCENARIO_TABLE[total];
  const resultDiv = document.getElementById('scenario-result');

  if (scenarioKey === 'player_choice') {
    resultDiv.innerHTML = `
      <div class="die">${die1}</div> + <div class="die">${die2}</div> = ${total}<br>
      <strong>Lower rating player chooses the scenario!</strong>
    `;
  } else {
    const scenario = SCENARIOS[scenarioKey];
    resultDiv.innerHTML = `
      <div style="display: flex; justify-content: center; gap: 0.5rem; margin-bottom: 0.5rem;">
        <div class="die">${die1}</div>
        <div class="die">${die2}</div>
      </div>
      <strong>${scenario.name}</strong><br>
      ${scenario.description}
    `;
  }

  checkCanStart();
}

function checkCanStart() {
  const wb1 = document.getElementById('warband-1').value;
  const wb2 = document.getElementById('warband-2').value;
  const method = document.getElementById('scenario-method').value;
  const hasScenario = method === 'choose' || document.getElementById('scenario-result').textContent !== '';

  const canStart = wb1 && wb2 && wb1 !== wb2 && hasScenario;
  document.getElementById('game-start-section').classList.toggle('hidden', !canStart);
}

async function startGame() {
  const wb1Id = document.getElementById('warband-1').value;
  const wb2Id = document.getElementById('warband-2').value;

  // Get scenario
  let scenarioKey;
  const method = document.getElementById('scenario-method').value;
  if (method === 'choose') {
    scenarioKey = document.getElementById('scenario').value;
  } else {
    // Parse from result
    const resultText = document.getElementById('scenario-result').textContent;
    scenarioKey = Object.keys(SCENARIOS).find(key =>
      resultText.includes(SCENARIOS[key].name)
    );
  }

  if (!scenarioKey) {
    alert('Please select or roll for a scenario first');
    return;
  }

  // Store game setup and transition to gameplay
  sessionStorage.setItem('gameSetup', JSON.stringify({
    warband1Id: wb1Id,
    warband2Id: wb2Id,
    scenario: scenarioKey
  }));

  // Show game play UI
  showGamePlay(document.getElementById('page-container'));
}

function showGamePlay(container) {
  const setup = JSON.parse(sessionStorage.getItem('gameSetup'));
  const scenario = SCENARIOS[setup.scenario];

  container.innerHTML = `
    <div id="game-play">
      <div class="phase-indicator">
        <span id="current-phase">Setup Phase</span>
      </div>

      <div class="card">
        <h3>${scenario.name}</h3>
        <p>${scenario.description}</p>
      </div>

      <div class="action-prompt">
        <h3>Board Setup</h3>
        <p><strong>Terrain:</strong> ${scenario.setup.terrain}</p>
        <p><strong>Deployment:</strong></p>
        <ul>
          ${Object.entries(scenario.setup.deployment || {}).map(([role, instructions]) =>
            `<li><strong>${role}:</strong> ${instructions}</li>`
          ).join('')}
        </ul>
      </div>

      <div class="action-options">
        <button class="btn" id="setup-complete">Setup Complete - Start Game</button>
      </div>
    </div>
  `;

  document.getElementById('setup-complete').addEventListener('click', () => {
    startTurnLoop(container, setup, scenario);
  });
}

function startTurnLoop(container, setup, scenario) {
  // Initialize game state
  const gameState = {
    turn: 1,
    currentPlayer: 1,
    phase: 'recovery',
    scenario: scenario
  };

  showTurnPhase(container, gameState);
}

function showTurnPhase(container, gameState) {
  const phases = ['Recovery', 'Movement', 'Shooting', 'Combat'];
  const currentPhaseName = phases[['recovery', 'movement', 'shooting', 'combat'].indexOf(gameState.phase)];

  container.innerHTML = `
    <div id="game-play">
      <div class="phase-indicator">
        Turn ${gameState.turn} - Player ${gameState.currentPlayer} - ${currentPhaseName} Phase
      </div>

      <div class="action-prompt">
        <h3>${currentPhaseName} Phase</h3>
        <p>Perform ${currentPhaseName.toLowerCase()} phase actions...</p>
      </div>

      <div class="action-options">
        <button class="btn" id="next-phase">End Phase</button>
        <button class="btn btn-secondary" id="roll-dice">Roll Dice</button>
        <button class="btn btn-danger" id="end-game">End Game</button>
      </div>
    </div>
  `;

  document.getElementById('next-phase').addEventListener('click', () => {
    advancePhase(container, gameState);
  });

  document.getElementById('roll-dice').addEventListener('click', () => {
    showDiceRoller();
  });

  document.getElementById('end-game').addEventListener('click', () => {
    showEndGameOptions(container, gameState);
  });
}

function showEndGameOptions(container, gameState) {
  const setup = JSON.parse(sessionStorage.getItem('gameSetup'));

  container.innerHTML = `
    <div id="end-game">
      <h2>End Game</h2>

      <div class="card">
        <h3>Battle Result</h3>
        <div class="form-group">
          <label>Which warband won?</label>
          <select id="winner" class="form-control">
            <option value="">-- Select Winner --</option>
            <option value="${setup.warband1Id}">Player 1 (Warband 1)</option>
            <option value="${setup.warband2Id}">Player 2 (Warband 2)</option>
            <option value="draw">Draw</option>
          </select>
        </div>
      </div>

      <div class="action-options">
        <button class="btn btn-success" id="proceed-aftermath">Proceed to Post-Battle</button>
        <button class="btn btn-secondary" id="back-to-game">Back to Game</button>
      </div>
    </div>
  `;

  document.getElementById('proceed-aftermath').addEventListener('click', async () => {
    const winner = document.getElementById('winner').value;
    if (!winner) {
      alert('Please select a winner');
      return;
    }

    // Store battle result
    sessionStorage.setItem('battleResult', JSON.stringify({
      winner,
      warband1Id: setup.warband1Id,
      warband2Id: setup.warband2Id
    }));

    // Navigate to aftermath
    import('./aftermath.js').then(module => {
      // Ask which warband to process first
      module.showAftermath(container, setup.warband1Id, { winner });
    });
  });

  document.getElementById('back-to-game').addEventListener('click', () => {
    showTurnPhase(container, gameState);
  });
}

function advancePhase(container, gameState) {
  const phases = ['recovery', 'movement', 'shooting', 'combat'];
  const currentIndex = phases.indexOf(gameState.phase);

  if (currentIndex < phases.length - 1) {
    // Next phase
    gameState.phase = phases[currentIndex + 1];
  } else {
    // End of turn, switch player or advance turn
    if (gameState.currentPlayer === 1) {
      gameState.currentPlayer = 2;
      gameState.phase = 'recovery';
    } else {
      gameState.turn++;
      gameState.currentPlayer = 1;
      gameState.phase = 'recovery';
    }
  }

  showTurnPhase(container, gameState);
}

function showDiceRoller() {
  const modal = document.getElementById('dice-modal');
  const display = document.getElementById('dice-display');
  const result = document.getElementById('dice-result');
  const title = document.getElementById('dice-title');

  title.textContent = 'Rolling D6...';
  const roll = rollD6();

  display.innerHTML = `<div class="die">${roll}</div>`;
  result.textContent = `Result: ${roll}`;

  modal.classList.remove('hidden');

  document.getElementById('dice-close').onclick = () => {
    modal.classList.add('hidden');
  };
}
