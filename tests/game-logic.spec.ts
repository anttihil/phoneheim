import { test, expect } from '@playwright/test';

// These tests verify the app loads correctly and game modules work

test.describe('App Loading', () => {

  test('should load the app without errors', async ({ page }) => {
    await page.goto('/');

    // Wait for app to initialize
    await page.waitForSelector('#app');

    // The app should load without errors
    await expect(page.locator('#app')).toBeVisible();
    await expect(page.locator('.app-header h1')).toContainText('Phoneheim');
  });

  test('should show main navigation', async ({ page }) => {
    await page.goto('/');

    // Navigation should be visible
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should navigate to home page', async ({ page }) => {
    await page.goto('/');

    // Home page content should be visible
    await expect(page.locator('h2')).toContainText('Welcome');
  });

});

test.describe('Warband Manager Logic', () => {

  test('creating a warband should set correct starting gold', async ({ page }) => {
    await page.goto('/warband/create');

    // Test different warband types and their starting gold
    const warbandGold: Record<string, string> = {
      'mercenaries_reikland': '500',
      'mercenaries_middenheim': '500',
      'mercenaries_marienburg': '600',
      'cult_of_possessed': '500',
      'witch_hunters': '500',
      'undead': '500',
      'skaven': '500'
    };

    for (const [type, gold] of Object.entries(warbandGold)) {
      await page.selectOption('select', type);
      // Check the type-info section for starting gold
      await expect(page.locator('.type-info')).toContainText(`${gold}gc`);
    }
  });

});

test.describe('Routing', () => {

  test('should navigate to warband creation page', async ({ page }) => {
    await page.goto('/warband/create');
    await expect(page.locator('h2')).toContainText('Create New Warband');
  });

  test('should navigate to warband list page', async ({ page }) => {
    await page.goto('/warband/list');
    await expect(page.locator('h2')).toContainText('My Warbands');
  });

  test('should navigate to game setup page', async ({ page }) => {
    await page.goto('/game/setup');
    await expect(page.locator('h2')).toContainText('Game Setup');
  });

  test('should navigate to rules reference page', async ({ page }) => {
    await page.goto('/rules');
    await expect(page.locator('h2')).toContainText('Rules Reference');
  });

  test('should navigate to multiplayer page', async ({ page }) => {
    await page.goto('/multiplayer');
    await expect(page.locator('h2')).toContainText('Multiplayer');
  });

});
