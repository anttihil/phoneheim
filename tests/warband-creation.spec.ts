import { test, expect } from '@playwright/test';

test.describe('Warband Creation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display main navigation', async ({ page }) => {
    // Check all navigation links exist
    await expect(page.locator('nav a[href="/warband/create"]')).toBeVisible();
    await expect(page.locator('nav a[href="/warband/list"]')).toBeVisible();
    await expect(page.locator('nav a[href="/game/setup"]')).toBeVisible();
    await expect(page.locator('nav a[href="/rules"]')).toBeVisible();
  });

  test('should navigate to warband creator', async ({ page }) => {
    await page.click('nav a[href="/warband/create"]');
    await expect(page.locator('h2')).toContainText('Create New Warband');
  });

  test('should show warband type selection in step 1', async ({ page }) => {
    await page.goto('/warband/create');

    // Should show step 1 with warband type selector
    await expect(page.locator('text=Step 1: Choose Warband Type')).toBeVisible();

    // Warband type selector should be visible
    const typeSelect = page.locator('select');
    await expect(typeSelect).toBeVisible();

    // Check some warband types are in the dropdown
    await expect(typeSelect).toContainText('Reikland');
    await expect(typeSelect).toContainText('Middenheim');
    await expect(typeSelect).toContainText('Marienburg');
    await expect(typeSelect).toContainText('Cult of the Possessed');
    await expect(typeSelect).toContainText('Witch Hunters');
    await expect(typeSelect).toContainText('Undead');
    await expect(typeSelect).toContainText('Skaven');
  });

  test('should show warband info when type is selected', async ({ page }) => {
    await page.goto('/warband/create');

    // Select Reikland Mercenaries
    await page.selectOption('select', 'mercenaries_reikland');

    // Type info should be visible with starting gold
    await expect(page.locator('.type-info')).toContainText('500gc');
    await expect(page.locator('.type-info')).toContainText('15');
  });

  test('should proceed to step 2 for name input', async ({ page }) => {
    await page.goto('/warband/create');

    // Select warband type
    await page.selectOption('select', 'mercenaries_reikland');

    // Click next to go to step 2
    await page.click('button:has-text("Next")');

    // Should now show step 2
    await expect(page.locator('text=Step 2: Name Your Warband')).toBeVisible();

    // Name input should be visible
    await expect(page.locator('input')).toBeVisible();
  });

  test('should show treasury in step 3 (recruit warriors)', async ({ page }) => {
    await page.goto('/warband/create');

    // Go through steps
    await page.selectOption('select', 'mercenaries_reikland');
    await page.click('button:has-text("Next")');

    // Enter name in step 2
    await page.fill('input', 'Test Warband');
    await page.click('button:has-text("Next")');

    // Should now be on step 3
    await expect(page.locator('text=Step 3: Recruit Warriors')).toBeVisible();

    // Treasury should be visible
    await expect(page.locator('.treasury-amount')).toContainText('500gc');
  });

});

test.describe('Different Warband Types', () => {

  test('Marienburg should have 600gc starting gold', async ({ page }) => {
    await page.goto('/warband/create');
    await page.selectOption('select', 'mercenaries_marienburg');

    // Check in type info
    await expect(page.locator('.type-info')).toContainText('600gc');
  });

  test('Cult of Possessed should show Magister in step 3', async ({ page }) => {
    await page.goto('/warband/create');
    await page.selectOption('select', 'cult_of_possessed');
    await page.click('button:has-text("Next")');
    await page.fill('input', 'Test Cult');
    await page.click('button:has-text("Next")');

    // Should show Magister in recruit section
    await expect(page.locator('text=Magister')).toBeVisible();
  });

  test('Undead should show Vampire and Necromancer in step 3', async ({ page }) => {
    await page.goto('/warband/create');
    await page.selectOption('select', 'undead');
    await page.click('button:has-text("Next")');
    await page.fill('input', 'Test Undead');
    await page.click('button:has-text("Next")');

    // Should show Vampire and Necromancer
    await expect(page.locator('text=Vampire')).toBeVisible();
    await expect(page.locator('text=Necromancer')).toBeVisible();
  });

});
