// Rules Reference Page

import { createSignal, For, Show } from 'solid-js';
import { Card, Button } from '../components/common';
import { MELEE_WEAPONS, RANGED_WEAPONS, ARMOR, WEAPON_RULES } from '../data/equipment';
import { SKILLS, SKILL_CATEGORIES } from '../data/skills';
import { INJURY_RESULTS, HERO_SERIOUS_INJURIES } from '../data/injuries';

type Tab = 'weapons' | 'armor' | 'skills' | 'injuries';

export default function RulesReference() {
  const [activeTab, setActiveTab] = createSignal<Tab>('weapons');

  return (
    <div class="page rules-reference">
      <h2>Rules Reference</h2>

      <div class="tabs">
        <Button
          variant={activeTab() === 'weapons' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('weapons')}
        >
          Weapons
        </Button>
        <Button
          variant={activeTab() === 'armor' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('armor')}
        >
          Armor
        </Button>
        <Button
          variant={activeTab() === 'skills' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('skills')}
        >
          Skills
        </Button>
        <Button
          variant={activeTab() === 'injuries' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('injuries')}
        >
          Injuries
        </Button>
      </div>

      <Show when={activeTab() === 'weapons'}>
        <Card title="Melee Weapons">
          <table class="rules-table">
            <thead>
              <tr>
                <th>Weapon</th>
                <th>Cost</th>
                <th>Strength</th>
                <th>Special Rules</th>
              </tr>
            </thead>
            <tbody>
              <For each={Object.entries(MELEE_WEAPONS)}>
                {([key, weapon]) => (
                  <tr>
                    <td>{weapon.name}</td>
                    <td>{weapon.cost}gc</td>
                    <td>{weapon.strength}</td>
                    <td>{weapon.description || weapon.rules.join(', ')}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Card>

        <Card title="Ranged Weapons">
          <table class="rules-table">
            <thead>
              <tr>
                <th>Weapon</th>
                <th>Cost</th>
                <th>Range</th>
                <th>Strength</th>
                <th>Special Rules</th>
              </tr>
            </thead>
            <tbody>
              <For each={Object.entries(RANGED_WEAPONS)}>
                {([key, weapon]) => (
                  <tr>
                    <td>{weapon.name}</td>
                    <td>{weapon.cost}gc</td>
                    <td>{weapon.range}"</td>
                    <td>{weapon.strength}</td>
                    <td>{weapon.description || weapon.rules.join(', ')}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Card>
      </Show>

      <Show when={activeTab() === 'armor'}>
        <Card title="Armor">
          <table class="rules-table">
            <thead>
              <tr>
                <th>Armor</th>
                <th>Cost</th>
                <th>Save</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <For each={Object.entries(ARMOR)}>
                {([key, armor]) => (
                  <tr>
                    <td>{armor.name}</td>
                    <td>{armor.cost}gc</td>
                    <td>{armor.save ? `${armor.save}+` : armor.saveBonus ? `+${armor.saveBonus}` : '-'}</td>
                    <td>{armor.description}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Card>
      </Show>

      <Show when={activeTab() === 'skills'}>
        <For each={Object.entries(SKILL_CATEGORIES)}>
          {([category, categoryName]) => (
            <Card title={`${categoryName} Skills`}>
              <div class="skills-list">
                <For each={Object.entries(SKILLS).filter(([, s]) => s.category === category)}>
                  {([key, skill]) => (
                    <div class="skill-item">
                      <h4>{skill.name}</h4>
                      <p>{skill.description}</p>
                    </div>
                  )}
                </For>
              </div>
            </Card>
          )}
        </For>
      </Show>

      <Show when={activeTab() === 'injuries'}>
        <Card title="In-Game Injury Results (D6)">
          <table class="rules-table">
            <thead>
              <tr>
                <th>Roll</th>
                <th>Result</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <For each={Object.entries(INJURY_RESULTS)}>
                {([roll, injury]) => (
                  <tr>
                    <td>{roll}</td>
                    <td>{injury.name}</td>
                    <td>{injury.description}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Card>

        <Card title="Hero Serious Injuries (D66)">
          <table class="rules-table">
            <thead>
              <tr>
                <th>Roll</th>
                <th>Result</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <For each={Object.entries(HERO_SERIOUS_INJURIES).slice(0, 20)}>
                {([roll, injury]) => (
                  <tr>
                    <td>{roll}</td>
                    <td>{injury.name}</td>
                    <td>{injury.description}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Card>
      </Show>
    </div>
  );
}
