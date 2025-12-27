// Unit tests for Movement Rules
import { describe, it, expect } from 'vitest';
import {
  getTerrainMovementModifier,
  calculateEffectiveMovement,
  calculateRunningDistance,
  calculateChargeDistance,
  canLeapBarrier,
  isValidJumpDownHeight,
  isValidJumpGapDistance,
  getJumpDownTestCount,
  isValidClimbHeight,
  getRunningEnemyProximity,
  validateRunAttempt
} from './movement';

describe('Terrain Movement Modifiers', () => {
  describe('getTerrainMovementModifier', () => {
    it('returns 1 for open terrain', () => {
      expect(getTerrainMovementModifier('open')).toBe(1);
    });

    it('returns 0.5 for difficult terrain', () => {
      expect(getTerrainMovementModifier('difficult')).toBe(0.5);
    });

    it('returns 0.25 for very difficult terrain', () => {
      expect(getTerrainMovementModifier('veryDifficult')).toBe(0.25);
    });
  });

  describe('calculateEffectiveMovement', () => {
    it('returns full movement for open terrain without modifiers', () => {
      expect(calculateEffectiveMovement(4, 'open', false)).toBe(4);
    });

    it('returns half movement for difficult terrain', () => {
      expect(calculateEffectiveMovement(4, 'difficult', false)).toBe(2);
    });

    it('returns quarter movement for very difficult terrain', () => {
      expect(calculateEffectiveMovement(4, 'veryDifficult', false)).toBe(1);
    });

    it('applies half movement modifier (e.g., from standing up)', () => {
      expect(calculateEffectiveMovement(4, 'open', true)).toBe(2);
    });

    it('stacks terrain and half movement modifiers', () => {
      // 4 * 0.5 (difficult) * 0.5 (half movement) = 1
      expect(calculateEffectiveMovement(4, 'difficult', true)).toBe(1);
    });

    it('handles very difficult terrain with half movement', () => {
      // 4 * 0.25 (very difficult) * 0.5 (half movement) = 0.5
      expect(calculateEffectiveMovement(4, 'veryDifficult', true)).toBe(0.5);
    });

    it('defaults to open terrain when not specified', () => {
      expect(calculateEffectiveMovement(4)).toBe(4);
    });

    it('handles different movement values', () => {
      expect(calculateEffectiveMovement(6, 'open', false)).toBe(6);
      expect(calculateEffectiveMovement(3, 'difficult', false)).toBe(1.5);
    });
  });
});

describe('Running and Charging Distances', () => {
  describe('calculateRunningDistance', () => {
    it('returns double the base movement', () => {
      expect(calculateRunningDistance(4)).toBe(8);
    });

    it('handles different movement values', () => {
      expect(calculateRunningDistance(3)).toBe(6);
      expect(calculateRunningDistance(5)).toBe(10);
    });
  });

  describe('calculateChargeDistance', () => {
    it('returns double the base movement', () => {
      expect(calculateChargeDistance(4)).toBe(8);
    });

    it('handles different movement values', () => {
      expect(calculateChargeDistance(3)).toBe(6);
      expect(calculateChargeDistance(5)).toBe(10);
    });
  });
});

describe('Barriers and Obstacles', () => {
  describe('canLeapBarrier', () => {
    it('returns true for barriers less than 1 inch', () => {
      expect(canLeapBarrier(0.5)).toBe(true);
      expect(canLeapBarrier(0.9)).toBe(true);
    });

    it('returns false for barriers 1 inch or higher', () => {
      expect(canLeapBarrier(1)).toBe(false);
      expect(canLeapBarrier(1.5)).toBe(false);
      expect(canLeapBarrier(2)).toBe(false);
    });
  });
});

describe('Jumping', () => {
  describe('isValidJumpDownHeight', () => {
    it('returns true for heights up to 6 inches', () => {
      expect(isValidJumpDownHeight(1)).toBe(true);
      expect(isValidJumpDownHeight(3)).toBe(true);
      expect(isValidJumpDownHeight(6)).toBe(true);
    });

    it('returns false for heights over 6 inches', () => {
      expect(isValidJumpDownHeight(7)).toBe(false);
      expect(isValidJumpDownHeight(10)).toBe(false);
    });

    it('returns false for zero or negative heights', () => {
      expect(isValidJumpDownHeight(0)).toBe(false);
      expect(isValidJumpDownHeight(-1)).toBe(false);
    });
  });

  describe('isValidJumpGapDistance', () => {
    it('returns true for gaps up to 3 inches', () => {
      expect(isValidJumpGapDistance(1)).toBe(true);
      expect(isValidJumpGapDistance(2)).toBe(true);
      expect(isValidJumpGapDistance(3)).toBe(true);
    });

    it('returns false for gaps over 3 inches', () => {
      expect(isValidJumpGapDistance(4)).toBe(false);
      expect(isValidJumpGapDistance(5)).toBe(false);
    });

    it('returns false for zero or negative gaps', () => {
      expect(isValidJumpGapDistance(0)).toBe(false);
      expect(isValidJumpGapDistance(-1)).toBe(false);
    });
  });

  describe('getJumpDownTestCount', () => {
    it('returns 0 for jumps less than 2 inches', () => {
      expect(getJumpDownTestCount(1)).toBe(0);
      expect(getJumpDownTestCount(1.9)).toBe(0);
    });

    it('returns 1 for jumps of 2-3 inches', () => {
      expect(getJumpDownTestCount(2)).toBe(1);
      expect(getJumpDownTestCount(3)).toBe(1);
    });

    it('returns 2 for jumps of 4-5 inches', () => {
      expect(getJumpDownTestCount(4)).toBe(2);
      expect(getJumpDownTestCount(5)).toBe(2);
    });

    it('returns 3 for 6 inch jumps', () => {
      expect(getJumpDownTestCount(6)).toBe(3);
    });
  });
});

describe('Climbing', () => {
  describe('isValidClimbHeight', () => {
    it('returns true for climbs within movement value', () => {
      expect(isValidClimbHeight(2, 4)).toBe(true);
      expect(isValidClimbHeight(4, 4)).toBe(true);
    });

    it('returns false for climbs exceeding movement value', () => {
      expect(isValidClimbHeight(5, 4)).toBe(false);
      expect(isValidClimbHeight(6, 4)).toBe(false);
    });

    it('returns false for zero or negative climb heights', () => {
      expect(isValidClimbHeight(0, 4)).toBe(false);
      expect(isValidClimbHeight(-1, 4)).toBe(false);
    });
  });
});

describe('Running Restrictions', () => {
  describe('getRunningEnemyProximity', () => {
    it('returns 8 inches as the running restriction distance', () => {
      expect(getRunningEnemyProximity()).toBe(8);
    });
  });

  describe('validateRunAttempt', () => {
    it('allows running when no enemies are nearby', () => {
      const result = validateRunAttempt(false);
      expect(result.canRun).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('blocks running when enemies are within 8 inches', () => {
      const result = validateRunAttempt(true);
      expect(result.canRun).toBe(false);
      expect(result.reason).toContain('8 inches');
    });
  });
});
