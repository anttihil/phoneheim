// Mordheim Warbands Data

import type { WarbandType, Profile, EquipmentList } from '../types';

export const WARBAND_TYPES: Record<string, WarbandType> = {
  mercenaries_reikland: {
    name: 'Reikland Mercenaries',
    startingGold: 500,
    maxWarriors: 15,
    specialRules: {
      leaderRange: 12, // Leader ability works at 12" instead of 6"
      marksmenBSBonus: 1 // Marksmen get +1 BS
    },
    heroes: {
      captain: { min: 1, max: 1, cost: 60, startExp: 20 },
      champion: { min: 0, max: 2, cost: 35, startExp: 8 },
      youngblood: { min: 0, max: 2, cost: 15, startExp: 0 }
    },
    henchmen: {
      warrior: { min: 0, max: null, cost: 25 },
      marksman: { min: 0, max: 7, cost: 25 },
      swordsman: { min: 0, max: 5, cost: 35 }
    }
  },
  mercenaries_middenheim: {
    name: 'Middenheim Mercenaries',
    startingGold: 500,
    maxWarriors: 15,
    specialRules: {
      captainStrength: 4, // Captain and Champions start with S4
      championStrength: 4
    },
    heroes: {
      captain: { min: 1, max: 1, cost: 60, startExp: 20 },
      champion: { min: 0, max: 2, cost: 35, startExp: 8 },
      youngblood: { min: 0, max: 2, cost: 15, startExp: 0 }
    },
    henchmen: {
      warrior: { min: 0, max: null, cost: 25 },
      marksman: { min: 0, max: 7, cost: 25 },
      swordsman: { min: 0, max: 5, cost: 35 }
    }
  },
  mercenaries_marienburg: {
    name: 'Marienburg Mercenaries',
    startingGold: 600, // Extra 100gc
    maxWarriors: 15,
    specialRules: {
      rareItemBonus: 1 // +1 to rare item availability rolls
    },
    heroes: {
      captain: { min: 1, max: 1, cost: 60, startExp: 20 },
      champion: { min: 0, max: 2, cost: 35, startExp: 8 },
      youngblood: { min: 0, max: 2, cost: 15, startExp: 0 }
    },
    henchmen: {
      warrior: { min: 0, max: null, cost: 25 },
      marksman: { min: 0, max: 7, cost: 25 },
      swordsman: { min: 0, max: 5, cost: 35 }
    }
  },
  cult_of_possessed: {
    name: 'Cult of the Possessed',
    startingGold: 500,
    maxWarriors: 15,
    heroes: {
      magister: { min: 1, max: 1, cost: 70, startExp: 20, wizard: 'chaosRituals' },
      possessed: { min: 0, max: 2, cost: 90, startExp: 8 }, // + mutation cost
      mutant: { min: 0, max: 2, cost: 25, startExp: 0 } // + mutation cost
    },
    henchmen: {
      brethren: { min: 0, max: null, cost: 25 },
      darksoul: { min: 0, max: 5, cost: 35 },
      beastmen: { min: 0, max: 3, cost: 45 }
    }
  },
  witch_hunters: {
    name: 'Witch Hunters',
    startingGold: 500,
    maxWarriors: 12, // Lower max
    heroes: {
      witchHunterCaptain: { min: 1, max: 1, cost: 60, startExp: 20 },
      witchHunter: { min: 0, max: 3, cost: 25, startExp: 8 },
      warriorPriest: { min: 0, max: 1, cost: 40, startExp: 12, wizard: 'prayersOfSigmar' }
    },
    henchmen: {
      zealot: { min: 0, max: null, cost: 20 },
      flagellant: { min: 0, max: 5, cost: 40 },
      warhound: { min: 0, max: 5, cost: 15 }
    }
  },
  sisters_of_sigmar: {
    name: 'Sisters of Sigmar',
    startingGold: 500,
    maxWarriors: 15,
    heroes: {
      matriarch: { min: 1, max: 1, cost: 70, startExp: 20, wizard: 'prayersOfSigmar' },
      sisterSuperior: { min: 0, max: 3, cost: 35, startExp: 8 },
      augur: { min: 0, max: 1, cost: 25, startExp: 0 }
    },
    henchmen: {
      sister: { min: 0, max: null, cost: 25 },
      novice: { min: 0, max: 10, cost: 15 }
    }
  },
  undead: {
    name: 'The Undead',
    startingGold: 500,
    maxWarriors: 15,
    specialRules: {
      immuneToPsychology: true,
      immuneToPoison: true,
      causeFear: true
    },
    heroes: {
      vampire: { min: 1, max: 1, cost: 110, startExp: 20 },
      necromancer: { min: 0, max: 1, cost: 35, startExp: 8, wizard: 'necromancy' },
      dreg: { min: 0, max: 3, cost: 20, startExp: 0 }
    },
    henchmen: {
      zombie: { min: 0, max: null, cost: 15, noExperience: true },
      ghoul: { min: 0, max: 5, cost: 40 },
      direwolf: { min: 0, max: 5, cost: 50, noExperience: true }
    }
  },
  skaven: {
    name: 'Skaven',
    startingGold: 500,
    maxWarriors: 15,
    specialRules: {
      movement: 5 // Base movement is 5"
    },
    heroes: {
      assassinAdept: { min: 1, max: 1, cost: 60, startExp: 20, wizard: 'eshinSorcery' },
      eshinSorcerer: { min: 0, max: 1, cost: 45, startExp: 8, wizard: 'eshinSorcery' },
      blackSkaven: { min: 0, max: 2, cost: 40, startExp: 8 },
      nightRunner: { min: 0, max: 2, cost: 20, startExp: 0 }
    },
    henchmen: {
      verminkin: { min: 0, max: null, cost: 20 },
      giantRat: { min: 0, max: 5, cost: 15, noExperience: true },
      ratOgre: { min: 0, max: 1, cost: 210, largeTarget: true }
    }
  }
};

// Base profiles for warband members
export const WARRIOR_PROFILES: Record<string, Profile> = {
  // Mercenary profiles
  mercenary_captain: { M: 4, WS: 4, BS: 4, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 8 },
  mercenary_champion: { M: 4, WS: 4, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
  mercenary_youngblood: { M: 4, WS: 2, BS: 2, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 6 },
  mercenary_warrior: { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
  mercenary_marksman: { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
  mercenary_swordsman: { M: 4, WS: 4, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },

  // Cult of the Possessed profiles
  possessed_magister: { M: 4, WS: 4, BS: 4, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 8 },
  possessed_possessed: { M: 5, WS: 4, BS: 0, S: 4, T: 4, W: 2, I: 4, A: 2, Ld: 7 },
  possessed_mutant: { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
  possessed_brethren: { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
  possessed_darksoul: { M: 4, WS: 2, BS: 2, S: 4, T: 3, W: 1, I: 3, A: 1, Ld: 6 },
  possessed_beastmen: { M: 4, WS: 4, BS: 3, S: 3, T: 4, W: 1, I: 3, A: 1, Ld: 7 },

  // Witch Hunter profiles
  witch_hunter_captain: { M: 4, WS: 4, BS: 4, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 8 },
  witch_hunter: { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
  warrior_priest: { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 8 },
  zealot: { M: 4, WS: 2, BS: 2, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
  flagellant: { M: 4, WS: 3, BS: 3, S: 4, T: 4, W: 1, I: 3, A: 1, Ld: 10 },
  warhound: { M: 6, WS: 4, BS: 0, S: 4, T: 3, W: 1, I: 4, A: 1, Ld: 5 },

  // Sisters of Sigmar profiles
  matriarch: { M: 4, WS: 4, BS: 4, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 8 },
  sisterSuperior: { M: 4, WS: 4, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
  augur: { M: 4, WS: 2, BS: 2, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
  sister: { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
  novice: { M: 4, WS: 2, BS: 2, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 6 },

  // Undead profiles
  vampire: { M: 6, WS: 4, BS: 4, S: 4, T: 4, W: 2, I: 5, A: 2, Ld: 8 },
  necromancer: { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
  dreg: { M: 4, WS: 2, BS: 2, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
  zombie: { M: 4, WS: 2, BS: 0, S: 3, T: 3, W: 1, I: 1, A: 1, Ld: 5 },
  ghoul: { M: 4, WS: 2, BS: 2, S: 3, T: 4, W: 1, I: 3, A: 2, Ld: 5 },
  direwolf: { M: 9, WS: 3, BS: 0, S: 4, T: 3, W: 1, I: 2, A: 1, Ld: 4 },

  // Skaven profiles
  assassin_adept: { M: 5, WS: 4, BS: 4, S: 3, T: 3, W: 1, I: 5, A: 1, Ld: 7 },
  eshin_sorcerer: { M: 5, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 6 },
  black_skaven: { M: 5, WS: 4, BS: 3, S: 4, T: 3, W: 1, I: 5, A: 1, Ld: 6 },
  night_runner: { M: 5, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 4 },
  verminkin: { M: 5, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 5 },
  giant_rat: { M: 6, WS: 2, BS: 0, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 4 },
  rat_ogre: { M: 6, WS: 3, BS: 3, S: 5, T: 5, W: 3, I: 4, A: 3, Ld: 4 }
};

// Equipment lists for each warband type
export const EQUIPMENT_LISTS: Record<string, EquipmentList> = {
  mercenary: {
    melee: ['dagger', 'mace', 'axe', 'sword', 'morningstar', 'doubleHanded', 'spear', 'halberd'],
    ranged: ['crossbow', 'pistol', 'duellingPistol', 'bow'],
    armor: ['lightArmor', 'heavyArmor', 'shield', 'buckler', 'helmet']
  },
  marksman: {
    melee: ['dagger', 'mace', 'axe', 'sword'],
    ranged: ['crossbow', 'pistol', 'bow', 'longBow', 'blunderbuss', 'handgun', 'huntingRifle'],
    armor: ['lightArmor', 'shield', 'helmet']
  },
  possessed: {
    melee: ['dagger', 'mace', 'axe', 'sword', 'doubleHanded', 'spear'],
    ranged: ['bow', 'shortBow'],
    armor: ['lightArmor', 'heavyArmor', 'shield', 'helmet']
  },
  darksoul: {
    melee: ['dagger', 'mace', 'axe', 'sword', 'doubleHanded', 'flail'],
    ranged: [],
    armor: ['lightArmor', 'heavyArmor', 'shield', 'helmet']
  }
};
