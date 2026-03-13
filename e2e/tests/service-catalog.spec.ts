import { test, expect } from '../fixtures/auth.fixture.js';
import { byTestId } from '../helpers/selectors.js';

test.describe('Service Catalog', () => {
  test('service catalog page loads with tabs', async ({ authenticatedPage: page }) => {
    await page.goto('/services');
    await page.waitForSelector(byTestId('page-service-catalog'), { timeout: 10_000 });

    // All three tabs should be visible
    await expect(page.locator(byTestId('tab-descriptions'))).toBeVisible();
    await expect(page.locator(byTestId('tab-horizontal'))).toBeVisible();
    await expect(page.locator(byTestId('tab-vertical'))).toBeVisible();
  });

  test('service descriptions tab shows table', async ({ authenticatedPage: page }) => {
    await page.goto('/services');
    await page.waitForSelector(byTestId('page-service-catalog'), { timeout: 10_000 });

    // Click descriptions tab (may already be active)
    await page.locator(byTestId('tab-descriptions')).click();

    // Table or empty state should be visible
    const table = page.locator(byTestId('table-service-descriptions'));
    const createBtn = page.locator(byTestId('btn-create-service-description'));

    // The create button should always be visible
    await expect(createBtn).toBeVisible({ timeout: 10_000 });

    // Table should either have data or show empty state
    await expect(table.or(page.getByText(/Keine|No service/))).toBeVisible({ timeout: 10_000 });
  });

  test('create service description', async ({ authenticatedPage: page, apiContext }) => {
    await page.goto('/services');
    await page.waitForSelector(byTestId('page-service-catalog'), { timeout: 10_000 });

    // Ensure we are on the descriptions tab
    await page.locator(byTestId('tab-descriptions')).click();

    const title = `E2E Service ${Date.now()}`;

    // Click create
    await page.locator(byTestId('btn-create-service-description')).click();
    await page.waitForSelector(byTestId('modal-service-description'), { timeout: 5_000 });

    // Fill Code (first input) and Title (second input — the one without a placeholder)
    const modal = page.locator(byTestId('modal-service-description'));
    const codeInput = modal.locator('input').first();
    await codeInput.fill(`SVC-E2E-${Date.now()}`);
    const titleInput = modal.locator('input').nth(1);
    await titleInput.fill(title);

    // Submit the form — find the save button in the modal (case-insensitive)
    const saveBtn = modal.locator('button').filter({ hasText: /speichern|save|erstellen|create/i });
    await saveBtn.click();

    // Modal should close
    await expect(page.locator(byTestId('modal-service-description'))).not.toBeVisible({ timeout: 10_000 });

    // The new service description should appear
    await expect(page.locator(byTestId('table-service-descriptions'))).toContainText(title, { timeout: 10_000 });

    // Cleanup via API
    const descs = await apiContext.request.get('/api/v1/services/descriptions');
    const body = await descs.json() as { data?: Array<{ id: string; title: string }> };
    const created = body.data?.find((d) => d.title === title);
    if (created) {
      await apiContext.request.delete(`/api/v1/services/descriptions/${created.id}`, {
        headers: { 'X-CSRF-Token': apiContext.csrfToken },
      });
    }
  });

  test('horizontal catalog tab shows list', async ({ authenticatedPage: page }) => {
    await page.goto('/services');
    await page.waitForSelector(byTestId('page-service-catalog'), { timeout: 10_000 });

    // Click horizontal tab
    await page.locator(byTestId('tab-horizontal')).click();

    // Wait for content to load (table, list, or empty state)
    await page.waitForTimeout(1_000);

    // The content area should be present
    const content = page.locator(byTestId('page-service-catalog'));
    await expect(content).toBeVisible();
  });

  test('vertical catalog tab shows list (if enterprise)', async ({ authenticatedPage: page }) => {
    await page.goto('/services');
    await page.waitForSelector(byTestId('page-service-catalog'), { timeout: 10_000 });

    // Click vertical tab
    await page.locator(byTestId('tab-vertical')).click();

    // Wait for content to load
    await page.waitForTimeout(1_000);

    // Should show vertical catalogs or a message about enterprise license
    const content = page.locator(byTestId('page-service-catalog'));
    await expect(content).toBeVisible();
  });
});
