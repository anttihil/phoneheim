// Combat, Injuries, and Skills Type Definitions

import type { CharacteristicKey } from './warband';

// Dice roll result
export interface DiceResult {
  roll: number;
  success: boolean;
  needed: number;
  criticalHit?: boolean;
}

// To-hit result with additional info
export interface ToHitResult extends DiceResult {
  modifiers?: Record<string, number>;
}

// Wound roll result
export interface WoundResult extends DiceResult {
  strengthUsed: number;
  toughnessUsed: number;
}

// Armor save result
export interface ArmorSaveResult extends DiceResult {
  modifier: number;
  originalSave: number;
}

// In-game injury result
export interface InjuryResult {
  result: 'knockedDown' | 'stunned' | 'outOfAction';
  name: string;
  description: string;
}

// Critical hit effect
export interface CriticalHitEffect {
  name: string;
  wounds: number;
  ignoreArmor: boolean;
  injuryBonus: number;
}

// Henchman serious injury result
export interface HenchmanSeriousInjuryResult {
  result: 'dead' | 'survives';
  description: string;
}

// Characteristic effect from injury
export interface CharacteristicEffect {
  characteristic: CharacteristicKey;
  modifier: number;
}

// Sub-roll for complex injuries
export interface InjurySubRoll {
  name: string;
  description: string;
}

// Hero serious injury result
export interface HeroSeriousInjuryResult {
  name: string;
  description: string;
  effect?: CharacteristicEffect;
  subRoll?: Record<number, InjurySubRoll>;
}

// Experience thresholds
export interface ExperienceThresholds {
  hero: number[];
  henchman: number[];
}

// Hero advance type
export interface HeroAdvance {
  type: 'skill' | 'characteristic';
  description?: string;
  subRoll?: Record<number, CharacteristicKey>;
  choice?: CharacteristicKey[];
}

// Henchman advance type
export interface HenchmanAdvance {
  type: 'characteristic' | 'promotion';
  stat?: CharacteristicKey;
  value?: number;
  choice?: CharacteristicKey[];
  description?: string;
}

// Underdog bonus range
export interface UnderdogBonus {
  ratingDiff: [number, number];
  bonus: number;
}

// Skill category
export type SkillCategory = 'combat' | 'shooting' | 'academic' | 'strength' | 'speed';

// Skill definition
export interface Skill {
  category: SkillCategory;
  name: string;
  description: string;
}

// All skills
export type Skills = Record<string, Skill>;

// Skill categories mapping
export type SkillCategories = Record<SkillCategory, string>;

// Skill tables by warrior type
export type SkillTables = Record<string, SkillCategory[]>;

// Mutation definition
export interface Mutation {
  name: string;
  cost: number;
  description: string;
  effect: string;
}

// All mutations
export type Mutations = Record<string, Mutation>;

// Mutation rules
export interface MutationRules {
  whenPurchased: string;
  whoCanHave: string[];
  firstMutationCost: string;
  additionalMutationsCost: string;
}

// Random mutation table
export type RandomMutations = Record<number, string>;
