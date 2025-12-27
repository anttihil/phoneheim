// Phase Module Types
// Core interfaces for the modular phase architecture

import type {
  GameState,
  GamePhase,
  ShootingModifiers,
  CombatResolution,
  StrikeOrderEntry
} from '../../types/game';
import type { GameEvent, EventType } from '../types/events';
import type { ScreenCommand } from '../types/screens';

// =====================================
// AVAILABLE ACTION TYPES
// =====================================

/**
 * Represents an action available to a warrior in a given phase
 */
export interface AvailableAction {
  /** Action type identifier (e.g., 'move', 'charge', 'shoot') */
  type: string;
  /** Human-readable description of the action */
  description: string;
  /** Whether this action requires selecting a target */
  requiresTarget: boolean;
  /** Valid target warrior IDs (only present if requiresTarget is true) */
  validTargets?: string[];
}

// =====================================
// SUB-STATE TYPES
// =====================================

/**
 * Sub-states within a phase for handling modals
 * - 'main': Normal phase interaction
 * - 'resolution': Showing combat/shooting resolution modal
 * - 'rout_test': Showing rout test modal
 * - 'rout_result': Showing rout test result
 */
export type PhaseSubState = 'main' | 'resolution' | 'rout_test' | 'rout_result';

// =====================================
// PHASE CONTEXT
// =====================================

/**
 * Transient state passed to phase modules
 * This is NOT persisted in GameState - it's UI/interaction state
 */
export interface PhaseContext {
  // Selection state
  selectedWarriorId: string | null;
  selectedTargetId: string | null;

  // Shooting modifiers (set by UI before confirming shot)
  shootingModifiers: ShootingModifiers;

  // Sub-state for modal handling
  subState: PhaseSubState;

  // Pending modal data
  pendingResolution: CombatResolution | null;
  pendingRoutTest: number | null; // Warband index needing rout test

  // Combat phase tracking
  strikeOrder: StrikeOrderEntry[];
  currentFighterIndex: number;
}

/**
 * Create initial/default phase context
 */
export function createPhaseContext(): PhaseContext {
  return {
    selectedWarriorId: null,
    selectedTargetId: null,
    shootingModifiers: {
      cover: false,
      longRange: false,
      moved: false,
      largeTarget: false
    },
    subState: 'main',
    pendingResolution: null,
    pendingRoutTest: null,
    strikeOrder: [],
    currentFighterIndex: 0
  };
}

/**
 * Reset context for phase transition
 */
export function resetContextForPhaseChange(): Partial<PhaseContext> {
  return {
    selectedWarriorId: null,
    selectedTargetId: null,
    subState: 'main',
    pendingResolution: null,
    pendingRoutTest: null
  };
}

// =====================================
// PHASE RESULT
// =====================================

/**
 * Result of processing an event in a phase module
 */
export interface PhaseResult {
  /** Whether the event was processed successfully */
  success: boolean;

  /** Error message if success is false */
  error?: string;

  /** Whether the game state was modified */
  stateChanged: boolean;

  /** Updates to apply to the phase context */
  contextUpdates: Partial<PhaseContext>;
}

/**
 * Helper to create a success result
 */
export function successResult(
  stateChanged: boolean,
  contextUpdates: Partial<PhaseContext> = {}
): PhaseResult {
  return {
    success: true,
    stateChanged,
    contextUpdates
  };
}

/**
 * Helper to create an error result
 */
export function errorResult(error: string): PhaseResult {
  return {
    success: false,
    error,
    stateChanged: false,
    contextUpdates: {}
  };
}

// =====================================
// PHASE MODULE INTERFACE
// =====================================

/**
 * Interface that all phase modules must implement
 *
 * Phase modules are functional - they receive state and context as inputs
 * and return results. They do not hold internal state.
 */
export interface PhaseModule {
  /** The game phase this module handles */
  readonly phase: GamePhase;

  /**
   * Process a game event
   * @param event - The event to process
   * @param state - Current game state (may be mutated)
   * @param context - Current phase context (read-only, return updates)
   * @returns Result with success status and context updates
   */
  processEvent(
    event: GameEvent,
    state: GameState,
    context: PhaseContext
  ): PhaseResult;

  /**
   * Build the screen command for the current state
   * @param state - Current game state
   * @param context - Current phase context
   * @returns Screen command for the UI
   */
  buildScreen(
    state: GameState,
    context: PhaseContext
  ): ScreenCommand;

  /**
   * Get the event types this phase can handle
   * Used for validation and UI hints
   */
  getSupportedEvents(): EventType[];

  /**
   * Called when entering this phase
   * Can return context updates (e.g., combat builds strike order)
   * @param state - Current game state
   * @param context - Current phase context
   * @returns Context updates to apply
   */
  onEnter?(state: GameState, context: PhaseContext): Partial<PhaseContext>;

  /**
   * Called when leaving this phase
   * Can perform cleanup (state mutations are discouraged here)
   * @param state - Current game state
   * @param context - Current phase context
   */
  onExit?(state: GameState, context: PhaseContext): void;
}

// =====================================
// PHASE REGISTRY TYPE
// =====================================

/**
 * Map of game phases to their modules
 */
export type PhaseRegistry = Map<GamePhase, PhaseModule>;

/**
 * Create a phase registry from an array of modules
 */
export function createPhaseRegistry(modules: PhaseModule[]): PhaseRegistry {
  const registry = new Map<GamePhase, PhaseModule>();
  for (const module of modules) {
    registry.set(module.phase, module);
  }
  return registry;
}
