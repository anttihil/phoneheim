// Pure Movement Rules Logic for Mordheim
// These functions calculate movement values and validate movement actions

import { TERRAIN_MODIFIERS, MOVEMENT_LIMITS, type TerrainType } from '../data/terrain';

/**
 * Get the movement speed multiplier for a terrain type
 * @param terrain - The terrain type
 * @returns Movement multiplier (1 for open, 0.5 for difficult, 0.25 for very difficult)
 */
export function getTerrainMovementModifier(terrain: TerrainType): number {
  return TERRAIN_MODIFIERS[terrain];
}

/**
 * Calculate effective movement distance considering terrain and status modifiers
 * @param baseMovement - The warrior's base M value
 * @param terrain - The terrain type being moved through
 * @param isHalfMovement - Whether warrior has half movement (e.g., just stood up)
 * @returns Effective movement distance in inches
 */
export function calculateEffectiveMovement(
  baseMovement: number,
  terrain: TerrainType = 'open',
  isHalfMovement: boolean = false
): number {
  let effective = baseMovement;

  // Apply terrain modifier
  effective *= getTerrainMovementModifier(terrain);

  // Apply half movement if standing up
  if (isHalfMovement) {
    effective *= 0.5;
  }

  return effective;
}

/**
 * Calculate running movement distance (double normal movement)
 * Running is not affected by terrain in the same way - you just cover more ground
 * @param baseMovement - The warrior's base M value
 * @returns Running distance (2x base movement)
 */
export function calculateRunningDistance(baseMovement: number): number {
  return baseMovement * 2;
}

/**
 * Calculate charge distance (double normal movement, same as running)
 * @param baseMovement - The warrior's base M value
 * @returns Charge distance (2x base movement)
 */
export function calculateChargeDistance(baseMovement: number): number {
  return baseMovement * 2;
}

/**
 * Check if a barrier can be leaped without movement cost
 * @param barrierHeight - Height of the barrier in inches
 * @returns true if barrier can be leaped for free
 */
export function canLeapBarrier(barrierHeight: number): boolean {
  return barrierHeight < MOVEMENT_LIMITS.barrierLeapMaxHeight;
}

/**
 * Check if a jump down height is within allowed limits
 * @param height - Height in inches
 * @returns true if height is allowed for jumping
 */
export function isValidJumpDownHeight(height: number): boolean {
  return height > 0 && height <= MOVEMENT_LIMITS.maxJumpDownHeight;
}

/**
 * Check if a gap distance can be jumped
 * @param distance - Gap distance in inches
 * @returns true if gap can be jumped
 */
export function isValidJumpGapDistance(distance: number): boolean {
  return distance > 0 && distance <= MOVEMENT_LIMITS.maxJumpGapDistance;
}

/**
 * Get the number of Initiative tests required for jumping down
 * @param height - Height jumped in inches
 * @returns Number of Initiative tests required (1 per full 2")
 */
export function getJumpDownTestCount(height: number): number {
  return Math.floor(height / 2);
}

/**
 * Check if a climb height is within warrior's movement allowance
 * @param climbHeight - Height to climb in inches
 * @param warriorMovement - Warrior's M value
 * @returns true if climb is allowed
 */
export function isValidClimbHeight(climbHeight: number, warriorMovement: number): boolean {
  return climbHeight > 0 && climbHeight <= warriorMovement;
}

/**
 * Get the running enemy proximity limit
 * Warriors cannot run if enemies are within this distance
 * @returns Distance in inches
 */
export function getRunningEnemyProximity(): number {
  return MOVEMENT_LIMITS.runningEnemyProximity;
}

/**
 * Validate if a warrior can run
 * Warriors cannot run if there are non-hidden standing enemies within 8"
 * @param hasEnemiesNearby - Whether there are valid enemies within 8" (determined by player prompt)
 * @returns Object with canRun boolean and reason if blocked
 */
export function validateRunAttempt(hasEnemiesNearby: boolean): { canRun: boolean; reason?: string } {
  if (hasEnemiesNearby) {
    return {
      canRun: false,
      reason: `Cannot run when standing enemies are within ${MOVEMENT_LIMITS.runningEnemyProximity} inches`
    };
  }
  return { canRun: true };
}

/**
 * Check if knocked down/stunned warrior near edge needs a fall test
 * Warriors knocked down or stunned within 1" of edge must test or fall
 * @param isNearEdge - Whether warrior is within 1" of an edge (determined by player prompt)
 * @returns Whether a fall test is required
 */
export function requiresEdgeFallTest(isNearEdge: boolean): boolean {
  return isNearEdge;
}
