import { test, expect } from '@playwright/test';
import { byTestId } from '../helpers/selectors.js';

// Note: Portal tests do NOT use authenticated fixtures because
// the portal has its own separate auth system for customer users.

test.describe('Portal', () => {
  test('portal login page loads', async ({ page }) => {
    await page.goto('/portal/login');
    await page.waitForSelector(byTestId('page-portal-login'), { timeout: 10_000 });

    // The page should show the OpsWeave branding
    await expect(page.getByText('OpsWeave')).toBeVisible();

    // The "Kundenportal" badge should be visible
    await expect(page.getByText('Kundenportal')).toBeVisible();
  });

  test('portal login form has tenant, email, password fields', async ({ page }) => {
    await page.goto('/portal/login');
    await page.waitForSelector(byTestId('page-portal-login'), { timeout: 10_000 });

    // Form should be visible
    await expect(page.locator(byTestId('form-portal-login'))).toBeVisible();

    // Tenant slug field
    const tenantInput = page.locator(byTestId('input-portal-tenant'));
    await expect(tenantInput).toBeVisible();
    await expect(tenantInput).toHaveAttribute('type', 'text');

    // Email field
    const emailInput = page.locator(byTestId('input-portal-email'));
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');

    // Password field
    const passwordInput = page.locator(byTestId('input-portal-password'));
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Submit button
    const loginBtn = page.locator(byTestId('btn-portal-login'));
    await expect(loginBtn).toBeVisible();

    // Submit button should be disabled when fields are empty
    await expect(loginBtn).toBeDisabled();
  });

  test('portal login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/portal/login');
    await page.waitForSelector(byTestId('page-portal-login'), { timeout: 10_000 });

    // Fill in invalid credentials
    await page.locator(byTestId('input-portal-tenant')).fill('nonexistent-tenant');
    await page.locator(byTestId('input-portal-email')).fill('invalid@example.com');
    await page.locator(byTestId('input-portal-password')).fill('wrongpassword');

    // Submit
    const loginBtn = page.locator(byTestId('btn-portal-login'));
    await expect(loginBtn).toBeEnabled();
    await loginBtn.click();

    // Should show an error message (login will fail against the API)
    const errorMsg = page.locator('.text-destructive, [class*="destructive"]').first();
    await expect(errorMsg).toBeVisible({ timeout: 10_000 });

    // Should still be on the portal login page
    expect(page.url()).toContain('/portal/login');
  });

  test('portal login button disabled when fields are empty', async ({ page }) => {
    await page.goto('/portal/login');
    await page.waitForSelector(byTestId('page-portal-login'), { timeout: 10_000 });

    const loginBtn = page.locator(byTestId('btn-portal-login'));

    // Initially disabled (all fields empty)
    await expect(loginBtn).toBeDisabled();

    // Fill only tenant
    await page.locator(byTestId('input-portal-tenant')).fill('test');
    await expect(loginBtn).toBeDisabled();

    // Fill tenant + email
    await page.locator(byTestId('input-portal-email')).fill('test@test.com');
    await expect(loginBtn).toBeDisabled();

    // Fill all three
    await page.locator(byTestId('input-portal-password')).fill('password');
    await expect(loginBtn).toBeEnabled();
  });
});
