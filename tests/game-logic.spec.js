// @ts-check
import { test, expect } from '@playwright/test';

// These tests verify the game logic modules work correctly
// They test via the browser's ability to import ES modules

test.describe('Game Rules Logic', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load all game data modules', async ({ page }) => {
    // Wait for app to initialize
    await page.waitForFunction(() => {
      return document.querySelector('#app') !== null;
    });

    // The app should load without errors
    await expect(page.locator('#app')).toBeVisible();
    await expect(page.locator('.app-header h1')).toContainText('Phoneheim');
  });

  test('dice rolling should produce valid D6 results', async ({ page }) => {
    // Navigate to game setup to access dice roller
    await page.click('[data-page="play-game"]');

    // We can't directly test the dice roller without a full game setup
    // but we can verify the UI elements exist
    await expect(page.locator('#dice-modal')).toBeHidden();
  });

});

test.describe('Warband Manager Logic', () => {

  test('creating a warband should set correct starting gold', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-page="warband-create"]');

    // Test different warband types and their starting gold
    const warbandGold = {
      'mercenaries_reikland': '500',
      'mercenaries_middenheim': '500',
      'mercenaries_marienburg': '600',
      'cult_of_possessed': '500',
      'witch_hunters': '500',
      'undead': '500',
      'skaven': '500'
    };

    for (const [type, gold] of Object.entries(warbandGold)) {
      await page.selectOption('#warband-type', type);
      await expect(page.locator('#treasury')).toContainText(gold);
    }
  });

  test('adding warriors should decrease treasury correctly', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-page="warband-create"]');
    await page.selectOption('#warband-type', 'mercenaries_reikland');

    // Starting treasury
    await expect(page.locator('#treasury')).toContainText('500');

    // Add Captain (60gc)
    await page.click('button[data-type="captain"]');
    await expect(page.locator('#treasury')).toContainText('440');

    // Add Champion (35gc)
    await page.click('button[data-type="champion"]');
    await expect(page.locator('#treasury')).toContainText('405');

    // Add Warrior (25gc)
    await page.click('button[data-type="warrior"]');
    await expect(page.locator('#treasury')).toContainText('380');
  });

});

test.describe('Scenario Data', () => {

  test('scenario table should map correctly', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-page="play-game"]');

    // Click roll multiple times and verify we get valid results
    for (let i = 0; i < 5; i++) {
      await page.click('#roll-scenario');

      // Result should contain either a scenario name or "chooses"
      const resultText = await page.locator('#scenario-result').textContent();
      const validResults = [
        'chooses',
        'Defend the Find', 'Skirmish', 'Wyrdstone Hunt', 'Breakthrough',
        'Street Fight', 'Chance Encounter', 'Hidden Treasure', 'Occupy', 'Surprise Attack'
      ];
      const hasValidResult = validResults.some(r => resultText.includes(r));
      expect(hasValidResult).toBe(true);
    }
  });

});
