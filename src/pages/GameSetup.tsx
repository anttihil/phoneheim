// Game Setup Page

import { createSignal, onMount, For, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { warbandStore, warbandState } from '../stores/warbandStore';
import { uiStore } from '../stores/uiStore';
import { SCENARIOS } from '../data/scenarios';
import { Card, Button, FormControl } from '../components/common';

export default function GameSetup() {
  const navigate = useNavigate();
  const [warband1Id, setWarband1Id] = createSignal<string>('');
  const [warband2Id, setWarband2Id] = createSignal<string>('');
  const [scenarioKey, setScenarioKey] = createSignal<string>('skirmish');

  onMount(() => {
    warbandStore.loadWarbands();
  });

  const canStart = () => warband1Id() && warband2Id() && scenarioKey();

  const handleStart = () => {
    const wb1 = warbandState.warbands.find(w => w.id === warband1Id());
    const wb2 = warbandState.warbands.find(w => w.id === warband2Id());

    if (!wb1 || !wb2) {
      alert('Please select both warbands');
      return;
    }

    uiStore.startGame(wb1, wb2, scenarioKey());
    navigate('/game/play');
  };

  return (
    <div class="page game-setup">
      <h2>Game Setup</h2>

      <Card title="Select Warbands">
        <div class="warband-selection">
          <FormControl
            type="select"
            label="Player 1 Warband"
            value={warband1Id()}
            onChange={setWarband1Id}
            options={[
              { value: '', label: '-- Select Warband --' },
              ...warbandState.warbands.map(w => ({
                value: w.id!,
                label: `${w.name} (${w.typeName})`
              }))
            ]}
          />

          <FormControl
            type="select"
            label="Player 2 Warband"
            value={warband2Id()}
            onChange={setWarband2Id}
            options={[
              { value: '', label: '-- Select Warband --' },
              ...warbandState.warbands.map(w => ({
                value: w.id!,
                label: `${w.name} (${w.typeName})`
              }))
            ]}
          />
        </div>
      </Card>

      <Card title="Select Scenario">
        <FormControl
          type="select"
          label="Scenario"
          value={scenarioKey()}
          onChange={setScenarioKey}
          options={Object.entries(SCENARIOS).map(([key, scenario]) => ({
            value: key,
            label: scenario.name
          }))}
        />

        <Show when={scenarioKey()}>
          <div class="scenario-description">
            <p>{SCENARIOS[scenarioKey()]?.description}</p>
          </div>
        </Show>
      </Card>

      <div class="setup-actions">
        <Button
          onClick={handleStart}
          disabled={!canStart()}
        >
          Start Game
        </Button>

        <Button
          variant="secondary"
          onClick={() => navigate('/')}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
