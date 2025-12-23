// Mordheim Equipment Data

import type { MeleeWeapons, RangedWeapons, ArmorTypes, WeaponRules } from '../types';

export const MELEE_WEAPONS: MeleeWeapons = {
  dagger: {
    name: 'Dagger',
    cost: 2, // First is free
    strength: 'user',
    rules: ['enemyArmorSaveBonus'],
    description: 'Enemy gets +1 to armor save'
  },
  fist: {
    name: 'Fist',
    cost: 0,
    strength: 'user-1',
    rules: ['enemyArmorSaveBonus', 'singleAttack'],
    description: 'Only 1 attack, enemy gets +1 to armor save'
  },
  mace: {
    name: 'Mace/Hammer/Club',
    cost: 3,
    strength: 'user',
    rules: ['concussion'],
    description: 'Concussion: 2-4 on injury is Stunned'
  },
  axe: {
    name: 'Axe',
    cost: 5,
    strength: 'user',
    rules: ['cuttingEdge'],
    description: 'Cutting Edge: Extra -1 armor save modifier'
  },
  sword: {
    name: 'Sword',
    cost: 10,
    strength: 'user',
    rules: ['parry'],
    description: 'Parry: Can parry one attack per combat phase'
  },
  morningstar: {
    name: 'Morning Star',
    cost: 15,
    strength: 'user+1',
    rules: ['heavy', 'difficultToUse'],
    description: '+1S first turn only, cannot use buckler'
  },
  flail: {
    name: 'Flail',
    cost: 15,
    strength: 'user+2',
    rules: ['heavy', 'twoHanded'],
    description: '+2S first turn only, two-handed'
  },
  doubleHanded: {
    name: 'Double-Handed Weapon',
    cost: 15,
    strength: 'user+2',
    rules: ['twoHanded', 'strikeLast'],
    description: '+2S, two-handed, always strikes last'
  },
  spear: {
    name: 'Spear',
    cost: 10,
    strength: 'user',
    rules: ['strikeFirst', 'unwieldy', 'cavalryBonus'],
    description: 'Strike first on first turn, cavalry +1S on charge'
  },
  halberd: {
    name: 'Halberd',
    cost: 10,
    strength: 'user+1',
    rules: ['twoHanded'],
    description: '+1S, two-handed'
  }
};

export const RANGED_WEAPONS: RangedWeapons = {
  shortBow: {
    name: 'Short Bow',
    cost: 5,
    range: 16,
    strength: 3,
    rules: []
  },
  bow: {
    name: 'Bow',
    cost: 10,
    range: 24,
    strength: 3,
    rules: []
  },
  longBow: {
    name: 'Long Bow',
    cost: 15,
    range: 30,
    strength: 3,
    rules: []
  },
  elfBow: {
    name: 'Elf Bow',
    cost: 35, // Rare
    range: 36,
    strength: 3,
    rules: ['saveModifier-1'],
    description: '-1 armor save modifier'
  },
  crossbow: {
    name: 'Crossbow',
    cost: 25,
    range: 30,
    strength: 4,
    rules: ['moveOrFire']
  },
  sling: {
    name: 'Sling',
    cost: 2,
    range: 18,
    strength: 3,
    rules: ['fireTwiceHalfRange']
  },
  throwingKnife: {
    name: 'Throwing Knife/Star',
    cost: 10,
    range: 6,
    strength: 'user',
    rules: ['thrownWeapon']
  },
  pistol: {
    name: 'Pistol',
    cost: 15, // 30 for brace
    range: 6,
    strength: 4,
    rules: ['prepareShot', 'saveModifier-2', 'handToHand']
  },
  duellingPistol: {
    name: 'Duelling Pistol',
    cost: 25, // 50 for brace
    range: 10,
    strength: 4,
    rules: ['prepareShot', 'saveModifier-2', 'handToHand', 'accuracy+1']
  },
  blunderbuss: {
    name: 'Blunderbuss',
    cost: 30,
    range: 16,
    strength: 3,
    rules: ['fireOnce', 'shot'],
    description: '16" line, 1" wide, hits all models'
  },
  handgun: {
    name: 'Handgun',
    cost: 35,
    range: 24,
    strength: 4,
    rules: ['prepareShot', 'moveOrFire', 'saveModifier-2']
  },
  huntingRifle: {
    name: 'Hochland Long Rifle',
    cost: 200, // Rare
    range: 48,
    strength: 4,
    rules: ['prepareShot', 'moveOrFire', 'saveModifier-2', 'accuracy+1']
  },
  crossbowPistol: {
    name: 'Crossbow Pistol',
    cost: 35,
    range: 10,
    strength: 4,
    rules: ['handToHandShot']
  },
  repeaterCrossbow: {
    name: 'Repeater Crossbow',
    cost: 40,
    range: 24,
    strength: 3,
    rules: ['fireTwice']
  }
};

export const ARMOR: ArmorTypes = {
  lightArmor: {
    name: 'Light Armour',
    cost: 20,
    save: 6,
    description: '6+ armor save'
  },
  heavyArmor: {
    name: 'Heavy Armour',
    cost: 50,
    save: 5,
    description: '5+ armor save'
  },
  gromrilArmor: {
    name: 'Gromril Armour',
    cost: 150, // Rare
    save: 4,
    description: '4+ armor save (Dwarf-made)'
  },
  shield: {
    name: 'Shield',
    cost: 5,
    saveBonus: 1,
    description: '+1 to armor save'
  },
  buckler: {
    name: 'Buckler',
    cost: 5,
    rules: ['parry'],
    description: 'Can parry attacks in close combat'
  },
  helmet: {
    name: 'Helmet',
    cost: 10,
    rules: ['helmetSave'],
    description: '4+ save vs being stunned (becomes knocked down)'
  }
};

// Weapon special rules
export const WEAPON_RULES: WeaponRules = {
  concussion: 'On injury roll of 2-4, target is Stunned instead of Knocked Down',
  parry: 'Roll D6; if higher than opponent\'s highest to-hit roll, parry that attack',
  enemyArmorSaveBonus: 'Enemy gets +1 to armor save (or 6+ if none)',
  cuttingEdge: 'Extra -1 armor save modifier',
  heavy: 'Strength bonus only applies in first turn of combat',
  twoHanded: 'Cannot use shield/buckler/second weapon in close combat',
  strikeLast: 'Always strikes last in combat, even when charging',
  strikeFirst: 'Strikes first in first turn of combat',
  unwieldy: 'Can only use shield or buckler in other hand',
  cavalryBonus: '+1 Strength when charging on horseback',
  moveOrFire: 'Cannot move and shoot in same turn (except pivot/stand up)',
  prepareShot: 'Takes full turn to reload (fire every other turn)',
  saveModifier: 'Additional armor save modifier',
  handToHand: 'Can be used in close combat for +1 attack at weapon S',
  accuracy: 'Bonus to hit',
  fireOnce: 'Can only be fired once per battle',
  shot: 'Draw line from firer, all models in path are hit',
  fireTwice: 'May fire twice with -1 to hit penalty',
  fireTwiceHalfRange: 'May fire twice at half range with -1 to hit each',
  thrownWeapon: 'No penalties for range or movement',
  helmetSave: '4+ save vs being Stunned (becomes Knocked Down instead)'
};
