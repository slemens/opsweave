import { test, expect } from '@playwright/test';
import { checkHealth, login } from '../helpers/api.js';

test.describe('Smoke Tests', () => {
  test('health endpoint returns 200', async () => {
    const healthy = await checkHealth();
    expect(healthy).toBe(true);
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);

    // The login page should contain email and password fields
    const emailField = page.locator('input[type="email"], input[name="email"]');
    const passwordField = page.locator('input[type="password"], input[name="password"]');

    await expect(emailField).toBeVisible();
    await expect(passwordField).toBeVisible();
  });

  test('login with valid credentials works', async ({ page }) => {
    await page.goto('/login');

    // Fill in credentials
    const emailField = page.locator('input[type="email"], input[name="email"]');
    const passwordField = page.locator('input[type="password"], input[name="password"]');

    await emailField.fill('admin@opsweave.local');
    await passwordField.fill('changeme');

    // Submit the form
    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Login"), button:has-text("Anmelden")',
    );
    await submitButton.click();

    // After login, should redirect away from login page
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 10_000,
    });

    // Should not be on login anymore
    expect(page.url()).not.toContain('/login');
  });

  test('dashboard is shown after login', async ({ page }) => {
    await page.goto('/login');

    // Perform login
    const emailField = page.locator('input[type="email"], input[name="email"]');
    const passwordField = page.locator('input[type="password"], input[name="password"]');

    await emailField.fill('admin@opsweave.local');
    await passwordField.fill('changeme');

    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Login"), button:has-text("Anmelden")',
    );
    await submitButton.click();

    // Wait for navigation to complete
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 10_000,
    });

    // Verify the main app layout is present (sidebar, header, or dashboard content)
    const mainLayout = page.locator(
      '[data-testid="sidebar"], [data-testid="main-content"], nav, aside',
    );
    await expect(mainLayout.first()).toBeVisible({ timeout: 10_000 });
  });

  test('login via API returns valid cookies', async () => {
    const auth = await login();

    expect(auth.tokenCookie).toBeTruthy();
    expect(auth.csrfToken).toBeTruthy();
    expect(auth.user).toBeDefined();
  });

  test('unauthenticated access redirects to login', async ({ page }) => {
    // Clear any existing cookies
    await page.context().clearCookies();

    // Navigate to a protected route
    await page.goto('/');

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });
});
