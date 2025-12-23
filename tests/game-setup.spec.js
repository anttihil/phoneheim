// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Game Setup', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display game setup page', async ({ page }) => {
    await page.click('[data-page="play-game"]');
    await expect(page.locator('h2')).toContainText('Start a Game');
  });

  test('should show warband selection dropdowns', async ({ page }) => {
    await page.click('[data-page="play-game"]');

    await expect(page.locator('#warband-1')).toBeVisible();
    await expect(page.locator('#warband-2')).toBeVisible();
  });

  test('should show scenario selection options', async ({ page }) => {
    await page.click('[data-page="play-game"]');

    await expect(page.locator('#scenario-method')).toBeVisible();

    // Check default is random
    await expect(page.locator('#scenario-method')).toHaveValue('random');
  });

  test('should show roll button for random scenario', async ({ page }) => {
    await page.click('[data-page="play-game"]');

    // With random selected, roll button should be visible
    await expect(page.locator('#roll-scenario')).toBeVisible();

    // Manual selector should be hidden
    await expect(page.locator('#scenario-select')).toBeHidden();
  });

  test('should show scenario selector when choosing manual', async ({ page }) => {
    await page.click('[data-page="play-game"]');

    await page.selectOption('#scenario-method', 'choose');

    // Manual selector should now be visible
    await expect(page.locator('#scenario-select')).toBeVisible();

    // Roll button should be hidden
    await expect(page.locator('#scenario-roll')).toBeHidden();
  });

  test('should list all scenarios in manual selector', async ({ page }) => {
    await page.click('[data-page="play-game"]');
    await page.selectOption('#scenario-method', 'choose');

    const selector = page.locator('#scenario');
    await expect(selector).toContainText('Defend the Find');
    await expect(selector).toContainText('Skirmish');
    await expect(selector).toContainText('Wyrdstone Hunt');
    await expect(selector).toContainText('Breakthrough');
    await expect(selector).toContainText('Street Fight');
    await expect(selector).toContainText('Chance Encounter');
    await expect(selector).toContainText('Hidden Treasure');
    await expect(selector).toContainText('Occupy');
    await expect(selector).toContainText('Surprise Attack');
  });

  test('should show result when rolling for scenario', async ({ page }) => {
    await page.click('[data-page="play-game"]');

    // Initially result should be empty
    await expect(page.locator('#scenario-result')).toBeEmpty();

    // Click roll button
    await page.click('#roll-scenario');

    // Result should now contain scenario info
    await expect(page.locator('#scenario-result')).not.toBeEmpty();
  });

  test('start button should be hidden until warbands selected', async ({ page }) => {
    await page.click('[data-page="play-game"]');

    // Start section should be hidden
    await expect(page.locator('#game-start-section')).toBeHidden();
  });

});

test.describe('Rules Reference', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-page="rules"]');
  });

  test('should display rules reference page', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Rules Reference');
  });

  test('should show navigation buttons for sections', async ({ page }) => {
    await expect(page.locator('[data-section="shooting"]')).toBeVisible();
    await expect(page.locator('[data-section="combat"]')).toBeVisible();
    await expect(page.locator('[data-section="wounds"]')).toBeVisible();
    await expect(page.locator('[data-section="injuries"]')).toBeVisible();
    await expect(page.locator('[data-section="weapons"]')).toBeVisible();
    await expect(page.locator('[data-section="armor"]')).toBeVisible();
    await expect(page.locator('[data-section="skills"]')).toBeVisible();
  });

  test('should show shooting reference by default', async ({ page }) => {
    await expect(page.locator('#rules-content')).toContainText('Shooting');
    await expect(page.locator('#rules-content')).toContainText('Hit Modifiers');
  });

  test('should show combat reference when clicked', async ({ page }) => {
    await page.click('[data-section="combat"]');
    await expect(page.locator('#rules-content')).toContainText('Close Combat');
    await expect(page.locator('#rules-content')).toContainText('Combat Order');
  });

  test('should show wounds reference when clicked', async ({ page }) => {
    await page.click('[data-section="wounds"]');
    await expect(page.locator('#rules-content')).toContainText('Wound Chart');
    await expect(page.locator('#rules-content')).toContainText('Armor Save Modifiers');
  });

  test('should show injuries reference when clicked', async ({ page }) => {
    await page.click('[data-section="injuries"]');
    await expect(page.locator('#rules-content')).toContainText('Injury Roll');
    await expect(page.locator('#rules-content')).toContainText('Knocked Down');
    await expect(page.locator('#rules-content')).toContainText('Stunned');
    await expect(page.locator('#rules-content')).toContainText('Out of Action');
  });

  test('should show weapons reference when clicked', async ({ page }) => {
    await page.click('[data-section="weapons"]');
    await expect(page.locator('#rules-content')).toContainText('Melee Weapons');
    await expect(page.locator('#rules-content')).toContainText('Ranged Weapons');
    await expect(page.locator('#rules-content')).toContainText('Sword');
    await expect(page.locator('#rules-content')).toContainText('Crossbow');
  });

  test('should show skills reference when clicked', async ({ page }) => {
    await page.click('[data-section="skills"]');
    await expect(page.locator('#rules-content')).toContainText('Combat Skills');
    await expect(page.locator('#rules-content')).toContainText('Shooting Skills');
    await expect(page.locator('#rules-content')).toContainText('Mighty Blow');
    await expect(page.locator('#rules-content')).toContainText('Sprint');
  });

});
