// View Model Builders
// Shared utilities for converting game state to UI view models

import type { GameState, GameWarrior, GameWarband } from '../../types/game';
import type { WarriorView, WarbandView } from '../types/screens';

/**
 * Convert a GameWarrior to a WarriorView for UI display
 */
export function toWarriorView(warrior: GameWarrior, warbandIndex: number): WarriorView {
  return {
    id: warrior.id,
    name: warrior.name,
    type: warrior.type,
    category: warrior.category,
    warbandIndex,
    movement: warrior.profile.M,
    weaponSkill: warrior.profile.WS,
    ballisticSkill: warrior.profile.BS,
    strength: warrior.profile.S,
    toughness: warrior.profile.T,
    wounds: warrior.profile.W,
    woundsRemaining: warrior.woundsRemaining,
    initiative: warrior.profile.I,
    attacks: warrior.profile.A,
    leadership: warrior.profile.Ld,
    meleeWeapons: warrior.equipment.melee,
    rangedWeapons: warrior.equipment.ranged,
    armor: warrior.equipment.armor,
    status: warrior.gameStatus,
    hasActed: warrior.hasActed,
    hasMoved: warrior.hasMoved,
    hasRun: warrior.hasRun,
    hasShot: warrior.hasShot,
    hasCharged: warrior.hasCharged,
    inCombat: warrior.combatState.inCombat,
    inCover: warrior.combatState.inCover,
    engagedWith: warrior.combatState.engagedWith
  };
}

/**
 * Convert a GameWarband to a WarbandView for UI display
 */
export function toWarbandView(warband: GameWarband): WarbandView {
  return {
    name: warband.name,
    typeName: warband.typeName,
    player: warband.player,
    warriors: warband.warriors.map(w => toWarriorView(w, warband.player - 1)),
    outOfActionCount: warband.outOfActionCount,
    totalWarriors: warband.warriors.length,
    activeWarriors: warband.warriors.filter(w => w.gameStatus !== 'outOfAction').length
  };
}

/**
 * Get the current player's warband
 */
export function getCurrentWarband(state: GameState): GameWarband {
  return state.warbands[state.currentPlayer - 1];
}

/**
 * Get the opponent's warband
 */
export function getOpponentWarband(state: GameState): GameWarband {
  return state.warbands[state.currentPlayer === 1 ? 1 : 0];
}

/**
 * Find a warrior by ID across all warbands
 * @returns The warrior and its warband index, or null if not found
 */
export function findWarrior(
  state: GameState,
  warriorId: string
): { warrior: GameWarrior; warbandIndex: number } | null {
  for (let i = 0; i < state.warbands.length; i++) {
    const warrior = state.warbands[i].warriors.find(w => w.id === warriorId);
    if (warrior) {
      return { warrior, warbandIndex: i };
    }
  }
  return null;
}

/**
 * Find a warrior and convert to WarriorView
 * @returns The warrior view or null if not found
 */
export function findWarriorView(
  state: GameState,
  warriorId: string
): WarriorView | null {
  const result = findWarrior(state, warriorId);
  if (!result) return null;
  return toWarriorView(result.warrior, result.warbandIndex);
}
