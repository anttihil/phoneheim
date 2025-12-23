// Warband Manager - Core warband logic

import { WARBAND_TYPES, WARRIOR_PROFILES } from '../data/warbands';
import type {
  Warband,
  Warrior,
  Profile,
  HeroDefinition,
  HenchmanDefinition,
  ValidationResult,
  WarbandSummary
} from '../types';

// Create a new empty warband
export function createWarband(type: string, name: string): Warband {
  const warbandType = WARBAND_TYPES[type];
  if (!warbandType) {
    throw new Error(`Unknown warband type: ${type}`);
  }

  return {
    id: null, // Set when saved
    name: name,
    type: type,
    typeName: warbandType.name,
    treasury: warbandType.startingGold,
    warriors: [],
    stash: [], // Equipment not assigned to warriors
    rating: 0,
    gamesPlayed: 0,
    wins: 0,
    createdAt: new Date().toISOString()
  };
}

// Add a warrior to the warband
export function addWarrior(
  warband: Warband,
  type: string,
  category: 'hero' | 'henchman',
  definition: HeroDefinition | HenchmanDefinition
): Warrior {
  const profileKey = getProfileKey(warband.type, type);
  const baseProfile = WARRIOR_PROFILES[profileKey] || WARRIOR_PROFILES[type];

  const warrior: Warrior = {
    id: generateWarriorId(),
    name: '',
    type: type,
    category: category,
    cost: definition.cost,
    experience: 'startExp' in definition ? definition.startExp : 0,
    profile: { ...baseProfile },
    equipment: {
      melee: ['dagger'], // Free dagger
      ranged: [],
      armor: []
    },
    skills: [],
    injuries: [],
    status: 'healthy',
    mutations: [],
    specialRules: 'wizard' in definition && definition.wizard ? { wizard: definition.wizard } : {}
  };

  warband.warriors.push(warrior);
  updateWarbandRating(warband);

  return warrior;
}

// Remove a warrior from the warband
export function removeWarrior(warband: Warband, warriorId: string): boolean {
  const index = warband.warriors.findIndex(w => w.id === warriorId);
  if (index !== -1) {
    const warrior = warband.warriors[index];
    warband.treasury += warrior.cost;
    warband.warriors.splice(index, 1);
    updateWarbandRating(warband);
    return true;
  }
  return false;
}

// Equip a warrior with an item
export function equipWarrior(warrior: Warrior, item: string, slot: keyof Warrior['equipment']): void {
  if (!warrior.equipment[slot]) {
    warrior.equipment[slot] = [];
  }
  warrior.equipment[slot].push(item);
}

// Remove equipment from a warrior
export function unequipWarrior(warrior: Warrior, item: string, slot: keyof Warrior['equipment']): boolean {
  const index = warrior.equipment[slot]?.indexOf(item);
  if (index !== undefined && index !== -1) {
    warrior.equipment[slot].splice(index, 1);
    return true;
  }
  return false;
}

// Validate the warband
export function validateWarband(warband: Warband | null): ValidationResult {
  const errors: string[] = [];

  if (!warband) {
    return { valid: false, errors: ['No warband data'] };
  }

  // Check name
  if (!warband.name || warband.name.trim() === '') {
    errors.push('Warband must have a name');
  }

  // Check minimum warriors
  if (warband.warriors.length < 3) {
    errors.push('Warband must have at least 3 warriors');
  }

  // Check leader
  const warbandType = WARBAND_TYPES[warband.type];
  if (warbandType) {
    // Find the leader type for this warband
    for (const [heroType, heroDef] of Object.entries(warbandType.heroes)) {
      if (heroDef.min === 1 && heroDef.max === 1) {
        const leaderCount = warband.warriors.filter(w => w.type === heroType).length;
        if (leaderCount === 0) {
          errors.push(`Warband must have a ${formatTypeName(heroType)}`);
        } else if (leaderCount > 1) {
          errors.push(`Warband can only have one ${formatTypeName(heroType)}`);
        }
      }
    }

    // Check max warriors
    if (warband.warriors.length > warbandType.maxWarriors) {
      errors.push(`Warband cannot exceed ${warbandType.maxWarriors} warriors`);
    }

    // Check type limits
    for (const [heroType, heroDef] of Object.entries(warbandType.heroes)) {
      const count = warband.warriors.filter(w => w.type === heroType).length;
      if (heroDef.max && count > heroDef.max) {
        errors.push(`Cannot have more than ${heroDef.max} ${formatTypeName(heroType)}`);
      }
    }

    for (const [henchType, henchDef] of Object.entries(warbandType.henchmen)) {
      const count = warband.warriors.filter(w => w.type === henchType).length;
      if (henchDef.max && count > henchDef.max) {
        errors.push(`Cannot have more than ${henchDef.max} ${formatTypeName(henchType)}`);
      }
    }
  }

  // Check treasury not negative
  if (warband.treasury < 0) {
    errors.push('Not enough gold to recruit these warriors');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Calculate total cost of warband
export function calculateWarbandCost(warband: Warband): number {
  return warband.warriors.reduce((total, warrior) => total + warrior.cost, 0);
}

// Update warband rating
export function updateWarbandRating(warband: Warband): number {
  let rating = 0;
  for (const warrior of warband.warriors) {
    // Large creatures are worth 20 + XP, others are worth 5 + XP
    const isLarge = warrior.largeCreature || warrior.type === 'ratOgre';
    rating += (isLarge ? 20 : 5) + (warrior.experience || 0);
  }
  warband.rating = rating;
  return rating;
}

// Get the profile key for looking up base stats
function getProfileKey(warbandType: string, warriorType: string): string {
  // Map warband types to profile prefixes
  const prefixes: Record<string, string> = {
    'mercenaries_reikland': 'mercenary',
    'mercenaries_middenheim': 'mercenary',
    'mercenaries_marienburg': 'mercenary',
    'cult_of_possessed': 'possessed',
    'witch_hunters': '',
    'sisters_of_sigmar': '',
    'undead': '',
    'skaven': ''
  };

  const prefix = prefixes[warbandType];
  if (prefix) {
    return `${prefix}_${warriorType}`;
  }
  return warriorType;
}

// Generate unique warrior ID
function generateWarriorId(): string {
  return 'w_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Format type name for display
export function formatTypeName(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/_/g, ' ');
}

// Export warband summary
export function getWarbandSummary(warband: Warband): WarbandSummary {
  const heroes = warband.warriors.filter(w => w.category === 'hero');
  const henchmen = warband.warriors.filter(w => w.category === 'henchman');

  return {
    name: warband.name,
    type: warband.typeName,
    warriors: warband.warriors.length,
    heroes: heroes.length,
    henchmen: henchmen.length,
    rating: warband.rating,
    treasury: warband.treasury,
    gamesPlayed: warband.gamesPlayed,
    wins: warband.wins
  };
}
