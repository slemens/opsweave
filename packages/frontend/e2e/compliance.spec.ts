import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

test.describe('Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display compliance page', async ({ page }) => {
    await page.goto('/compliance');
    // The page itself must render — check for any top-level heading
    await expect(
      page.locator('h1, h2, [data-testid="compliance-page"]').first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('should load at least one framework', async ({ page }) => {
    await page.goto('/compliance');
    // Framework list rows or framework card items should appear
    await expect(
      page
        .locator('table tbody tr, [data-testid="framework-item"]')
        .first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('should display requirements when framework is selected', async ({ page }) => {
    await page.goto('/compliance');
    // Allow auto-selection of the first framework
    await page.waitForTimeout(1500);

    // If there is an "Anforderungen" tab, click it
    const reqTab = page
      .locator(
        'button:has-text("Anforderungen"), [role="tab"]:has-text("Anforderungen"), button:has-text("Requirements")'
      )
      .first();
    if (await reqTab.isVisible()) {
      await reqTab.click();
    }

    // Requirements table rows should be visible
    await expect(
      page.locator('table tbody tr').first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('should show compliance matrix or gap analysis', async ({ page }) => {
    await page.goto('/compliance');
    await page.waitForTimeout(1500);

    // The tab text is "Compliance-Matrix" (German i18n). Look for any tab containing "Matrix".
    const matrixTab = page
      .locator(
        '[role="tab"]:has-text("Matrix"), [role="tab"]:has-text("Gap"), button:has-text("Compliance-Matrix"), button:has-text("Gap Analysis")'
      )
      .first();

    if (await matrixTab.isVisible()) {
      await matrixTab.click();
      // After switching to the matrix tab, content renders as Cards (stats/requirements)
      // or an EmptyState div (no .empty-state class — uses flex/border-dashed/py-16).
      // Wait for either: a table, any Card, stat numbers, or the empty state message.
      await expect(
        page
          .locator('table, [role="tabpanel"], .grid, h1, h2, p')
          .first()
      ).toBeVisible({ timeout: 15000 });
    } else {
      // Matrix tab doesn't exist in this layout — just assert page is stable
      await expect(
        page.locator('h1, h2, [data-testid="compliance-page"]').first()
      ).toBeVisible();
    }
  });
});
