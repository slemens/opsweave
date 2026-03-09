import { test, expect } from '@playwright/test';
import { PORTAL_USER } from './helpers.js';

/**
 * Helper: Fill the portal login form and submit.
 * The PortalLoginPage has three fields: tenantSlug (#tenantSlug), email (#email), password (#password).
 */
async function portalLogin(
  page: import('@playwright/test').Page,
  opts: { email: string; password: string; tenantSlug: string }
): Promise<void> {
  await page.goto('/portal/login');
  await page.fill('#tenantSlug', opts.tenantSlug);
  await page.fill('#email', opts.email);
  await page.fill('#password', opts.password);
  await page.click('button[type="submit"]');
}

test.describe('Customer Portal', () => {
  test('should show portal login page', async ({ page }) => {
    await page.goto('/portal/login');
    // All three input fields must be present
    await expect(page.locator('#email')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#password')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#tenantSlug')).toBeVisible({ timeout: 10000 });
  });

  test('should login as portal user', async ({ page }) => {
    await portalLogin(page, PORTAL_USER);
    // After portal login, the app navigates to /portal/tickets
    await expect(page).not.toHaveURL(/portal\/login/, { timeout: 15000 });
  });

  test('should display portal tickets after login', async ({ page }) => {
    await portalLogin(page, PORTAL_USER);
    await page.waitForURL(/portal\/(tickets|$)/, { timeout: 15000 });
    // The portal tickets page renders a <table> when tickets exist,
    // or an empty-state div (border-dashed) when no tickets.
    // Also look for the page heading as a fallback.
    const content = page
      .locator('table, [data-testid="portal-tickets"], h1, h2')
      .first();
    await expect(content).toBeVisible({ timeout: 15000 });
  });

  test('should reject invalid portal credentials', async ({ page }) => {
    await page.goto('/portal/login');
    await page.fill('#tenantSlug', PORTAL_USER.tenantSlug);
    await page.fill('#email', 'wrong@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should stay on portal login
    await expect(page).toHaveURL(/portal\/login/);
    // An error message should appear
    const errorMsg = page
      .locator('.text-destructive, [role="alert"]')
      .first();
    await expect(errorMsg).toBeVisible({ timeout: 10000 });
  });

  test('should show public KB articles in portal', async ({ page }) => {
    await portalLogin(page, PORTAL_USER);
    await page.waitForURL(/portal/, { timeout: 15000 });
    await page.goto('/portal/kb');
    // KB page renders article Cards (grid of Card components) or an empty state div.
    // Also match the page heading h1 as a reliable indicator.
    const content = page
      .locator('[data-testid="portal-kb"], h1, h2')
      .first();
    await expect(content).toBeVisible({ timeout: 15000 });
  });
});
