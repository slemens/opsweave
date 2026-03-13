import { test, expect } from '../fixtures/auth.fixture.js';
import { byTestId } from '../helpers/selectors.js';

test.describe('Navigation', () => {
  test('sidebar shows all main navigation items', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForSelector(byTestId('sidebar'), { timeout: 10_000 });

    const navItems = [
      'sidebar-dashboard',
      'sidebar-tickets',
      'sidebar-assets',
      'sidebar-customers',
      'sidebar-projects',
      'sidebar-workflows',
      'sidebar-services',
      'sidebar-compliance',
      'sidebar-known-errors',
      'sidebar-knowledge-base',
      'sidebar-monitoring',
      'sidebar-reports-sla',
      'sidebar-cab',
      'sidebar-settings',
    ];

    for (const id of navItems) {
      await expect(page.locator(byTestId(id))).toBeVisible();
    }
  });

  test('click sidebar dashboard navigates to /', async ({ authenticatedPage: page }) => {
    await page.goto('/settings');
    await page.waitForSelector(byTestId('sidebar'), { timeout: 10_000 });
    await page.locator(byTestId('sidebar-dashboard')).click();
    await page.waitForURL('/', { timeout: 10_000 });
    expect(page.url()).toMatch(/\/$/);
  });

  test('click sidebar tickets navigates to /tickets', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForSelector(byTestId('sidebar'), { timeout: 10_000 });
    await page.locator(byTestId('sidebar-tickets')).click();
    await page.waitForURL(/\/tickets/, { timeout: 10_000 });
    expect(page.url()).toContain('/tickets');
  });

  test('click sidebar assets navigates to /assets', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForSelector(byTestId('sidebar'), { timeout: 10_000 });
    await page.locator(byTestId('sidebar-assets')).click();
    await page.waitForURL(/\/assets/, { timeout: 10_000 });
    expect(page.url()).toContain('/assets');
  });

  test('click sidebar customers navigates to /customers', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForSelector(byTestId('sidebar'), { timeout: 10_000 });
    await page.locator(byTestId('sidebar-customers')).click();
    await page.waitForURL(/\/customers/, { timeout: 10_000 });
    expect(page.url()).toContain('/customers');
  });

  test('click sidebar projects navigates to /projects', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForSelector(byTestId('sidebar'), { timeout: 10_000 });
    await page.locator(byTestId('sidebar-projects')).click();
    await page.waitForURL(/\/projects/, { timeout: 10_000 });
    expect(page.url()).toContain('/projects');
  });

  test('click sidebar workflows navigates to /workflows', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForSelector(byTestId('sidebar'), { timeout: 10_000 });
    await page.locator(byTestId('sidebar-workflows')).click();
    await page.waitForURL(/\/workflows/, { timeout: 10_000 });
    expect(page.url()).toContain('/workflows');
  });

  test('click sidebar services navigates to /services', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForSelector(byTestId('sidebar'), { timeout: 10_000 });
    await page.locator(byTestId('sidebar-services')).click();
    await page.waitForURL(/\/services/, { timeout: 10_000 });
    expect(page.url()).toContain('/services');
  });

  test('click sidebar compliance navigates to /compliance', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForSelector(byTestId('sidebar'), { timeout: 10_000 });
    await page.locator(byTestId('sidebar-compliance')).click();
    await page.waitForURL(/\/compliance/, { timeout: 10_000 });
    expect(page.url()).toContain('/compliance');
  });

  test('click sidebar knowledge-base navigates to /knowledge-base', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForSelector(byTestId('sidebar'), { timeout: 10_000 });
    await page.locator(byTestId('sidebar-knowledge-base')).click();
    await page.waitForURL(/\/knowledge-base/, { timeout: 10_000 });
    expect(page.url()).toContain('/knowledge-base');
  });

  test('click sidebar monitoring navigates to /monitoring', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForSelector(byTestId('sidebar'), { timeout: 10_000 });
    await page.locator(byTestId('sidebar-monitoring')).click();
    await page.waitForURL(/\/monitoring/, { timeout: 10_000 });
    expect(page.url()).toContain('/monitoring');
  });

  test('click sidebar reports/sla navigates to /reports/sla', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForSelector(byTestId('sidebar'), { timeout: 10_000 });
    await page.locator(byTestId('sidebar-reports-sla')).click();
    await page.waitForURL(/\/reports\/sla/, { timeout: 10_000 });
    expect(page.url()).toContain('/reports/sla');
  });

  test('click sidebar cab navigates to /cab', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForSelector(byTestId('sidebar'), { timeout: 10_000 });
    await page.locator(byTestId('sidebar-cab')).click();
    await page.waitForURL(/\/cab/, { timeout: 10_000 });
    expect(page.url()).toContain('/cab');
  });

  test('click sidebar settings navigates to /settings', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForSelector(byTestId('sidebar'), { timeout: 10_000 });
    await page.locator(byTestId('sidebar-settings')).click();
    await page.waitForURL(/\/settings/, { timeout: 10_000 });
    expect(page.url()).toContain('/settings');
  });

  test('header shows user menu button', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForSelector(byTestId('header'), { timeout: 10_000 });
    await expect(page.locator(byTestId('btn-user-menu'))).toBeVisible();
  });

  test('header theme toggle opens dropdown and switches theme', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForSelector(byTestId('header'), { timeout: 10_000 });

    const themeBtn = page.locator(byTestId('btn-theme-toggle'));
    await expect(themeBtn).toBeVisible();
    await themeBtn.click();

    // The dropdown should appear with theme options
    const darkOption = page.getByText('Dark').or(page.getByText('Dunkel'));
    await expect(darkOption.first()).toBeVisible({ timeout: 5_000 });
    await darkOption.first().click();

    // The html element should have the dark class applied
    await expect(page.locator('html.dark')).toBeAttached({ timeout: 5_000 });

    // Switch back to light
    await themeBtn.click();
    const lightOption = page.getByText('Light').or(page.getByText('Hell'));
    await expect(lightOption.first()).toBeVisible({ timeout: 5_000 });
    await lightOption.first().click();
  });

  test('header language toggle switches language', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForSelector(byTestId('header'), { timeout: 10_000 });

    const langBtn = page.locator(byTestId('btn-language-toggle'));
    await expect(langBtn).toBeVisible();

    // Get initial text — should be DE or EN
    const initialText = await langBtn.textContent();

    // Click to toggle
    await langBtn.click();

    // After toggle, the button text should change
    await expect(langBtn).not.toHaveText(initialText ?? '', { timeout: 5_000 });
  });

  test('header notifications button exists', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForSelector(byTestId('header'), { timeout: 10_000 });
    await expect(page.locator(byTestId('btn-notifications'))).toBeVisible();
  });

  test('header global search input exists', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForSelector(byTestId('header'), { timeout: 10_000 });
    await expect(page.locator(byTestId('input-global-search'))).toBeVisible();
  });

  test('sidebar collapse/expand toggle works', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForSelector(byTestId('sidebar'), { timeout: 10_000 });

    const sidebar = page.locator(byTestId('sidebar'));
    const toggleBtn = page.locator(byTestId('btn-sidebar-toggle'));

    // Sidebar starts expanded (w-64)
    await expect(sidebar).toHaveClass(/w-64/);

    // Click collapse
    await toggleBtn.click();

    // Sidebar should now be collapsed (w-16)
    await expect(sidebar).toHaveClass(/w-16/);

    // Click expand
    await toggleBtn.click();

    // Sidebar should be expanded again
    await expect(sidebar).toHaveClass(/w-64/);
  });

  test('404 page shown for unknown routes', async ({ authenticatedPage: page }) => {
    await page.goto('/this-route-does-not-exist-ever');
    // Should show some kind of 404 or "not found" content
    // The page should not redirect to login (we are authenticated)
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
    // The 404 route is outside the ProtectedLayout (no sidebar).
    // Verify the page shows "not found" or "404" content.
    const notFoundText = page.getByText(/not found|404|seite nicht gefunden/i).first();
    await expect(notFoundText).toBeVisible({ timeout: 10_000 });
  });

  test('dashboard page loads with stat cards', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForSelector(byTestId('page-dashboard'), { timeout: 10_000 });

    // Stat cards should be visible
    await expect(page.locator(byTestId('card-stat-dashboard-open_tickets'))).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(byTestId('card-stat-dashboard-sla_breaches'))).toBeVisible();
    await expect(page.locator(byTestId('card-stat-dashboard-assets_total'))).toBeVisible();
    await expect(page.locator(byTestId('card-stat-dashboard-pending_changes'))).toBeVisible();
  });
});
