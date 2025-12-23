// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Warband Creation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display main navigation', async ({ page }) => {
    // Check all navigation buttons exist
    await expect(page.locator('[data-page="warband-create"]')).toBeVisible();
    await expect(page.locator('[data-page="warband-list"]')).toBeVisible();
    await expect(page.locator('[data-page="play-game"]')).toBeVisible();
    await expect(page.locator('[data-page="rules"]')).toBeVisible();
  });

  test('should navigate to warband creator', async ({ page }) => {
    await page.click('[data-page="warband-create"]');
    await expect(page.locator('#page-container h2')).toContainText('Create New Warband');
  });

  test('should show warband type selection', async ({ page }) => {
    await page.click('[data-page="warband-create"]');

    // Warband type selector should be visible
    await expect(page.locator('#warband-type')).toBeVisible();

    // Check some warband types are in the dropdown
    await expect(page.locator('#warband-type')).toContainText('Reikland');
    await expect(page.locator('#warband-type')).toContainText('Middenheim');
    await expect(page.locator('#warband-type')).toContainText('Marienburg');
    await expect(page.locator('#warband-type')).toContainText('Cult of the Possessed');
    await expect(page.locator('#warband-type')).toContainText('Witch Hunters');
    await expect(page.locator('#warband-type')).toContainText('Undead');
    await expect(page.locator('#warband-type')).toContainText('Skaven');
  });

  test('should show warband info when type is selected', async ({ page }) => {
    await page.click('[data-page="warband-create"]');

    // Select Reikland Mercenaries
    await page.selectOption('#warband-type', 'mercenaries_reikland');

    // Info should be visible
    await expect(page.locator('#warband-info')).toBeVisible();
    await expect(page.locator('#starting-gold')).toContainText('500');
    await expect(page.locator('#max-warriors')).toContainText('15');
  });

  test('should show name input after selecting type', async ({ page }) => {
    await page.click('[data-page="warband-create"]');

    // Initially name step should be hidden
    await expect(page.locator('#step-name')).toBeHidden();

    // Select warband type
    await page.selectOption('#warband-type', 'mercenaries_reikland');

    // Now name step should be visible
    await expect(page.locator('#step-name')).toBeVisible();
    await expect(page.locator('#warband-name')).toBeVisible();
  });

  test('should show available warriors after selecting type', async ({ page }) => {
    await page.click('[data-page="warband-create"]');
    await page.selectOption('#warband-type', 'mercenaries_reikland');

    // Warriors step should be visible
    await expect(page.locator('#step-warriors')).toBeVisible();

    // Should show Captain (required leader)
    await expect(page.locator('#available-warriors')).toContainText('Captain');

    // Should show other hero types
    await expect(page.locator('#available-warriors')).toContainText('Champion');
    await expect(page.locator('#available-warriors')).toContainText('Youngblood');

    // Should show henchmen
    await expect(page.locator('#available-warriors')).toContainText('Warrior');
    await expect(page.locator('#available-warriors')).toContainText('Marksman');
    await expect(page.locator('#available-warriors')).toContainText('Swordsman');
  });

  test('should add warrior when clicking Add button', async ({ page }) => {
    await page.click('[data-page="warband-create"]');
    await page.selectOption('#warband-type', 'mercenaries_reikland');

    // Initially treasury should be 500
    await expect(page.locator('#treasury')).toContainText('500');

    // Click Add for Captain
    await page.click('button[data-type="captain"]');

    // Treasury should decrease by 60 (Captain cost)
    await expect(page.locator('#treasury')).toContainText('440');

    // Warrior should appear in recruited list
    await expect(page.locator('#warrior-list')).toContainText('Captain');
  });

  test('should validate minimum requirements', async ({ page }) => {
    await page.click('[data-page="warband-create"]');
    await page.selectOption('#warband-type', 'mercenaries_reikland');

    // Without any warriors, should show validation errors
    await expect(page.locator('#validation-messages')).toContainText('at least 3 warriors');
    await expect(page.locator('#validation-messages')).toContainText('must have a');

    // Save button should be disabled
    await expect(page.locator('#save-warband')).toBeDisabled();
  });

  test('should enable save when warband is valid', async ({ page }) => {
    await page.click('[data-page="warband-create"]');
    await page.selectOption('#warband-type', 'mercenaries_reikland');

    // Enter warband name
    await page.fill('#warband-name', 'Test Warband');

    // Add Captain (60gc)
    await page.click('button[data-type="captain"]');

    // Add 2 Warriors (25gc each)
    await page.click('button[data-type="warrior"]');
    await page.click('button[data-type="warrior"]');

    // Should now be valid
    await expect(page.locator('#validation-messages')).toContainText('valid');

    // Save button should be enabled
    await expect(page.locator('#save-warband')).toBeEnabled();
  });

  test('should not allow exceeding type limits', async ({ page }) => {
    await page.click('[data-page="warband-create"]');
    await page.selectOption('#warband-type', 'mercenaries_reikland');

    // Add Captain
    await page.click('button[data-type="captain"]');

    // Try to add another Captain - should fail (max 1)
    page.on('dialog', dialog => dialog.accept());
    await page.click('button[data-type="captain"]');

    // Should still only have 1 captain
    const captains = await page.locator('#warrior-list').locator('text=Captain').count();
    expect(captains).toBe(1);
  });

  test('should remove warrior and refund gold', async ({ page }) => {
    await page.click('[data-page="warband-create"]');
    await page.selectOption('#warband-type', 'mercenaries_reikland');

    // Add Captain (60gc)
    await page.click('button[data-type="captain"]');
    await expect(page.locator('#treasury')).toContainText('440');

    // Remove Captain
    await page.click('button[data-action="remove"]');

    // Treasury should be refunded
    await expect(page.locator('#treasury')).toContainText('500');

    // Warrior list should be empty
    await expect(page.locator('#warrior-list')).toContainText('No warriors');
  });

});

test.describe('Different Warband Types', () => {

  test('Marienburg should have 600gc starting gold', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-page="warband-create"]');
    await page.selectOption('#warband-type', 'mercenaries_marienburg');

    await expect(page.locator('#starting-gold')).toContainText('600');
    await expect(page.locator('#treasury')).toContainText('600');
  });

  test('Witch Hunters should have max 12 warriors', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-page="warband-create"]');
    await page.selectOption('#warband-type', 'witch_hunters');

    await expect(page.locator('#max-warriors')).toContainText('12');
  });

  test('Cult of Possessed should show Magister and Possessed', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-page="warband-create"]');
    await page.selectOption('#warband-type', 'cult_of_possessed');

    await expect(page.locator('#available-warriors')).toContainText('Magister');
    await expect(page.locator('#available-warriors')).toContainText('Possessed');
    await expect(page.locator('#available-warriors')).toContainText('Mutant');
    await expect(page.locator('#available-warriors')).toContainText('Beastmen');
  });

  test('Undead should show Vampire and Necromancer', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-page="warband-create"]');
    await page.selectOption('#warband-type', 'undead');

    await expect(page.locator('#available-warriors')).toContainText('Vampire');
    await expect(page.locator('#available-warriors')).toContainText('Necromancer');
    await expect(page.locator('#available-warriors')).toContainText('Zombie');
    await expect(page.locator('#available-warriors')).toContainText('Ghoul');
  });

});
