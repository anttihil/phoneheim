// Mordheim Exploration and Income Tables

// Wyrdstone found based on exploration dice total
export const WYRDSTONE_FOUND = [
  { min: 1, max: 5, shards: 1 },
  { min: 6, max: 11, shards: 2 },
  { min: 12, max: 17, shards: 3 },
  { min: 18, max: 24, shards: 4 },
  { min: 25, max: 30, shards: 5 },
  { min: 31, max: 35, shards: 6 },
  { min: 36, max: Infinity, shards: 7 }
];

// Exploration chart - special locations found when rolling multiples
export const EXPLORATION_DOUBLES = {
  11: {
    name: 'Well',
    description: 'A source of fresh water.',
    reward: 'Roll D6: 1-2=D6gc, 3-4=Rope & Hook, 5=Lucky Charm, 6=Holy Relic'
  },
  22: {
    name: 'Shop',
    description: 'An abandoned shop.',
    reward: 'Roll D6: 1-2=2D6gc, 3-4=D3 pieces of equipment, 5-6=D6x5gc'
  },
  33: {
    name: 'Corpse',
    description: 'A dead adventurer.',
    reward: 'D6gc and D3 pieces of equipment (roll randomly)'
  },
  44: {
    name: 'Straggler',
    description: 'A survivor from a destroyed warband.',
    reward: 'May hire free Henchman (roll for type based on warband). No upkeep for first game.'
  },
  55: {
    name: 'Overturned Cart',
    description: 'An abandoned merchant cart.',
    reward: '2D6gc worth of goods. Roll D6: 1-3=nothing extra, 4-5=D3 items, 6=rare item'
  },
  66: {
    name: 'Ruined Hovels',
    description: 'Destroyed homes with hidden valuables.',
    reward: 'D6x5gc hidden treasure'
  }
};

export const EXPLORATION_TRIPLES = {
  111: {
    name: 'Tavern',
    description: 'A ruined tavern with a hidden cellar.',
    reward: 'D6x10gc in coins and valuables. May hire a Hired Sword without seeking.'
  },
  222: {
    name: 'Smithy',
    description: 'A blacksmith workshop.',
    reward: 'Free light armor or weapon worth up to 20gc. +1 to find rare armor for this post-battle.'
  },
  333: {
    name: 'Prisoners',
    description: 'Captives held in a building.',
    reward: 'D3 prisoners. Each can be: freed for +1 XP leader, sold for D6x5gc, or recruited as Henchman.'
  },
  444: {
    name: 'Fletcher',
    description: 'An arrow-maker\'s workshop.',
    reward: 'D6 arrows/bolts. +1 to find rare missile weapons for this post-battle.'
  },
  555: {
    name: 'Market Hall',
    description: 'A merchant guild building.',
    reward: 'D6x10gc. May make 2 extra rare item rolls this post-battle.'
  },
  666: {
    name: 'Returning a Favour',
    description: 'Someone you helped before returns the favor.',
    reward: 'Gain one common item for free, or re-roll one failed rare item search.'
  }
};

export const EXPLORATION_QUADS = {
  1111: {
    name: 'Gunsmith',
    description: 'A weapon smith specializing in blackpowder.',
    reward: 'Free pistol or handgun. +2 to find rare blackpowder weapons for this post-battle.'
  },
  2222: {
    name: 'Shrine',
    description: 'A holy shrine (to Sigmar, or darker gods...).',
    reward: 'D6x10gc. One Hero may gain a blessing: re-roll one failed armor save next game.'
  },
  3333: {
    name: 'Townhouse',
    description: 'A wealthy merchant\'s home.',
    reward: 'D6x20gc. Roll D6: 6=find valuable painting worth 50gc.'
  },
  4444: {
    name: 'Armourer',
    description: 'An armor workshop.',
    reward: 'Free heavy armor. +2 to find rare armor for this post-battle.'
  },
  5555: {
    name: 'Graveyard',
    description: 'An old cemetery.',
    reward: 'Undead may raise D3 free Zombies. Others gain D6x10gc from grave goods (risk D6: 1=attacked by D3 Ghouls).'
  },
  6666: {
    name: 'Catacombs',
    description: 'Underground tunnels beneath the city.',
    reward: 'D6 shards of wyrdstone. May use tunnels: next game, D3 warriors may start anywhere on table edge.'
  }
};

export const EXPLORATION_FIVE = {
  11111: {
    name: 'Moneylender\'s House',
    description: 'A secure vault.',
    reward: 'D6x25gc. Roll D6: 6=find promissory note worth 100gc.'
  },
  22222: {
    name: 'Alchemist\'s Laboratory',
    description: 'A workshop of forbidden science.',
    reward: 'D3 potions/elixirs. +2 to find rare equipment. Risk: D6 roll of 1=explosion, random Hero takes S4 hit.'
  },
  33333: {
    name: 'Jewelsmith',
    description: 'A gemcutter\'s workshop.',
    reward: 'D6x20gc in gems. May buy one piece of jewelry at normal price (rare item check automatic success).'
  },
  44444: {
    name: 'Merchant\'s House',
    description: 'A wealthy trader\'s home.',
    reward: 'D6x30gc. May trade wyrdstone at 45gc per shard (instead of 35gc) this post-battle.'
  },
  55555: {
    name: 'Shattered Building',
    description: 'A collapsed structure with trapped valuables.',
    reward: 'D3+1 wyrdstone shards. Risk: each searching Hero rolls D6, 1=building collapses, S5 hit.'
  },
  66666: {
    name: 'Entrance to the Catacombs',
    description: 'A permanent entrance to the underground.',
    reward: 'Gain "Catacombs" ability permanently: may re-roll one exploration dice per search.'
  }
};

export const EXPLORATION_SIX = {
  111111: {
    name: 'The Pit',
    description: 'The crater where the comet struck.',
    reward: 'D6+3 wyrdstone shards. Extreme danger: each Hero must pass Ld test or gain D3 mutations (Possessed) or go permanently insane (others).'
  },
  222222: {
    name: 'Hidden Treasure',
    description: 'A secret cache of valuables.',
    reward: 'D6x50gc plus one random magic item from any list.'
  },
  333333: {
    name: 'Dwarf Smithy',
    description: 'A master craftsman\'s forge.',
    reward: 'One free Gromril item of choice. May commission custom weapon: 3x normal cost, +1 to hit.'
  },
  444444: {
    name: 'Slaughtered Warband',
    description: 'The remains of a destroyed rival.',
    reward: 'D6x30gc in equipment. D3 weapons/armor, D3 wyrdstone shards. May recruit D3 survivors as Henchmen for free.'
  },
  555555: {
    name: 'Fighting Arena',
    description: 'An underground fighting pit.',
    reward: 'May enter one Hero in fights: fight D3 opponents (use Pit Fighter profile). Win all: D6x20gc + D6 XP. Lose: roll on serious injury.'
  },
  666666: {
    name: 'Noble\'s Villa',
    description: 'An aristocrat\'s mansion.',
    reward: 'D6x100gc. D3 pieces of rare equipment. One random magic item. Noble patron: +1 to all rare rolls for next 3 games.'
  }
};

// Wyrdstone prices
export const WYRDSTONE_PRICE = 35; // gc per shard

// Post-battle sequence steps
export const POST_BATTLE_SEQUENCE = [
  { step: 1, name: 'Injuries', description: 'Determine injuries for Out of Action warriors' },
  { step: 2, name: 'Experience', description: 'Allocate experience points' },
  { step: 3, name: 'Exploration', description: 'Roll on Exploration chart' },
  { step: 4, name: 'Sell Wyrdstone', description: 'Sell wyrdstone (once per sequence)' },
  { step: 5, name: 'Check Veterans', description: 'Roll for available veterans to hire' },
  { step: 6, name: 'Rare Items', description: 'Make rarity rolls and buy rare items' },
  { step: 7, name: 'Dramatis Personae', description: 'Look for special characters' },
  { step: 8, name: 'Recruits', description: 'Hire new recruits and buy common items' },
  { step: 9, name: 'Reallocate Equipment', description: 'Swap equipment between models' },
  { step: 10, name: 'Update Rating', description: 'Calculate new warband rating' }
];

// Warband rating calculation
export function calculateWarbandRating(warband) {
  let rating = 0;
  for (const warrior of warband.warriors) {
    if (warrior.largeCreature) {
      rating += 20 + warrior.experience;
    } else {
      rating += 5 + warrior.experience;
    }
  }
  return rating;
}
