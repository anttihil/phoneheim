// Unit tests for Game State actions
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createGameState,
  runWarrior,
  moveWarrior,
  chargeWarrior,
  canWarriorShoot,
  climbWarrior,
  jumpDownWarrior,
  applyFalling,
  checkEdgeFall,
  setWarriorStatus,
  canWarriorHide,
  hideWarrior,
  revealWarrior,
  getDetectionRange,
  getShootingTargets,
  executeShot,
  canMoveInCombat,
  disengageFromCombat,
  engageWarriors
} from './gameState';
import * as gameRules from './gameRules';
import type { GameState } from '../types';
import type { Warband } from '../types/warband';

// Helper to create a minimal test warband
function createTestWarband(name: string): Warband {
  return {
    id: `warband_${name}`,
    name,
    type: 'mercenaries_reikland',
    treasury: 500,
    wyrdstone: 0,
    warriors: [
      {
        id: `warrior_${name}_1`,
        type: 'Captain',
        name: 'Test Captain',
        profile: { M: 4, WS: 4, BS: 4, S: 3, T: 3, W: 1, I: 4, A: 1, Ld: 8 },
        experience: 20,
        equipment: { melee: ['sword'], ranged: [], armor: [] },
        injuries: [],
        skills: []
      },
      {
        id: `warrior_${name}_2`,
        type: 'Warrior',
        name: 'Test Warrior',
        profile: { M: 4, WS: 3, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 7 },
        experience: 0,
        equipment: { melee: ['sword'], ranged: [], armor: [] },
        injuries: [],
        skills: []
      }
    ],
    maxSize: 15,
    alignment: 'neutral'
  };
}

describe('Running Actions', () => {
  let gameState: GameState;

  beforeEach(() => {
    const warband1 = createTestWarband('Alpha');
    const warband2 = createTestWarband('Beta');
    gameState = createGameState(warband1, warband2, 'defend');
    // Advance to movement phase for testing
    gameState.phase = 'movement';
  });

  describe('runWarrior', () => {
    it('allows running when no enemies nearby option is set', () => {
      const warriorId = gameState.warbands[0].warriors[0].id;
      const action = runWarrior(gameState, 0, warriorId, { hasEnemiesNearby: false });

      expect(action.type).toBe('run');
      expect(gameState.warbands[0].warriors[0].hasRun).toBe(true);
      expect(gameState.warbands[0].warriors[0].hasMoved).toBe(true);
    });

    it('allows running when no options provided (backwards compatible)', () => {
      const warriorId = gameState.warbands[0].warriors[0].id;
      const action = runWarrior(gameState, 0, warriorId);

      expect(action.type).toBe('run');
      expect(gameState.warbands[0].warriors[0].hasRun).toBe(true);
    });

    it('throws error when enemies are within 8 inches', () => {
      const warriorId = gameState.warbands[0].warriors[0].id;

      expect(() => {
        runWarrior(gameState, 0, warriorId, { hasEnemiesNearby: true });
      }).toThrowError(/Cannot run when standing enemies are within 8 inches/);
    });

    it('does not mark hasRun when blocked by nearby enemies', () => {
      const warriorId = gameState.warbands[0].warriors[0].id;

      try {
        runWarrior(gameState, 0, warriorId, { hasEnemiesNearby: true });
      } catch {
        // Expected to throw
      }

      expect(gameState.warbands[0].warriors[0].hasRun).toBe(false);
      expect(gameState.warbands[0].warriors[0].hasMoved).toBe(false);
    });

    it('prevents shooting after running', () => {
      const warriorId = gameState.warbands[0].warriors[0].id;
      runWarrior(gameState, 0, warriorId);

      // hasRun should be true, which prevents shooting
      expect(gameState.warbands[0].warriors[0].hasRun).toBe(true);
    });

    it('throws error if warrior has already moved', () => {
      const warriorId = gameState.warbands[0].warriors[0].id;

      // First, do a normal move
      moveWarrior(gameState, 0, warriorId);

      // Then try to run
      expect(() => {
        runWarrior(gameState, 0, warriorId);
      }).toThrowError(/already moved/);
    });
  });
});

describe('Charge Actions', () => {
  let gameState: GameState;

  beforeEach(() => {
    const warband1 = createTestWarband('Alpha');
    const warband2 = createTestWarband('Beta');
    gameState = createGameState(warband1, warband2, 'defend');
    // Advance to movement phase for testing
    gameState.phase = 'movement';
  });

  describe('chargeWarrior - successful charges', () => {
    it('engages warriors in combat when charge succeeds', () => {
      const attackerId = gameState.warbands[0].warriors[0].id;
      const targetId = gameState.warbands[1].warriors[0].id;

      const action = chargeWarrior(gameState, 0, attackerId, 1, targetId, { reachedTarget: true });

      expect(action.type).toBe('charge');
      expect(gameState.warbands[0].warriors[0].hasCharged).toBe(true);
      expect(gameState.warbands[0].warriors[0].combatState.inCombat).toBe(true);
      expect(gameState.warbands[0].warriors[0].combatState.engagedWith).toContain(targetId);
    });

    it('defaults to successful charge for backwards compatibility', () => {
      const attackerId = gameState.warbands[0].warriors[0].id;
      const targetId = gameState.warbands[1].warriors[0].id;

      const action = chargeWarrior(gameState, 0, attackerId, 1, targetId);

      expect(action.type).toBe('charge');
      expect(gameState.warbands[0].warriors[0].hasCharged).toBe(true);
    });
  });

  describe('chargeWarrior - failed charges', () => {
    it('sets hasFailedCharge flag when charge fails', () => {
      const attackerId = gameState.warbands[0].warriors[0].id;
      const targetId = gameState.warbands[1].warriors[0].id;

      const action = chargeWarrior(gameState, 0, attackerId, 1, targetId, { reachedTarget: false });

      expect(action.type).toBe('failedCharge');
      expect(gameState.warbands[0].warriors[0].hasFailedCharge).toBe(true);
      expect(gameState.warbands[0].warriors[0].hasMoved).toBe(true);
    });

    it('does not engage warriors in combat on failed charge', () => {
      const attackerId = gameState.warbands[0].warriors[0].id;
      const targetId = gameState.warbands[1].warriors[0].id;

      chargeWarrior(gameState, 0, attackerId, 1, targetId, { reachedTarget: false });

      expect(gameState.warbands[0].warriors[0].hasCharged).toBe(false);
      expect(gameState.warbands[0].warriors[0].combatState.inCombat).toBe(false);
    });

    it('prevents shooting after failed charge', () => {
      const attackerId = gameState.warbands[0].warriors[0].id;
      const targetId = gameState.warbands[1].warriors[0].id;

      // Give the warrior a ranged weapon for this test
      gameState.warbands[0].warriors[0].equipment.ranged = ['bow'];

      chargeWarrior(gameState, 0, attackerId, 1, targetId, { reachedTarget: false });

      // Check canWarriorShoot returns false
      expect(canWarriorShoot(gameState, gameState.warbands[0].warriors[0])).toBe(false);
    });
  });

  describe('chargeWarrior - interception', () => {
    it('engages charger with interceptor instead of original target', () => {
      const attackerId = gameState.warbands[0].warriors[0].id;
      const originalTargetId = gameState.warbands[1].warriors[0].id;
      const interceptorId = gameState.warbands[1].warriors[1].id;

      const action = chargeWarrior(gameState, 0, attackerId, 1, originalTargetId, {
        reachedTarget: true,
        interceptedBy: { warriorId: interceptorId, warbandIndex: 1 }
      });

      // Charger should be engaged with interceptor, not original target
      expect(action.type).toBe('charge');
      expect(gameState.warbands[0].warriors[0].combatState.engagedWith).toContain(interceptorId);
      expect(gameState.warbands[0].warriors[0].combatState.engagedWith).not.toContain(originalTargetId);
    });

    it('charger still has hasCharged = true after interception (strikes first)', () => {
      const attackerId = gameState.warbands[0].warriors[0].id;
      const originalTargetId = gameState.warbands[1].warriors[0].id;
      const interceptorId = gameState.warbands[1].warriors[1].id;

      chargeWarrior(gameState, 0, attackerId, 1, originalTargetId, {
        reachedTarget: true,
        interceptedBy: { warriorId: interceptorId, warbandIndex: 1 }
      });

      // Charger should still count as having charged (strikes first in combat)
      expect(gameState.warbands[0].warriors[0].hasCharged).toBe(true);
    });

    it('interceptor does not have hasCharged flag', () => {
      const attackerId = gameState.warbands[0].warriors[0].id;
      const originalTargetId = gameState.warbands[1].warriors[0].id;
      const interceptorId = gameState.warbands[1].warriors[1].id;

      chargeWarrior(gameState, 0, attackerId, 1, originalTargetId, {
        reachedTarget: true,
        interceptedBy: { warriorId: interceptorId, warbandIndex: 1 }
      });

      // Interceptor should NOT have hasCharged (they don't strike first)
      expect(gameState.warbands[1].warriors[1].hasCharged).toBe(false);
    });

    it('action description mentions interception', () => {
      const attackerId = gameState.warbands[0].warriors[0].id;
      const originalTargetId = gameState.warbands[1].warriors[0].id;
      const interceptorId = gameState.warbands[1].warriors[1].id;

      const action = chargeWarrior(gameState, 0, attackerId, 1, originalTargetId, {
        reachedTarget: true,
        interceptedBy: { warriorId: interceptorId, warbandIndex: 1 }
      });

      expect(action.description).toContain('intercepted');
    });
  });
});

describe('Climbing Actions', () => {
  let gameState: GameState;

  beforeEach(() => {
    const warband1 = createTestWarband('Alpha');
    const warband2 = createTestWarband('Beta');
    gameState = createGameState(warband1, warband2, 'defend');
    gameState.phase = 'movement';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('climbWarrior - successful climbs', () => {
    it('marks warrior as moved on successful climb up', () => {
      // Mock a successful climb test
      vi.spyOn(gameRules, 'rollClimbingTest').mockReturnValue({ roll: 3, passed: true });

      const warriorId = gameState.warbands[0].warriors[0].id;
      const result = climbWarrior(gameState, 0, warriorId, { height: 3, direction: 'up' });

      expect(result.success).toBe(true);
      expect(result.action.type).toBe('climb');
      expect(gameState.warbands[0].warriors[0].hasMoved).toBe(true);
    });

    it('marks warrior as moved on successful climb down', () => {
      vi.spyOn(gameRules, 'rollClimbingTest').mockReturnValue({ roll: 2, passed: true });

      const warriorId = gameState.warbands[0].warriors[0].id;
      const result = climbWarrior(gameState, 0, warriorId, { height: 2, direction: 'down' });

      expect(result.success).toBe(true);
      expect(result.fell).toBeUndefined();
    });
  });

  describe('climbWarrior - failed climbs', () => {
    it('fails climb up without falling', () => {
      vi.spyOn(gameRules, 'rollClimbingTest').mockReturnValue({ roll: 5, passed: false });

      const warriorId = gameState.warbands[0].warriors[0].id;
      const result = climbWarrior(gameState, 0, warriorId, { height: 3, direction: 'up' });

      expect(result.success).toBe(false);
      expect(result.fell).toBeUndefined(); // No fall when climbing up fails
      expect(gameState.warbands[0].warriors[0].hasMoved).toBe(true); // Cannot move further
    });

    it('fails climb down and marks as fell', () => {
      vi.spyOn(gameRules, 'rollClimbingTest').mockReturnValue({ roll: 6, passed: false });

      const warriorId = gameState.warbands[0].warriors[0].id;
      const result = climbWarrior(gameState, 0, warriorId, { height: 4, direction: 'down' });

      expect(result.success).toBe(false);
      expect(result.fell).toBe(true); // Warrior fell
      expect(gameState.warbands[0].warriors[0].hasMoved).toBe(true);
    });
  });

  describe('climbWarrior - validation', () => {
    it('throws error if climb height exceeds movement value', () => {
      const warriorId = gameState.warbands[0].warriors[0].id;
      // Warrior has M: 4, so cannot climb 5"
      expect(() => {
        climbWarrior(gameState, 0, warriorId, { height: 5, direction: 'up' });
      }).toThrowError(/Cannot climb more than 4 inches/);
    });

    it('throws error if climb height is zero or negative', () => {
      const warriorId = gameState.warbands[0].warriors[0].id;

      expect(() => {
        climbWarrior(gameState, 0, warriorId, { height: 0, direction: 'up' });
      }).toThrowError(/must be positive/);
    });

    it('throws error if warrior has already moved', () => {
      const warriorId = gameState.warbands[0].warriors[0].id;
      moveWarrior(gameState, 0, warriorId);

      expect(() => {
        climbWarrior(gameState, 0, warriorId, { height: 2, direction: 'up' });
      }).toThrowError(/already moved/);
    });
  });
});

describe('Jumping Actions', () => {
  let gameState: GameState;

  beforeEach(() => {
    const warband1 = createTestWarband('Alpha');
    const warband2 = createTestWarband('Beta');
    gameState = createGameState(warband1, warband2, 'defend');
    gameState.phase = 'movement';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('jumpDownWarrior - successful jumps', () => {
    it('allows successful jump with passing tests', () => {
      vi.spyOn(gameRules, 'rollJumpTest').mockReturnValue({
        success: true,
        tests: [{ roll: 2, success: true }]
      });

      const warriorId = gameState.warbands[0].warriors[0].id;
      const result = jumpDownWarrior(gameState, 0, warriorId, 2);

      expect(result.success).toBe(true);
      expect(result.action.type).toBe('jumpDown');
    });

    it('sets divingChargeBonus on successful diving charge', () => {
      vi.spyOn(gameRules, 'rollJumpTest').mockReturnValue({
        success: true,
        tests: [{ roll: 2, success: true }]
      });

      const warriorId = gameState.warbands[0].warriors[0].id;
      jumpDownWarrior(gameState, 0, warriorId, 3, true);

      expect(gameState.warbands[0].warriors[0].divingChargeBonus).toBe(true);
    });
  });

  describe('jumpDownWarrior - failed jumps', () => {
    it('sets hasFallen on failed jump', () => {
      vi.spyOn(gameRules, 'rollJumpTest').mockReturnValue({
        success: false,
        tests: [{ roll: 5, success: false }]
      });

      const warriorId = gameState.warbands[0].warriors[0].id;
      const result = jumpDownWarrior(gameState, 0, warriorId, 4);

      expect(result.success).toBe(false);
      expect(gameState.warbands[0].warriors[0].hasFallen).toBe(true);
      expect(gameState.warbands[0].warriors[0].hasMoved).toBe(true);
    });
  });

  describe('jumpDownWarrior - validation', () => {
    it('throws error if jump height exceeds 6 inches', () => {
      const warriorId = gameState.warbands[0].warriors[0].id;

      expect(() => {
        jumpDownWarrior(gameState, 0, warriorId, 7);
      }).toThrowError(/Cannot jump down more than 6 inches/);
    });

    it('throws error if jump height is zero or negative', () => {
      const warriorId = gameState.warbands[0].warriors[0].id;

      expect(() => {
        jumpDownWarrior(gameState, 0, warriorId, 0);
      }).toThrowError(/must be positive/);
    });
  });
});

describe('Falling Damage', () => {
  let gameState: GameState;

  beforeEach(() => {
    const warband1 = createTestWarband('Alpha');
    const warband2 = createTestWarband('Beta');
    gameState = createGameState(warband1, warband2, 'defend');
    gameState.phase = 'movement';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('applyFalling', () => {
    it('applies falling damage and sets hasFallen flag', () => {
      // Mock falling damage and wound roll
      vi.spyOn(gameRules, 'calculateFallingDamage').mockReturnValue({ hits: 1, strength: 4 });
      vi.spyOn(gameRules, 'rollToWound').mockReturnValue({
        roll: 2,
        needed: 4,
        wounded: false
      });

      const warriorId = gameState.warbands[0].warriors[0].id;
      const result = applyFalling(gameState, 0, warriorId, 4);

      expect(result.action.type).toBe('fall');
      expect(result.hits).toBe(1);
      expect(result.strength).toBe(4);
      expect(gameState.warbands[0].warriors[0].hasFallen).toBe(true);
    });

    it('applies wounds from falling damage', () => {
      // Mock falling that wounds
      vi.spyOn(gameRules, 'calculateFallingDamage').mockReturnValue({ hits: 2, strength: 4 });
      vi.spyOn(gameRules, 'rollToWound').mockReturnValue({
        roll: 4,
        needed: 4,
        wounded: true
      });
      vi.spyOn(gameRules, 'rollInjury').mockReturnValue({
        roll: 2,
        result: 'knockedDown'
      });

      const warriorId = gameState.warbands[0].warriors[0].id;
      const result = applyFalling(gameState, 0, warriorId, 4);

      expect(result.woundsDealt).toBeGreaterThan(0);
    });
  });
});

describe('Edge Fall Check', () => {
  let gameState: GameState;

  beforeEach(() => {
    const warband1 = createTestWarband('Alpha');
    const warband2 = createTestWarband('Beta');
    gameState = createGameState(warband1, warband2, 'defend');
    gameState.phase = 'movement';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkEdgeFall', () => {
    it('returns no test required if not near edge', () => {
      const warriorId = gameState.warbands[0].warriors[0].id;
      setWarriorStatus(gameState, 0, warriorId, 'knockedDown');

      const result = checkEdgeFall(gameState, 0, warriorId, false, 4);

      expect(result.testRequired).toBe(false);
      expect(result.fell).toBe(false);
    });

    it('returns no test required if warrior is standing', () => {
      const warriorId = gameState.warbands[0].warriors[0].id;
      // Warrior is already standing by default

      const result = checkEdgeFall(gameState, 0, warriorId, true, 4);

      expect(result.testRequired).toBe(false);
      expect(result.fell).toBe(false);
    });

    it('warrior passes test and does not fall', () => {
      vi.spyOn(gameRules, 'characteristicTest').mockReturnValue({ roll: 2, passed: true });

      const warriorId = gameState.warbands[0].warriors[0].id;
      setWarriorStatus(gameState, 0, warriorId, 'knockedDown');

      const result = checkEdgeFall(gameState, 0, warriorId, true, 4);

      expect(result.testRequired).toBe(true);
      expect(result.testPassed).toBe(true);
      expect(result.fell).toBe(false);
    });

    it('warrior fails test and falls', () => {
      vi.spyOn(gameRules, 'characteristicTest').mockReturnValue({ roll: 5, passed: false });
      vi.spyOn(gameRules, 'calculateFallingDamage').mockReturnValue({ hits: 1, strength: 4 });
      vi.spyOn(gameRules, 'rollToWound').mockReturnValue({
        roll: 6,
        needed: 4,
        wounded: false
      });

      const warriorId = gameState.warbands[0].warriors[0].id;
      setWarriorStatus(gameState, 0, warriorId, 'stunned');

      const result = checkEdgeFall(gameState, 0, warriorId, true, 4);

      expect(result.testRequired).toBe(true);
      expect(result.testPassed).toBe(false);
      expect(result.fell).toBe(true);
      expect(result.fallDamage).toBeDefined();
    });
  });

  // =====================================
  // HIDING MECHANICS TESTS
  // =====================================

  describe('Hiding Mechanics', () => {
    describe('canWarriorHide', () => {
      it('allows standing warrior to hide', () => {
        const warrior = gameState.warbands[0].warriors[0];
        const result = canWarriorHide(warrior);
        expect(result.canHide).toBe(true);
      });

      it('prevents hiding after running', () => {
        const warrior = gameState.warbands[0].warriors[0];
        warrior.hasRun = true;
        const result = canWarriorHide(warrior);
        expect(result.canHide).toBe(false);
        expect(result.reason).toContain('running');
      });

      it('prevents hiding after charging', () => {
        const warrior = gameState.warbands[0].warriors[0];
        warrior.hasCharged = true;
        const result = canWarriorHide(warrior);
        expect(result.canHide).toBe(false);
        expect(result.reason).toContain('charging');
      });

      it('prevents hiding after failed charge', () => {
        const warrior = gameState.warbands[0].warriors[0];
        warrior.hasFailedCharge = true;
        const result = canWarriorHide(warrior);
        expect(result.canHide).toBe(false);
        expect(result.reason).toContain('failing a charge');
      });

      it('prevents hiding after falling', () => {
        const warrior = gameState.warbands[0].warriors[0];
        warrior.hasFallen = true;
        const result = canWarriorHide(warrior);
        expect(result.canHide).toBe(false);
        expect(result.reason).toContain('falling');
      });

      it('prevents hiding while in combat', () => {
        const warrior = gameState.warbands[0].warriors[0];
        warrior.combatState.inCombat = true;
        const result = canWarriorHide(warrior);
        expect(result.canHide).toBe(false);
        expect(result.reason).toContain('combat');
      });

      it('prevents non-standing warriors from hiding', () => {
        const warriorId = gameState.warbands[0].warriors[0].id;
        setWarriorStatus(gameState, 0, warriorId, 'knockedDown');
        const warrior = gameState.warbands[0].warriors[0];
        const result = canWarriorHide(warrior);
        expect(result.canHide).toBe(false);
        expect(result.reason).toContain('standing');
      });
    });

    describe('hideWarrior', () => {
      it('sets warrior isHidden to true', () => {
        const warriorId = gameState.warbands[0].warriors[0].id;

        hideWarrior(gameState, 0, warriorId);

        const warrior = gameState.warbands[0].warriors[0];
        expect(warrior.isHidden).toBe(true);
      });

      it('creates action record with hide type', () => {
        const warriorId = gameState.warbands[0].warriors[0].id;

        const action = hideWarrior(gameState, 0, warriorId);

        expect(action.type).toBe('hide');
        expect(action.warriorId).toBe(warriorId);
      });

      it('throws if warrior cannot hide', () => {
        const warriorId = gameState.warbands[0].warriors[0].id;
        gameState.warbands[0].warriors[0].hasRun = true;

        expect(() => hideWarrior(gameState, 0, warriorId)).toThrow('Cannot hide after running');
      });
    });

    describe('revealWarrior', () => {
      it('sets warrior isHidden to false', () => {
        const warriorId = gameState.warbands[0].warriors[0].id;
        gameState.warbands[0].warriors[0].isHidden = true;

        revealWarrior(gameState, 0, warriorId);

        const warrior = gameState.warbands[0].warriors[0];
        expect(warrior.isHidden).toBe(false);
      });

      it('creates action record with reveal type', () => {
        const warriorId = gameState.warbands[0].warriors[0].id;
        gameState.warbands[0].warriors[0].isHidden = true;

        const action = revealWarrior(gameState, 0, warriorId, 'detected');

        expect(action.type).toBe('reveal');
        expect(action.description).toContain('detected');
      });

      it('throws if warrior is not hidden', () => {
        const warriorId = gameState.warbands[0].warriors[0].id;
        gameState.warbands[0].warriors[0].isHidden = false;

        expect(() => revealWarrior(gameState, 0, warriorId)).toThrow('Warrior is not hidden');
      });
    });

    describe('getDetectionRange', () => {
      it('returns warrior Initiative value as detection range', () => {
        const warrior = gameState.warbands[0].warriors[0];
        warrior.profile.I = 4;

        expect(getDetectionRange(warrior)).toBe(4);
      });

      it('handles different Initiative values', () => {
        const warrior = gameState.warbands[0].warriors[0];

        warrior.profile.I = 2;
        expect(getDetectionRange(warrior)).toBe(2);

        warrior.profile.I = 6;
        expect(getDetectionRange(warrior)).toBe(6);
      });
    });

    describe('getShootingTargets with hidden warriors', () => {
      it('excludes hidden warriors from target list', () => {
        // Set up shooter with ranged weapon
        const shooterWarband = gameState.warbands[0];
        shooterWarband.warriors[0].equipment = {
          melee: ['sword'],
          ranged: ['bow'],
          armor: []
        };

        // Make enemy warrior hidden
        const targetWarrior = gameState.warbands[1].warriors[0];
        targetWarrior.isHidden = true;

        const shooterId = shooterWarband.warriors[0].id;
        const targets = getShootingTargets(gameState, shooterId);

        // Hidden warrior should not appear in targets
        const hiddenTarget = targets.find(t => t.targetId === targetWarrior.id);
        expect(hiddenTarget).toBeUndefined();
      });

      it('includes non-hidden warriors in target list', () => {
        // Set up shooter with ranged weapon
        const shooterWarband = gameState.warbands[0];
        shooterWarband.warriors[0].equipment = {
          melee: ['sword'],
          ranged: ['bow'],
          armor: []
        };

        // Enemy warrior is not hidden
        const targetWarrior = gameState.warbands[1].warriors[0];
        targetWarrior.isHidden = false;

        const shooterId = shooterWarband.warriors[0].id;
        const targets = getShootingTargets(gameState, shooterId);

        // Non-hidden warrior should appear in targets
        const visibleTarget = targets.find(t => t.targetId === targetWarrior.id);
        expect(visibleTarget).toBeDefined();
      });
    });

    describe('shooting reveals hidden warrior', () => {
      it('reveals hidden shooter when they shoot', () => {
        // Mock dice rolls
        vi.spyOn(gameRules, 'rollToHitShooting').mockReturnValue({
          roll: 4,
          needed: 4,
          success: true
        });
        vi.spyOn(gameRules, 'rollToWound').mockReturnValue({
          roll: 4,
          needed: 4,
          success: true,
          wounded: true
        });
        vi.spyOn(gameRules, 'rollArmorSave').mockReturnValue({
          roll: 1,
          needed: 6,
          saved: false
        });
        vi.spyOn(gameRules, 'rollInjury').mockReturnValue({
          roll: 4,
          result: 'knockedDown'
        });

        // Set up hidden shooter with ranged weapon
        const shooterWarband = gameState.warbands[0];
        shooterWarband.warriors[0].equipment = {
          melee: ['sword'],
          ranged: ['bow'],
          armor: []
        };
        shooterWarband.warriors[0].isHidden = true;

        // Enemy target
        const targetWarrior = gameState.warbands[1].warriors[0];

        const shooterId = shooterWarband.warriors[0].id;
        const targetId = targetWarrior.id;

        executeShot(gameState, shooterId, targetId, {
          cover: false,
          longRange: false,
          moved: false,
          largeTarget: false
        });

        // Shooter should no longer be hidden
        expect(shooterWarband.warriors[0].isHidden).toBe(false);
      });
    });
  });

  // =====================================
  // COMBAT MOVEMENT RESTRICTION TESTS
  // =====================================

  describe('Combat Movement Restrictions', () => {
    describe('canMoveInCombat', () => {
      it('allows movement when not in combat', () => {
        const warriorId = gameState.warbands[0].warriors[0].id;
        const result = canMoveInCombat(gameState, 0, warriorId);
        expect(result.canMove).toBe(true);
      });

      it('blocks movement when engaged with standing enemies', () => {
        const warrior1Id = gameState.warbands[0].warriors[0].id;
        const warrior2Id = gameState.warbands[1].warriors[0].id;

        // Engage in combat
        engageWarriors(gameState, 0, warrior1Id, 1, warrior2Id);

        const result = canMoveInCombat(gameState, 0, warrior1Id);
        expect(result.canMove).toBe(false);
        expect(result.reason).toContain('standing enemies');
      });

      it('allows movement when all engaged enemies are knocked down', () => {
        const warrior1Id = gameState.warbands[0].warriors[0].id;
        const warrior2Id = gameState.warbands[1].warriors[0].id;

        // Engage in combat
        engageWarriors(gameState, 0, warrior1Id, 1, warrior2Id);

        // Knock down the enemy
        setWarriorStatus(gameState, 1, warrior2Id, 'knockedDown');

        const result = canMoveInCombat(gameState, 0, warrior1Id);
        expect(result.canMove).toBe(true);
      });

      it('allows movement when all engaged enemies are stunned', () => {
        const warrior1Id = gameState.warbands[0].warriors[0].id;
        const warrior2Id = gameState.warbands[1].warriors[0].id;

        // Engage in combat
        engageWarriors(gameState, 0, warrior1Id, 1, warrior2Id);

        // Stun the enemy
        setWarriorStatus(gameState, 1, warrior2Id, 'stunned');

        const result = canMoveInCombat(gameState, 0, warrior1Id);
        expect(result.canMove).toBe(true);
      });

      it('blocks movement if at least one engaged enemy is standing', () => {
        const warrior1Id = gameState.warbands[0].warriors[0].id;
        const warrior2Id = gameState.warbands[1].warriors[0].id;
        const warrior3Id = gameState.warbands[1].warriors[1].id;

        // Engage with multiple enemies
        engageWarriors(gameState, 0, warrior1Id, 1, warrior2Id);
        gameState.warbands[0].warriors[0].combatState.engagedWith.push(warrior3Id);
        gameState.warbands[1].warriors[1].combatState.inCombat = true;
        gameState.warbands[1].warriors[1].combatState.engagedWith.push(warrior1Id);

        // Knock down one, leave other standing
        setWarriorStatus(gameState, 1, warrior2Id, 'knockedDown');

        const result = canMoveInCombat(gameState, 0, warrior1Id);
        expect(result.canMove).toBe(false);
      });
    });

    describe('disengageFromCombat', () => {
      it('clears warrior combat state', () => {
        const warrior1Id = gameState.warbands[0].warriors[0].id;
        const warrior2Id = gameState.warbands[1].warriors[0].id;

        // Engage in combat
        engageWarriors(gameState, 0, warrior1Id, 1, warrior2Id);

        // Knock down enemy so we can disengage
        setWarriorStatus(gameState, 1, warrior2Id, 'knockedDown');

        // Disengage
        disengageFromCombat(gameState, 0, warrior1Id);

        const warrior = gameState.warbands[0].warriors[0];
        expect(warrior.combatState.inCombat).toBe(false);
        expect(warrior.combatState.engagedWith).toEqual([]);
      });

      it('removes warrior from enemies engagedWith lists', () => {
        const warrior1Id = gameState.warbands[0].warriors[0].id;
        const warrior2Id = gameState.warbands[1].warriors[0].id;

        // Engage in combat
        engageWarriors(gameState, 0, warrior1Id, 1, warrior2Id);

        // Knock down enemy so we can disengage
        setWarriorStatus(gameState, 1, warrior2Id, 'knockedDown');

        // Disengage
        disengageFromCombat(gameState, 0, warrior1Id);

        const enemy = gameState.warbands[1].warriors[0];
        expect(enemy.combatState.engagedWith).not.toContain(warrior1Id);
        expect(enemy.combatState.inCombat).toBe(false);
      });
    });

    describe('moveWarrior with combat restrictions', () => {
      it('throws error when trying to move while engaged with standing enemy', () => {
        const warrior1Id = gameState.warbands[0].warriors[0].id;
        const warrior2Id = gameState.warbands[1].warriors[0].id;

        // Engage in combat
        engageWarriors(gameState, 0, warrior1Id, 1, warrior2Id);

        expect(() => moveWarrior(gameState, 0, warrior1Id)).toThrow('Cannot move while engaged with standing enemies');
      });

      it('allows movement when all engaged enemies are down', () => {
        const warrior1Id = gameState.warbands[0].warriors[0].id;
        const warrior2Id = gameState.warbands[1].warriors[0].id;

        // Engage in combat
        engageWarriors(gameState, 0, warrior1Id, 1, warrior2Id);

        // Knock down the enemy
        setWarriorStatus(gameState, 1, warrior2Id, 'knockedDown');

        // Should not throw
        const action = moveWarrior(gameState, 0, warrior1Id);
        expect(action.type).toBe('move');
      });

      it('disengages from downed enemies when option set', () => {
        const warrior1Id = gameState.warbands[0].warriors[0].id;
        const warrior2Id = gameState.warbands[1].warriors[0].id;

        // Engage in combat
        engageWarriors(gameState, 0, warrior1Id, 1, warrior2Id);

        // Knock down the enemy
        setWarriorStatus(gameState, 1, warrior2Id, 'knockedDown');

        // Move with disengage option
        moveWarrior(gameState, 0, warrior1Id, { disengageFromDowned: true });

        const warrior = gameState.warbands[0].warriors[0];
        expect(warrior.combatState.inCombat).toBe(false);
        expect(warrior.combatState.engagedWith).toEqual([]);
      });

      it('action description reflects disengagement', () => {
        const warrior1Id = gameState.warbands[0].warriors[0].id;
        const warrior2Id = gameState.warbands[1].warriors[0].id;

        // Engage in combat
        engageWarriors(gameState, 0, warrior1Id, 1, warrior2Id);

        // Knock down the enemy
        setWarriorStatus(gameState, 1, warrior2Id, 'knockedDown');

        // Move with disengage option
        const action = moveWarrior(gameState, 0, warrior1Id, { disengageFromDowned: true });

        expect(action.description).toContain('downed enemies');
      });
    });
  });
});

// Need afterEach for vi.restoreAllMocks
import { afterEach } from 'vitest';
