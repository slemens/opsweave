import { Page } from '@playwright/test';

export const BASE_URL = process.env['E2E_BASE_URL'] ?? 'http://localhost:5173';

export const ADMIN = {
  email: 'admin@opsweave.local',
  password: 'changeme',
  tenantSlug: 'demo-org',
};

export const PORTAL_USER = {
  email: 'portal@acme.example.com',
  password: 'changeme',
  tenantSlug: 'demo-org',
};

/**
 * Log in as the admin user.
 * Waits for the post-login redirect (dashboard or root) before returning.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  // The LoginPage uses id="email" and id="password" (see LoginPage.tsx)
  await page.fill('#email', ADMIN.email);
  await page.fill('#password', ADMIN.password);
  await page.click('button[type="submit"]');
  // After successful login, navigate() pushes '/' — wait for that redirect
  await page.waitForURL(/\/(tickets|assets|dashboard|compliance|settings|knowledge-base|monitoring|services|workflows)?$/);
}

/**
 * Log out the currently authenticated user.
 * Tries data-testid first, then falls back to clearing session storage.
 */
export async function logout(page: Page): Promise<void> {
  const logoutBtn = page
    .locator('[data-testid="logout"], button:has-text("Abmelden"), button:has-text("Logout")')
    .first();

  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
  } else {
    // Fallback: wipe auth state and navigate to login
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/login');
  }
}
