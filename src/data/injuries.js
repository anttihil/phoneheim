// Mordheim Injuries and Campaign Events

// In-game injury results (when reduced to 0 wounds)
export const INJURY_RESULTS = {
  1: { result: 'knockedDown', name: 'Knocked Down', description: 'Place model face up' },
  2: { result: 'knockedDown', name: 'Knocked Down', description: 'Place model face up' },
  3: { result: 'stunned', name: 'Stunned', description: 'Place model face down' },
  4: { result: 'stunned', name: 'Stunned', description: 'Place model face down' },
  5: { result: 'outOfAction', name: 'Out of Action', description: 'Remove from battle' },
  6: { result: 'outOfAction', name: 'Out of Action', description: 'Remove from battle' }
};

// Critical hit effects (rolled when natural 6 to wound)
export const CRITICAL_HIT_TABLE = {
  1: { name: 'Hits a Vital Part', wounds: 2, ignoreArmor: false, injuryBonus: 0 },
  2: { name: 'Hits a Vital Part', wounds: 2, ignoreArmor: false, injuryBonus: 0 },
  3: { name: 'Hits an Exposed Spot', wounds: 2, ignoreArmor: true, injuryBonus: 0 },
  4: { name: 'Hits an Exposed Spot', wounds: 2, ignoreArmor: true, injuryBonus: 0 },
  5: { name: 'Master Strike', wounds: 2, ignoreArmor: true, injuryBonus: 2 },
  6: { name: 'Master Strike', wounds: 2, ignoreArmor: true, injuryBonus: 2 }
};

// Serious injuries for Henchmen (post-battle, D6 roll)
export const HENCHMAN_SERIOUS_INJURY = {
  1: { result: 'dead', description: 'Remove from roster permanently' },
  2: { result: 'dead', description: 'Remove from roster permanently' },
  3: { result: 'survives', description: 'May fight in next battle' },
  4: { result: 'survives', description: 'May fight in next battle' },
  5: { result: 'survives', description: 'May fight in next battle' },
  6: { result: 'survives', description: 'May fight in next battle' }
};

// Serious injuries for Heroes (post-battle, D66 roll)
export const HERO_SERIOUS_INJURIES = {
  11: { name: 'Dead', description: 'Remove from roster. All equipment lost.' },
  12: { name: 'Dead', description: 'Remove from roster. All equipment lost.' },
  13: { name: 'Dead', description: 'Remove from roster. All equipment lost.' },
  14: { name: 'Dead', description: 'Remove from roster. All equipment lost.' },
  15: { name: 'Dead', description: 'Remove from roster. All equipment lost.' },

  16: { name: 'Multiple Injuries', description: 'Roll D6 times on this table. Re-roll Dead, Captured, and Multiple Injuries.' },
  21: { name: 'Multiple Injuries', description: 'Roll D6 times on this table. Re-roll Dead, Captured, and Multiple Injuries.' },

  22: { name: 'Leg Wound', description: '-1 Movement permanently.', effect: { characteristic: 'M', modifier: -1 } },

  23: {
    name: 'Arm Wound',
    description: 'Roll again: 1=Severe (only one-handed weapons). 2-6=Miss next game.',
    subRoll: {
      1: { name: 'Severe Arm Wound', description: 'Can only use single one-handed weapon from now on.' },
      2: { name: 'Light Wound', description: 'Miss next game.' },
      3: { name: 'Light Wound', description: 'Miss next game.' },
      4: { name: 'Light Wound', description: 'Miss next game.' },
      5: { name: 'Light Wound', description: 'Miss next game.' },
      6: { name: 'Light Wound', description: 'Miss next game.' }
    }
  },

  24: {
    name: 'Madness',
    description: 'Roll D6: 1-3=Stupidity, 4-6=Frenzy.',
    subRoll: {
      1: { name: 'Stupidity', description: 'Suffers from Stupidity from now on.' },
      2: { name: 'Stupidity', description: 'Suffers from Stupidity from now on.' },
      3: { name: 'Stupidity', description: 'Suffers from Stupidity from now on.' },
      4: { name: 'Frenzy', description: 'Suffers from Frenzy from now on.' },
      5: { name: 'Frenzy', description: 'Suffers from Frenzy from now on.' },
      6: { name: 'Frenzy', description: 'Suffers from Frenzy from now on.' }
    }
  },

  25: {
    name: 'Smashed Leg',
    description: 'Roll again: 1=Cannot run. 2-6=Miss next game.',
    subRoll: {
      1: { name: 'Smashed Leg', description: 'Cannot run anymore, but may still charge.' },
      2: { name: 'Light Injury', description: 'Miss next game.' },
      3: { name: 'Light Injury', description: 'Miss next game.' },
      4: { name: 'Light Injury', description: 'Miss next game.' },
      5: { name: 'Light Injury', description: 'Miss next game.' },
      6: { name: 'Light Injury', description: 'Miss next game.' }
    }
  },

  26: { name: 'Chest Wound', description: '-1 Toughness permanently.', effect: { characteristic: 'T', modifier: -1 } },

  31: { name: 'Blinded in One Eye', description: '-1 BS permanently. If blinded in both eyes, must retire.', effect: { characteristic: 'BS', modifier: -1 } },

  32: { name: 'Old Battle Wound', description: 'Roll D6 at start of each battle. On 1, cannot participate.' },

  33: { name: 'Nervous Condition', description: '-1 Initiative permanently.', effect: { characteristic: 'I', modifier: -1 } },

  34: { name: 'Hand Injury', description: '-1 WS permanently.', effect: { characteristic: 'WS', modifier: -1 } },

  35: { name: 'Deep Wound', description: 'Miss next D3 games. Cannot do anything while recovering.' },

  36: { name: 'Robbed', description: 'Survives but all weapons, armor, and equipment are lost.' },

  41: { name: 'Full Recovery', description: 'Knocked unconscious but makes full recovery.' },
  42: { name: 'Full Recovery', description: 'Knocked unconscious but makes full recovery.' },
  43: { name: 'Full Recovery', description: 'Knocked unconscious but makes full recovery.' },
  44: { name: 'Full Recovery', description: 'Knocked unconscious but makes full recovery.' },
  45: { name: 'Full Recovery', description: 'Knocked unconscious but makes full recovery.' },
  46: { name: 'Full Recovery', description: 'Knocked unconscious but makes full recovery.' },
  47: { name: 'Full Recovery', description: 'Knocked unconscious but makes full recovery.' },
  48: { name: 'Full Recovery', description: 'Knocked unconscious but makes full recovery.' },
  49: { name: 'Full Recovery', description: 'Knocked unconscious but makes full recovery.' },
  50: { name: 'Full Recovery', description: 'Knocked unconscious but makes full recovery.' },
  51: { name: 'Full Recovery', description: 'Knocked unconscious but makes full recovery.' },
  52: { name: 'Full Recovery', description: 'Knocked unconscious but makes full recovery.' },
  53: { name: 'Full Recovery', description: 'Knocked unconscious but makes full recovery.' },
  54: { name: 'Full Recovery', description: 'Knocked unconscious but makes full recovery.' },
  55: { name: 'Full Recovery', description: 'Knocked unconscious but makes full recovery.' },

  56: {
    name: 'Bitter Enmity',
    description: 'Full recovery but now hates (roll D6):',
    subRoll: {
      1: { name: 'Hates Individual', description: 'Hates the warrior who caused injury (or enemy leader if Henchman).' },
      2: { name: 'Hates Individual', description: 'Hates the warrior who caused injury (or enemy leader if Henchman).' },
      3: { name: 'Hates Individual', description: 'Hates the warrior who caused injury (or enemy leader if Henchman).' },
      4: { name: 'Hates Leader', description: 'Hates the enemy warband leader.' },
      5: { name: 'Hates Warband', description: 'Hates the entire enemy warband.' },
      6: { name: 'Hates Warband Type', description: 'Hates all warbands of that type.' }
    }
  },

  61: {
    name: 'Captured',
    description: 'Held captive by enemy. May be ransomed, exchanged, sold (D6x5gc), killed for XP (Possessed), or zombified (Undead).'
  },

  62: { name: 'Hardened', description: 'Survives and becomes immune to Fear.' },
  63: { name: 'Hardened', description: 'Survives and becomes immune to Fear.' },

  64: { name: 'Horrible Scars', description: 'Causes Fear from now on.' },

  65: {
    name: 'Sold to the Pits',
    description: 'Must fight a Pit Fighter. Roll for charge, fight. If loses: roll D66 11-35 (dead/injured) or thrown out without equipment. If wins: gains 50gc, +2 XP, keeps equipment.'
  },

  66: { name: 'Survives Against the Odds', description: 'Rejoins warband. Gains +1 Experience.' }
};

// Experience needed for advances
export const EXPERIENCE_THRESHOLDS = {
  hero: [2, 4, 6, 8, 11, 14, 17, 20, 24, 28, 32, 36, 41, 46, 51, 57, 63, 69, 76, 83, 90],
  henchman: [2, 5, 9, 14] // Henchmen advance more slowly
};

// Hero advance table (2D6)
export const HERO_ADVANCE_TABLE = {
  2: { type: 'skill', description: 'New Skill' },
  3: { type: 'skill', description: 'New Skill' },
  4: { type: 'skill', description: 'New Skill' },
  5: { type: 'skill', description: 'New Skill' },
  6: { type: 'characteristic', subRoll: { 1: 'S', 2: 'S', 3: 'S', 4: 'A', 5: 'A', 6: 'A' } },
  7: { type: 'characteristic', choice: ['WS', 'BS'] },
  8: { type: 'characteristic', subRoll: { 1: 'I', 2: 'I', 3: 'I', 4: 'Ld', 5: 'Ld', 6: 'Ld' } },
  9: { type: 'characteristic', subRoll: { 1: 'W', 2: 'W', 3: 'W', 4: 'T', 5: 'T', 6: 'T' } },
  10: { type: 'skill', description: 'New Skill' },
  11: { type: 'skill', description: 'New Skill' },
  12: { type: 'skill', description: 'New Skill' }
};

// Henchman advance table (2D6)
export const HENCHMAN_ADVANCE_TABLE = {
  2: { type: 'characteristic', stat: 'I', value: 1 },
  3: { type: 'characteristic', stat: 'I', value: 1 },
  4: { type: 'characteristic', stat: 'I', value: 1 },
  5: { type: 'characteristic', stat: 'S', value: 1 },
  6: { type: 'characteristic', choice: ['WS', 'BS'] },
  7: { type: 'characteristic', choice: ['WS', 'BS'] },
  8: { type: 'characteristic', stat: 'A', value: 1 },
  9: { type: 'characteristic', stat: 'Ld', value: 1 },
  10: { type: 'promotion', description: 'Lad\'s Got Talent - becomes Hero' },
  11: { type: 'promotion', description: 'Lad\'s Got Talent - becomes Hero' },
  12: { type: 'promotion', description: 'Lad\'s Got Talent - becomes Hero' }
};

// Underdog experience bonus
export const UNDERDOG_BONUS = [
  { ratingDiff: [0, 50], bonus: 0 },
  { ratingDiff: [51, 75], bonus: 1 },
  { ratingDiff: [76, 100], bonus: 2 },
  { ratingDiff: [101, 150], bonus: 3 },
  { ratingDiff: [151, 300], bonus: 4 },
  { ratingDiff: [301, Infinity], bonus: 5 }
];
