// Warband Store - SolidJS state management for warbands

import { createStore, produce } from 'solid-js/store';
import type { Warband, Warrior, ValidationResult } from '../types';
import * as storage from '../services/storage';
import { validateWarband, updateWarbandRating } from '../logic/warbandManager';

// Store state interface
interface WarbandStoreState {
  warbands: Warband[];
  currentWarband: Warband | null;
  loading: boolean;
  error: string | null;
}

// Create the store
const [state, setState] = createStore<WarbandStoreState>({
  warbands: [],
  currentWarband: null,
  loading: false,
  error: null
});

// Derived state: validation result for current warband
export function getCurrentValidation(): ValidationResult {
  return validateWarband(state.currentWarband);
}

// Actions
async function loadWarbands(): Promise<void> {
  setState('loading', true);
  setState('error', null);
  try {
    const warbands = await storage.getAllWarbands();
    setState('warbands', warbands);
  } catch (e) {
    setState('error', (e as Error).message);
  } finally {
    setState('loading', false);
  }
}

async function loadWarband(id: string): Promise<Warband | undefined> {
  setState('loading', true);
  setState('error', null);
  try {
    const warband = await storage.getWarband(id);
    if (warband) {
      setState('currentWarband', warband);
    }
    return warband;
  } catch (e) {
    setState('error', (e as Error).message);
    return undefined;
  } finally {
    setState('loading', false);
  }
}

async function saveWarband(warband: Warband): Promise<Warband> {
  setState('loading', true);
  setState('error', null);
  try {
    const saved = await storage.saveWarband(warband);
    setState(produce((s) => {
      const idx = s.warbands.findIndex(w => w.id === saved.id);
      if (idx >= 0) {
        s.warbands[idx] = saved;
      } else {
        s.warbands.push(saved);
      }
      s.currentWarband = saved;
    }));
    return saved;
  } catch (e) {
    setState('error', (e as Error).message);
    throw e;
  } finally {
    setState('loading', false);
  }
}

async function deleteWarband(id: string): Promise<void> {
  setState('loading', true);
  setState('error', null);
  try {
    await storage.deleteWarband(id);
    setState(produce((s) => {
      const idx = s.warbands.findIndex(w => w.id === id);
      if (idx >= 0) {
        s.warbands.splice(idx, 1);
      }
      if (s.currentWarband?.id === id) {
        s.currentWarband = null;
      }
    }));
  } catch (e) {
    setState('error', (e as Error).message);
    throw e;
  } finally {
    setState('loading', false);
  }
}

function setCurrentWarband(warband: Warband | null): void {
  setState('currentWarband', warband ? { ...warband } : null);
}

function updateCurrentWarband(updates: Partial<Warband>): void {
  setState(produce((s) => {
    if (s.currentWarband) {
      Object.assign(s.currentWarband, updates);
    }
  }));
}

function updateWarrior(warriorId: string, updates: Partial<Warrior>): void {
  setState(produce((s) => {
    if (s.currentWarband) {
      const warrior = s.currentWarband.warriors.find(w => w.id === warriorId);
      if (warrior) {
        Object.assign(warrior, updates);
      }
      updateWarbandRating(s.currentWarband);
    }
  }));
}

function addWarriorToCurrentWarband(warrior: Warrior): void {
  setState(produce((s) => {
    if (s.currentWarband) {
      s.currentWarband.warriors.push(warrior);
      updateWarbandRating(s.currentWarband);
    }
  }));
}

function removeWarriorFromCurrentWarband(warriorId: string): void {
  setState(produce((s) => {
    if (s.currentWarband) {
      const idx = s.currentWarband.warriors.findIndex(w => w.id === warriorId);
      if (idx >= 0) {
        const warrior = s.currentWarband.warriors[idx];
        s.currentWarband.treasury += warrior.cost;
        s.currentWarband.warriors.splice(idx, 1);
        updateWarbandRating(s.currentWarband);
      }
    }
  }));
}

function updateTreasury(amount: number): void {
  setState(produce((s) => {
    if (s.currentWarband) {
      s.currentWarband.treasury += amount;
    }
  }));
}

function clearError(): void {
  setState('error', null);
}

// Export store and actions
export const warbandStore = {
  // State (readonly access)
  get state() { return state; },

  // Actions
  loadWarbands,
  loadWarband,
  saveWarband,
  deleteWarband,
  setCurrentWarband,
  updateCurrentWarband,
  updateWarrior,
  addWarriorToCurrentWarband,
  removeWarriorFromCurrentWarband,
  updateTreasury,
  clearError,
  getCurrentValidation
};

// For direct state access in components
export { state as warbandState };
