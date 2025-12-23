// Dice Roller UI Module

import { rollD6, roll2D6, rollD3, rollD66 } from '../logic/gameRules.js';

// Show dice modal with result
export function showDiceResult(options = {}) {
  const {
    title = 'Rolling...',
    diceType = 'D6',
    count = 1,
    target = null,
    modifier = 0,
    callback = null
  } = options;

  const modal = document.getElementById('dice-modal');
  const display = document.getElementById('dice-display');
  const result = document.getElementById('dice-result');
  const titleEl = document.getElementById('dice-title');
  const closeBtn = document.getElementById('dice-close');

  titleEl.textContent = title;

  // Roll the dice
  let rolls = [];
  let total = 0;

  switch (diceType) {
    case 'D3':
      for (let i = 0; i < count; i++) {
        const roll = rollD3();
        rolls.push(roll);
        total += roll;
      }
      break;
    case 'D66':
      const d66 = rollD66();
      rolls = [Math.floor(d66 / 10), d66 % 10];
      total = d66;
      break;
    case '2D6':
      const r1 = rollD6();
      const r2 = rollD6();
      rolls = [r1, r2];
      total = r1 + r2;
      break;
    default: // D6
      for (let i = 0; i < count; i++) {
        const roll = rollD6();
        rolls.push(roll);
        total += roll;
      }
  }

  total += modifier;

  // Determine success
  let success = null;
  if (target !== null) {
    success = total >= target;
  }

  // Display dice
  display.innerHTML = rolls.map(roll => {
    const dieClass = success === true ? 'success' : success === false ? 'fail' : '';
    return `<div class="die ${dieClass}">${roll}</div>`;
  }).join('');

  // Display result
  let resultText = `Total: ${total}`;
  if (modifier !== 0) {
    resultText = `${rolls.join(' + ')} + ${modifier} = ${total}`;
  }
  if (target !== null) {
    resultText += ` (needed ${target}+)`;
    resultText += success ? ' - SUCCESS!' : ' - FAILED';
  }
  result.textContent = resultText;

  // Show modal
  modal.classList.remove('hidden');

  // Close button handler
  closeBtn.onclick = () => {
    modal.classList.add('hidden');
    if (callback) {
      callback({ rolls, total, success });
    }
  };
}

// Quick roll functions
export function quickRollD6(callback) {
  showDiceResult({
    title: 'Rolling D6',
    diceType: 'D6',
    callback
  });
}

export function quickRoll2D6(target, callback) {
  showDiceResult({
    title: 'Rolling 2D6',
    diceType: '2D6',
    target,
    callback
  });
}

export function rollLeadershipTest(leadership, callback) {
  showDiceResult({
    title: 'Leadership Test',
    diceType: '2D6',
    target: leadership,
    callback
  });
}

export function rollCharacteristicTest(characteristic, value, callback) {
  showDiceResult({
    title: `${characteristic} Test`,
    diceType: 'D6',
    target: value,
    callback
  });
}

export function rollToHit(needed, callback) {
  showDiceResult({
    title: 'Roll to Hit',
    diceType: 'D6',
    target: needed,
    callback
  });
}

export function rollToWound(needed, callback) {
  showDiceResult({
    title: 'Roll to Wound',
    diceType: 'D6',
    target: needed,
    callback
  });
}

export function rollArmorSave(needed, callback) {
  showDiceResult({
    title: 'Armor Save',
    diceType: 'D6',
    target: needed,
    callback
  });
}

export function rollInjury(modifier, callback) {
  showDiceResult({
    title: 'Injury Roll',
    diceType: 'D6',
    modifier,
    callback: (result) => {
      let injury;
      if (result.total <= 2) injury = 'Knocked Down';
      else if (result.total <= 4) injury = 'Stunned';
      else injury = 'Out of Action';

      if (callback) {
        callback({ ...result, injury });
      }
    }
  });
}

export function rollSeriousInjury(callback) {
  showDiceResult({
    title: 'Serious Injury (D66)',
    diceType: 'D66',
    callback
  });
}
