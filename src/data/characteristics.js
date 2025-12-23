// Mordheim Characteristics System
// Each model has: M (Movement), WS (Weapon Skill), BS (Ballistic Skill),
// S (Strength), T (Toughness), W (Wounds), I (Initiative), A (Attacks), Ld (Leadership)

export const CHARACTERISTIC_DESCRIPTIONS = {
  M: { name: 'Movement', description: 'How far the model can move in inches per turn' },
  WS: { name: 'Weapon Skill', description: 'Close combat ability (1-10)' },
  BS: { name: 'Ballistic Skill', description: 'Shooting ability (1-10)' },
  S: { name: 'Strength', description: 'Physical power, affects wounding and armor penetration' },
  T: { name: 'Toughness', description: 'Resistance to wounds' },
  W: { name: 'Wounds', description: 'Damage capacity before injury rolls' },
  I: { name: 'Initiative', description: 'Speed and agility, determines strike order and climbing' },
  A: { name: 'Attacks', description: 'Number of blows in hand-to-hand combat' },
  Ld: { name: 'Leadership', description: 'Courage and self-control' }
};

// Racial maximum characteristics
export const RACIAL_MAXIMUMS = {
  human: { M: 4, WS: 6, BS: 6, S: 4, T: 4, W: 3, I: 6, A: 4, Ld: 9 },
  elf: { M: 5, WS: 7, BS: 7, S: 4, T: 4, W: 3, I: 9, A: 4, Ld: 10 },
  dwarf: { M: 3, WS: 7, BS: 6, S: 4, T: 5, W: 3, I: 5, A: 4, Ld: 10 },
  ogre: { M: 6, WS: 6, BS: 5, S: 5, T: 5, W: 5, I: 6, A: 5, Ld: 9 },
  halfling: { M: 4, WS: 5, BS: 7, S: 3, T: 3, W: 3, I: 9, A: 4, Ld: 10 },
  beastman: { M: 4, WS: 7, BS: 6, S: 4, T: 5, W: 4, I: 6, A: 4, Ld: 9 },
  possessed: { M: 6, WS: 8, BS: 0, S: 6, T: 6, W: 4, I: 7, A: 5, Ld: 10 },
  vampire: { M: 6, WS: 8, BS: 6, S: 7, T: 6, W: 4, I: 9, A: 4, Ld: 10 },
  skaven: { M: 6, WS: 6, BS: 6, S: 4, T: 4, W: 3, I: 7, A: 4, Ld: 7 },
  ghoul: { M: 5, WS: 5, BS: 2, S: 4, T: 5, W: 3, I: 5, A: 5, Ld: 7 }
};

// To Hit chart for shooting (BS -> required roll)
export const BS_TO_HIT = {
  1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1, 7: 0, 8: -1, 9: -2, 10: -3
};

// To Hit chart for close combat (attacker WS vs defender WS)
export function getCloseCombatToHit(attackerWS, defenderWS) {
  if (attackerWS >= defenderWS * 2) return 3;
  if (attackerWS > defenderWS) return 3;
  if (attackerWS === defenderWS) return 4;
  if (defenderWS >= attackerWS * 2) return 5;
  return 4;
}

// Wound chart (Strength vs Toughness)
export function getWoundRoll(strength, toughness) {
  const diff = strength - toughness;
  if (diff >= 2) return 2;
  if (diff === 1) return 3;
  if (diff === 0) return 4;
  if (diff === -1) return 5;
  if (diff === -2) return 6;
  return null; // Cannot wound
}

// Armor save modifiers based on Strength
export function getArmorSaveModifier(strength) {
  if (strength <= 3) return 0;
  return -(strength - 3); // S4=-1, S5=-2, S6=-3, etc.
}
