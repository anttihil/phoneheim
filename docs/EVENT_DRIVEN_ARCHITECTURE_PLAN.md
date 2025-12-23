# Event-Driven Architecture Plan

This document describes a refactoring plan to move from the current "fat controller" store architecture to an event-driven architecture with clean separation between UI, game engine, and state.

## Goals

1. **Multiplayer** - Local and remote inputs are unified as events
2. **Undo** - Fine-grained events enable precise undo at any granularity
3. **Replayability** - Event log can recreate any game state
4. **Headless operation** - Game engine can run without browser/UI (for testing, bots, coding agents)
5. **Clean separation** - UI only renders, engine only processes, state is pure data

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           BROWSER                                    │
│  ┌─────────────┐                              ┌─────────────────┐   │
│  │   UI Layer  │  ───── input events ───────► │  Input Mediator │   │
│  │  (renders)  │                              │                 │   │
│  └──────▲──────┘                              └────────┬────────┘   │
│         │                                              │            │
│         │ UI state                                     │            │
│         │                                              │            │
│  ┌──────┴──────┐                                       │            │
│  │  UI Store   │ ◄─── screen commands ───┐             │            │
│  │ (what to    │                         │             │            │
│  │  render)    │                         │             │            │
│  └─────────────┘                         │             │            │
└──────────────────────────────────────────┼─────────────┼────────────┘
                                           │             │
                              ┌────────────┴─────────────┴────────────┐
                              │           GAME ENGINE                  │
                              │  (can run in browser, Node, or test)  │
                              │                                        │
                              │  ┌─────────────┐  ┌────────────────┐  │
                              │  │ Event       │  │ Screen Command │  │
                              │  │ Processor   │  │ Emitter        │  │
                              │  └──────┬──────┘  └────────────────┘  │
                              │         │                              │
                              │         ▼                              │
                              │  ┌─────────────┐  ┌────────────────┐  │
                              │  │ Game State  │  │ Event History  │  │
                              │  │ (pure data) │  │ (for undo)     │  │
                              │  └─────────────┘  └────────────────┘  │
                              └────────────────────────────────────────┘
                                           │
                                           │ state sync (multiplayer)
                                           ▼
                              ┌────────────────────────────────────────┐
                              │           NETWORK LAYER                │
                              │  (WebRTC, current player broadcasts)   │
                              └────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Multiplayer Authority: Current Player Broadcasts

Since this is turn-based:
- The current player's client is authoritative for their turn
- After processing an event, current player broadcasts resulting state to others
- Other players receive state updates and render accordingly
- On turn change, authority transfers to next player

```typescript
// When it's my turn
mediator.submitEvent(event);  // Process locally, broadcast state

// When it's opponent's turn
mediator.receiveState(state);  // Accept their authoritative state
```

### 2. Fine-Grained Events for Undo

Events are small and composable. A shooting action is multiple events:

```typescript
// User wants to shoot
{ type: 'SELECT_WARRIOR', warriorId: 'archer1' }
{ type: 'SET_SHOOTING_MODIFIER', modifier: 'cover', value: true }
{ type: 'SET_SHOOTING_MODIFIER', modifier: 'longRange', value: true }
{ type: 'SELECT_TARGET', targetId: 'enemy1' }
{ type: 'CONFIRM_SHOT' }  // This triggers dice rolls

// Undo can revert to any point:
// - Undo CONFIRM_SHOT: re-roll? or back to target selection
// - Undo SELECT_TARGET: choose different target
// - Undo SET_SHOOTING_MODIFIER: toggle modifier off
```

Events that involve randomness (dice rolls) store their results:
```typescript
{
  type: 'CONFIRM_SHOT',
  // Results stored in event for replay determinism
  results: {
    toHitRoll: 4,
    toWoundRoll: 5,
    armorSaveRoll: 2,
    injuryRoll: 8
  }
}
```

### 3. Engine Emits Screen Commands (Option A)

The engine explicitly tells the UI what to display:

```typescript
interface ScreenCommand {
  screen: ScreenType;
  data: ScreenData;
}

type ScreenType =
  | 'GAME_SETUP'
  | 'RECOVERY_PHASE'
  | 'MOVEMENT_PHASE'
  | 'SHOOTING_PHASE'
  | 'SHOOTING_TARGET_SELECT'
  | 'SHOOTING_MODIFIERS'
  | 'COMBAT_RESOLUTION'
  | 'INJURY_ROLL'
  | 'ROUT_TEST'
  | 'GAME_OVER'
  // etc.

// Example screen commands
{ screen: 'SHOOTING_TARGET_SELECT', data: {
    shooterId: 'archer1',
    validTargets: ['enemy1', 'enemy2'],
    currentModifiers: { cover: true, longRange: false }
}}

{ screen: 'COMBAT_RESOLUTION', data: {
    attackerName: 'Marksman',
    defenderName: 'Swordsman',
    rolls: { toHit: 4, toWound: 5, armorSave: 2 },
    outcome: 'stunned'
}}
```

UI becomes a pure renderer:
```typescript
function renderScreen(command: ScreenCommand) {
  switch (command.screen) {
    case 'SHOOTING_TARGET_SELECT':
      return <TargetSelectScreen {...command.data} />;
    case 'COMBAT_RESOLUTION':
      return <CombatResolutionModal {...command.data} />;
    // etc.
  }
}
```

## Component Specifications

### 1. Game Events (Input)

```typescript
// Base event structure
interface GameEvent {
  id: string;           // Unique event ID
  timestamp: string;    // ISO timestamp
  playerId: string;     // Which player submitted this
  type: string;         // Event type
  payload: unknown;     // Event-specific data
}

// Event categories

// Selection events
interface SelectWarriorEvent extends GameEvent {
  type: 'SELECT_WARRIOR';
  payload: { warriorId: string };
}

interface SelectTargetEvent extends GameEvent {
  type: 'SELECT_TARGET';
  payload: { targetId: string };
}

interface DeselectEvent extends GameEvent {
  type: 'DESELECT';
  payload: {};
}

// Modifier events
interface SetModifierEvent extends GameEvent {
  type: 'SET_MODIFIER';
  payload: {
    category: 'shooting' | 'combat';
    modifier: string;
    value: boolean;
  };
}

// Action events (trigger game logic)
interface ConfirmMoveEvent extends GameEvent {
  type: 'CONFIRM_MOVE';
  payload: { moveType: 'move' | 'run' | 'charge' };
}

interface ConfirmShotEvent extends GameEvent {
  type: 'CONFIRM_SHOT';
  payload: {
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

interface ConfirmMeleeEvent extends GameEvent {
  type: 'CONFIRM_MELEE';
  payload: {
    weaponKey: string;
    results?: { /* dice results */ };
  };
}

// Recovery events
interface RecoveryActionEvent extends GameEvent {
  type: 'RECOVERY_ACTION';
  payload: {
    action: 'rally' | 'recoverFromStunned' | 'standUp';
    warriorId: string;
    results?: { roll: number };
  };
}

// Phase events
interface AdvancePhaseEvent extends GameEvent {
  type: 'ADVANCE_PHASE';
  payload: {};
}

// Meta events
interface UndoEvent extends GameEvent {
  type: 'UNDO';
  payload: { toEventId: string };  // Undo back to this event
}

interface RequestStateEvent extends GameEvent {
  type: 'REQUEST_STATE';
  payload: {};  // Used by joining players
}
```

### 2. Screen Commands (Output)

```typescript
interface ScreenCommand {
  screen: ScreenType;
  data: ScreenData;
  // Available actions the UI should present
  availableEvents: AvailableEventType[];
}

// Screen types and their data

interface GameSetupScreen {
  screen: 'GAME_SETUP';
  data: {
    warband: WarbandView;
    opponentWarband: WarbandView;
    scenario: ScenarioView;
    currentPlayer: 1 | 2;
    warriorsToPosition: WarriorView[];
  };
  availableEvents: ['SELECT_WARRIOR', 'CONFIRM_POSITION'];
}

interface RecoveryPhaseScreen {
  screen: 'RECOVERY_PHASE';
  data: {
    currentPlayer: 1 | 2;
    fleeingWarriors: WarriorView[];
    stunnedWarriors: WarriorView[];
    knockedDownWarriors: WarriorView[];
    completedRecoveries: string[];  // warrior IDs
  };
  availableEvents: ['SELECT_WARRIOR', 'RECOVERY_ACTION', 'ADVANCE_PHASE'];
}

interface MovementPhaseScreen {
  screen: 'MOVEMENT_PHASE';
  data: {
    currentPlayer: 1 | 2;
    actableWarriors: WarriorView[];
    selectedWarrior: WarriorView | null;
    chargeTargets: WarriorView[];  // If warrior selected
  };
  availableEvents: ['SELECT_WARRIOR', 'CONFIRM_MOVE', 'ADVANCE_PHASE'];
}

interface ShootingPhaseScreen {
  screen: 'SHOOTING_PHASE';
  data: {
    currentPlayer: 1 | 2;
    actableWarriors: WarriorView[];
    selectedWarrior: WarriorView | null;
  };
  availableEvents: ['SELECT_WARRIOR', 'ADVANCE_PHASE'];
}

interface ShootingTargetSelectScreen {
  screen: 'SHOOTING_TARGET_SELECT';
  data: {
    shooter: WarriorView;
    validTargets: TargetView[];
    modifiers: ShootingModifiers;
  };
  availableEvents: ['SELECT_TARGET', 'SET_MODIFIER', 'DESELECT'];
}

interface ShootingConfirmScreen {
  screen: 'SHOOTING_CONFIRM';
  data: {
    shooter: WarriorView;
    target: TargetView;
    modifiers: ShootingModifiers;
    toHitNeeded: number;
  };
  availableEvents: ['CONFIRM_SHOT', 'SET_MODIFIER', 'DESELECT'];
}

interface CombatResolutionScreen {
  screen: 'COMBAT_RESOLUTION';
  data: {
    attackerName: string;
    defenderName: string;
    weapon: string;
    rolls: {
      toHit?: { roll: number; needed: number; success: boolean };
      toWound?: { roll: number; needed: number; success: boolean };
      armorSave?: { roll: number; needed: number; success: boolean };
      injury?: { roll: number; result: string };
      critical?: { roll: number; type: string; description: string };
      parry?: { roll: number; success: boolean };
    };
    outcome: string;
  };
  availableEvents: ['ACKNOWLEDGE'];  // Dismiss modal
}

interface RoutTestScreen {
  screen: 'ROUT_TEST';
  data: {
    warbandName: string;
    leadershipNeeded: number;
    outOfActionCount: number;
    totalWarriors: number;
  };
  availableEvents: ['CONFIRM_ROUT_TEST'];
}

interface RoutTestResultScreen {
  screen: 'ROUT_TEST_RESULT';
  data: {
    warbandName: string;
    roll: number;
    needed: number;
    passed: boolean;
  };
  availableEvents: ['ACKNOWLEDGE'];
}

interface GameOverScreen {
  screen: 'GAME_OVER';
  data: {
    winner: 1 | 2 | null;
    winnerName: string;
    reason: 'rout' | 'objective' | 'elimination' | 'voluntary';
    gameLog: LogEntry[];
    statistics: GameStatistics;
  };
  availableEvents: ['NEW_GAME', 'REMATCH', 'EXIT'];
}
```

### 3. Game Engine

```typescript
interface GameEngine {
  // Initialize
  createGame(warband1: Warband, warband2: Warband, scenario: string): void;
  loadGame(state: GameState, history: GameEvent[]): void;

  // Core event processing
  processEvent(event: GameEvent): ProcessResult;

  // State access
  getState(): GameState;
  getEventHistory(): GameEvent[];

  // Screen commands
  getCurrentScreen(): ScreenCommand;

  // Undo
  canUndo(): boolean;
  getUndoableEvents(): GameEvent[];  // Events that can be undone
  undoToEvent(eventId: string): void;

  // Serialization (for network sync, save/load)
  serialize(): SerializedGame;

  // Headless execution (for bots, testing)
  simulateEvent(event: GameEvent): SimulationResult;
}

interface ProcessResult {
  success: boolean;
  error?: string;
  stateChanged: boolean;
  screenCommand: ScreenCommand;
  // For multiplayer broadcast
  stateDelta?: StateDelta;
}

// Implementation sketch
class MordheimGameEngine implements GameEngine {
  private state: GameState;
  private history: GameEvent[];
  private currentScreen: ScreenCommand;

  processEvent(event: GameEvent): ProcessResult {
    // Validate event is allowed in current state
    if (!this.isEventValid(event)) {
      return { success: false, error: 'Invalid event for current state' };
    }

    // Process event
    const previousState = deepClone(this.state);

    switch (event.type) {
      case 'SELECT_WARRIOR':
        this.handleSelectWarrior(event);
        break;
      case 'CONFIRM_SHOT':
        this.handleConfirmShot(event);
        break;
      // ... etc
    }

    // Record in history
    this.history.push(event);

    // Compute new screen command
    this.currentScreen = this.computeScreenCommand();

    return {
      success: true,
      stateChanged: true,
      screenCommand: this.currentScreen
    };
  }

  private computeScreenCommand(): ScreenCommand {
    // Based on current game state, determine what screen to show

    if (this.state.ended) {
      return this.buildGameOverScreen();
    }

    if (this.state.pendingResolution) {
      return this.buildResolutionScreen();
    }

    if (this.state.pendingRoutTest !== null) {
      return this.buildRoutTestScreen();
    }

    // Phase-based screens
    switch (this.state.phase) {
      case 'setup':
        return this.buildSetupScreen();
      case 'recovery':
        return this.buildRecoveryScreen();
      case 'movement':
        return this.buildMovementScreen();
      case 'shooting':
        if (this.state.selectedTarget) {
          return this.buildShootingConfirmScreen();
        }
        if (this.state.selectedWarrior) {
          return this.buildShootingTargetSelectScreen();
        }
        return this.buildShootingPhaseScreen();
      case 'combat':
        return this.buildCombatScreen();
    }
  }
}
```

### 4. Input Mediator

```typescript
interface InputMediator {
  // Submit local player event
  submitEvent(event: Omit<GameEvent, 'id' | 'timestamp' | 'playerId'>): void;

  // Network handlers
  onRemoteState(state: GameState): void;
  onRemoteEvent(event: GameEvent): void;  // For spectators/replay

  // Connection
  connect(networkAdapter: NetworkAdapter): void;
  disconnect(): void;

  // Subscribe to screen updates
  onScreenCommand(callback: (command: ScreenCommand) => void): void;
}

class GameInputMediator implements InputMediator {
  constructor(
    private engine: GameEngine,
    private localPlayerId: string
  ) {}

  private networkAdapter: NetworkAdapter | null = null;
  private screenListeners: ((cmd: ScreenCommand) => void)[] = [];

  submitEvent(eventData: Omit<GameEvent, 'id' | 'timestamp' | 'playerId'>): void {
    const event: GameEvent = {
      ...eventData,
      id: generateEventId(),
      timestamp: new Date().toISOString(),
      playerId: this.localPlayerId
    };

    // Check if it's our turn
    if (!this.isMyTurn()) {
      console.warn('Not your turn');
      return;
    }

    // Process locally
    const result = this.engine.processEvent(event);

    if (result.success) {
      // Notify UI
      this.notifyScreen(result.screenCommand);

      // Broadcast to other players
      if (this.networkAdapter) {
        this.networkAdapter.broadcastState(this.engine.serialize());
      }
    }
  }

  onRemoteState(serialized: SerializedGame): void {
    // Opponent made a move, accept their state
    this.engine.loadGame(serialized.state, serialized.history);
    this.notifyScreen(this.engine.getCurrentScreen());
  }

  private isMyTurn(): boolean {
    const state = this.engine.getState();
    return state.currentPlayer === this.getMyPlayerNumber();
  }

  private notifyScreen(command: ScreenCommand): void {
    for (const listener of this.screenListeners) {
      listener(command);
    }
  }
}
```

### 5. UI Store (Simplified)

```typescript
// UI store becomes trivially simple
interface UIState {
  currentScreen: ScreenCommand | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  localPlayerId: string | null;
}

const [uiState, setUIState] = createStore<UIState>({
  currentScreen: null,
  connectionStatus: 'disconnected',
  localPlayerId: null
});

// Subscribe to mediator
mediator.onScreenCommand((command) => {
  setUIState('currentScreen', command);
});

// UI components just render
function GameScreen() {
  const screen = () => uiState.currentScreen;

  return (
    <Switch>
      <Match when={screen()?.screen === 'MOVEMENT_PHASE'}>
        <MovementPhaseScreen data={screen()!.data} />
      </Match>
      <Match when={screen()?.screen === 'SHOOTING_TARGET_SELECT'}>
        <TargetSelectScreen data={screen()!.data} />
      </Match>
      <Match when={screen()?.screen === 'COMBAT_RESOLUTION'}>
        <CombatResolutionModal data={screen()!.data} />
      </Match>
      {/* etc */}
    </Switch>
  );
}

// UI emits events, doesn't know about game logic
function TargetSelectScreen(props: { data: ShootingTargetSelectData }) {
  const handleTargetClick = (targetId: string) => {
    mediator.submitEvent({ type: 'SELECT_TARGET', payload: { targetId } });
  };

  const handleModifierToggle = (modifier: string, value: boolean) => {
    mediator.submitEvent({
      type: 'SET_MODIFIER',
      payload: { category: 'shooting', modifier, value }
    });
  };

  return (
    <div>
      <h2>Select Target for {props.data.shooter.name}</h2>
      <For each={props.data.validTargets}>
        {(target) => (
          <button onClick={() => handleTargetClick(target.id)}>
            {target.name}
          </button>
        )}
      </For>
      <ModifierToggles
        modifiers={props.data.modifiers}
        onToggle={handleModifierToggle}
      />
    </div>
  );
}
```

## Headless Operation

The game engine can run without any UI:

```typescript
// For testing
const engine = new MordheimGameEngine();
engine.createGame(warband1, warband2, 'streetFight');

engine.processEvent({ type: 'SELECT_WARRIOR', payload: { warriorId: 'w1' } });
engine.processEvent({ type: 'CONFIRM_MOVE', payload: { moveType: 'move' } });
engine.processEvent({ type: 'ADVANCE_PHASE', payload: {} });

expect(engine.getState().phase).toBe('shooting');

// For bots/AI
class SimpleBot {
  constructor(private engine: GameEngine) {}

  takeTurn(): void {
    const screen = this.engine.getCurrentScreen();

    switch (screen.screen) {
      case 'MOVEMENT_PHASE':
        this.handleMovement(screen.data);
        break;
      case 'SHOOTING_PHASE':
        this.handleShooting(screen.data);
        break;
      // etc
    }
  }
}

// For coding agents (CLI interface)
const engine = new MordheimGameEngine();
engine.loadGame(savedState, savedHistory);

// Agent can query state and submit events
console.log(JSON.stringify(engine.getCurrentScreen(), null, 2));
// Agent reads this, decides action, submits event
engine.processEvent(agentDecidedEvent);
```

## Migration Path

### Phase 1: Extract Pure Game State

1. Create `GameState` type that contains only game data (no UI state)
2. Move game state out of `gameStore.ts` into engine
3. Keep existing store as temporary adapter

### Phase 2: Define Event Schema

1. Define all `GameEvent` types
2. Define all `ScreenCommand` types
3. Create event validation logic

### Phase 3: Build Game Engine

1. Implement `GameEngine` class
2. Port logic from `gameState.ts` into engine event handlers
3. Implement `computeScreenCommand()` logic
4. Add event history and undo

### Phase 4: Build Input Mediator

1. Implement `InputMediator` class
2. Integrate with existing WebRTC code
3. Handle turn-based authority model

### Phase 5: Refactor UI

1. Create new `UIStore` (just screen command state)
2. Convert components to render from `ScreenCommand`
3. Convert user actions to emit events via mediator
4. Remove old `gameStore.ts`

### Phase 6: Headless Mode

1. Create CLI interface for engine
2. Add bot/AI support
3. Document API for coding agents

## File Structure (Target)

```
src/
├── engine/
│   ├── GameEngine.ts        # Core engine class
│   ├── events.ts            # Event type definitions
│   ├── screens.ts           # Screen command definitions
│   ├── handlers/            # Event handlers by category
│   │   ├── selection.ts
│   │   ├── movement.ts
│   │   ├── shooting.ts
│   │   ├── combat.ts
│   │   └── recovery.ts
│   ├── state.ts             # GameState type and helpers
│   └── undo.ts              # Undo logic
├── mediator/
│   ├── InputMediator.ts     # Main mediator class
│   ├── NetworkAdapter.ts    # WebRTC integration
│   └── LocalAdapter.ts      # Single-player adapter
├── stores/
│   └── uiStore.ts           # Minimal UI state
├── ui/
│   ├── screens/             # Screen components
│   │   ├── MovementPhase.tsx
│   │   ├── ShootingPhase.tsx
│   │   ├── CombatResolution.tsx
│   │   └── ...
│   └── GameScreen.tsx       # Screen router
├── cli/                     # Headless interface
│   ├── index.ts
│   └── bot.ts
└── logic/
    └── gameRules.js         # Keep as-is (pure dice/combat math)
```

## Design Decisions (Resolved)

### Event ID Generation: Sequential

Since players cannot emit events simultaneously (turn-based), use simple incrementing counter:
```typescript
let nextEventId = 1;

function generateEventId(): string {
  return String(nextEventId++);
}
```

When loading a saved game, initialize counter to `history.length + 1`.

### Dice Rolls: Generate If Missing, Use If Provided

The engine generates random dice rolls during live play, but accepts pre-rolled values for replay:

```typescript
function rollDice(event: GameEvent, key: string, sides: number = 6): number {
  // If event has pre-rolled result, use it (replay mode)
  if (event.payload.results?.[key] !== undefined) {
    return event.payload.results[key];
  }
  // Otherwise generate (live play)
  return Math.floor(Math.random() * sides) + 1;
}

// After processing, store results back into event for history
event.payload.results = event.payload.results || {};
event.payload.results.toHitRoll = rollResult;
```

### Spectators: Event Stream

Spectators receive all events, enabling:
- Full replay capability
- Seeing undo/redo actions
- Time-travel through game history

```typescript
// When broadcasting to spectators
networkAdapter.broadcastToSpectators(event);

// Spectator client
spectatorAdapter.onEvent((event) => {
  engine.processEvent(event);  // Build up state from events
});
```

### Save Format: Full Event History

Save complete event history for maximum replay capability:

```typescript
interface SavedGame {
  version: string;
  createdAt: string;
  initialState: {
    warband1: Warband;
    warband2: Warband;
    scenario: string;
  };
  events: GameEvent[];
}

// Loading reconstructs state by replaying all events
function loadGame(saved: SavedGame): GameEngine {
  const engine = new MordheimGameEngine();
  engine.createGame(saved.initialState.warband1, saved.initialState.warband2, saved.initialState.scenario);

  for (const event of saved.events) {
    engine.processEvent(event);  // Replays with stored dice results
  }

  return engine;
}
```

### Undo Granularity: All Events Independent

Every event can be individually undone. Users can undo to any point, including intermediate states:

```typescript
function undo(toEventId: string): void {
  // Find event index
  const targetIndex = this.history.findIndex(e => e.id === toEventId);

  // Rebuild state by replaying events up to (but not including) target
  const eventsToReplay = this.history.slice(0, targetIndex);

  this.resetState();
  for (const event of eventsToReplay) {
    this.processEventInternal(event);
  }

  // Truncate history
  this.history = eventsToReplay;
}
```

This means users can:
- Undo target selection and pick a different target
- Undo modifier toggles
- Undo back to before selecting a warrior

The UI can present this as "Undo last action" (most recent event) or "Undo to..." (pick from history).
