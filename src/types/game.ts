// Game State Type Definitions

import type { Warband, Warrior, Profile } from './warband';

// Game phases
export type GamePhase = 'setup' | 'recovery' | 'movement' | 'shooting' | 'combat' | 'end';

// Warrior status during game
export type WarriorGameStatus = 'standing' | 'knockedDown' | 'stunned' | 'outOfAction' | 'fleeing';

// Combat state for warriors
export interface WarriorCombatState {
  inCombat: boolean;
  inCover: boolean;
  engagedWith: string[]; // Array of enemy warrior IDs
}

// Warrior with game-specific state
export interface GameWarrior extends Warrior {
  gameStatus: WarriorGameStatus;
  woundsRemaining: number;
  hasActed: boolean;
  hasMoved: boolean;
  hasRun: boolean; // Ran this turn (prevents shooting)
  hasShot: boolean;
  hasCharged: boolean;
  hasFailedCharge: boolean; // Failed a charge this turn (prevents shooting, but can cast spells)
  hasFallen: boolean; // Fell this turn (cannot move or hide)
  hasRecovered: boolean; // Whether warrior has been processed in recovery phase
  isHidden: boolean;
  carriedWyrdstone: number;
  position: { x: number; y: number } | null;
  combatState: WarriorCombatState;
  halfMovement: boolean; // From standing up
  strikesLast: boolean; // From standing up
  divingChargeBonus: boolean; // Has +1 S and +1 to hit from diving charge
}

// Warband with game-specific state
export interface GameWarband extends Omit<Warband, 'warriors'> {
  player: 1 | 2;
  warriors: GameWarrior[];
  outOfActionCount: number;
  routFailed: boolean;
}

// Game log entry
export interface GameLogEntry {
  turn: number;
  phase: GamePhase;
  player: 1 | 2;
  message: string;
  timestamp: string;
}

// Wyrdstone counter position
export interface WyrdstoneCounter {
  x: number;
  y: number;
}

// Recovery action types
export type RecoveryActionType = 'rally' | 'recoverFromStunned' | 'standUp';

// Game action for undo history
export interface GameAction {
  id: string;
  type: RecoveryActionType | 'move' | 'run' | 'shoot' | 'charge' | 'failedCharge' | 'climb' | 'jumpDown' | 'jumpGap' | 'fall' | 'hide' | 'reveal' | 'meleeAttack' | 'setCombatState' | 'setStatus';
  timestamp: string;
  turn: number;
  phase: GamePhase;
  player: 1 | 2;
  warriorId: string;
  warbandIndex: number;
  targetId?: string;
  targetWarbandIndex?: number;
  previousState: Partial<GameWarrior>;
  diceRolls?: { roll: number; needed?: number; success?: boolean }[];
  description: string;
}

// Complete game state
export interface GameState {
  id: string;
  scenario: string;
  scenarioData: Scenario;
  turn: number;
  currentPlayer: 1 | 2;
  phase: GamePhase;
  warbands: [GameWarband, GameWarband];
  wyrdstoneCounters: WyrdstoneCounter[];
  objectives: string[];
  log: GameLogEntry[];
  actionHistory: GameAction[];
  startedAt: string;
  ended: boolean;
  winner: 1 | 2 | null;
  endReason?: string;
  endedAt?: string;
}

// Scenario deployment info
export interface ScenarioDeployment {
  defender?: string;
  attacker?: string;
  first?: string;
  second?: string;
  defenderPlacement?: string;
}

// Scenario setup info
export interface ScenarioSetup {
  terrain: string;
  deployment: ScenarioDeployment;
  determineSides?: string;
  specialSetup?: string;
  objectives?: string;
}

// Scenario victory conditions
export interface ScenarioVictoryConditions {
  attacker?: string;
  defender?: string;
  standard?: string;
}

// Scenario experience rewards
export interface ScenarioExperience {
  survives: number;
  winningLeader: number;
  perEnemyOutOfAction: number;
  perWyrdstoneCounter?: number;
  breakingThrough?: number;
  firstToEscape?: number;
  findingChest?: number;
}

// Scenario special rules
export interface ScenarioSpecialRules {
  wyrdstonePickup?: string;
  carrierOutOfAction?: string;
  noBacktrack?: string;
  startingWyrdstone?: string;
  searchBuilding?: string;
  deploymentZoneExcluded?: string;
  lastBuilding?: string;
  treasureCarrying?: string;
  treasureContents?: Record<string, { amount: string | number; roll: string }>;
  occupying?: string;
  gameDuration?: string;
  noRoutTest?: string;
  reinforcements?: string;
}

// Complete scenario definition
export interface Scenario {
  id: number;
  name: string;
  description: string;
  setup: ScenarioSetup;
  startingPlayer: string;
  victoryConditions: ScenarioVictoryConditions;
  experience: ScenarioExperience;
  specialRules?: ScenarioSpecialRules;
  wyrdstone?: string;
}

// Scenario table mapping
export type ScenarioTable = Record<number, string>;

// Pre-battle sequence step
export type PreBattleSequence = string[];

// =====================================
// COMBAT RESOLUTION TYPES
// =====================================

// Shooting modifiers for ranged attacks
export interface ShootingModifiers {
  cover: boolean;
  longRange: boolean;
  moved: boolean;
  largeTarget: boolean;
}

// Combat resolution - tracks all rolls in an attack sequence
export interface CombatResolution {
  attackerId: string;
  attackerName: string;
  defenderId: string;
  defenderName: string;
  weapon: string;
  weaponStrength: number;

  // To Hit
  toHitRoll: number;
  toHitNeeded: number;
  hit: boolean;
  autoHit?: boolean; // For knocked down targets in melee

  // Parry (melee only)
  parryAttempted?: boolean;
  parryRoll?: number;
  parrySuccess?: boolean;

  // To Wound
  toWoundRoll?: number;
  toWoundNeeded?: number;
  wounded?: boolean;

  // Critical Hit
  criticalHit?: boolean;
  criticalType?: 'vitalPart' | 'exposedSpot' | 'masterStrike';
  criticalDescription?: string;

  // Armor Save
  armorSaveRoll?: number;
  armorSaveNeeded?: number;
  armorSaved?: boolean;
  noArmorSave?: boolean; // When save is impossible or ignored by critical

  // Injury
  injuryRoll?: number;
  injuryResult?: 'knockedDown' | 'stunned' | 'outOfAction';

  // Final outcome
  finalOutcome: 'miss' | 'parried' | 'noWound' | 'saved' | 'knockedDown' | 'stunned' | 'outOfAction';
}

// Shooting action with all context
export interface ShootingAction {
  shooterId: string;
  targetId: string;
  weapon: string;
  modifiers: ShootingModifiers;
  resolution: CombatResolution;
}

// Melee fighter entry for strike order
export interface StrikeOrderEntry {
  warriorId: string;
  warriorName: string;
  warbandIndex: number;
  initiative: number;
  charged: boolean;
  stoodUp: boolean;
  attacks: number;
}

// Melee round tracking
export interface MeleeRound {
  strikeOrder: StrikeOrderEntry[];
  currentFighterIndex: number;
  attacks: CombatResolution[][];  // Array of attack arrays per fighter
  completed: boolean;
}

// Shooting target info
export interface ShootingTarget {
  targetId: string;
  targetName: string;
  targetStatus: WarriorGameStatus;
  inCover: boolean;
  longRange: boolean;
  toHitNeeded: number;
}

// Melee target info
export interface MeleeTarget {
  targetId: string;
  targetName: string;
  targetStatus: WarriorGameStatus;
  warbandIndex: number;
}

// Weapon profile for combat
export interface WeaponProfile {
  name: string;
  strength: number | 'user' | 'user+1' | 'user+2' | 'user-1';
  rules: string[];
  range?: number; // For ranged weapons
}

// Rout test result
export interface RoutTestResult {
  roll: number;
  needed: number;
  passed: boolean;
  warbandIndex: number;
}
