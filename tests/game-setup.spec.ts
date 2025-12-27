import { test, expect } from '@playwright/test';

test.describe('Game Setup', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display game setup page', async ({ page }) => {
    await page.click('nav a[href="/game/setup"]');
    await expect(page.locator('h2')).toContainText('Game Setup');
  });

  test('should show warband selection', async ({ page }) => {
    await page.goto('/game/setup');

    // Warband selectors should be visible
    await expect(page.locator('text=Player 1 Warband')).toBeVisible();
    await expect(page.locator('text=Player 2 Warband')).toBeVisible();
  });

  test('should show scenario selection', async ({ page }) => {
    await page.goto('/game/setup');

    // Scenario selector card should be visible
    await expect(page.locator('text=Select Scenario')).toBeVisible();
  });

  test('should list scenarios in selector', async ({ page }) => {
    await page.goto('/game/setup');

    // Find the scenario select (it's the one without a label after the warband selects)
    const scenarioSelects = page.locator('select');

    // The third select should be the scenario selector
    // First two are Player 1 and Player 2 warband selectors
    await expect(scenarioSelects.nth(2)).toContainText('Skirmish');
  });

  test('should show scenario info when selected', async ({ page }) => {
    await page.goto('/game/setup');

    // Scenario description should be shown
    await expect(page.locator('.scenario-description')).toBeVisible();
  });

});

test.describe('Rules Reference', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/rules');
  });

  test('should display rules reference page', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Rules Reference');
  });

  test('should show tab navigation buttons', async ({ page }) => {
    // Should have tab buttons for different sections
    await expect(page.locator('button:has-text("Weapons")')).toBeVisible();
    await expect(page.locator('button:has-text("Armor")')).toBeVisible();
    await expect(page.locator('button:has-text("Skills")')).toBeVisible();
    await expect(page.locator('button:has-text("Injuries")')).toBeVisible();
  });

  test('should show weapons reference by default', async ({ page }) => {
    // Weapons tab should be active and showing weapon tables
    await expect(page.locator('text=Melee Weapons')).toBeVisible();
    await expect(page.locator('text=Ranged Weapons')).toBeVisible();
  });

  test('should show armor reference when clicked', async ({ page }) => {
    await page.click('button:has-text("Armor")');
    await expect(page.locator('.card-title:has-text("Armor")')).toBeVisible();
  });

  test('should show skills reference when clicked', async ({ page }) => {
    await page.click('button:has-text("Skills")');
    // Should show skill categories
    await expect(page.locator('text=Combat Skills')).toBeVisible();
  });

  test('should show injuries reference when clicked', async ({ page }) => {
    await page.click('button:has-text("Injuries")');
    await expect(page.locator('text=In-Game Injury Results')).toBeVisible();
    await expect(page.locator('text=Hero Serious Injuries')).toBeVisible();
  });

});
