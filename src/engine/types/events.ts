// Game Event Type Definitions
// Events are the inputs to the game engine - user actions and game commands

import type { ShootingModifiers } from '../../types/game';

// Base event structure - all events have these fields
export interface GameEventBase {
  id: string;
  timestamp: string;
  playerId: string;
}

// =====================================
// SELECTION EVENTS
// =====================================

export interface SelectWarriorEvent extends GameEventBase {
  type: 'SELECT_WARRIOR';
  payload: {
    warriorId: string;
  };
}

export interface DeselectEvent extends GameEventBase {
  type: 'DESELECT';
  payload: Record<string, never>;
}

export interface SelectTargetEvent extends GameEventBase {
  type: 'SELECT_TARGET';
  payload: {
    targetId: string;
  };
}

// =====================================
// MOVEMENT EVENTS
// =====================================

export interface ConfirmMoveEvent extends GameEventBase {
  type: 'CONFIRM_MOVE';
  payload: {
    moveType: 'move' | 'run';
  };
}

export interface ConfirmChargeEvent extends GameEventBase {
  type: 'CONFIRM_CHARGE';
  payload: {
    targetId: string;
  };
}

export interface ConfirmPositionEvent extends GameEventBase {
  type: 'CONFIRM_POSITION';
  payload: Record<string, never>;
}

// =====================================
// MODIFIER EVENTS
// =====================================

export interface SetModifierEvent extends GameEventBase {
  type: 'SET_MODIFIER';
  payload: {
    category: 'shooting' | 'combat';
    modifier: keyof ShootingModifiers;
    value: boolean;
  };
}

// =====================================
// SHOOTING EVENTS
// =====================================

export interface ConfirmShotEvent extends GameEventBase {
  type: 'CONFIRM_SHOT';
  payload: {
    targetId: string;
    // Dice results stored for deterministic replay
    results?: {
      toHitRoll: number;
      toWoundRoll?: number;
      armorSaveRoll?: number;
      injuryRoll?: number;
      criticalRoll?: number;
    };
  };
}

// =====================================
// COMBAT EVENTS
// =====================================

export interface ConfirmMeleeEvent extends GameEventBase {
  type: 'CONFIRM_MELEE';
  payload: {
    targetId: string;
    weaponKey: string;
    // Dice results stored for deterministic replay
    results?: {
      toHitRoll: number;
      parryRoll?: number;
      toWoundRoll?: number;
      armorSaveRoll?: number;
      injuryRoll?: number;
      criticalRoll?: number;
    };
  };
}

// =====================================
// RECOVERY EVENTS
// =====================================

export type RecoveryActionType = 'rally' | 'recoverFromStunned' | 'standUp';

export interface RecoveryActionEvent extends GameEventBase {
  type: 'RECOVERY_ACTION';
  payload: {
    action: RecoveryActionType;
    warriorId: string;
    // Dice result stored for deterministic replay
    results?: {
      roll: number;
    };
  };
}

// =====================================
// PHASE & TURN EVENTS
// =====================================

export interface AdvancePhaseEvent extends GameEventBase {
  type: 'ADVANCE_PHASE';
  payload: Record<string, never>;
}

export interface ConfirmRoutTestEvent extends GameEventBase {
  type: 'CONFIRM_ROUT_TEST';
  payload: {
    warbandIndex: number;
    // Dice result stored for deterministic replay
    results?: {
      roll: number;
    };
  };
}

// =====================================
// MODAL/UI EVENTS
// =====================================

export interface AcknowledgeEvent extends GameEventBase {
  type: 'ACKNOWLEDGE';
  payload: Record<string, never>;
}

// =====================================
// META EVENTS
// =====================================

export interface UndoEvent extends GameEventBase {
  type: 'UNDO';
  payload: {
    toEventId: string; // Undo back to this event
  };
}

export interface RequestStateEvent extends GameEventBase {
  type: 'REQUEST_STATE';
  payload: Record<string, never>; // Used by joining players
}

// =====================================
// UNION TYPE
// =====================================

export type GameEvent =
  | SelectWarriorEvent
  | DeselectEvent
  | SelectTargetEvent
  | ConfirmMoveEvent
  | ConfirmChargeEvent
  | ConfirmPositionEvent
  | SetModifierEvent
  | ConfirmShotEvent
  | ConfirmMeleeEvent
  | RecoveryActionEvent
  | AdvancePhaseEvent
  | ConfirmRoutTestEvent
  | AcknowledgeEvent
  | UndoEvent
  | RequestStateEvent;

// Type guard helpers
export function isSelectionEvent(event: GameEvent): event is SelectWarriorEvent | DeselectEvent | SelectTargetEvent {
  return event.type === 'SELECT_WARRIOR' || event.type === 'DESELECT' || event.type === 'SELECT_TARGET';
}

export function isMovementEvent(event: GameEvent): event is ConfirmMoveEvent | ConfirmChargeEvent | ConfirmPositionEvent {
  return event.type === 'CONFIRM_MOVE' || event.type === 'CONFIRM_CHARGE' || event.type === 'CONFIRM_POSITION';
}

export function isCombatEvent(event: GameEvent): event is ConfirmShotEvent | ConfirmMeleeEvent {
  return event.type === 'CONFIRM_SHOT' || event.type === 'CONFIRM_MELEE';
}

// Event type strings for availableEvents in screen commands
export type EventType = GameEvent['type'];

// Helper to create an event with auto-generated id and timestamp
export function createEvent<T extends GameEvent>(
  type: T['type'],
  payload: T['payload'],
  playerId: string
): T {
  return {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    playerId,
    type,
    payload
  } as T;
}
