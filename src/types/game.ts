// Game State Type Definitions

import type { Warband, Warrior, Profile } from './warband';

// Game phases
export type GamePhase = 'setup' | 'recovery' | 'movement' | 'shooting' | 'combat' | 'end';

// Warrior status during game
export type WarriorGameStatus = 'standing' | 'knockedDown' | 'stunned' | 'outOfAction' | 'fleeing';

// Warrior with game-specific state
export interface GameWarrior extends Warrior {
  gameStatus: WarriorGameStatus;
  woundsRemaining: number;
  hasActed: boolean;
  hasMoved: boolean;
  hasShot: boolean;
  hasCharged: boolean;
  isHidden: boolean;
  carriedWyrdstone: number;
  position: { x: number; y: number } | null;
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
