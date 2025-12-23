// Warband and Warrior Type Definitions

// Characteristic profile for a warrior
export interface Profile {
  M: number;  // Movement
  WS: number; // Weapon Skill
  BS: number; // Ballistic Skill
  S: number;  // Strength
  T: number;  // Toughness
  W: number;  // Wounds
  I: number;  // Initiative
  A: number;  // Attacks
  Ld: number; // Leadership
}

export type CharacteristicKey = keyof Profile;

// Characteristic description
export interface CharacteristicDescription {
  name: string;
  description: string;
}

// Racial maximum characteristics
export type RacialMaximums = Record<string, Profile>;

// Equipment slots for a warrior
export interface WarriorEquipment {
  melee: string[];
  ranged: string[];
  armor: string[];
}

// Warrior status types
export type WarriorStatus = 'healthy' | 'recovering' | 'missNextGame' | 'dead';

// Individual warrior
export interface Warrior {
  id: string;
  name: string;
  type: string;
  category: 'hero' | 'henchman';
  cost: number;
  experience: number;
  profile: Profile;
  equipment: WarriorEquipment;
  skills: string[];
  injuries: string[];
  status: WarriorStatus;
  mutations: string[];
  specialRules: Record<string, unknown>;
  largeCreature?: boolean;
}

// Hero definition in warband type
export interface HeroDefinition {
  min: number;
  max: number;
  cost: number;
  startExp: number;
  wizard?: string;
}

// Henchman definition in warband type
export interface HenchmanDefinition {
  min: number;
  max: number | null;
  cost: number;
  noExperience?: boolean;
  largeTarget?: boolean;
}

// Special rules for warband types
export interface WarbandSpecialRules {
  leaderRange?: number;
  marksmenBSBonus?: number;
  captainStrength?: number;
  championStrength?: number;
  rareItemBonus?: number;
  immuneToPsychology?: boolean;
  immuneToPoison?: boolean;
  causeFear?: boolean;
  movement?: number;
}

// Warband type definition (from data)
export interface WarbandType {
  name: string;
  startingGold: number;
  maxWarriors: number;
  specialRules?: WarbandSpecialRules;
  heroes: Record<string, HeroDefinition>;
  henchmen: Record<string, HenchmanDefinition>;
}

// Warband instance
export interface Warband {
  id: string | null;
  name: string;
  type: string;
  typeName: string;
  treasury: number;
  warriors: Warrior[];
  stash: string[];
  rating: number;
  gamesPlayed: number;
  wins: number;
  wyrdstone?: number;
  createdAt: string;
  updatedAt?: string;
}

// Equipment list for a warband type
export interface EquipmentList {
  melee: string[];
  ranged: string[];
  armor: string[];
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Warband summary for list display
export interface WarbandSummary {
  name: string;
  type: string;
  warriors: number;
  heroes: number;
  henchmen: number;
  rating: number;
  treasury: number;
  gamesPlayed: number;
  wins: number;
}
