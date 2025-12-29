// Screen Command Type Definitions
// Screen commands are the outputs of the game engine - they tell the UI what to render

import type { EventType } from './events';
import type {
  GamePhase,
  WarriorGameStatus,
  ShootingModifiers,
  CombatResolution,
  StrikeOrderEntry,
  GameLogEntry
} from '../../types/game';

// =====================================
// VIEW MODELS - Simplified data for UI rendering
// =====================================

// Simplified warrior view for UI display
export interface WarriorView {
  id: string;
  name: string;
  type: string;
  category: 'hero' | 'henchman';
  warbandIndex: number;
  // Stats
  movement: number;
  weaponSkill: number;
  ballisticSkill: number;
  strength: number;
  toughness: number;
  wounds: number;
  woundsRemaining: number;
  initiative: number;
  attacks: number;
  leadership: number;
  // Equipment
  meleeWeapons: string[];
  rangedWeapons: string[];
  armor: string[];
  // Game state
  status: WarriorGameStatus;
  hasActed: boolean;
  hasMoved: boolean;
  hasRun: boolean;
  hasShot: boolean;
  hasCharged: boolean;
  inCombat: boolean;
  inCover: boolean;
  engagedWith: string[];
}

// Target view with hit probability info
export interface TargetView extends WarriorView {
  toHitNeeded: number;
  inCover: boolean;
  longRange: boolean;
}

// Warband view for UI display
export interface WarbandView {
  name: string;
  typeName: string;
  player: 1 | 2;
  warriors: WarriorView[];
  outOfActionCount: number;
  totalWarriors: number;
  activeWarriors: number;
}

// =====================================
// SCREEN TYPES
// =====================================

export type ScreenType =
  | 'GAME_SETUP'
  | 'RECOVERY_PHASE'
  | 'MOVEMENT_PHASE'
  | 'SHOOTING_PHASE'
  | 'SHOOTING_TARGET_SELECT'
  | 'SHOOTING_CONFIRM'
  | 'COMBAT_PHASE'
  | 'COMBAT_RESOLUTION'
  | 'ROUT_TEST'
  | 'ROUT_TEST_RESULT'
  | 'GAME_OVER'
  | 'ERROR';

// =====================================
// SCREEN DATA TYPES
// =====================================

export interface GameSetupData {
  warband: WarbandView;
  opponentWarband: WarbandView;
  scenario: {
    name: string;
    description: string;
  };
  currentPlayer: 1 | 2;
  warriorsToPosition: WarriorView[];
  selectedWarrior: WarriorView | null;
}

export interface RecoveryPhaseData {
  currentPlayer: 1 | 2;
  warband: WarbandView;
  fleeingWarriors: WarriorView[];
  stunnedWarriors: WarriorView[];
  knockedDownWarriors: WarriorView[];
  completedRecoveries: string[]; // warrior IDs that have already recovered
  selectedWarrior: WarriorView | null;
}

export interface MovementPhaseData {
  currentPlayer: 1 | 2;
  warband: WarbandView;
  opponentWarband: WarbandView;
  actableWarriors: WarriorView[]; // Warriors who can still move
  selectedWarrior: WarriorView | null;
  chargeTargets: WarriorView[]; // Valid charge targets if warrior selected
  canMove: boolean;
  canRun: boolean;
  canCharge: boolean;
}

export interface ShootingPhaseData {
  currentPlayer: 1 | 2;
  warband: WarbandView;
  opponentWarband: WarbandView;
  actableWarriors: WarriorView[]; // Warriors who can shoot
  selectedWarrior: WarriorView | null;
}

export interface ShootingTargetSelectData {
  shooter: WarriorView;
  validTargets: TargetView[];
  modifiers: ShootingModifiers;
  selectedTarget: TargetView | null;
}

export interface ShootingConfirmData {
  shooter: WarriorView;
  target: TargetView;
  modifiers: ShootingModifiers;
  toHitNeeded: number;
}

export interface CombatPhaseData {
  currentPlayer: 1 | 2;
  warband: WarbandView;
  opponentWarband: WarbandView;
  strikeOrder: StrikeOrderEntry[];
  currentFighterIndex: number;
  currentFighter: WarriorView | null;
  meleeTargets: WarriorView[]; // Valid melee targets for current fighter
  selectedTarget: WarriorView | null;
  allFightersComplete: boolean;
  attacksRemaining: number; // How many attacks the current fighter has left
  attacksTotal: number; // Total attacks for current fighter
}

export interface CombatResolutionData {
  attackerName: string;
  defenderName: string;
  weapon: string;
  // Dice roll details
  rolls: {
    toHit?: { roll: number; needed: number; success: boolean };
    parry?: { roll: number; opponentRoll: number; success: boolean };
    toWound?: { roll: number; needed: number; success: boolean };
    critical?: { roll: number; type: string; description: string };
    armorSave?: { roll: number; needed: number; success: boolean; noSave?: boolean };
    injury?: { roll: number; result: string };
  };
  outcome: CombatResolution['finalOutcome'];
  outcomeDescription: string;
}

export interface RoutTestData {
  warbandName: string;
  warbandIndex: number;
  leadershipNeeded: number;
  outOfActionCount: number;
  totalWarriors: number;
}

export interface RoutTestResultData {
  warbandName: string;
  roll: number;
  needed: number;
  passed: boolean;
}

export interface GameOverData {
  winner: 1 | 2 | null;
  winnerName: string | null;
  reason: 'rout' | 'objective' | 'elimination' | 'voluntary' | 'draw';
  gameLog: GameLogEntry[];
  statistics: {
    turns: number;
    warband1OutOfAction: number;
    warband2OutOfAction: number;
  };
}

export interface ErrorData {
  message: string;
  code?: string;
}

// =====================================
// SCREEN COMMAND UNION
// =====================================

interface ScreenCommandBase<T extends ScreenType, D> {
  screen: T;
  data: D;
  availableEvents: EventType[];
  // Game context always available
  turn: number;
  phase: GamePhase;
  currentPlayer: 1 | 2;
  gameId: string;
}

export type GameSetupScreen = ScreenCommandBase<'GAME_SETUP', GameSetupData>;
export type RecoveryPhaseScreen = ScreenCommandBase<'RECOVERY_PHASE', RecoveryPhaseData>;
export type MovementPhaseScreen = ScreenCommandBase<'MOVEMENT_PHASE', MovementPhaseData>;
export type ShootingPhaseScreen = ScreenCommandBase<'SHOOTING_PHASE', ShootingPhaseData>;
export type ShootingTargetSelectScreen = ScreenCommandBase<'SHOOTING_TARGET_SELECT', ShootingTargetSelectData>;
export type ShootingConfirmScreen = ScreenCommandBase<'SHOOTING_CONFIRM', ShootingConfirmData>;
export type CombatPhaseScreen = ScreenCommandBase<'COMBAT_PHASE', CombatPhaseData>;
export type CombatResolutionScreen = ScreenCommandBase<'COMBAT_RESOLUTION', CombatResolutionData>;
export type RoutTestScreen = ScreenCommandBase<'ROUT_TEST', RoutTestData>;
export type RoutTestResultScreen = ScreenCommandBase<'ROUT_TEST_RESULT', RoutTestResultData>;
export type GameOverScreen = ScreenCommandBase<'GAME_OVER', GameOverData>;
export type ErrorScreen = ScreenCommandBase<'ERROR', ErrorData>;

export type ScreenCommand =
  | GameSetupScreen
  | RecoveryPhaseScreen
  | MovementPhaseScreen
  | ShootingPhaseScreen
  | ShootingTargetSelectScreen
  | ShootingConfirmScreen
  | CombatPhaseScreen
  | CombatResolutionScreen
  | RoutTestScreen
  | RoutTestResultScreen
  | GameOverScreen
  | ErrorScreen;

// Type guard helpers
export function isPhaseScreen(screen: ScreenCommand): screen is
  | RecoveryPhaseScreen
  | MovementPhaseScreen
  | ShootingPhaseScreen
  | CombatPhaseScreen {
  return ['RECOVERY_PHASE', 'MOVEMENT_PHASE', 'SHOOTING_PHASE', 'COMBAT_PHASE'].includes(screen.screen);
}

export function isModalScreen(screen: ScreenCommand): screen is
  | CombatResolutionScreen
  | RoutTestScreen
  | RoutTestResultScreen {
  return ['COMBAT_RESOLUTION', 'ROUT_TEST', 'ROUT_TEST_RESULT'].includes(screen.screen);
}
