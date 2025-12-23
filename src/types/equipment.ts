// Equipment Type Definitions

// Strength type - can be fixed or relative to user
export type StrengthValue = number | 'user' | 'user-1' | 'user+1' | 'user+2';

// Melee weapon definition
export interface MeleeWeapon {
  name: string;
  cost: number;
  strength: StrengthValue;
  rules: string[];
  description?: string;
}

// Ranged weapon definition
export interface RangedWeapon {
  name: string;
  cost: number;
  range: number;
  strength: StrengthValue;
  rules: string[];
  description?: string;
}

// Armor definition
export interface Armor {
  name: string;
  cost: number;
  save?: number;
  saveBonus?: number;
  rules?: string[];
  description?: string;
}

// Weapon rules descriptions
export type WeaponRules = Record<string, string>;

// All melee weapons
export type MeleeWeapons = Record<string, MeleeWeapon>;

// All ranged weapons
export type RangedWeapons = Record<string, RangedWeapon>;

// All armor types
export type ArmorTypes = Record<string, Armor>;
