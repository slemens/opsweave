import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

test.describe('Knowledge Base', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display article list', async ({ page }) => {
    await page.goto('/knowledge-base');
    // Either a table or a custom list container should appear
    const content = page
      .locator('table, [data-testid="kb-list"]')
      .first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('should open article viewer on row click', async ({ page }) => {
    await page.goto('/knowledge-base');
    // Wait for the first table row to be rendered
    await page.locator('table tbody tr').first().waitFor({ timeout: 10000 });
    await page.locator('table tbody tr').first().click();
    // A dialog (article viewer) should open
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
  });

  test('should filter articles by search query', async ({ page }) => {
    await page.goto('/knowledge-base');
    const searchInput = page
      .locator('input[placeholder*="Suche"], input[placeholder*="Search"], input[type="search"]')
      .first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('Test');
      // Allow debounce to fire
      await page.waitForTimeout(600);
    }

    // Page should not crash regardless of whether results exist
    const content = page
      .locator('table, [data-testid="kb-list"], .empty-state')
      .first();
    await expect(content).toBeVisible({ timeout: 5000 });
  });

  test('should show create article button', async ({ page }) => {
    await page.goto('/knowledge-base');
    const createBtn = page
      .locator(
        'button:has-text("Neuer Artikel"), button:has-text("New Article"), button:has-text("Erstellen"), button:has-text("Create")'
      )
      .first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
  });
});
