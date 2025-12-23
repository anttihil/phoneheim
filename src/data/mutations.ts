// Mordheim Mutations (for Cult of the Possessed)

import type { Mutations, MutationRules, RandomMutations } from '../types';

export const MUTATIONS: Mutations = {
  daemonSoul: {
    name: 'Daemon Soul',
    cost: 20,
    description: 'A Daemon lives within the mutant\'s soul.',
    effect: '4+ save against spells and prayers'
  },
  greatClaw: {
    name: 'Great Claw',
    cost: 50,
    description: 'One arm ends in a massive crab-like claw.',
    effect: 'Cannot hold weapons in this arm. +1 Attack at +1 Strength in close combat.'
  },
  clovenHoofs: {
    name: 'Cloven Hoofs',
    cost: 40,
    description: 'Legs end in powerful hooves.',
    effect: '+1 Movement'
  },
  tentacle: {
    name: 'Tentacle',
    cost: 35,
    description: 'One arm is a writhing tentacle.',
    effect: 'In close combat, reduce one opponent\'s Attacks by 1 (minimum 1). Choose which attack.'
  },
  blackblood: {
    name: 'Blackblood',
    cost: 30,
    description: 'Veins filled with corrosive ichor.',
    effect: 'When wounded in close combat, anyone in base contact takes S3 hit (no crits).'
  },
  spines: {
    name: 'Spines',
    cost: 35,
    description: 'Body covered in sharp spines.',
    effect: 'Anyone in base contact takes automatic S1 hit at start of each close combat phase (no crits).'
  },
  scorpionTail: {
    name: 'Scorpion Tail',
    cost: 40,
    description: 'A venomous tail.',
    effect: 'Extra S5 attack in close combat. S2 if target is immune to poison.'
  },
  extraArm: {
    name: 'Extra Arm',
    cost: 40,
    description: 'A third arm grows from the body.',
    effect: '+1 Attack with any one-handed weapon OR may carry shield/buckler. Possessed get +1 Attack but still no weapons.'
  },
  hideous: {
    name: 'Hideous',
    cost: 40,
    description: 'So twisted and vile that enemies recoil.',
    effect: 'Causes Fear'
  }
};

// Mutation purchasing rules
export const MUTATION_RULES: MutationRules = {
  whenPurchased: 'Only when model is recruited (not later)',
  whoCanHave: ['Mutant', 'Possessed'],
  firstMutationCost: 'Normal cost',
  additionalMutationsCost: 'Double cost for 2nd and subsequent mutations on same model'
};

// Random mutation table (for certain special situations like visiting The Pit)
export const RANDOM_MUTATIONS: RandomMutations = {
  1: 'daemonSoul',
  2: 'clovenHoofs',
  3: 'tentacle',
  4: 'blackblood',
  5: 'spines',
  6: 'hideous'
};
