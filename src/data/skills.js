// Mordheim Skills Data

export const SKILL_CATEGORIES = {
  combat: 'Combat',
  shooting: 'Shooting',
  academic: 'Academic',
  strength: 'Strength',
  speed: 'Speed'
};

export const SKILLS = {
  // Combat Skills
  strikeToInjure: {
    category: 'combat',
    name: 'Strike to Injure',
    description: 'Add +1 to all injury rolls caused in hand-to-hand combat.'
  },
  combatMaster: {
    category: 'combat',
    name: 'Combat Master',
    description: 'Gain +1 Attack when fighting 2+ enemies. Immune to All Alone tests.'
  },
  weaponsTraining: {
    category: 'combat',
    name: 'Weapons Training',
    description: 'May use any hand-to-hand combat weapon, not just those in equipment options.'
  },
  webOfSteel: {
    category: 'combat',
    name: 'Web of Steel',
    description: '+1 to Critical Hit table rolls in hand-to-hand combat.'
  },
  expertSwordsman: {
    category: 'combat',
    name: 'Expert Swordsman',
    description: 'Re-roll all missed attacks when charging with a sword.'
  },
  stepAside: {
    category: 'combat',
    name: 'Step Aside',
    description: '5+ save (unmodified) against wounds in close combat, taken after armor saves.'
  },

  // Shooting Skills
  quickShot: {
    category: 'shooting',
    name: 'Quick Shot',
    description: 'May shoot twice per turn with bow or crossbow (not crossbow pistol).'
  },
  pistolier: {
    category: 'shooting',
    name: 'Pistolier',
    description: 'Fire brace of pistols twice per turn. Single pistol can fire same turn it reloads.'
  },
  eagleEyes: {
    category: 'shooting',
    name: 'Eagle Eyes',
    description: '+6" range on all missile weapons.'
  },
  weaponsExpert: {
    category: 'shooting',
    name: 'Weapons Expert',
    description: 'May use any missile weapon, not just those in equipment options.'
  },
  nimble: {
    category: 'shooting',
    name: 'Nimble',
    description: 'May move and fire with Move or Fire weapons. Cannot combine with Quick Shot.'
  },
  trickShooter: {
    category: 'shooting',
    name: 'Trick Shooter',
    description: 'Ignore all cover modifiers when shooting.'
  },
  hunter: {
    category: 'shooting',
    name: 'Hunter',
    description: 'May fire handgun or Hochland long rifle every turn (no reload needed).'
  },
  knifeFighter: {
    category: 'shooting',
    name: 'Knife Fighter',
    description: 'Throw up to 3 throwing knives/stars per shooting phase, divided between targets. Cannot combine with Quick Shot.'
  },

  // Academic Skills
  battleTongue: {
    category: 'academic',
    name: 'Battle Tongue',
    description: 'Leader only. Increase Leader ability range by 6". Undead may not use.'
  },
  sorcery: {
    category: 'academic',
    name: 'Sorcery',
    description: 'Spellcasters only. +1 to casting rolls. Sisters/Warrior-Priests may not use.'
  },
  streetwise: {
    category: 'academic',
    name: 'Streetwise',
    description: '+2 to rare item availability rolls.'
  },
  haggle: {
    category: 'academic',
    name: 'Haggle',
    description: 'Deduct 2D6gc from price of one item per post-battle sequence (min 1gc).'
  },
  arcaneLore: {
    category: 'academic',
    name: 'Arcane Lore',
    description: 'May learn Lesser Magic with Tome of Magic. Not for Witch Hunters, Sisters, or Warrior-Priests.'
  },
  wyrdstoneHunter: {
    category: 'academic',
    name: 'Wyrdstone Hunter',
    description: 'Re-roll one exploration die if this Hero searches ruins.'
  },
  warriorWizard: {
    category: 'academic',
    name: 'Warrior Wizard',
    description: 'Spellcasters only. May wear armor and cast spells.'
  },

  // Strength Skills
  mightyBlow: {
    category: 'strength',
    name: 'Mighty Blow',
    description: '+1 Strength in close combat (not pistols). Applies to all melee weapons.'
  },
  pitFighter: {
    category: 'strength',
    name: 'Pit Fighter',
    description: '+1 WS and +1 Attack when fighting inside buildings or ruins.'
  },
  resilient: {
    category: 'strength',
    name: 'Resilient',
    description: '-1 Strength from all hits in close combat. Does not affect armor save modifiers.'
  },
  fearsome: {
    category: 'strength',
    name: 'Fearsome',
    description: 'Model causes Fear.'
  },
  strongman: {
    category: 'strength',
    name: 'Strongman',
    description: 'Use double-handed weapon without Strike Last penalty.'
  },
  unstoppableCharge: {
    category: 'strength',
    name: 'Unstoppable Charge',
    description: '+1 WS when charging.'
  },

  // Speed Skills
  leap: {
    category: 'speed',
    name: 'Leap',
    description: 'Leap D6" in addition to normal movement. Once per turn. Can jump over 1" obstacles and man-sized models.'
  },
  sprint: {
    category: 'speed',
    name: 'Sprint',
    description: 'Triple movement when running or charging (instead of double).'
  },
  acrobat: {
    category: 'speed',
    name: 'Acrobat',
    description: 'May fall/jump 12" without damage on single Initiative test. Re-roll failed Diving Charge. Still max 6" for diving charge.'
  },
  lightningReflexes: {
    category: 'speed',
    name: 'Lightning Reflexes',
    description: 'Strike first when charged. If chargers also strike first, compare Initiative.'
  },
  jumpUp: {
    category: 'speed',
    name: 'Jump Up',
    description: 'Ignore Knocked Down results on injury (not from helmet save or No Pain).'
  },
  dodge: {
    category: 'speed',
    name: 'Dodge',
    description: '5+ save against missile hits, taken before wound roll and other effects.'
  },
  scaleSheerSurfaces: {
    category: 'speed',
    name: 'Scale Sheer Surfaces',
    description: 'Climb twice normal movement. No Initiative test needed for climbing.'
  }
};

// Skill availability by warband type (simplified)
export const SKILL_TABLES = {
  mercenary_captain: ['combat', 'shooting', 'academic', 'strength', 'speed'],
  mercenary_champion: ['combat', 'shooting', 'strength'],
  mercenary_youngblood: ['combat', 'speed'],
  possessed_magister: ['combat', 'academic', 'strength', 'speed'],
  possessed_possessed: ['combat', 'strength', 'speed'],
  possessed_mutant: ['combat', 'strength', 'speed'],
  witch_hunter_captain: ['combat', 'shooting', 'academic', 'strength', 'speed'],
  witch_hunter: ['combat', 'shooting', 'strength'],
  warrior_priest: ['combat', 'academic', 'strength']
};
