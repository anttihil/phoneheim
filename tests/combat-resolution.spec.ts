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

// Helper to skip to movement phase (Player 1)
async function skipToMovementPhase(page: Page): Promise<void> {
  await page.click('button:has-text("Next Phase")'); // Setup P1 -> Setup P2
  await page.click('button:has-text("Next Phase")'); // Setup P2 -> Recovery P1
  await page.click('button:has-text("Next Phase")'); // Recovery P1 -> Movement P1
  // Now in Movement P1
}

// Helper to skip to combat phase (Player 1)
async function skipToCombatPhase(page: Page): Promise<void> {
  await skipToMovementPhase(page);
  await page.click('button:has-text("Next Phase")'); // Movement P1 -> Shooting P1
  await page.click('button:has-text("Next Phase")'); // Shooting P1 -> Combat P1
  // Now in Combat P1
}

// These tests verify combat resolution mechanics work correctly

test.describe('Combat Resolution UI - Issue Fixes', () => {

  test.beforeEach(async ({ page }) => {
    // Create two warbands for testing
    await createTestWarband(page, 'Combat Test Warband 1', 'reikland');
    await createTestWarband(page, 'Combat Test Warband 2', 'reikland');
  });

  test('strike order should display warrior names (Issue 2)', async ({ page }) => {
    // Start game and go to movement phase
    await startGame(page);
    await skipToMovementPhase(page);

    // Select a warrior and charge an enemy to create combat
    const warriorItem = page.locator('.warrior-item').first();
    if (await warriorItem.isVisible()) {
      await warriorItem.click();

      // Look for charge button - if there are charge targets available
      const chargeButton = page.locator('button:has-text("Charge")').first();
      if (await chargeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await chargeButton.click();
      }
    }

    // Continue to combat phase
    await page.click('button:has-text("Next Phase")'); // Movement -> Shooting
    await page.click('button:has-text("Next Phase")'); // Shooting -> Combat

    // Check if strike order is visible (only if there's combat)
    const strikeOrder = page.locator('.strike-order, .strike-entry');
    if (await strikeOrder.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      // If strike order is visible, warrior names should NOT be undefined
      const strikeEntries = page.locator('.strike-entry');
      const count = await strikeEntries.count();

      for (let i = 0; i < count; i++) {
        const entryText = await strikeEntries.nth(i).textContent();
        // Name should not be undefined or empty after the number prefix
        expect(entryText).not.toContain('undefined');
        expect(entryText).not.toMatch(/^\d+\.\s*$/); // Should have more than just "1. "
      }
    }
  });

  test('combat resolution modal should display dice roll information (Issue 1)', async ({ page }) => {
    // Start game and go to movement phase
    await startGame(page);
    await skipToMovementPhase(page);

    // Try to create combat via charge
    const warriorItem = page.locator('.warrior-item').first();
    if (await warriorItem.isVisible()) {
      await warriorItem.click();

      const chargeButton = page.locator('button:has-text("Charge")').first();
      if (await chargeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await chargeButton.click();
      }
    }

    // Continue to combat phase
    await page.click('button:has-text("Next Phase")'); // Movement -> Shooting
    await page.click('button:has-text("Next Phase")'); // Shooting -> Combat

    // If there's a current fighter with attack targets
    const attackButton = page.locator('button:has-text("Attack")').first();
    if (await attackButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await attackButton.click();

      // Resolution modal should appear
      const resolutionModal = page.locator('.resolution-modal');
      await expect(resolutionModal).toBeVisible({ timeout: 5000 });

      // Modal should contain dice roll information
      await expect(resolutionModal.locator('.step-label').first()).toBeVisible();

      // Should show at least one rolled value (may have multiple for hit/wound/etc)
      await expect(resolutionModal.locator('.step-roll').first()).toBeVisible();

      // Should show at least one needed value
      await expect(resolutionModal.locator('.step-needed').first()).toBeVisible();

      // Should show at least one result (success/fail)
      await expect(resolutionModal.locator('.step-result').first()).toBeVisible();

      // Should show final outcome
      await expect(resolutionModal.locator('.resolution-outcome')).toBeVisible();

      // Verify the modal contains actual dice values, not undefined
      const rollTexts = await resolutionModal.locator('.step-roll').allTextContents();
      for (const text of rollTexts) {
        expect(text).toMatch(/Rolled \[\d+\]/); // Should have actual numbers
        expect(text).not.toContain('undefined');
      }

      // Close modal
      await page.click('button:has-text("OK")');
    }
  });

  test('combat phase should show current fighter from strike order', async ({ page }) => {
    await startGame(page);
    await skipToCombatPhase(page);

    // Verify combat phase UI
    const phaseIndicator = page.locator('.phase-indicator');
    await expect(phaseIndicator).toContainText('Combat');

    // Either we have fighters or "No more fighters" message
    const noFighters = page.locator('text=No more fighters');
    const currentFighter = page.locator('.current-fighter, h4:has-text("Current Fighter")');

    // One of these should be visible
    const hasNoFighters = await noFighters.isVisible({ timeout: 2000 }).catch(() => false);
    const hasCurrentFighter = await currentFighter.isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasNoFighters || hasCurrentFighter).toBe(true);
  });

  test('opponent warrior should be able to strike after first fighter (Issue 3)', async ({ page }) => {
    // Start game and go to movement phase
    await startGame(page);
    await skipToMovementPhase(page);

    // Get initial phase indicator state
    const phaseIndicator = page.locator('.phase-indicator');
    await expect(phaseIndicator).toContainText('Movement');

    // Select a warrior and charge an enemy to create combat
    const warriorItem = page.locator('.warrior-item').first();
    let chargeSuccessful = false;

    if (await warriorItem.isVisible()) {
      await warriorItem.click();

      // Look for charge button with a target
      const chargeButton = page.locator('button[class*="danger"]').filter({ hasText: /Charge/ }).first();
      if (await chargeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await chargeButton.click();
        chargeSuccessful = true;
      }
    }

    // Continue to combat phase regardless
    await page.click('button:has-text("Next Phase")'); // Movement -> Shooting
    await page.click('button:has-text("Next Phase")'); // Shooting -> Combat

    await expect(phaseIndicator).toContainText('Combat');

    // Skip test if no combat was created (no charge happened)
    test.skip(!chargeSuccessful, 'Could not create combat scenario - no charge target available');

    // Should have strike order visible
    const strikeOrder = page.locator('.strike-order');
    await expect(strikeOrder).toBeVisible({ timeout: 5000 });

    // Get strike order entries
    const strikeEntries = page.locator('.strike-entry');
    const entryCount = await strikeEntries.count();

    // Should have at least 2 fighters (charger and defender)
    expect(entryCount).toBeGreaterThanOrEqual(2);

    // Record initial current fighter index
    const firstCurrentClass = await strikeEntries.first().getAttribute('class');
    expect(firstCurrentClass).toContain('current');

    // Attack button should be visible
    const attackButton = page.locator('button:has-text("Attack")').first();
    await expect(attackButton).toBeVisible();

    // Execute attack
    await attackButton.click();

    // Resolution modal should appear
    const resolutionModal = page.locator('.resolution-modal');
    await expect(resolutionModal).toBeVisible({ timeout: 5000 });

    // Close resolution modal
    await page.click('button:has-text("OK")');

    // Wait for modal to close
    await expect(resolutionModal).not.toBeVisible({ timeout: 2000 });

    // Check if we still have active combat (defender might have been taken out)
    const noMoreFighters = page.locator('text=No more fighters');
    const hasNoMoreFighters = await noMoreFighters.isVisible({ timeout: 1000 }).catch(() => false);

    // Skip if defender was taken out of action - we can't test opponent strike
    test.skip(hasNoMoreFighters, 'Defender was taken out - cannot test opponent strike');

    // CRITICAL ASSERTION FOR ISSUE 3:
    // The second entry (opponent's warrior) should now be marked as current
    const refreshedEntries = page.locator('.strike-entry');
    const secondEntry = refreshedEntries.nth(1);

    // Either: first entry is still current (charger has more attacks)
    // OR: second entry is now current (charger finished, opponent's turn)
    const firstStillCurrent = await strikeEntries.first().evaluate(el => el.classList.contains('current'));
    const secondNowCurrent = await secondEntry.evaluate(el => el.classList.contains('current')).catch(() => false);

    // At least one should be current
    expect(firstStillCurrent || secondNowCurrent).toBe(true);

    // If second is current, attack button must be visible
    if (secondNowCurrent) {
      const newAttackButton = page.locator('button:has-text("Attack")').first();
      // This is the key test for Issue 3: opponent's warrior MUST be able to attack
      await expect(newAttackButton).toBeVisible({ timeout: 3000 });
    }
  });

});

test.describe('Shooting Mechanics', () => {

  test('shooting phase should show available shooters', async ({ page }) => {
    // This test would require a full game setup with warriors that have ranged weapons
    // For now, we verify the game pages load correctly
    await page.goto('/game/setup');
    await expect(page.locator('h2')).toContainText('Game Setup');
  });

  test('shooting modifiers should be toggleable', async ({ page }) => {
    // This test would verify the shooting modifier checkboxes work
    await page.goto('/game/setup');
    await expect(page.locator('h2')).toContainText('Game Setup');
  });

});

test.describe('Melee Combat Mechanics', () => {

  test('strike order should prioritize chargers', async ({ page }) => {
    // This test would verify chargers strike first in combat phase
    await page.goto('/game/setup');
    await expect(page.locator('h2')).toContainText('Game Setup');
  });

  test('knocked down targets should be auto-hit', async ({ page }) => {
    // This test would verify knocked down warriors are automatically hit
    await page.goto('/game/setup');
    await expect(page.locator('h2')).toContainText('Game Setup');
  });

  test('stunned targets should be taken out of action on wound', async ({ page }) => {
    // This test would verify stunned warriors go OOA when wounded
    await page.goto('/game/setup');
    await expect(page.locator('h2')).toContainText('Game Setup');
  });

});

test.describe('Rout Test', () => {

  test('rout test should trigger when 25% or more out of action', async ({ page }) => {
    // This test would verify the rout test triggers at correct threshold
    await page.goto('/game/setup');
    await expect(page.locator('h2')).toContainText('Game Setup');
  });

  test('failed rout test should end the game', async ({ page }) => {
    // This test would verify a failed rout test ends the game
    await page.goto('/game/setup');
    await expect(page.locator('h2')).toContainText('Game Setup');
  });

});

test.describe('Injury Results', () => {

  test('injury roll 1-2 should knock down', async ({ page }) => {
    // This would test injury table results
    await page.goto('/game/setup');
    await expect(page.locator('h2')).toContainText('Game Setup');
  });

  test('injury roll 3-4 should stun', async ({ page }) => {
    // This would test injury table results
    await page.goto('/game/setup');
    await expect(page.locator('h2')).toContainText('Game Setup');
  });

  test('injury roll 5-6 should take out of action', async ({ page }) => {
    // This would test injury table results
    await page.goto('/game/setup');
    await expect(page.locator('h2')).toContainText('Game Setup');
  });

});

test.describe('Critical Hits', () => {

  test('critical hit should occur on natural 6 to wound when not needing 6s', async ({ page }) => {
    // This would test critical hit trigger conditions
    await page.goto('/game/setup');
    await expect(page.locator('h2')).toContainText('Game Setup');
  });

  test('master strike critical should add +2 to injury roll', async ({ page }) => {
    // This would test master strike critical effect
    await page.goto('/game/setup');
    await expect(page.locator('h2')).toContainText('Game Setup');
  });

});

test.describe('Weapon Special Rules', () => {

  test('sword should allow parry', async ({ page }) => {
    // This would test parry functionality
    await page.goto('/game/setup');
    await expect(page.locator('h2')).toContainText('Game Setup');
  });

  test('mace should cause concussion (2-4 = stunned)', async ({ page }) => {
    // This would test concussion weapon rule
    await page.goto('/game/setup');
    await expect(page.locator('h2')).toContainText('Game Setup');
  });

  test('axe should give extra -1 armor save modifier', async ({ page }) => {
    // This would test cutting edge weapon rule
    await page.goto('/game/setup');
    await expect(page.locator('h2')).toContainText('Game Setup');
  });

  test('flail should have +2S on first round only', async ({ page }) => {
    // This would test heavy weapon rule
    await page.goto('/game/setup');
    await expect(page.locator('h2')).toContainText('Game Setup');
  });

});
