// Exploration and Post-Battle Type Definitions

// Wyrdstone found range
export interface WyrdstoneFoundRange {
  min: number;
  max: number;
  shards: number;
}

// Exploration location reward
export interface ExplorationLocation {
  name: string;
  description: string;
  reward: string;
}

// Exploration tables by roll type
export type ExplorationDoubles = Record<number, ExplorationLocation>;
export type ExplorationTriples = Record<number, ExplorationLocation>;
export type ExplorationQuads = Record<number, ExplorationLocation>;
export type ExplorationFive = Record<number, ExplorationLocation>;
export type ExplorationSix = Record<number, ExplorationLocation>;

// Post-battle sequence step
export interface PostBattleStep {
  step: number;
  name: string;
  description: string;
}

// Post-battle sequence
export type PostBattleSequence = PostBattleStep[];
