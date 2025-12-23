// Warband Creator Page

import { createSignal, createEffect, For, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { WARBAND_TYPES } from '../data/warbands';
import { createWarband, addWarrior, validateWarband, formatTypeName } from '../logic/warbandManager';
import { warbandStore } from '../stores/warbandStore';
import type { Warband, WarbandType, HeroDefinition, HenchmanDefinition } from '../types';
import { Card, Button, FormControl } from '../components/common';
import { WarriorList, TreasuryDisplay } from '../components/warband';

type Step = 1 | 2 | 3 | 4;

export default function WarbandCreator() {
  const navigate = useNavigate();
  const [step, setStep] = createSignal<Step>(1);
  const [selectedType, setSelectedType] = createSignal<string>('');
  const [warband, setWarband] = createSignal<Warband | null>(null);
  const [saving, setSaving] = createSignal(false);

  const warbandType = () => selectedType() ? WARBAND_TYPES[selectedType()] : null;
  const validation = () => validateWarband(warband());

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    if (type) {
      setWarband(createWarband(type, ''));
    } else {
      setWarband(null);
    }
  };

  const handleNameChange = (name: string) => {
    const wb = warband();
    if (wb) {
      setWarband({ ...wb, name });
    }
  };

  const handleAddWarrior = (warriorType: string, category: 'hero' | 'henchman') => {
    const wb = warband();
    const wt = warbandType();
    if (!wb || !wt) return;

    const def = category === 'hero'
      ? wt.heroes[warriorType]
      : wt.henchmen[warriorType];

    if (wb.treasury < def.cost) {
      alert('Not enough gold!');
      return;
    }

    // Clone warband and add warrior
    const newWarband = { ...wb, warriors: [...wb.warriors] };
    addWarrior(newWarband, warriorType, category, def);
    newWarband.treasury -= def.cost;
    setWarband(newWarband);
  };

  const handleRemoveWarrior = (warriorId: string) => {
    const wb = warband();
    if (!wb) return;

    const warrior = wb.warriors.find(w => w.id === warriorId);
    if (!warrior) return;

    const newWarband = {
      ...wb,
      warriors: wb.warriors.filter(w => w.id !== warriorId),
      treasury: wb.treasury + warrior.cost
    };
    setWarband(newWarband);
  };

  const handleSave = async () => {
    const wb = warband();
    if (!wb || !validation().valid) return;

    setSaving(true);
    try {
      await warbandStore.saveWarband(wb);
      navigate('/warband/list');
    } catch (e) {
      alert('Failed to save: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => setStep(s => Math.min(4, s + 1) as Step);
  const prevStep = () => setStep(s => Math.max(1, s - 1) as Step);

  return (
    <div class="page warband-creator">
      <h2>Create New Warband</h2>

      {/* Step 1: Choose Type */}
      <Show when={step() === 1}>
        <Card title="Step 1: Choose Warband Type">
          <FormControl
            type="select"
            value={selectedType()}
            onChange={handleTypeChange}
            options={[
              { value: '', label: '-- Select Warband Type --' },
              ...Object.entries(WARBAND_TYPES).map(([key, wb]) => ({
                value: key,
                label: `${wb.name} (${wb.startingGold}gc)`
              }))
            ]}
          />
          <Show when={warbandType()}>
            <div class="type-info">
              <p>Starting Gold: {warbandType()?.startingGold}gc</p>
              <p>Max Warriors: {warbandType()?.maxWarriors}</p>
            </div>
          </Show>
          <div class="step-actions">
            <Button onClick={nextStep} disabled={!selectedType()}>Next</Button>
          </div>
        </Card>
      </Show>

      {/* Step 2: Name Warband */}
      <Show when={step() === 2}>
        <Card title="Step 2: Name Your Warband">
          <FormControl
            type="text"
            label="Warband Name"
            value={warband()?.name || ''}
            onChange={handleNameChange}
            placeholder="Enter warband name..."
          />
          <div class="step-actions">
            <Button variant="secondary" onClick={prevStep}>Back</Button>
            <Button onClick={nextStep} disabled={!warband()?.name?.trim()}>Next</Button>
          </div>
        </Card>
      </Show>

      {/* Step 3: Recruit Warriors */}
      <Show when={step() === 3}>
        <Card
          title="Step 3: Recruit Warriors"
          headerRight={<TreasuryDisplay amount={warband()?.treasury || 0} />}
        >
          <div class="recruit-section">
            <h4>Heroes</h4>
            <div class="recruit-options">
              <For each={Object.entries(warbandType()?.heroes || {})}>
                {([type, def]) => (
                  <button
                    class="recruit-btn"
                    onClick={() => handleAddWarrior(type, 'hero')}
                    disabled={(warband()?.treasury || 0) < def.cost}
                  >
                    {formatTypeName(type)} ({def.cost}gc)
                  </button>
                )}
              </For>
            </div>

            <h4>Henchmen</h4>
            <div class="recruit-options">
              <For each={Object.entries(warbandType()?.henchmen || {})}>
                {([type, def]) => (
                  <button
                    class="recruit-btn"
                    onClick={() => handleAddWarrior(type, 'henchman')}
                    disabled={(warband()?.treasury || 0) < def.cost}
                  >
                    {formatTypeName(type)} ({def.cost}gc)
                  </button>
                )}
              </For>
            </div>
          </div>

          <WarriorList
            warriors={warband()?.warriors || []}
            showActions
            onRemove={(w) => handleRemoveWarrior(w.id)}
          />

          <div class="step-actions">
            <Button variant="secondary" onClick={prevStep}>Back</Button>
            <Button onClick={nextStep}>Next</Button>
          </div>
        </Card>
      </Show>

      {/* Step 4: Review and Save */}
      <Show when={step() === 4}>
        <Card title="Step 4: Review Warband">
          <div class="warband-summary">
            <h3>{warband()?.name}</h3>
            <p>{warband()?.typeName}</p>
            <p>Warriors: {warband()?.warriors.length}</p>
            <TreasuryDisplay amount={warband()?.treasury || 0} />
          </div>

          <WarriorList warriors={warband()?.warriors || []} compact />

          <div class="validation-status">
            <For each={validation().errors}>
              {(err) => <p class="error">{err}</p>}
            </For>
            <Show when={validation().valid}>
              <p class="success">Warband is valid!</p>
            </Show>
          </div>

          <div class="step-actions">
            <Button variant="secondary" onClick={prevStep}>Back</Button>
            <Button
              variant="success"
              onClick={handleSave}
              disabled={!validation().valid || saving()}
            >
              {saving() ? 'Saving...' : 'Save Warband'}
            </Button>
          </div>
        </Card>
      </Show>
    </div>
  );
}
