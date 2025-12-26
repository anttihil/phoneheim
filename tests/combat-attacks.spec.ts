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

// Helper to skip to movement phase
async function skipToMovementPhase(page: Page): Promise<void> {
  await page.click('button:has-text("Next Phase")'); // Player 1 Setup
  await page.click('button:has-text("Next Phase")'); // Player 2 Setup
  await page.click('button:has-text("Next Phase")'); // Recovery P1
  await page.click('button:has-text("Next Phase")'); // Recovery P2
  // Now in Movement P1
}

// Helper to execute a charge to get warriors in combat
async function executeCharge(page: Page): Promise<void> {
  // Enable show all warriors to see the opponent
  await page.click('button:has-text("Show All Warriors")');

  // Click on a warrior that can act
  const warrior = page.locator('.warrior-game-status.can-act').first();
  await warrior.click();

  // Click Charge
  await page.click('button:has-text("Charge")');

  // Click on a valid target
  const validTarget = page.locator('.warrior-game-status.valid-target').first();
  await validTarget.click();

  // Wait for charge to complete
  const gameLog = page.locator('.game-log');
  await expect(gameLog).toContainText('charges');
}

// Helper to advance to combat phase after a charge
async function advanceToCombatPhase(page: Page): Promise<void> {
  await page.click('button:has-text("Next Phase")'); // Movement P2
  await page.click('button:has-text("Next Phase")'); // Shooting P1
  await page.click('button:has-text("Next Phase")'); // Shooting P2
  await page.click('button:has-text("Next Phase")'); // Now in Combat phase

  // Wait for combat panel to be visible
  await expect(page.locator('.combat-panel')).toBeVisible({ timeout: 10000 });
}

test.describe('Combat Attack Limits', () => {
  test.beforeEach(async ({ page }) => {
    // Create two warbands for testing
    await createTestWarband(page, 'Attack Test Warband 1', 'reikland');
    await createTestWarband(page, 'Attack Test Warband 2', 'reikland');
  });

  test('should display correct attack count in strike order', async ({ page }) => {
    await startGame(page);
    await skipToMovementPhase(page);
    await executeCharge(page);
    await advanceToCombatPhase(page);

    // Check strike order entry shows attack stats
    const strikeOrderEntry = page.locator('.strike-order-entry').first();
    await expect(strikeOrderEntry).toBeVisible();

    // Should show format "A:X/Y" where X is remaining and Y is total
    await expect(strikeOrderEntry).toContainText(/A:\d+\/\d+/);
  });

  test('should show attacks remaining in current fighter section', async ({ page }) => {
    await startGame(page);
    await skipToMovementPhase(page);
    await executeCharge(page);
    await advanceToCombatPhase(page);

    // Check current fighter section shows attacks remaining
    const currentFighterSection = page.locator('.current-fighter-section');
    await expect(currentFighterSection).toBeVisible();
    await expect(currentFighterSection).toContainText(/\d+ attack/);
  });

  test('should decrement attack count after attacking', async ({ page }) => {
    await startGame(page);
    await skipToMovementPhase(page);
    await executeCharge(page);
    await advanceToCombatPhase(page);

    // Get initial attack count from strike order
    const strikeOrderEntry = page.locator('.strike-order-entry.current');
    const initialText = await strikeOrderEntry.textContent();

    // Extract current attacks remaining (format: A:X/Y)
    const initialMatch = initialText?.match(/A:(\d+)\/(\d+)/);
    expect(initialMatch).not.toBeNull();
    const initialRemaining = parseInt(initialMatch![1]);
    const totalAttacks = parseInt(initialMatch![2]);

    // Click attack button
    const attackBtn = page.locator('.melee-target-card button:has-text("Attack")').first();
    await attackBtn.click();

    // Wait for and close the resolution modal (use force to bypass overlay)
    const okBtn = page.locator('button:has-text("OK")');
    await expect(okBtn).toBeVisible({ timeout: 5000 });
    await okBtn.click({ force: true });

    // Wait for modal to close
    await expect(okBtn).not.toBeVisible({ timeout: 5000 });

    // Check attack count decremented - the first fighter should now show 0 remaining
    const firstFighter = page.locator('.strike-order-entry').first();
    await expect(firstFighter).toContainText(`A:${initialRemaining - 1}/${totalAttacks}`);
  });

  test('should auto-advance to next fighter when attacks exhausted', async ({ page }) => {
    await startGame(page);
    await skipToMovementPhase(page);
    await executeCharge(page);
    await advanceToCombatPhase(page);

    // Get current fighter name
    const currentEntry = page.locator('.strike-order-entry.current');
    const currentFighterName = await currentEntry.locator('.fighter-name').textContent();

    // Get attack count
    const entryText = await currentEntry.textContent();
    const attackMatch = entryText?.match(/A:(\d+)\/(\d+)/);
    const attacksRemaining = parseInt(attackMatch![1]);

    // Attack until exhausted
    for (let i = 0; i < attacksRemaining; i++) {
      const attackBtn = page.locator('.melee-target-card button:has-text("Attack")').first();
      if (await attackBtn.isVisible()) {
        await attackBtn.click();

        // Close resolution modal - wait for modal and click the OK button
        const modal = page.locator('.modal-overlay').first();
        await expect(modal).toBeVisible({ timeout: 5000 });
        const okBtn = page.locator('.modal-overlay button:has-text("OK")').first();
        await okBtn.click();
        // Wait a bit for modal to close
        await page.waitForTimeout(500);
      }
    }

    // After exhausting attacks, should have advanced to next fighter OR same fighter should be marked complete
    // Check that either:
    // 1. Current marker moved to different fighter, OR
    // 2. Previous fighter is now marked as completed
    const completedEntry = page.locator('.strike-order-entry.completed');
    const stillCurrent = page.locator('.strike-order-entry.current');

    // Either we advanced (old one is completed) or combat ended
    const completedCount = await completedEntry.count();
    const currentCount = await stillCurrent.count();

    // At least one entry should be completed now, or no more current (combat over)
    expect(completedCount > 0 || currentCount === 0).toBeTruthy();
  });

  test('should mark fighter as completed after exhausting attacks', async ({ page }) => {
    await startGame(page);
    await skipToMovementPhase(page);
    await executeCharge(page);
    await advanceToCombatPhase(page);

    // Get the first fighter's name before attacking
    const firstFighterEntry = page.locator('.strike-order-entry').first();
    const firstFighterName = await firstFighterEntry.locator('.fighter-name').textContent();

    // Get attack count for current fighter
    const currentEntry = page.locator('.strike-order-entry.current');
    const entryText = await currentEntry.textContent();
    const attackMatch = entryText?.match(/A:(\d+)\/(\d+)/);
    const attacksRemaining = parseInt(attackMatch![1]);

    // Attack until exhausted
    for (let i = 0; i < attacksRemaining; i++) {
      const attackBtn = page.locator('.melee-target-card button:has-text("Attack")').first();
      if (await attackBtn.isVisible() && await attackBtn.isEnabled()) {
        await attackBtn.click();

        // Close resolution modal
        const okBtn = page.locator('.modal-overlay button:has-text("OK")').first();
        await expect(okBtn).toBeVisible({ timeout: 5000 });
        await okBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // The first fighter should now be marked as completed (not current)
    const completedEntry = page.locator('.strike-order-entry.completed').first();
    await expect(completedEntry).toContainText(firstFighterName!);

    // And the first entry should show 0 attacks remaining
    await expect(firstFighterEntry).toContainText('A:0/');
  });

  test('should allow choosing different targets for multiple attacks', async ({ page }) => {
    await startGame(page);
    await skipToMovementPhase(page);

    // Execute two charges to get multiple enemies engaged
    await executeCharge(page);

    // Try to charge with another warrior if possible
    const anotherWarrior = page.locator('.warrior-game-status.can-act').first();
    if (await anotherWarrior.isVisible()) {
      await anotherWarrior.click();
      const chargeBtn = page.locator('button:has-text("Charge")');
      if (await chargeBtn.isVisible()) {
        await chargeBtn.click();
        const validTarget = page.locator('.warrior-game-status.valid-target').first();
        if (await validTarget.isVisible()) {
          await validTarget.click();
        }
      }
    }

    await advanceToCombatPhase(page);

    // Check that melee targets section shows available targets
    const meleeTargets = page.locator('.melee-target-card');
    const targetCount = await meleeTargets.count();

    // If there are multiple targets, verify we can see attack buttons for each
    if (targetCount > 1) {
      for (let i = 0; i < targetCount; i++) {
        const targetCard = meleeTargets.nth(i);
        const attackBtn = targetCard.locator('button:has-text("Attack")');
        await expect(attackBtn.first()).toBeVisible();
      }
    }
  });

  test('should not show Actions panel during combat phase', async ({ page }) => {
    await startGame(page);
    await skipToMovementPhase(page);
    await executeCharge(page);
    await advanceToCombatPhase(page);

    // Click on a warrior in the Your Warband section
    const yourWarrior = page.locator('.warriors-in-game .warrior-game-status:not(.opponent)').first();
    await yourWarrior.click();

    // The Actions panel should NOT be visible during combat phase
    const actionsPanel = page.locator('.action-panel');
    await expect(actionsPanel).not.toBeVisible();
  });

  test('should have read-only opponent warriors during combat phase', async ({ page }) => {
    await startGame(page);
    await skipToMovementPhase(page);
    await executeCharge(page);
    await advanceToCombatPhase(page);

    // Enable showing opponent warband if not already visible
    const showAllBtn = page.locator('button:has-text("Show All Warriors")');
    if (await showAllBtn.isVisible()) {
      await showAllBtn.click();
    }

    // Opponent warriors should have read-only class during combat
    const opponentWarrior = page.locator('.warrior-game-status.opponent').first();
    await expect(opponentWarrior).toBeVisible({ timeout: 10000 });
    await expect(opponentWarrior).toHaveClass(/read-only/);
  });

  test('should reset strike order for new turn combat', async ({ page }) => {
    await startGame(page);
    await skipToMovementPhase(page);
    await executeCharge(page);
    await advanceToCombatPhase(page);

    // Complete turn 1 combat - exhaust all attacks or advance through all fighters
    const strikeOrderEntries = page.locator('.strike-order-entry');
    const strikeOrderCount = await strikeOrderEntries.count();

    // Process each fighter in strike order
    for (let i = 0; i < strikeOrderCount; i++) {
      // Check if we have a current fighter with an attack button
      const attackBtn = page.locator('.melee-target-card button:has-text("Attack")').first();
      if (await attackBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Get current fighter's attacks
        const currentEntry = page.locator('.strike-order-entry.current');
        if (await currentEntry.count() > 0) {
          const entryText = await currentEntry.textContent();
          const attackMatch = entryText?.match(/A:(\d+)\/(\d+)/);
          if (attackMatch) {
            const attacksRemaining = parseInt(attackMatch[1]);
            // Attack until exhausted
            for (let j = 0; j < attacksRemaining; j++) {
              const btn = page.locator('.melee-target-card button:has-text("Attack")').first();
              if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
                await btn.click();
                // Close resolution modal
                const okBtn = page.locator('.modal-overlay button:has-text("OK")').first();
                await expect(okBtn).toBeVisible({ timeout: 5000 });
                await okBtn.click();
                await page.waitForTimeout(300);
              }
            }
          }
        }
      }
    }

    // Advance to turn 2 - complete combat phase (both players) then cycle through phases
    await page.click('button:has-text("Next Phase")'); // Combat P2

    // Advance through turn 2 phases: Recovery P1, Recovery P2, Movement P1
    await page.click('button:has-text("Next Phase")'); // Recovery P1
    await page.click('button:has-text("Next Phase")'); // Recovery P2
    await page.click('button:has-text("Next Phase")'); // Movement P1

    // Execute another charge in turn 2
    await page.click('button:has-text("Show All Warriors")').catch(() => {});
    const warrior = page.locator('.warrior-game-status.can-act').first();
    if (await warrior.isVisible({ timeout: 2000 }).catch(() => false)) {
      await warrior.click();
      const chargeBtn = page.locator('button:has-text("Charge")');
      if (await chargeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await chargeBtn.click();
        const validTarget = page.locator('.warrior-game-status.valid-target').first();
        if (await validTarget.isVisible({ timeout: 1000 }).catch(() => false)) {
          await validTarget.click();
        }
      }
    }

    // Advance to turn 2 combat phase
    await page.click('button:has-text("Next Phase")'); // Movement P2
    await page.click('button:has-text("Next Phase")'); // Shooting P1
    await page.click('button:has-text("Next Phase")'); // Shooting P2
    await page.click('button:has-text("Next Phase")'); // Combat P1

    // Verify strike order was rebuilt fresh (has a current fighter, not all completed)
    const combatPanel = page.locator('.combat-panel');
    await expect(combatPanel).toBeVisible({ timeout: 5000 });

    // Either there's a current fighter (combat active) or no combat message (no engagements)
    const hasCurrent = await page.locator('.strike-order-entry.current').count() > 0;
    const noCombatMsg = await page.locator('text=No warriors in combat').isVisible().catch(() => false);
    const combatComplete = await page.locator('text=All combat resolved').isVisible().catch(() => false);

    // If there are warriors in combat, we should have a current fighter, not show "All combat resolved"
    // The bug would show "All combat resolved" even when fighters are present and not yet attacked
    if (!noCombatMsg) {
      // If we have strike order entries, the first one should be current (not completed)
      const turn2Entries = await page.locator('.strike-order-entry').count();
      if (turn2Entries > 0) {
        // Check that not all entries are completed
        const completedCount = await page.locator('.strike-order-entry.completed').count();
        expect(completedCount).toBeLessThan(turn2Entries);
      }
    }
  });
});
