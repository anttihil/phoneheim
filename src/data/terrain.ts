// Terrain Type Definitions for Mordheim

// Terrain types affect movement speed
export type TerrainType = 'open' | 'difficult' | 'veryDifficult';

// Barrier types - low obstacles that can be leaped
export type BarrierType = 'lowWall' | 'fence' | 'barrel' | 'crate';

// Terrain definitions with movement modifiers
export const TERRAIN_MODIFIERS: Record<TerrainType, number> = {
  open: 1,           // Normal movement (1x)
  difficult: 0.5,    // Half movement (0.5x) - steep slopes, bushes, angled roofs
  veryDifficult: 0.25 // Quarter movement (0.25x) - narrow crawlholes, dense rubble
};

// Barrier definitions
export const BARRIERS: Record<BarrierType, { maxHeight: number; description: string }> = {
  lowWall: { maxHeight: 1, description: 'Low wall or hedge' },
  fence: { maxHeight: 1, description: 'Fence or railing' },
  barrel: { maxHeight: 1, description: 'Barrel or similar obstacle' },
  crate: { maxHeight: 1, description: 'Crate or box' }
};

// Maximum heights for various actions (in inches)
export const MOVEMENT_LIMITS = {
  barrierLeapMaxHeight: 1,  // Barriers < 1" can be leaped without cost
  maxJumpDownHeight: 6,     // Maximum height for jumping down
  maxJumpGapDistance: 3,    // Maximum gap distance that can be jumped
  runningEnemyProximity: 8  // Cannot run if enemies within this distance
};
