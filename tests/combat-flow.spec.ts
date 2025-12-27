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

  // Wait for navigation to warband list and verify warband was saved
  await page.waitForURL('/warband/list', { timeout: 10000 });
  await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 5000 });
}

// Helper function to start a game with two warbands
async function startGame(page: Page): Promise<void> {
  await page.goto('/game/setup');

  // Wait for selects to appear and have options
  const select1 = page.locator('select').nth(0);
  const select2 = page.locator('select').nth(1);

  // Wait for first select to have warband options (more than just placeholder)
  await expect(select1.locator('option')).toHaveCount(3, { timeout: 10000 });

  // Select first available warband in select1
  await select1.selectOption({ index: 1 });

  // After selecting, select2 should still have options (the unselected warband)
  await expect(select2.locator('option')).toHaveCount(2, { timeout: 10000 });

  // Select the remaining warband in select2
  await select2.selectOption({ index: 1 });

  // Start game
  await page.click('button:has-text("Start Game")');

  // Wait for navigation to game play
  await page.waitForURL('/game/play', { timeout: 10000 });
}

test.describe('Combat Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create two warbands for testing (both Reikland for reliability)
    await createTestWarband(page, 'Test Warband 1', 'reikland');
    await createTestWarband(page, 'Test Warband 2', 'reikland');
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

      // Check for setup phase card with positioning instructions
      await expect(page.locator('.card-title:has-text("Setup Phase")')).toBeVisible();
      await expect(page.locator('text=Position your warriors')).toBeVisible();
    });

    test('should show warriors to position list', async ({ page }) => {
      await startGame(page);

      // Verify warriors to position list is visible
      await expect(page.locator('text=Warriors to Position')).toBeVisible();

      // Warriors should be listed and clickable
      const warriors = page.locator('.warrior-item');
      const count = await warriors.count();
      expect(count).toBeGreaterThan(0);

      // Each warrior item should be visible
      await expect(warriors.first()).toBeVisible();
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
      // Skip setup phases to get to movement (new turn structure: P1 completes all phases)
      await page.click('button:has-text("Next Phase")'); // Setup P1 -> Setup P2
      await page.click('button:has-text("Next Phase")'); // Setup P2 -> Recovery P1
      await page.click('button:has-text("Next Phase")'); // Recovery P1 -> Movement P1
    });

    test('should be in movement phase', async ({ page }) => {
      const phaseIndicator = page.locator('.phase-indicator');
      await expect(phaseIndicator).toContainText('Movement');
      await expect(phaseIndicator).toContainText('Player 1');
    });

    test('should show Move button for standing warrior', async ({ page }) => {
      // Click on a warrior in the actable warriors list
      const warrior = page.locator('.warrior-item').first();
      await warrior.click();

      // Check Move action is available
      const moveBtn = page.getByRole('button', { name: 'Move', exact: true });
      await expect(moveBtn).toBeVisible();
    });

    test('should perform move action when clicking Move', async ({ page }) => {
      // Click on a warrior
      const warrior = page.locator('.warrior-item').first();
      await warrior.click();

      // Click Move
      await page.getByRole('button', { name: 'Move', exact: true }).click();

      // After move, warrior should no longer be in actable list
      // Or we should be able to move another warrior
      // The action panel should disappear
      await expect(page.locator('.action-panel')).not.toBeVisible();
    });

    test('should show warriors that can move', async ({ page }) => {
      // Movement phase should show actable warriors
      await expect(page.locator('text=Warriors that can act')).toBeVisible();

      // Should have warrior items
      const warriors = page.locator('.warrior-item');
      const count = await warriors.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should perform run action when clicking Run', async ({ page }) => {
      // Click on a warrior
      const warrior = page.locator('.warrior-item').first();
      await warrior.click();

      // Click Run
      await page.getByRole('button', { name: 'Run' }).click();

      // After run, action panel should disappear
      await expect(page.locator('.action-panel')).not.toBeVisible();
    });

    test('should reduce actable warriors after moving', async ({ page }) => {
      // Count initial warriors
      const initialCount = await page.locator('.actable-warriors .warrior-item').count();
      expect(initialCount).toBeGreaterThan(0);

      // Move a warrior
      const warrior = page.locator('.warrior-item').first();
      await warrior.click();
      await page.getByRole('button', { name: 'Move', exact: true }).click();

      // Count should decrease
      const newCount = await page.locator('.actable-warriors .warrior-item').count();
      expect(newCount).toBeLessThan(initialCount);
    });

    test('should allow selecting different warriors', async ({ page }) => {
      // Click on first warrior
      const firstWarrior = page.locator('.warrior-item').first();
      await firstWarrior.click();

      // Action panel should show
      await expect(page.locator('.action-panel')).toBeVisible();

      // Click on first warrior again to deselect
      await firstWarrior.click();

      // Action panel should hide
      await expect(page.locator('.action-panel')).not.toBeVisible();
    });
  });

  test.describe('Charge Action', () => {
    test.beforeEach(async ({ page }) => {
      await startGame(page);
      // Skip to movement phase (new turn structure: P1 completes all phases)
      await page.click('button:has-text("Next Phase")'); // Setup P1 -> Setup P2
      await page.click('button:has-text("Next Phase")'); // Setup P2 -> Recovery P1
      await page.click('button:has-text("Next Phase")'); // Recovery P1 -> Movement P1
    });

    test('should show movement phase with warriors', async ({ page }) => {
      // In movement phase, warriors that can act should be shown
      await expect(page.locator('text=Warriors that can act')).toBeVisible();
      const warriors = page.locator('.warrior-item');
      const count = await warriors.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should show action panel when warrior selected', async ({ page }) => {
      // Click on a warrior
      const warrior = page.locator('.warrior-item').first();
      await warrior.click();

      // Action panel should appear
      await expect(page.locator('.action-panel')).toBeVisible();
    });

    test('should show Move and Run buttons', async ({ page }) => {
      // Click on a warrior
      const warrior = page.locator('.warrior-item').first();
      await warrior.click();

      // Check Move and Run buttons
      await expect(page.getByRole('button', { name: 'Move', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Run' })).toBeVisible();
    });

    test('should hide action panel when deselected', async ({ page }) => {
      // Click on a warrior
      const warrior = page.locator('.warrior-item').first();
      await warrior.click();

      // Action panel should appear
      await expect(page.locator('.action-panel')).toBeVisible();

      // Click again to deselect
      await warrior.click();

      // Action panel should disappear
      await expect(page.locator('.action-panel')).not.toBeVisible();
    });

    test('should execute move on valid warrior', async ({ page }) => {
      // Click on a warrior
      const warrior = page.locator('.warrior-item').first();
      await warrior.click();

      // Click Move
      await page.getByRole('button', { name: 'Move', exact: true }).click();

      // Action panel should disappear (warrior moved and deselected)
      await expect(page.locator('.action-panel')).not.toBeVisible();
    });
  });

  test.describe('Game Phase Progression', () => {
    test.beforeEach(async ({ page }) => {
      await startGame(page);
      // Skip to movement phase (new turn structure: P1 completes all phases)
      await page.click('button:has-text("Next Phase")'); // Setup P1 -> Setup P2
      await page.click('button:has-text("Next Phase")'); // Setup P2 -> Recovery P1
      await page.click('button:has-text("Next Phase")'); // Recovery P1 -> Movement P1
    });

    test('should show actable warriors in movement phase', async ({ page }) => {
      // Movement phase shows warriors that can move
      const warriors = page.locator('.warrior-item');
      const count = await warriors.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should decrease actable count after moving', async ({ page }) => {
      // Count initial warriors
      const initialCount = await page.locator('.warrior-item').count();

      // Move a warrior
      await page.locator('.warrior-item').first().click();
      await page.getByRole('button', { name: 'Move', exact: true }).click();

      // Count should decrease
      const newCount = await page.locator('.warrior-item').count();
      expect(newCount).toBeLessThan(initialCount);
    });

    test('should advance to next phase', async ({ page }) => {
      const phaseIndicator = page.locator('.phase-indicator');
      await expect(phaseIndicator).toContainText('Movement');
      await expect(phaseIndicator).toContainText('Player 1');

      // Advance to Shooting (same player in new turn structure)
      await page.click('button:has-text("Next Phase")');
      await expect(phaseIndicator).toContainText('Shooting');
      await expect(phaseIndicator).toContainText('Player 1');
    });

    test('should show shooting phase after movement', async ({ page }) => {
      const phaseIndicator = page.locator('.phase-indicator');

      // Movement P1 -> Shooting P1 (new structure: same player advances phases)
      await page.click('button:has-text("Next Phase")');

      await expect(phaseIndicator).toContainText('Shooting');
      await expect(phaseIndicator).toContainText('Player 1');
    });
  });

  test.describe('Undo Actions', () => {
    test.beforeEach(async ({ page }) => {
      await startGame(page);
      // Skip to movement phase (new turn structure: P1 completes all phases)
      await page.click('button:has-text("Next Phase")'); // Setup P1 -> Setup P2
      await page.click('button:has-text("Next Phase")'); // Setup P2 -> Recovery P1
      await page.click('button:has-text("Next Phase")'); // Recovery P1 -> Movement P1
    });

    test('should have undo button visible', async ({ page }) => {
      await expect(page.locator('button:has-text("Undo")')).toBeVisible();
    });
  });
});
