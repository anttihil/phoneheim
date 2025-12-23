import { test, expect, Page } from '@playwright/test';

// Helper to create a minimal warband for testing via the multi-step form
async function createTestWarband(page: Page, name: string, type: string = 'mercenaries_reikland'): Promise<void> {
  await page.goto('/warband/create');

  // Step 1: Select warband type
  await page.waitForSelector('select', { timeout: 10000 });
  await page.selectOption('select', type);
  await page.click('button:has-text("Next")');

  // Step 2: Name the warband
  await page.waitForSelector('input', { timeout: 10000 });
  await page.fill('input', name);
  await page.click('button:has-text("Next")');

  // Step 3: Recruit warriors - add a Captain (required leader)
  await page.waitForSelector('.recruit-btn', { timeout: 10000 });
  // Click the Captain button
  const captainBtn = page.locator('.recruit-btn:has-text("Captain")');
  if (await captainBtn.isVisible()) {
    await captainBtn.click();
  }
  // Add some warriors
  const warriorBtn = page.locator('.recruit-btn:has-text("Warrior")');
  if (await warriorBtn.count() > 0 && await warriorBtn.first().isVisible()) {
    await warriorBtn.first().click();
    await warriorBtn.first().click();
    await warriorBtn.first().click();
  }
  await page.click('button:has-text("Next")');

  // Step 4: Save
  await page.waitForSelector('button:has-text("Save Warband")', { timeout: 10000 });
  // Wait for validation
  await page.waitForSelector('.success', { timeout: 5000 }).catch(() => {});
  await page.click('button:has-text("Save Warband")');
  await page.waitForURL('/warband/list', { timeout: 10000 });
}

// Helper to start a game with two warbands
async function startGame(page: Page): Promise<void> {
  await page.goto('/game/setup');
  await page.waitForSelector('select', { timeout: 10000 });

  // Select first warband
  const wb1Select = page.locator('select').first();
  await wb1Select.selectOption({ index: 1 });

  // Select second warband
  const wb2Select = page.locator('select').nth(1);
  await wb2Select.selectOption({ index: 1 });

  // Start game
  await page.click('button:has-text("Start Game")');
  await page.waitForURL('/game/play', { timeout: 10000 });
}

test.describe('Recovery Phase Mechanics', () => {
  test.beforeEach(async ({ page }) => {
    // Create two warbands for game
    await createTestWarband(page, 'Test Warband 1');
    await createTestWarband(page, 'Test Warband 2');
  });

  test('should display recovery phase when game starts', async ({ page }) => {
    await startGame(page);

    // Phase indicator should show Setup Phase initially
    const phaseIndicator = page.locator('.phase-indicator');
    await expect(phaseIndicator).toContainText(/Setup Phase/i);

    // Advance to recovery phase (from setup)
    await page.click('button:has-text("Next Phase")');

    // Should show recovery phase indicator
    await expect(phaseIndicator).toContainText(/Recovery/i);
  });

  test('should show warriors during recovery phase', async ({ page }) => {
    await startGame(page);

    // Advance to recovery phase
    await page.click('button:has-text("Next Phase")');

    // Warriors should be displayed with status
    const warriors = page.locator('.warrior-game-status');
    await expect(warriors.first()).toBeVisible();
  });
});

test.describe('Warrior Selection and Actions', () => {
  test.beforeEach(async ({ page }) => {
    await createTestWarband(page, 'Action Test 1');
    await createTestWarband(page, 'Action Test 2');
  });

  test('should show warriors in game', async ({ page }) => {
    await startGame(page);

    // Warriors should be displayed
    const warriors = page.locator('.warrior-game-status');
    await expect(warriors.first()).toBeVisible();
  });

  test('should display warrior status badges', async ({ page }) => {
    await startGame(page);

    // Status badges should be visible
    const statusBadge = page.locator('.status-badge').first();
    await expect(statusBadge).toBeVisible();
  });
});

test.describe('Warrior Action Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await createTestWarband(page, 'Track Test 1');
    await createTestWarband(page, 'Track Test 2');
  });

  test('should track warriors during gameplay', async ({ page }) => {
    await startGame(page);

    // Game should start and warriors should be displayed
    const warriors = page.locator('.warrior-game-status');
    await expect(warriors.first()).toBeVisible();

    // Wounds display should be visible
    const woundsDisplay = page.locator('.wounds-display').first();
    await expect(woundsDisplay).toBeVisible();
  });

  test('should show warriors with wounds remaining', async ({ page }) => {
    await startGame(page);

    // Wounds display should show current wounds
    const woundsDisplay = page.locator('.wounds-display').first();
    await expect(woundsDisplay).toContainText(/Wounds:/);
  });
});

test.describe('Warrior Combat State', () => {
  test.beforeEach(async ({ page }) => {
    await createTestWarband(page, 'Combat Test 1');
    await createTestWarband(page, 'Combat Test 2');
  });

  test('should display combat state for warriors', async ({ page }) => {
    await startGame(page);

    // Warriors should have status badges
    const statusBadge = page.locator('.status-badge').first();
    await expect(statusBadge).toBeVisible();
  });

  test('should show warriors start as standing', async ({ page }) => {
    await startGame(page);

    // Initial status should be standing
    const statusBadge = page.locator('.status-badge').first();
    await expect(statusBadge).toContainText(/standing/i);
  });
});

test.describe('Game Controls', () => {
  test.beforeEach(async ({ page }) => {
    await createTestWarband(page, 'Controls Test 1');
    await createTestWarband(page, 'Controls Test 2');
  });

  test('should have game control buttons', async ({ page }) => {
    await startGame(page);

    // Control buttons should exist
    await expect(page.locator('button:has-text("Next Phase")')).toBeVisible();
    await expect(page.locator('button:has-text("End Game")')).toBeVisible();
  });

  test('should show game log card', async ({ page }) => {
    await startGame(page);

    // Game log card should be visible (contains text "Game Log")
    await expect(page.locator('text=Game Log')).toBeVisible();
  });

  test('should have dice roller button', async ({ page }) => {
    await startGame(page);

    // Dice roller button should be visible
    await expect(page.locator('button:has-text("Roll Dice")')).toBeVisible();
  });

  test('should have undo button', async ({ page }) => {
    await startGame(page);

    // Undo button should be visible
    await expect(page.locator('button:has-text("Undo")')).toBeVisible();
  });
});

test.describe('Game Phase Transitions', () => {
  // Mordheim turn structure: Each phase has both players act before moving to next phase
  // Flow: Recovery (P1→P2) → Movement (P1→P2) → Shooting (P1→P2) → Combat (P1→P2) → Next Turn

  test.beforeEach(async ({ page }) => {
    await createTestWarband(page, 'Phase Test 1');
    await createTestWarband(page, 'Phase Test 2');
  });

  test('should start in setup phase', async ({ page }) => {
    await startGame(page);

    const phaseIndicator = page.locator('.phase-indicator');
    // Phase indicator should show setup initially
    await expect(phaseIndicator).toContainText(/Setup/i);
  });

  test('should alternate players within recovery phase', async ({ page }) => {
    await startGame(page);

    const phaseIndicator = page.locator('.phase-indicator');

    // Advance from setup to recovery P1
    await page.click('button:has-text("Next Phase")');
    await expect(phaseIndicator).toContainText(/Recovery/i);
    await expect(phaseIndicator).toContainText(/Player 1/i);

    // Advance to recovery P2 (same phase, different player)
    await page.click('button:has-text("Next Phase")');
    await expect(phaseIndicator).toContainText(/Recovery/i);
    await expect(phaseIndicator).toContainText(/Player 2/i);
  });

  test('should advance to movement after both players complete recovery', async ({ page }) => {
    await startGame(page);

    const phaseIndicator = page.locator('.phase-indicator');

    // Setup → Recovery P1 → Recovery P2 → Movement P1
    await page.click('button:has-text("Next Phase")'); // Recovery P1
    await page.click('button:has-text("Next Phase")'); // Recovery P2
    await page.click('button:has-text("Next Phase")'); // Movement P1

    await expect(phaseIndicator).toContainText(/Movement/i);
    await expect(phaseIndicator).toContainText(/Player 1/i);
  });

  test('should advance through all phases correctly', async ({ page }) => {
    await startGame(page);

    const phaseIndicator = page.locator('.phase-indicator');

    // Recovery P1
    await page.click('button:has-text("Next Phase")');
    await expect(phaseIndicator).toContainText(/Recovery/i);
    await expect(phaseIndicator).toContainText(/Player 1/i);

    // Recovery P2
    await page.click('button:has-text("Next Phase")');
    await expect(phaseIndicator).toContainText(/Recovery/i);
    await expect(phaseIndicator).toContainText(/Player 2/i);

    // Movement P1
    await page.click('button:has-text("Next Phase")');
    await expect(phaseIndicator).toContainText(/Movement/i);
    await expect(phaseIndicator).toContainText(/Player 1/i);

    // Movement P2
    await page.click('button:has-text("Next Phase")');
    await expect(phaseIndicator).toContainText(/Movement/i);
    await expect(phaseIndicator).toContainText(/Player 2/i);

    // Shooting P1
    await page.click('button:has-text("Next Phase")');
    await expect(phaseIndicator).toContainText(/Shooting/i);
    await expect(phaseIndicator).toContainText(/Player 1/i);

    // Shooting P2
    await page.click('button:has-text("Next Phase")');
    await expect(phaseIndicator).toContainText(/Shooting/i);
    await expect(phaseIndicator).toContainText(/Player 2/i);

    // Combat P1
    await page.click('button:has-text("Next Phase")');
    await expect(phaseIndicator).toContainText(/Combat/i);
    await expect(phaseIndicator).toContainText(/Player 1/i);

    // Combat P2
    await page.click('button:has-text("Next Phase")');
    await expect(phaseIndicator).toContainText(/Combat/i);
    await expect(phaseIndicator).toContainText(/Player 2/i);
  });

  test('should increment turn after combat phase completes for both players', async ({ page }) => {
    await startGame(page);

    const phaseIndicator = page.locator('.phase-indicator');

    // Complete all phases for turn 1 (8 clicks after setup)
    // Recovery P1, Recovery P2, Movement P1, Movement P2, Shooting P1, Shooting P2, Combat P1, Combat P2
    for (let i = 0; i < 8; i++) {
      await page.click('button:has-text("Next Phase")');
    }

    // Should still be turn 1, combat P2
    await expect(phaseIndicator).toContainText(/Turn 1/i);
    await expect(phaseIndicator).toContainText(/Combat/i);
    await expect(phaseIndicator).toContainText(/Player 2/i);

    // One more click to start turn 2
    await page.click('button:has-text("Next Phase")');
    await expect(phaseIndicator).toContainText(/Turn 2/i);
    await expect(phaseIndicator).toContainText(/Recovery/i);
    await expect(phaseIndicator).toContainText(/Player 1/i);
  });
});

test.describe('Warband Display in Game', () => {
  test.beforeEach(async ({ page }) => {
    await createTestWarband(page, 'Display Test 1');
    await createTestWarband(page, 'Display Test 2');
  });

  test('should display both warbands', async ({ page }) => {
    await startGame(page);

    // Should show "Your Warband" section
    await expect(page.locator('text=Your Warband')).toBeVisible();

    // Should show "Opponent" section
    await expect(page.locator('text=Opponent')).toBeVisible();
  });

  test('should show warrior cards for each warband', async ({ page }) => {
    await startGame(page);

    // Warrior cards should be visible
    const warriorCards = page.locator('.warrior-game-status');
    const count = await warriorCards.count();
    expect(count).toBeGreaterThan(0);
  });
});
