# Phoneheim Architecture

This document explains the game architecture, focusing on how the UI and game logic communicate.

## Overview

Phoneheim uses a **store-centric architecture** where the game store acts as the central coordinator:

```
┌─────────────────┐         ┌─────────────────────────────────────┐
│   UI Layer      │         │           gameStore.ts              │
│  (components/)  │ ──────► │  ┌───────────┐  ┌───────────────┐   │
│   (pages/)      │ ◄────── │  │ UI State  │  │ Game State    │   │
└─────────────────┘         │  │ (modals,  │  │ (activeGame)  │   │
                            │  │ selection)│  │               │   │
                            │  └───────────┘  └───────────────┘   │
                            │         │                           │
                            │         │ orchestration logic       │
                            │         ▼                           │
                            │  ┌───────────────────────────┐      │
                            │  │ embedded game decisions   │      │
                            │  │ (rout checks, game end)   │      │
                            │  └───────────────────────────┘      │
                            └──────────────────┬──────────────────┘
                                               │ imports
                                               ▼
                            ┌─────────────────────────────────────┐
                            │         logic/gameState.ts          │
                            │         (pure game rules)           │
                            └─────────────────────────────────────┘
```

## Are UI and Logic Decoupled?

**Partially.** There is a layered structure, but the boundaries are not clean:

1. **The logic layer (`gameState.ts`) is mostly pure** - it contains game rules as functions that take state and return results
2. **The store layer is a "fat controller"** - it mixes UI state, game state access, and some game logic
3. **UI components access store state directly** - creating tight coupling to state shape

### What's Well-Separated

The logic layer (`src/logic/gameState.ts`) contains pure functions for game mechanics:

```typescript
// Pure function - takes state, returns result
export function executeShot(
  gameState: GameState,
  shooterId: string,
  targetId: string,
  modifiers: ShootingModifiers
): { action: GameAction; resolution: CombatResolution } {
  // Dice rolls, damage calculation, injury rolls
  const hitResult = rollToHitShooting(shooter.profile.BS, {...});
  const woundResult = rollToWound(weaponStrength, target.profile.T);
  return { action, resolution };
}
```

### What's Mixed Together

The store (`src/stores/gameStore.ts`) combines multiple concerns:

**1. UI State** (lines 69-86):
```typescript
interface GameStoreState {
  // UI-only concerns
  selectedWarrior: string | null;
  selectedTarget: string | null;
  pendingUndo: boolean;
  showResolutionModal: boolean;
  showRoutModal: boolean;
  shootingModifiers: ShootingModifiers;

  // Game state
  activeGame: GameState | null;
  strikeOrder: StrikeOrderEntry[];
}
```

**2. Game Logic in Store** (lines 444-451):
```typescript
function shootWarrior(shooterId: string, targetId: string) {
  setState(produce((s) => {
    result = executeShotLogic(...);  // Calls logic layer

    // But then makes game decisions here in the store:
    for (let i = 0; i < 2; i++) {
      if (isRoutTestRequired(s.activeGame.warbands[i])) {
        s.pendingRoutTest = i;
        s.showRoutModal = true;
      }
    }
  }));
}
```

**3. Direct State Mutation** (lines 168-177):
```typescript
// Bypasses logic layer entirely
function setWarriorActed(warbandIndex: number, warriorId: string): void {
  setState(produce((s) => {
    const warrior = warband.warriors.find(w => w.id === warriorId);
    if (warrior) {
      warrior.hasActed = true;
    }
  }));
}
```

**4. UI Direct State Access** (line 761):
```typescript
export { state as gameState };

// UI components then do:
const showModal = () => gameState.showResolutionModal;
const selected = () => gameState.selectedWarrior;
```

## Layer Responsibilities (Actual)

### UI Layer (`src/components/`, `src/pages/`)

- Renders game state to the DOM
- Captures user interactions
- Calls store actions
- **Directly reads store state** (not through getters/selectors)

### Store Layer (`src/stores/gameStore.ts`)

This is the "fat controller" that does multiple things:

- Holds UI state (selections, modal visibility)
- Holds reference to game state
- Wraps logic functions with `setState` calls
- **Contains game flow decisions** (when to show rout modal, when game ends)
- **Some functions bypass logic layer** (direct state mutation)

### Logic Layer (`src/logic/`)

- **`gameRules.js`** - Dice rolling, combat math (pure)
- **`gameState.ts`** - Turn phases, action execution (mostly pure)
- **`warbandManager.ts`** - Warband validation (pure)

The logic layer is the cleanest part - functions here generally don't have side effects and don't know about UI.

## Data Flow Examples

### Shooting Action (Shows Mixed Responsibilities)

```
1. User clicks "Shoot"
   └─► GamePlay.tsx: handleShoot(targetId)

2. UI calls store
   └─► gameStore.shootWarrior(shooterId, targetId)

3. Store does multiple things:
   ├─► Calls executeShotLogic() from logic layer
   ├─► Stores result in state (currentResolution)
   ├─► Decides to show modal (showResolutionModal = true)  ← UI concern
   └─► Checks if rout test needed                          ← Game logic
       └─► Sets pendingRoutTest, showRoutModal             ← Mixed

4. UI reacts to state changes
   └─► Modal appears because showResolutionModal is true
```

### Where Logic Layer Is Bypassed

```
// These store functions mutate state directly:
setWarriorActed()    - lines 168-177
setWarriorMoved()    - lines 180-190
setWarriorShot()     - lines 192-202
setWarriorCharged()  - lines 204-214

// vs these that properly call logic layer:
moveWarrior()        - calls moveWarriorLogic()
shootWarrior()       - calls executeShotLogic()
```

## State Management

### Solid.js Store Pattern

```typescript
const [state, setState] = createStore<GameStoreState>({...});

// Mutations use produce() for immutability
setState(produce((s) => {
  s.activeGame.turn++;
}));
```

### Direct State Export

The store exports raw state for UI consumption:

```typescript
// Store exports
export const gameStore = { /* actions */ };
export { state as gameState };

// UI imports both
import { gameStore, gameState } from '../stores/gameStore';

// UI reads state directly
const phase = () => gameState.activeGame?.phase;
```

This creates coupling - UI components depend on the exact shape of `GameStoreState`.

## Architectural Trade-offs

### Current Approach Benefits

| Benefit | How |
|---------|-----|
| Simple to understand | One file coordinates everything |
| Easy to add features | Just add to gameStore |
| Reactive updates | Solid.js signals work well |
| Undo support | Action history in logic layer |

### Current Approach Drawbacks

| Issue | Where |
|-------|-------|
| Mixed concerns | UI state + game logic in store |
| Leaky abstraction | Game decisions in store, not logic |
| Tight coupling | UI reads state shape directly |
| Hard to test store | Would need to mock UI state too |
| Inconsistent patterns | Some functions use logic layer, some don't |

## Potential Improvements

If stricter separation were desired:

1. **Split store state**: Separate `uiStore` (modals, selection) from `gameStore` (game state only)

2. **Move game decisions to logic layer**: Rout test checks, game end conditions should be in `gameState.ts`

3. **Consistent logic layer usage**: All state mutations should go through logic functions

4. **Selectors instead of direct access**: UI uses `getCurrentPhase()` instead of `gameState.activeGame?.phase`

## Key Files

| File | Purpose | Purity |
|------|---------|--------|
| `src/stores/gameStore.ts` | Central coordinator, mixed concerns | Impure |
| `src/stores/warbandStore.ts` | Warband CRUD | Impure |
| `src/logic/gameState.ts` | Core game logic | Mostly pure |
| `src/logic/gameRules.js` | Dice mechanics | Pure |
| `src/pages/GamePlay.tsx` | Main game UI | Impure |
