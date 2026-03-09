import { test, expect } from '@playwright/test';
import { loginAsAdmin, ADMIN, logout } from './helpers.js';

test.describe('Authentication', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    // Heading should be visible before interaction
    await expect(page.locator('h1').first()).toBeVisible();

    await page.fill('#email', ADMIN.email);
    await page.fill('#password', ADMIN.password);
    await page.click('button[type="submit"]');

    // After login, the app redirects away from /login
    await expect(page).not.toHaveURL(/login/);
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'wrong@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should remain on the login page
    await expect(page).toHaveURL(/login/);
    // Error message div should appear (LoginPage renders it with text-destructive)
    const errorMsg = page
      .locator('.text-destructive, [role="alert"]')
      .first();
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Directly navigate to a protected route without logging in first
    await page.goto('/tickets');
    await expect(page).toHaveURL(/login/);
  });

  test('should stay logged in on page reload', async ({ page }) => {
    await loginAsAdmin(page);
    await page.reload();
    // After reload the app should still be on a protected page
    await expect(page).not.toHaveURL(/login/);
  });

  test('should logout successfully', async ({ page }) => {
    await loginAsAdmin(page);
    await logout(page);
    await expect(page).toHaveURL(/login/);
  });
});
