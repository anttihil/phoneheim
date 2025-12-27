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

// Helper to skip to combat phase (Player 1)
// New turn structure: P1 completes all phases, then P2 completes all phases
async function skipToCombatPhase(page: Page): Promise<void> {
  await page.click('button:has-text("Next Phase")'); // Setup P1 -> Setup P2
  await page.click('button:has-text("Next Phase")'); // Setup P2 -> Recovery P1
  await page.click('button:has-text("Next Phase")'); // Recovery P1 -> Movement P1
  await page.click('button:has-text("Next Phase")'); // Movement P1 -> Shooting P1
  await page.click('button:has-text("Next Phase")'); // Shooting P1 -> Combat P1
  // Now in Combat P1
}

test.describe('Combat Phase Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create two warbands for testing
    await createTestWarband(page, 'Attack Test Warband 1', 'reikland');
    await createTestWarband(page, 'Attack Test Warband 2', 'reikland');
  });

  test('should reach combat phase', async ({ page }) => {
    await startGame(page);
    await skipToCombatPhase(page);

    // Verify we're in combat phase
    const phaseIndicator = page.locator('.phase-indicator');
    await expect(phaseIndicator).toContainText('Combat');
    await expect(phaseIndicator).toContainText('Player 1');
  });

  test('should show combat phase card', async ({ page }) => {
    await startGame(page);
    await skipToCombatPhase(page);

    // Combat phase card should be visible
    await expect(page.locator('.card-title:has-text("Combat Phase")')).toBeVisible();
  });

  test('should advance from combat P1 to recovery P2', async ({ page }) => {
    await startGame(page);
    await skipToCombatPhase(page);

    const phaseIndicator = page.locator('.phase-indicator');
    await expect(phaseIndicator).toContainText('Player 1');

    // Advance to Player 2's Recovery (new turn structure)
    await page.click('button:has-text("Next Phase")');

    await expect(phaseIndicator).toContainText('Recovery');
    await expect(phaseIndicator).toContainText('Player 2');
  });

  test('should advance to next turn after P2 combat phase', async ({ page }) => {
    await startGame(page);
    await skipToCombatPhase(page);

    const phaseIndicator = page.locator('.phase-indicator');

    // Combat P1 -> Recovery P2
    await page.click('button:has-text("Next Phase")');
    // Recovery P2 -> Movement P2
    await page.click('button:has-text("Next Phase")');
    // Movement P2 -> Shooting P2
    await page.click('button:has-text("Next Phase")');
    // Shooting P2 -> Combat P2
    await page.click('button:has-text("Next Phase")');
    // Combat P2 -> Recovery P1 (Turn 2)
    await page.click('button:has-text("Next Phase")');

    // Should be Turn 2 Recovery
    await expect(phaseIndicator).toContainText('Turn 2');
    await expect(phaseIndicator).toContainText('Recovery');
  });

  test('should show no fighters message when no combat', async ({ page }) => {
    await startGame(page);
    await skipToCombatPhase(page);

    // Without any charges, combat phase should show no fighters
    await expect(page.locator('text=No more fighters')).toBeVisible();
  });

  test('should have game controls in combat phase', async ({ page }) => {
    await startGame(page);
    await skipToCombatPhase(page);

    // Game controls should still be visible
    await expect(page.locator('button:has-text("Next Phase")')).toBeVisible();
    await expect(page.locator('button:has-text("End Game")')).toBeVisible();
    await expect(page.locator('button:has-text("Undo")')).toBeVisible();
    await expect(page.locator('button:has-text("Roll Dice")')).toBeVisible();
  });

  test('should show phase indicator throughout game', async ({ page }) => {
    await startGame(page);

    const phaseIndicator = page.locator('.phase-indicator');

    // Setup phase
    await expect(phaseIndicator).toContainText('Setup');

    // Advance through phases checking indicator updates
    await page.click('button:has-text("Next Phase")');
    await expect(phaseIndicator).toContainText('Setup');
    await expect(phaseIndicator).toContainText('Player 2');

    // P1 phases (new structure: one player completes all phases)
    await page.click('button:has-text("Next Phase")');
    await expect(phaseIndicator).toContainText('Recovery');
    await expect(phaseIndicator).toContainText('Player 1');

    await page.click('button:has-text("Next Phase")');
    await expect(phaseIndicator).toContainText('Movement');
    await expect(phaseIndicator).toContainText('Player 1');

    await page.click('button:has-text("Next Phase")');
    await expect(phaseIndicator).toContainText('Shooting');
    await expect(phaseIndicator).toContainText('Player 1');

    await page.click('button:has-text("Next Phase")');
    await expect(phaseIndicator).toContainText('Combat');
    await expect(phaseIndicator).toContainText('Player 1');
  });

  test('should allow ending game from combat phase', async ({ page }) => {
    await startGame(page);
    await skipToCombatPhase(page);

    // End Game button should be visible
    const endGameBtn = page.locator('button:has-text("End Game")');
    await expect(endGameBtn).toBeVisible();

    // Note: We don't actually click End Game as it has a confirm dialog
  });

  test('should show turn number in phase indicator', async ({ page }) => {
    await startGame(page);
    await skipToCombatPhase(page);

    const phaseIndicator = page.locator('.phase-indicator');
    await expect(phaseIndicator).toContainText('Turn 1');
  });
});
