// Rules Reference UI Module

import { BS_TO_HIT, getCloseCombatToHit, getWoundRoll } from '../data/characteristics.js';
import { SKILLS } from '../data/skills.js';
import { MELEE_WEAPONS, RANGED_WEAPONS, ARMOR } from '../data/equipment.js';
import { HERO_SERIOUS_INJURIES, INJURY_RESULTS } from '../data/injuries.js';

export function showRulesReference(container) {
  container.innerHTML = `
    <div id="rules-reference">
      <h2>Rules Reference</h2>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Quick Navigation</span>
        </div>
        <div class="flex gap-1" style="flex-wrap: wrap;">
          <button class="btn btn-secondary" data-section="shooting">Shooting</button>
          <button class="btn btn-secondary" data-section="combat">Combat</button>
          <button class="btn btn-secondary" data-section="wounds">Wounds</button>
          <button class="btn btn-secondary" data-section="injuries">Injuries</button>
          <button class="btn btn-secondary" data-section="weapons">Weapons</button>
          <button class="btn btn-secondary" data-section="armor">Armor</button>
          <button class="btn btn-secondary" data-section="skills">Skills</button>
        </div>
      </div>

      <div id="rules-content">
        <!-- Content loaded dynamically -->
      </div>
    </div>
  `;

  // Add click handlers
  container.querySelectorAll('[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      showSection(section);
    });
  });

  // Show shooting by default
  showSection('shooting');
}

function showSection(section) {
  const content = document.getElementById('rules-content');

  switch (section) {
    case 'shooting':
      content.innerHTML = getShootingReference();
      break;
    case 'combat':
      content.innerHTML = getCombatReference();
      break;
    case 'wounds':
      content.innerHTML = getWoundsReference();
      break;
    case 'injuries':
      content.innerHTML = getInjuriesReference();
      break;
    case 'weapons':
      content.innerHTML = getWeaponsReference();
      break;
    case 'armor':
      content.innerHTML = getArmorReference();
      break;
    case 'skills':
      content.innerHTML = getSkillsReference();
      break;
  }
}

function getShootingReference() {
  return `
    <div class="card">
      <h3>Shooting To Hit</h3>
      <table>
        <tr>
          <th>BS</th>
          ${[1,2,3,4,5,6,7,8,9,10].map(bs => `<td>${bs}</td>`).join('')}
        </tr>
        <tr>
          <th>Need</th>
          ${[1,2,3,4,5,6,7,8,9,10].map(bs => `<td>${BS_TO_HIT[bs] || '-'}</td>`).join('')}
        </tr>
      </table>

      <h4 class="mt-2">Hit Modifiers</h4>
      <ul>
        <li>-1 Target in cover</li>
        <li>-1 Long range (over half weapon range)</li>
        <li>-1 Moving and shooting</li>
        <li>+1 Large target</li>
      </ul>
    </div>
  `;
}

function getCombatReference() {
  return `
    <div class="card">
      <h3>Close Combat To Hit</h3>
      <table>
        <tr>
          <th>WS vs WS</th>
          <th>Roll Needed</th>
        </tr>
        <tr><td>Attacker WS ≥ 2x Defender</td><td>3+</td></tr>
        <tr><td>Attacker WS > Defender</td><td>3+</td></tr>
        <tr><td>Equal WS</td><td>4+</td></tr>
        <tr><td>Defender WS > Attacker</td><td>4+</td></tr>
        <tr><td>Defender WS ≥ 2x Attacker</td><td>5+</td></tr>
      </table>

      <h4 class="mt-2">Combat Order</h4>
      <ol>
        <li>Chargers strike first</li>
        <li>By Initiative (highest first)</li>
        <li>Warriors who stood up this turn strike last</li>
      </ol>
    </div>
  `;
}

function getWoundsReference() {
  return `
    <div class="card">
      <h3>Wound Chart</h3>
      <table>
        <tr>
          <th>S vs T</th>
          <th>Roll Needed</th>
        </tr>
        <tr><td>S ≥ T+2</td><td>2+</td></tr>
        <tr><td>S = T+1</td><td>3+</td></tr>
        <tr><td>S = T</td><td>4+</td></tr>
        <tr><td>S = T-1</td><td>5+</td></tr>
        <tr><td>S = T-2</td><td>6+</td></tr>
        <tr><td>S ≤ T-3</td><td>Cannot wound</td></tr>
      </table>

      <h4 class="mt-2">Armor Save Modifiers</h4>
      <table>
        <tr>
          <th>Strength</th>
          <th>Modifier</th>
        </tr>
        <tr><td>1-3</td><td>None</td></tr>
        <tr><td>4</td><td>-1</td></tr>
        <tr><td>5</td><td>-2</td></tr>
        <tr><td>6</td><td>-3</td></tr>
        <tr><td>7</td><td>-4</td></tr>
        <tr><td>8+</td><td>-5</td></tr>
      </table>
    </div>
  `;
}

function getInjuriesReference() {
  return `
    <div class="card">
      <h3>Injury Roll (D6)</h3>
      <table>
        <tr><td>1-2</td><td><span class="status status-knockedDown">Knocked Down</span></td></tr>
        <tr><td>3-4</td><td><span class="status status-stunned">Stunned</span></td></tr>
        <tr><td>5-6</td><td><span class="status status-outOfAction">Out of Action</span></td></tr>
      </table>

      <h4 class="mt-2">Critical Hits (on 6 to wound)</h4>
      <table>
        <tr><td>1-2</td><td>Vital Part: 2 wounds, normal armor</td></tr>
        <tr><td>3-4</td><td>Exposed Spot: 2 wounds, no armor</td></tr>
        <tr><td>5-6</td><td>Master Strike: 2 wounds, no armor, +2 injury</td></tr>
      </table>
    </div>
  `;
}

function getWeaponsReference() {
  return `
    <div class="card">
      <h3>Melee Weapons</h3>
      <table>
        <tr><th>Weapon</th><th>Cost</th><th>Strength</th><th>Special</th></tr>
        ${Object.entries(MELEE_WEAPONS).map(([key, w]) => `
          <tr>
            <td>${w.name}</td>
            <td>${w.cost}gc</td>
            <td>${w.strength}</td>
            <td>${w.rules?.join(', ') || '-'}</td>
          </tr>
        `).join('')}
      </table>

      <h3 class="mt-2">Ranged Weapons</h3>
      <table>
        <tr><th>Weapon</th><th>Cost</th><th>Range</th><th>S</th><th>Special</th></tr>
        ${Object.entries(RANGED_WEAPONS).map(([key, w]) => `
          <tr>
            <td>${w.name}</td>
            <td>${w.cost}gc</td>
            <td>${w.range}"</td>
            <td>${w.strength}</td>
            <td>${w.rules?.join(', ') || '-'}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;
}

function getArmorReference() {
  return `
    <div class="card">
      <h3>Armor</h3>
      <table>
        <tr><th>Armor</th><th>Cost</th><th>Save</th></tr>
        <tr><td>Light Armor</td><td>20gc</td><td>6+</td></tr>
        <tr><td>Heavy Armor</td><td>50gc</td><td>5+</td></tr>
        <tr><td>Gromril Armor</td><td>150gc</td><td>4+</td></tr>
        <tr><td>Shield</td><td>5gc</td><td>+1</td></tr>
        <tr><td>Buckler</td><td>5gc</td><td>Parry</td></tr>
        <tr><td>Helmet</td><td>10gc</td><td>4+ vs Stun</td></tr>
      </table>
    </div>
  `;
}

function getSkillsReference() {
  const categories = ['combat', 'shooting', 'academic', 'strength', 'speed'];

  return `
    <div class="card">
      <h3>Skills</h3>
      ${categories.map(cat => `
        <h4 class="mt-2">${cat.charAt(0).toUpperCase() + cat.slice(1)} Skills</h4>
        <ul>
          ${Object.entries(SKILLS)
            .filter(([k, s]) => s.category === cat)
            .map(([k, s]) => `<li><strong>${s.name}:</strong> ${s.description}</li>`)
            .join('')}
        </ul>
      `).join('')}
    </div>
  `;
}
