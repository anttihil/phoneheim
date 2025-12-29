// Test helpers for phase unit tests

import type { Warband, Warrior, Profile } from '../../types/warband';
import type { GameState, GameWarrior, GameWarband, GamePhase } from '../../types/game';

let idCounter = 0;

function generateId(): string {
  return `test-${++idCounter}`;
}

// Reset ID counter between tests
export function resetIdCounter(): void {
  idCounter = 0;
}

// Create a minimal profile for testing
export function createTestProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    M: 4,
    WS: 3,
    BS: 3,
    S: 3,
    T: 3,
    W: 1,
    I: 3,
    A: 1,
    Ld: 7,
    ...overrides
  };
}

// Create a minimal warrior for testing
export function createTestWarrior(overrides: Partial<Warrior> = {}): Warrior {
  const id = overrides.id ?? generateId();
  return {
    id,
    name: overrides.name ?? `Warrior ${id}`,
    type: 'mercenary',
    category: 'henchman',
    cost: 25,
    experience: 0,
    profile: createTestProfile(overrides.profile),
    equipment: {
      melee: ['sword'],
      ranged: [],
      armor: []
    },
    skills: [],
    injuries: [],
    status: 'healthy',
    mutations: [],
    specialRules: {},
    ...overrides
  };
}

// Create a minimal warband for testing
export function createTestWarband(name: string, warriorCount: number = 3): Warband {
  const warriors: Warrior[] = [];

  // First warrior is the leader
  warriors.push(createTestWarrior({
    name: `${name} Leader`,
    type: 'captain',
    category: 'hero',
    profile: { ...createTestProfile(), Ld: 8 }
  }));

  // Add additional warriors
  for (let i = 1; i < warriorCount; i++) {
    warriors.push(createTestWarrior({
      name: `${name} Warrior ${i}`
    }));
  }

  return {
    id: generateId(),
    name,
    type: 'reikland',
    typeName: 'Reikland Mercenaries',
    treasury: 0,
    warriors,
    stash: [],
    rating: warriors.length * 5,
    gamesPlayed: 0,
    wins: 0,
    createdAt: new Date().toISOString()
  };
}

// Convert a Warrior to GameWarrior
export function toGameWarrior(warrior: Warrior): GameWarrior {
  return {
    ...warrior,
    gameStatus: 'standing',
    woundsRemaining: warrior.profile.W,
    hasActed: false,
    hasMoved: false,
    hasRun: false,
    hasShot: false,
    hasCharged: false,
    hasFailedCharge: false,
    hasFallen: false,
    hasRecovered: false,
    isHidden: false,
    carriedWyrdstone: 0,
    position: null,
    combatState: {
      inCombat: false,
      inCover: false,
      engagedWith: []
    },
    halfMovement: false,
    strikesLast: false,
    divingChargeBonus: false
  };
}

// Convert a Warband to GameWarband
export function toGameWarband(warband: Warband, player: 1 | 2): GameWarband {
  return {
    ...warband,
    player,
    warriors: warband.warriors.map(toGameWarrior),
    outOfActionCount: 0,
    routFailed: false
  };
}

// Create a minimal game state for testing
export function createTestGameState(
  warband1?: Warband,
  warband2?: Warband,
  options: {
    phase?: GamePhase;
    turn?: number;
    currentPlayer?: 1 | 2;
  } = {}
): GameState {
  const wb1 = warband1 ?? createTestWarband('Warband 1');
  const wb2 = warband2 ?? createTestWarband('Warband 2');

  return {
    id: generateId(),
    scenario: 'skirmish',
    scenarioData: {
      id: 2,
      name: 'Skirmish',
      description: 'Two warbands encounter each other while searching the ruins.',
      setup: {
        terrain: 'Place terrain in 4x4 area.',
        deployment: {
          first: 'Within 8" of chosen table edge',
          second: 'Within 8" of opposite edge'
        }
      },
      startingPlayer: 'highest D6 roll',
      victoryConditions: {
        standard: 'Opponent fails Rout test'
      },
      experience: {
        survives: 1,
        winningLeader: 1,
        perEnemyOutOfAction: 1
      }
    },
    turn: options.turn ?? 1,
    currentPlayer: options.currentPlayer ?? 1,
    phase: options.phase ?? 'movement',
    warbands: [
      toGameWarband(wb1, 1),
      toGameWarband(wb2, 2)
    ],
    wyrdstoneCounters: [],
    objectives: [],
    log: [],
    actionHistory: [],
    startedAt: new Date().toISOString(),
    ended: false,
    winner: null
  };
}

// Helper to get a warrior by index from a game state
export function getWarrior(state: GameState, warbandIndex: number, warriorIndex: number): GameWarrior {
  return state.warbands[warbandIndex].warriors[warriorIndex];
}

// Helper to create a game event with defaults
export function createTestEvent<T extends { type: string; payload: unknown }>(
  type: T['type'],
  payload: T['payload'],
  overrides: { playerId?: string; id?: string } = {}
): { id: string; timestamp: string; playerId: string; type: T['type']; payload: T['payload'] } {
  return {
    id: overrides.id ?? generateId(),
    timestamp: new Date().toISOString(),
    playerId: overrides.playerId ?? 'player1',
    type,
    payload
  };
}
