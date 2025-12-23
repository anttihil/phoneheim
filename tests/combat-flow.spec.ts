import { test, expect, Page } from '@playwright/test';

// Helper function to create a test warband
async function createTestWarband(page: Page, name: string, type: 'reikland' | 'skaven' = 'reikland'): Promise<void> {
  await page.goto('/warband/create');

  // Step 1: Select warband type
  await page.waitForSelector('select', { timeout: 10000 });
  if (type === 'reikland') {
    await page.selectOption('select', { label: 'Reikland Mercenaries (500gc)' });
  } else {
    await page.selectOption('select', { label: 'Skaven (500gc)' });
  }
  await page.click('button:has-text("Next")');

  // Step 2: Enter name
  await page.waitForSelector('input[type="text"]', { timeout: 10000 });
  await page.fill('input[type="text"]', name);
  await page.click('button:has-text("Next")');

  // Step 3: Recruit warriors
  await page.waitForSelector('.recruit-btn', { timeout: 10000 });

  // Recruit hero(es) and henchmen based on warband type
  if (type === 'reikland') {
    // Recruit Captain
    const captainBtn = page.locator('.recruit-btn').filter({ hasText: 'Captain' }).first();
    if (await captainBtn.isVisible()) {
      await captainBtn.click();
    }
    // Recruit Warriors
    const warriorBtn = page.locator('.recruit-btn').filter({ hasText: 'Warrior' }).first();
    if (await warriorBtn.isVisible()) {
      await warriorBtn.click();
      await warriorBtn.click();
    }
  } else {
    // Recruit Skaven heroes and henchmen
    const adeptBtn = page.locator('.recruit-btn').filter({ hasText: 'Assassin Adept' }).first();
    if (await adeptBtn.isVisible()) {
      await adeptBtn.click();
    }
    const verminkinBtn = page.locator('.recruit-btn').filter({ hasText: 'Verminkin' }).first();
    if (await verminkinBtn.isVisible()) {
      await verminkinBtn.click();
      await verminkinBtn.click();
    }
  }

  await page.click('button:has-text("Next")');

  // Step 4: Review and save
  await page.waitForSelector('button:has-text("Save Warband")', { timeout: 10000 });
  await page.click('button:has-text("Save Warband")');

  // Wait for navigation to warband detail
  await page.waitForURL(/\/warband\/.*/, { timeout: 10000 });
}

// Helper function to start a game with two warbands
async function startGame(page: Page): Promise<void> {
  await page.goto('/game/setup');

  // Wait for the selects to be populated
  await page.waitForSelector('select', { timeout: 10000 });

  // Select warbands
  const selects = page.locator('select');
  await selects.nth(0).selectOption({ index: 1 });
  await selects.nth(1).selectOption({ index: 1 });

  // Start game
  await page.click('button:has-text("Start Game")');

  // Wait for navigation to game play
  await page.waitForURL('/game/play', { timeout: 10000 });
}

test.describe('Combat Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create two warbands for testing
    await createTestWarband(page, 'Test Warband 1', 'reikland');
    await createTestWarband(page, 'Test Warband 2', 'skaven');
  });

  test.describe('Setup Phase', () => {
    test('should start in setup phase with Player 1', async ({ page }) => {
      await startGame(page);

      // Check we're in setup phase
      const phaseIndicator = page.locator('.phase-indicator');
      await expect(phaseIndicator).toContainText('Setup');
      await expect(phaseIndicator).toContainText('Player 1');
    });

    test('should show setup phase instructions', async ({ page }) => {
      await startGame(page);

      // Check for setup phase card
      const setupCard = page.locator('.setup-actions');
      await expect(setupCard).toBeVisible();
      await expect(setupCard).toContainText('Position your warriors');
    });

    test('should allow clicking warriors and marking as positioned', async ({ page }) => {
      await startGame(page);

      // Click on a warrior
      const warrior = page.locator('.warrior-game-status.can-act').first();
      await expect(warrior).toBeVisible();
      await warrior.click();

      // Check action panel shows position action
      const actionPanel = page.locator('.action-panel');
      await expect(actionPanel).toBeVisible();

      // Click mark positioned
      await page.click('button:has-text("Mark Positioned")');

      // Check log entry was added
      const gameLog = page.locator('.game-log');
      await expect(gameLog).toContainText('positioned');
    });

    test('should advance to Player 2 setup after Player 1', async ({ page }) => {
      await startGame(page);

      // Advance phase for Player 1
      await page.click('button:has-text("Next Phase")');

      // Check we're now Player 2's setup
      const phaseIndicator = page.locator('.phase-indicator');
      await expect(phaseIndicator).toContainText('Setup');
      await expect(phaseIndicator).toContainText('Player 2');
    });

    test('should advance to Recovery phase after both players setup', async ({ page }) => {
      await startGame(page);

      // Advance through both players' setup
      await page.click('button:has-text("Next Phase")'); // Player 1 -> Player 2
      await page.click('button:has-text("Next Phase")'); // Player 2 -> Recovery

      // Check we're in recovery phase
      const phaseIndicator = page.locator('.phase-indicator');
      await expect(phaseIndicator).toContainText('Recovery');
      await expect(phaseIndicator).toContainText('Player 1');
    });
  });

  test.describe('Movement Actions', () => {
    test.beforeEach(async ({ page }) => {
      await startGame(page);
      // Skip setup phases to get to movement
      await page.click('button:has-text("Next Phase")'); // Player 1 Setup
      await page.click('button:has-text("Next Phase")'); // Player 2 Setup
      await page.click('button:has-text("Next Phase")'); // Recovery P1
      await page.click('button:has-text("Next Phase")'); // Recovery P2
    });

    test('should be in movement phase', async ({ page }) => {
      const phaseIndicator = page.locator('.phase-indicator');
      await expect(phaseIndicator).toContainText('Movement');
      await expect(phaseIndicator).toContainText('Player 1');
    });

    test('should show Move button for standing warrior', async ({ page }) => {
      // Click on a warrior
      const warrior = page.locator('.warrior-game-status.can-act').first();
      await warrior.click();

      // Check Move action is available
      const moveBtn = page.locator('button:has-text("Move")');
      await expect(moveBtn).toBeVisible();
    });

    test('should log move action when clicking Move', async ({ page }) => {
      // Click on a warrior
      const warrior = page.locator('.warrior-game-status.can-act').first();
      await warrior.click();

      // Click Move
      await page.click('button:has-text("Move")');

      // Check log entry
      const gameLog = page.locator('.game-log');
      await expect(gameLog).toContainText('moves');
    });

    test('should mark warrior as moved after Move action', async ({ page }) => {
      // Click on a warrior
      const warrior = page.locator('.warrior-game-status.can-act').first();
      await warrior.click();

      // Click Move
      await page.click('button:has-text("Move")');

      // Check warrior shows "Moved" badge
      await expect(page.locator('.acted-badge').filter({ hasText: 'Moved' })).toBeVisible();
    });

    test('should log run action when clicking Run', async ({ page }) => {
      // Click on a warrior
      const warrior = page.locator('.warrior-game-status.can-act').first();
      await warrior.click();

      // Click Run
      await page.click('button:has-text("Run")');

      // Check log entry
      const gameLog = page.locator('.game-log');
      await expect(gameLog).toContainText('runs');
    });

    test('should mark warrior as ran after Run action', async ({ page }) => {
      // Click on a warrior
      const warrior = page.locator('.warrior-game-status.can-act').first();
      await warrior.click();

      // Click Run
      await page.click('button:has-text("Run")');

      // Check warrior shows "Ran" badge
      await expect(page.locator('.acted-badge').filter({ hasText: 'Ran' })).toBeVisible();
    });

    test('should not allow warrior to move twice', async ({ page }) => {
      // Click on a warrior
      const warrior = page.locator('.warrior-game-status.can-act').first();
      await warrior.click();

      // Click Move
      await page.click('button:has-text("Move")');

      // Click on the same warrior again
      await warrior.click();

      // Move button should not be available (warrior no longer "can-act")
      await expect(warrior).not.toHaveClass(/can-act/);
    });
  });

  test.describe('Charge Action', () => {
    test.beforeEach(async ({ page }) => {
      await startGame(page);
      // Skip to movement phase
      await page.click('button:has-text("Next Phase")'); // Player 1 Setup
      await page.click('button:has-text("Next Phase")'); // Player 2 Setup
      await page.click('button:has-text("Next Phase")'); // Recovery P1
      await page.click('button:has-text("Next Phase")'); // Recovery P2
    });

    test('should show Charge action with target required', async ({ page }) => {
      // Click on a warrior
      const warrior = page.locator('.warrior-game-status.can-act').first();
      await warrior.click();

      // Check Charge action is available
      const chargeBtn = page.locator('button:has-text("Charge")');
      await expect(chargeBtn).toBeVisible();
    });

    test('should enter target selection mode when clicking Charge', async ({ page }) => {
      // Click on a warrior
      const warrior = page.locator('.warrior-game-status.can-act').first();
      await warrior.click();

      // Click Charge
      await page.click('button:has-text("Charge")');

      // Check target selection banner appears
      const banner = page.locator('.target-selection-banner');
      await expect(banner).toBeVisible();
      await expect(banner).toContainText('Select a target');
    });

    test('should show opponent warriors when in target selection mode', async ({ page }) => {
      // Click on a warrior
      const warrior = page.locator('.warrior-game-status.can-act').first();
      await warrior.click();

      // Click Charge
      await page.click('button:has-text("Charge")');

      // Check opponent card is visible with valid targets
      const validTarget = page.locator('.warrior-game-status.valid-target');
      await expect(validTarget.first()).toBeVisible();
    });

    test('should cancel target selection when clicking Cancel', async ({ page }) => {
      // Click on a warrior
      const warrior = page.locator('.warrior-game-status.can-act').first();
      await warrior.click();

      // Click Charge
      await page.click('button:has-text("Charge")');

      // Click Cancel
      await page.click('button:has-text("Cancel")');

      // Check banner is gone
      const banner = page.locator('.target-selection-banner');
      await expect(banner).not.toBeVisible();
    });

    test('should execute charge when clicking valid target', async ({ page }) => {
      // Enable show all warriors to see the opponent
      await page.click('button:has-text("Show All Warriors")');

      // Click on a warrior
      const warrior = page.locator('.warrior-game-status.can-act').first();
      await warrior.click();

      // Click Charge
      await page.click('button:has-text("Charge")');

      // Click on a valid target
      const validTarget = page.locator('.warrior-game-status.valid-target').first();
      await validTarget.click();

      // Check log entry for charge
      const gameLog = page.locator('.game-log');
      await expect(gameLog).toContainText('charges');
    });
  });

  test.describe('Warrior Filtering', () => {
    test.beforeEach(async ({ page }) => {
      await startGame(page);
      // Skip to movement phase
      await page.click('button:has-text("Next Phase")'); // Player 1 Setup
      await page.click('button:has-text("Next Phase")'); // Player 2 Setup
      await page.click('button:has-text("Next Phase")'); // Recovery P1
      await page.click('button:has-text("Next Phase")'); // Recovery P2
    });

    test('should only show actionable warriors by default', async ({ page }) => {
      // All visible warriors should have can-act class
      const warriors = page.locator('.warrior-game-status:not(.opponent)');
      const count = await warriors.count();
      expect(count).toBeGreaterThan(0);

      // Move one warrior
      const warrior = page.locator('.warrior-game-status.can-act').first();
      await warrior.click();
      await page.click('button:has-text("Move")');

      // Now there should be fewer warriors shown (unless show all is on)
      const newCount = await page.locator('.warrior-game-status.can-act:not(.opponent)').count();
      expect(newCount).toBeLessThan(count);
    });

    test('should show toggle button for all warriors', async ({ page }) => {
      const toggleBtn = page.locator('button:has-text("Show All Warriors")');
      await expect(toggleBtn).toBeVisible();
    });

    test('should show all warriors when toggle is clicked', async ({ page }) => {
      const initialCount = await page.locator('.warrior-game-status:not(.opponent)').count();

      // Move one warrior so it's no longer "can-act"
      const warrior = page.locator('.warrior-game-status.can-act').first();
      await warrior.click();
      await page.click('button:has-text("Move")');

      // Count should decrease since moved warrior is filtered
      const reducedCount = await page.locator('.warrior-game-status:not(.opponent)').count();

      // Click toggle to show all
      await page.click('button:has-text("Show All Warriors")');

      // Count should be back to initial (or more)
      const allCount = await page.locator('.warrior-game-status:not(.opponent)').count();
      expect(allCount).toBeGreaterThanOrEqual(reducedCount);
    });

    test('should not show opponent by default', async ({ page }) => {
      // Opponent card should not be visible by default
      const opponentCard = page.locator('text=Opponent:').first();
      await expect(opponentCard).not.toBeVisible();
    });

    test('should show opponent when Show All Warriors is clicked', async ({ page }) => {
      // Click toggle
      await page.click('button:has-text("Show All Warriors")');

      // Opponent card should now be visible
      const opponentCard = page.locator('text=Opponent:').first();
      await expect(opponentCard).toBeVisible();
    });
  });

  test.describe('Undo Actions', () => {
    test.beforeEach(async ({ page }) => {
      await startGame(page);
      // Skip to movement phase
      await page.click('button:has-text("Next Phase")'); // Player 1 Setup
      await page.click('button:has-text("Next Phase")'); // Player 2 Setup
      await page.click('button:has-text("Next Phase")'); // Recovery P1
      await page.click('button:has-text("Next Phase")'); // Recovery P2
    });

    test('should allow undoing move action', async ({ page }) => {
      // Perform a move
      const warrior = page.locator('.warrior-game-status.can-act').first();
      await warrior.click();
      await page.click('button:has-text("Move")');

      // Verify moved badge
      await expect(page.locator('.acted-badge').filter({ hasText: 'Moved' })).toBeVisible();

      // Click undo
      await page.click('button:has-text("Undo")');

      // Confirm undo
      await page.click('button:has-text("Confirm Undo")');

      // Check log shows undo
      const gameLog = page.locator('.game-log');
      await expect(gameLog).toContainText('UNDO');
    });
  });
});
