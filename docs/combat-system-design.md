# Combat System UI & Flow Design

## Overview

Design and implement the Shooting Phase and Combat Phase for Phoneheim. The core mechanics are already implemented in `gameRules.ts` - this plan focuses on UI flow and state management for executing combat.

## Current State

**Implemented:**
- Turn phases: Recovery → Movement → Shooting → Combat
- Recovery phase fully working (rally, stunned recovery, stand up)
- Movement phase working (move, run, charge with engagement tracking)
- All dice functions: `rollToHitShooting`, `rollToHitMelee`, `rollToWound`, `rollArmorSave`, `rollInjury`, `rollCriticalHit`
- Warrior status: `standing`, `knockedDown`, `stunned`, `outOfAction`, `fleeing`
- Combat engagement tracking: `warrior.combatState.inCombat`, `engagedWith[]`
- Undo system for all actions

**Missing:**
- Shooting phase UI and actions
- Combat phase UI and actions
- Combat resolution flow (attack sequence with dice results)

## Mordheim Rules Summary

### Shooting Phase
1. Each warrior may shoot once (if: has ranged weapon, not in combat, didn't run/charge/rally, not stunned/knocked down)
2. Select target (restrictions: closest enemy, or further if easier to hit, can ignore stunned/knocked down, cannot shoot into combat)
3. Resolution: Roll to Hit (BS-based) → Roll to Wound (S vs T) → Armor Save → Injury (if wounds = 0)
4. Modifiers: Cover (-1 to hit), Long range (-1), Moved (-1), Large target (+1)

### Combat Phase
1. **Both players fight** regardless of whose turn it is
2. Strike order:
   - Chargers strike first
   - Then by Initiative (highest first)
   - Models that stood up this turn strike last
   - Equal initiative = roll off
3. For each attack: To Hit (WS vs WS) → Wound (S vs T) → Armor Save → Injury
4. Special rules:
   - Critical hit on natural 6 to wound (unless needing 6+ to wound)
   - Parry with swords/bucklers
   - Multiple attacks can be divided between engaged enemies
   - Knocked down: auto-hit, wound+failed save = out of action
   - Stunned: auto-out of action if attacked

---

## Design: Shooting Phase

### UI Flow

```
┌─────────────────────────────────────────────────────────────┐
│ SHOOTING PHASE - Player 1's Turn                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Warriors Ready to Shoot:                                    │
│ ┌──────────────────────────────────────────────────┐        │
│ │ [Marksman] - Crossbow (30", S4)                  │ [Shoot]│
│ │ [Archer] - Bow (24", S3)                         │ [Shoot]│
│ │ [Captain] - Pistol (6", S4) - has moved          │ [Shoot]│
│ └──────────────────────────────────────────────────┘        │
│                                                             │
│ Already Shot / Cannot Shoot:                                │
│ • Swordsman (no ranged weapon)                              │
│ • Runner (ran this turn)                                    │
│ • Fighter (in combat)                                       │
│                                                             │
│ [Skip Remaining Shots] [Next Phase]                         │
└─────────────────────────────────────────────────────────────┘
```

### Target Selection Modal

```
┌─────────────────────────────────────────────────────────────┐
│ SELECT TARGET - Marksman shooting Crossbow                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Available Targets:                                          │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ [Enemy Warrior 1] - In Cover                   [Select]│  │
│ │   Hit needed: 5+ (BS4, -1 cover)                       │  │
│ │ [Enemy Warrior 2] - In Open, Long Range        [Select]│  │
│ │   Hit needed: 5+ (BS4, -1 long range)                  │  │
│ │ [Enemy Warrior 3] - Knocked Down, In Open      [Select]│  │
│ │   Hit needed: 4+ (BS4)                                 │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                             │
│ Cannot Target:                                              │
│ • Enemy Fighter (in combat with your warrior)               │
│ • Enemy Hero (out of range)                                 │
│                                                             │
│ [Cancel]                                                    │
└─────────────────────────────────────────────────────────────┘
```

### Shot Resolution Display

```
┌─────────────────────────────────────────────────────────────┐
│ SHOT RESOLUTION                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Marksman → Enemy Warrior (Crossbow)                         │
│                                                             │
│ ⚔️ TO HIT: Rolled [4] - Need 4+ ✓ HIT!                      │
│                                                             │
│ 💪 TO WOUND: Rolled [5] - Need 4+ (S4 vs T3) ✓ WOUNDED!     │
│                                                             │
│ 🛡️ ARMOR SAVE: Rolled [3] - Need 5+ (4+ base, -1 S4) ✗ FAIL│
│                                                             │
│ 💀 INJURY: Rolled [4] - STUNNED                             │
│    Enemy Warrior is now Stunned!                            │
│                                                             │
│ [OK]                                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Design: Combat Phase

### UI Flow - Strike Order Queue

```
┌─────────────────────────────────────────────────────────────┐
│ COMBAT PHASE - Resolving All Combats                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Strike Order: (sorted by initiative, chargers first)        │
│                                                             │
│ 1. ⚡ [Your Captain] - I:4, Charged this turn    [CURRENT]  │
│ 2.    [Enemy Champion] - I:4                     [WAITING]  │
│ 3.    [Your Warrior] - I:3                       [WAITING]  │
│ 4. 🐢 [Enemy Grunt] - I:3, Stood up             [WAITING]  │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ Current Fighter: Your Captain                               │
│ Attacks: 2 | Weapon: Sword (+parry) | Strength: 4           │
│                                                             │
│ Engaged With:                                               │
│ • Enemy Champion (standing)                      [Attack]   │
│ • Enemy Grunt (knocked down)                     [Attack]   │
│                                                             │
│ [Divide Attacks] [Attack All vs Champion]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Attack Resolution Display

```
┌─────────────────────────────────────────────────────────────┐
│ MELEE ATTACK RESOLUTION                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Your Captain (2 attacks) → Enemy Champion                   │
│                                                             │
│ ATTACK 1:                                                   │
│ ⚔️ TO HIT: Rolled [5] - Need 4+ (WS4 vs WS4) ✓ HIT!         │
│   🛡️ PARRY: Enemy rolled [4] vs your [5] - Parry FAILED    │
│ 💪 TO WOUND: Rolled [6] - CRITICAL HIT! 🎯                  │
│   → Critical: Rolled [5] - Master Strike! (2 wounds, no save)│
│ 💀 INJURY: Rolled [5] - OUT OF ACTION!                      │
│                                                             │
│ Enemy Champion is Out of Action!                            │
│ Combat ends - no second attack needed.                      │
│                                                             │
│ [Continue to Next Fighter]                                  │
└─────────────────────────────────────────────────────────────┘
```

### Knocked Down / Stunned Target Attack

```
┌─────────────────────────────────────────────────────────────┐
│ ATTACK VS DOWNED ENEMY                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Your Warrior → Enemy Grunt (Knocked Down)                   │
│                                                             │
│ ⚠️ AUTO-HIT (enemy is knocked down)                         │
│                                                             │
│ 💪 TO WOUND: Rolled [4] - Need 4+ (S3 vs T3) ✓ WOUNDED!     │
│                                                             │
│ 🛡️ ARMOR SAVE: Rolled [2] - Need 6+ ✗ FAILED               │
│                                                             │
│ 💀 Wounded while knocked down = OUT OF ACTION!              │
│                                                             │
│ [Continue]                                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## State Management

### New Types (in `types/game.ts`)

```typescript
interface CombatResolution {
  attackerId: string;
  defenderId: string;
  weapon: string;

  toHitRoll: number;
  toHitNeeded: number;
  hit: boolean;

  parryAttempted?: boolean;
  parryRoll?: number;
  parrySuccess?: boolean;

  toWoundRoll?: number;
  toWoundNeeded?: number;
  wounded?: boolean;

  criticalHit?: boolean;
  criticalType?: 'vitalPart' | 'exposedSpot' | 'masterStrike';

  armorSaveRoll?: number;
  armorSaveNeeded?: number;
  armorSaved?: boolean;

  injuryRoll?: number;
  injuryResult?: 'knockedDown' | 'stunned' | 'outOfAction';

  finalOutcome: 'miss' | 'parried' | 'saved' | 'knockedDown' | 'stunned' | 'outOfAction';
}

interface ShootingAction {
  shooterId: string;
  targetId: string;
  weapon: string;
  modifiers: {
    cover: boolean;
    longRange: boolean;
    moved: boolean;
    largeTarget: boolean;
  };
  resolution: CombatResolution;
}

interface MeleeRound {
  strikeOrder: string[]; // warrior IDs in order
  currentFighterIndex: number;
  attacks: CombatResolution[];
}
```

### New Functions (in `gameState.ts`)

```typescript
// Shooting Phase
canWarriorShoot(state, warriorId): boolean
getShootingTargets(state, shooterId): { targetId, modifiers, toHitNeeded }[]
executeShot(state, shooterId, targetId): { state, resolution }

// Combat Phase
buildStrikeOrder(state): string[]  // Returns warrior IDs sorted by strike priority
getAttackTargets(state, fighterId): { targetId, status }[]
executeMeleeAttack(state, attackerId, defenderId, attackCount): { state, resolutions }
processAllCombats(state): { state, allResolutions }
```

---

## Design Decisions (Confirmed)

1. **Modifiers**: Manual toggle - user toggles "in cover", "long range", etc. before each shot
2. **Combat pace**: Step-by-step display with [Continue] buttons for drama/clarity
3. **Rout tests**: Auto-trigger when 25%+ out of action, prompt Leadership test at start of turn
4. **Scope**: Full rules - including parry, all critical hit types, weapon special rules

---

## Detailed Implementation Phases

### Phase 1: Types & Core Resolution Functions

**File: `src/types/game.ts`**
- Add `CombatResolution` interface (tracks all roll results)
- Add `ShootingModifiers` interface
- Add `WeaponProfile` type with special rules

**File: `src/logic/gameRules.ts`** - Add:
```typescript
// Complete modifier calculations
calculateShootingModifiers(inCover, longRange, moved, largeTarget): number
calculateArmorSaveModifier(strength, weaponModifier): number

// Parry mechanics
attemptParry(parryRoll, opponentHitRoll, hasReroll): { success, roll }

// Critical hit resolution
rollCriticalHit(): { type, wounds, ignoresArmor, injuryBonus }

// Weapon special rules
getWeaponStrengthBonus(weaponType, isFirstRound): number
getWeaponSpecialRules(weaponType): string[]
```

### Phase 2: Game State - Shooting Phase

**File: `src/logic/gameState.ts`** - Add:
```typescript
// Eligibility
canWarriorShoot(state, warriorId): boolean
// Returns false if: in combat, ran, charged, rallied, stunned, knocked down, no ranged weapon

// Target list with calculated to-hit
getShootingTargets(state, shooterId): Array<{
  targetId: string,
  targetName: string,
  modifiers: ShootingModifiers,
  toHitNeeded: number
}>
// Filters: not in combat, not same warband

// Full resolution chain
executeShot(state, shooterId, targetId, modifiers): {
  newState: GameState,
  resolution: CombatResolution
}
// Steps: roll hit → roll wound → check critical → roll armor → roll injury
// Updates target status (stunned, knocked down, out of action)
```

### Phase 3: Game State - Combat Phase

**File: `src/logic/gameState.ts`** - Add:
```typescript
// Build sorted list of fighters
buildStrikeOrder(state): Array<{
  warriorId: string,
  initiative: number,
  charged: boolean,
  stoodUp: boolean,
  warbandIndex: number
}>
// Sort: chargers first → initiative desc → roll off if equal → stood up last

// Available attack targets
getAttackTargets(state, attackerId): Array<{
  targetId: string,
  targetName: string,
  status: 'standing' | 'knockedDown' | 'stunned'
}>

// Single attack resolution
executeMeleeAttack(state, attackerId, defenderId, weapon): {
  newState: GameState,
  resolution: CombatResolution
}
// Handles: auto-hit knocked down, parry, critical hits, weapon bonuses

// Full combat round
resolveCombatPhase(state): {
  newState: GameState,
  strikeOrder: string[],
  resolutions: CombatResolution[][]
}
```

### Phase 4: Game Store Actions

**File: `src/stores/gameStore.ts`** - Add:
```typescript
// Shooting actions
shootWarrior(shooterId: string, targetId: string, modifiers: ShootingModifiers): CombatResolution
skipShooting(warriorId: string): void

// Combat actions
setCurrentFighter(warriorId: string): void
executeAttack(attackerId: string, targetId: string): CombatResolution
divideAttacks(attackerId: string, targets: Array<{targetId, attacks}>): CombatResolution[]
nextFighter(): void

// Auto-checks
checkRoutRequired(): boolean
executeRoutTest(): { passed: boolean, roll: number, needed: number }
```

### Phase 5: UI Components

**File: `src/components/game/ShootingPanel.tsx`** (NEW)
```
┌─────────────────────────────────────────┐
│ Warriors Ready to Shoot                 │
│ ┌─────────────────────────────────────┐ │
│ │ Marksman - Crossbow (30", S4)       │ │
│ │ [In Cover ☐] [Long Range ☐]         │ │
│ │ [Target Moved ☐]                    │ │
│ │ To Hit: 4+        [Select Target]   │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Archer - Bow (24", S3) ✓ Shot       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Skip Remaining]                        │
└─────────────────────────────────────────┘
```

**File: `src/components/game/CombatPanel.tsx`** (NEW)
```
┌─────────────────────────────────────────┐
│ STRIKE ORDER                            │
│ 1. ⚡ Captain (I:4, Charged)  ← CURRENT │
│ 2.    Champion (I:4)                    │
│ 3.    Warrior (I:3)                     │
│ 4. 🐢 Grunt (I:3, Stood Up)             │
├─────────────────────────────────────────┤
│ Captain's Turn - 2 Attacks              │
│ Weapon: Sword (Parry)                   │
│                                         │
│ Engaged Enemies:                        │
│ • Champion (standing)      [Attack]     │
│ • Grunt (knocked down)     [Attack]     │
│                                         │
│ [Divide Attacks Between Targets]        │
└─────────────────────────────────────────┘
```

**File: `src/components/game/CombatResolutionModal.tsx`** (NEW)
- Step-by-step display with [Continue] between each step
- Shows: attacker/defender, weapon, each dice roll with target/result
- Visual indicators: ✓ success, ✗ failure, 🎯 critical

**File: `src/components/game/RoutTestModal.tsx`** (NEW)
- Auto-triggered at start of turn when 25%+ OOA
- Shows current casualty count, leader Ld, roll result
- Pass: continue playing, Fail: warband routs, game ends

### Phase 6: GamePlay.tsx Integration

**Shooting Phase Section:**
```tsx
<Show when={game().phase === 'shooting'}>
  <ShootingPanel
    warriors={getShooters()}
    onShoot={handleShoot}
    onSkip={handleSkipShooting}
  />
</Show>
```

**Combat Phase Section:**
```tsx
<Show when={game().phase === 'combat'}>
  <CombatPanel
    strikeOrder={getStrikeOrder()}
    currentFighter={getCurrentFighter()}
    onAttack={handleAttack}
    onDivideAttacks={handleDivideAttacks}
  />
</Show>

<CombatResolutionModal
  isOpen={showResolution()}
  resolution={currentResolution()}
  onStep={handleResolutionStep}
  onComplete={handleResolutionComplete}
/>

<RoutTestModal
  isOpen={showRoutTest()}
  casualties={getCasualtyCount()}
  total={getWarbandSize()}
  leadership={getLeaderLd()}
  onRoll={handleRoutRoll}
/>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/game.ts` | Add CombatResolution, ShootingAction, MeleeRound types |
| `src/logic/gameState.ts` | Add shooting/combat resolution functions |
| `src/logic/gameRules.ts` | Minor additions for parry, modifier calculations |
| `src/stores/gameStore.ts` | Add shoot/combat actions |
| `src/pages/GamePlay.tsx` | Add shooting/combat phase UI sections |
| `src/components/game/index.ts` | Export new components |
| NEW: `src/components/game/ShootingPanel.tsx` | Shooting phase UI |
| NEW: `src/components/game/CombatPanel.tsx` | Combat phase UI |
| NEW: `src/components/game/CombatResolutionModal.tsx` | Dice result display |
| NEW: `src/components/game/RoutTestModal.tsx` | Rout test UI |

---

## Weapon Special Rules to Implement

| Weapon | Rule | Implementation |
|--------|------|----------------|
| Sword | Parry | Roll to block hits, re-roll if have buckler too |
| Buckler | Parry | Same as sword |
| Flail | +2S first round | `getWeaponStrengthBonus(weapon, isFirstRound)` |
| Morning Star | +1S first round | Same as flail |
| Halberd | +1S, Two-handed | Strength bonus, no shield |
| Double-handed | +2S, Strike Last | Strength bonus, override initiative |
| Axe | -1 armor save | Extra save modifier |
| Dagger | +1 enemy armor save | Negative save modifier |
| Spear | Strike first (1st round) | Override initiative on charge |

---

## Test Coverage

**New test file: `tests/combat-resolution.spec.ts`**
- Shooting: modifiers calculation, hit/miss, wound/save, injury results
- Melee: strike order, parry, critical hits, knocked down/stunned rules
- Rout: threshold detection, test execution, game end on fail

---

## Implementation Order

1. [ ] Add types to `types/game.ts`
2. [ ] Add modifier/weapon functions to `gameRules.ts`
3. [ ] Add shooting resolution to `gameState.ts`
4. [ ] Add combat resolution to `gameState.ts`
5. [ ] Add store actions to `gameStore.ts`
6. [ ] Create `ShootingPanel.tsx`
7. [ ] Create `CombatPanel.tsx`
8. [ ] Create `CombatResolutionModal.tsx`
9. [ ] Create `RoutTestModal.tsx`
10. [ ] Integrate into `GamePlay.tsx`
11. [ ] Add tests
12. [ ] CSS styling for new components
