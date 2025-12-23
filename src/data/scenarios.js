// Mordheim Scenarios Data

export const SCENARIOS = {
  defend_the_find: {
    id: 1,
    name: 'Defend the Find',
    description: 'A warband finds a building with treasure and must defend it from attackers.',
    setup: {
      terrain: 'Place terrain in 4x4 area. First building in center is the objective.',
      deployment: {
        defender: 'Inside or within 6" of objective building',
        attacker: 'Within 6" of any table edge (may split warband)'
      },
      determineSides: 'Warband with fewer warriors is defender. If equal, roll D6.'
    },
    startingPlayer: 'attacker',
    victoryConditions: {
      attacker: 'At end of defender turn, have more standing models within 6" of objective than defender',
      defender: 'Prevent attacker victory or make them rout'
    },
    experience: {
      survives: 1,
      winningLeader: 1,
      perEnemyOutOfAction: 1
    },
    wyrdstone: 'One shard per Hero inside objective building at end (max 3 per warband)'
  },

  skirmish: {
    id: 2,
    name: 'Skirmish',
    description: 'Two warbands encounter each other while searching the ruins.',
    setup: {
      terrain: 'Place terrain in 4x4 area.',
      deployment: {
        first: 'Within 8" of chosen table edge',
        second: 'Within 8" of opposite edge'
      },
      determineSides: 'Highest D6 roll chooses who deploys first.'
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

  wyrdstone_hunt: {
    id: 3,
    name: 'Wyrdstone Hunt',
    description: 'Both warbands are scavenging for wyrdstone shards.',
    setup: {
      terrain: 'Place terrain in 4x4 area.',
      deployment: {
        first: 'Within 8" of chosen table edge',
        second: 'Within 8" of opposite edge'
      },
      specialSetup: 'Place D3+1 wyrdstone counters. Each player alternates placing. Counters must be >10" from edge and >6" apart.'
    },
    startingPlayer: 'highest D6 roll',
    victoryConditions: {
      standard: 'Opponent fails Rout test'
    },
    specialRules: {
      wyrdstonePickup: 'Move into contact to pick up. No movement penalty.',
      carrierOutOfAction: 'Place counter where model fell.'
    },
    experience: {
      survives: 1,
      winningLeader: 1,
      perEnemyOutOfAction: 1,
      perWyrdstoneCounter: 1
    },
    wyrdstone: 'Warriors keep counters they hold at end'
  },

  breakthrough: {
    id: 4,
    name: 'Breakthrough',
    description: 'The attacker must break through enemy lines.',
    setup: {
      terrain: 'Place terrain in 4x4 area.',
      deployment: {
        attacker: 'Within 8" of chosen table edge',
        defender: 'Anywhere on table at least 14" from any attacker'
      }
    },
    startingPlayer: 'attacker',
    victoryConditions: {
      attacker: 'Move 2+ standing warriors within 2" of defender table edge',
      defender: 'Make attacker rout'
    },
    experience: {
      survives: 1,
      winningLeader: 1,
      perEnemyOutOfAction: 1,
      breakingThrough: 1
    }
  },

  street_fight: {
    id: 5,
    name: 'Street Fight',
    description: 'Two warbands meet in a narrow street with no way out but through.',
    setup: {
      terrain: 'Set up buildings as single street with no side gaps. May wind but must be passable.',
      deployment: {
        first: 'Within 6" of one end of street',
        second: 'Within 6" of opposite end'
      }
    },
    startingPlayer: 'D6 roll',
    specialRules: {
      noBacktrack: 'Cannot exit via own table edge'
    },
    victoryConditions: {
      standard: 'Move all remaining warriors out via opposing edge, or opponent routs'
    },
    experience: {
      survives: 1,
      winningLeader: 1,
      perEnemyOutOfAction: 1,
      firstToEscape: 1
    }
  },

  chance_encounter: {
    id: 6,
    name: 'Chance Encounter',
    description: 'Both warbands are returning from searching and unexpectedly meet.',
    setup: {
      terrain: 'Place terrain in 4x4 area.',
      deployment: {
        first: 'Entire warband in deployment zone A (one quarter)',
        second: 'Deployment zone B (opposite quarter), no model within 14" of enemy'
      }
    },
    startingPlayer: 'D6 + leader Initiative, highest goes first',
    specialRules: {
      startingWyrdstone: 'Each warband carries D3 wyrdstone at start'
    },
    victoryConditions: {
      standard: 'Opponent fails Rout test'
    },
    experience: {
      survives: 1,
      winningLeader: 1,
      perEnemyOutOfAction: 1
    },
    wyrdstone: 'Keep own starting wyrdstone minus own Heroes OOA. Gain 1 per enemy Hero OOA (up to enemy starting amount)'
  },

  hidden_treasure: {
    id: 7,
    name: 'Hidden Treasure',
    description: 'Search buildings to find a hidden treasure chest.',
    setup: {
      terrain: 'Place terrain in 4x4 area.',
      deployment: {
        first: 'Within 8" of chosen table edge',
        second: 'Within 8" of opposite edge'
      }
    },
    startingPlayer: 'highest D6 roll',
    specialRules: {
      searchBuilding: 'Warriors (not animals) entering unsearched building roll 2D6. On 12, treasure found.',
      deploymentZoneExcluded: 'Buildings in deployment zones cannot be searched.',
      lastBuilding: 'Treasure auto-found in last unsearched building.',
      treasureCarrying: 'Half movement when carrying. 2+ models carry without penalty.',
      treasureContents: {
        goldCrowns: { amount: '3D6', roll: 'automatic' },
        wyrdstone: { amount: 'D3', roll: '5+' },
        lightArmor: { amount: 1, roll: '4+' },
        sword: { amount: 1, roll: '3+' },
        gems: { amount: 'D3 (10gc each)', roll: '5+' }
      }
    },
    victoryConditions: {
      standard: 'Carry treasure off own table edge, or opponent routs'
    },
    experience: {
      survives: 1,
      winningLeader: 1,
      perEnemyOutOfAction: 1,
      findingChest: 2
    }
  },

  occupy: {
    id: 8,
    name: 'Occupy',
    description: 'Capture and hold key buildings rich with wyrdstone.',
    setup: {
      terrain: 'Place terrain in 4x4 area.',
      deployment: {
        first: 'Within 8" of chosen table edge',
        second: 'Within 8" of opposite edge'
      },
      objectives: 'D3+2 buildings marked as objectives, starting from center outward'
    },
    startingPlayer: 'highest D6 roll',
    specialRules: {
      occupying: 'Building occupied if you have standing model inside and enemy does not',
      gameDuration: '8 turns maximum',
      noRoutTest: 'No Rout tests required'
    },
    victoryConditions: {
      standard: 'Control most buildings at end of turn 8, or opponent voluntarily routs'
    },
    experience: {
      survives: 1,
      winningLeader: 1,
      perEnemyOutOfAction: 1
    }
  },

  surprise_attack: {
    id: 9,
    name: 'Surprise Attack',
    description: 'One warband is spread out searching when attacked.',
    setup: {
      terrain: 'Attacker places first, alternating.',
      deployment: {
        defender: 'Roll D6 per Hero/Henchman group. 1-3: arrives as reinforcement. 4-6: deploys at start. At least one unit starts on table.',
        defenderPlacement: 'No model closer than 8" to another or to table edge',
        attacker: 'Within 8" of random table edge'
      }
    },
    startingPlayer: 'attacker',
    specialRules: {
      reinforcements: 'Defender rolls D6 per off-table unit at start of turn 2+. On 4+, enters from random edge and may charge.'
    },
    victoryConditions: {
      standard: 'Opponent fails Rout test'
    },
    experience: {
      survives: 1,
      winningLeader: 1,
      perEnemyOutOfAction: 1
    }
  }
};

// Scenario selection table (2D6)
export const SCENARIO_TABLE = {
  2: 'player_choice', // Lower rating player chooses
  3: 'street_fight',
  4: 'hidden_treasure',
  5: 'wyrdstone_hunt',
  6: 'occupy',
  7: 'skirmish',
  8: 'breakthrough',
  9: 'surprise_attack',
  10: 'chance_encounter',
  11: 'defend_the_find',
  12: 'player_choice' // Lower rating player chooses
};

// Pre-battle sequence
export const PRE_BATTLE_SEQUENCE = [
  'Lower rating player rolls 2D6 on Scenario table (or chooses if 2 or 12)',
  'Roll for warriors with Old Battle Wound (skip battle on 1)',
  'Set up terrain according to scenario',
  'Deploy warbands according to scenario rules'
];
