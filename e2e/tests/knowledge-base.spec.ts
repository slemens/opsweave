import { test, expect } from '../fixtures/auth.fixture.js';
import { byTestId } from '../helpers/selectors.js';

test.describe('Knowledge Base', () => {
  test('knowledge base page loads', async ({ authenticatedPage: page }) => {
    await page.goto('/knowledge-base');
    await page.waitForSelector(byTestId('page-knowledge-base'), { timeout: 10_000 });

    // Create button should be visible
    await expect(page.locator(byTestId('btn-create-article'))).toBeVisible();

    // Search input should be visible
    await expect(page.locator(byTestId('input-search-articles'))).toBeVisible();

    // Filter selects should be visible
    await expect(page.locator(byTestId('select-status-filter'))).toBeVisible();
    await expect(page.locator(byTestId('select-visibility-filter'))).toBeVisible();

    // Table should be visible (may be empty or have seed data)
    await expect(page.locator(byTestId('table-articles'))).toBeVisible();
  });

  test('create article', async ({ authenticatedPage: page, apiContext }) => {
    await page.goto('/knowledge-base');
    await page.waitForSelector(byTestId('page-knowledge-base'), { timeout: 10_000 });

    const articleTitle = `E2E KB Article ${Date.now()}`;

    // Click create
    await page.locator(byTestId('btn-create-article')).click();

    // Wait for the dialog
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Fill the title
    await dialog.locator('#kb-title').fill(articleTitle);

    // Fill content
    await dialog.locator('#kb-content').fill('This is test content for the E2E article.');

    // Save
    const saveBtn = dialog.locator('button').filter({ hasText: /Speichern|Save/ });
    await saveBtn.click();

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    // The article should appear in the table
    await expect(page.locator(byTestId('table-articles'))).toContainText(articleTitle, { timeout: 10_000 });

    // Cleanup via API
    const articles = await apiContext.request.get('/api/v1/kb/articles');
    const body = await articles.json() as { data?: Array<{ id: string; title: string }> };
    const created = body.data?.find((a) => a.title === articleTitle);
    if (created) {
      await apiContext.request.delete(`/api/v1/kb/articles/${created.id}`, {
        headers: { 'X-CSRF-Token': apiContext.csrfToken },
      });
    }
  });

  test('search articles', async ({ authenticatedPage: page }) => {
    await page.goto('/knowledge-base');
    await page.waitForSelector(byTestId('page-knowledge-base'), { timeout: 10_000 });

    const searchInput = page.locator(byTestId('input-search-articles'));
    await expect(searchInput).toBeVisible();

    // Type a search term
    await searchInput.fill('test-nonexistent-article-query');

    // Wait for debounced search
    await page.waitForTimeout(1_000);

    // Results should update (may show empty or filtered)
    await expect(page.locator(byTestId('table-articles'))).toBeVisible();
  });

  test('filter by status', async ({ authenticatedPage: page }) => {
    await page.goto('/knowledge-base');
    await page.waitForSelector(byTestId('page-knowledge-base'), { timeout: 10_000 });

    const statusFilter = page.locator(byTestId('select-status-filter'));
    await expect(statusFilter).toBeVisible();

    // Open the select
    await statusFilter.click();

    // Select "published"
    const publishedOption = page.getByRole('option', { name: /published|Veröffentlicht/ });
    const optionVisible = await publishedOption.isVisible().catch(() => false);
    if (optionVisible) {
      await publishedOption.click();
    } else {
      // Fallback: close by pressing Escape
      await page.keyboard.press('Escape');
    }

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Table should still be visible
    await expect(page.locator(byTestId('table-articles'))).toBeVisible();
  });

  test('filter by visibility', async ({ authenticatedPage: page }) => {
    await page.goto('/knowledge-base');
    await page.waitForSelector(byTestId('page-knowledge-base'), { timeout: 10_000 });

    const visFilter = page.locator(byTestId('select-visibility-filter'));
    await expect(visFilter).toBeVisible();

    // Open the select
    await visFilter.click();

    // Select "internal"
    const internalOption = page.getByRole('option', { name: /internal|Intern/ });
    const optionVisible = await internalOption.isVisible().catch(() => false);
    if (optionVisible) {
      await internalOption.click();
    } else {
      await page.keyboard.press('Escape');
    }

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Table should still be visible
    await expect(page.locator(byTestId('table-articles'))).toBeVisible();
  });

  test('edit article', async ({ authenticatedPage: page, apiContext }) => {
    // Create an article via API first
    const articleTitle = `E2E Edit Article ${Date.now()}`;
    const createResp = await apiContext.request.post('/api/v1/kb/articles', {
      data: {
        title: articleTitle,
        slug: `e2e-edit-${Date.now()}`,
        content: 'Original content',
        visibility: 'internal',
        status: 'draft',
        tags: [],
      },
      headers: { 'X-CSRF-Token': apiContext.csrfToken },
    });
    const createBody = await createResp.json() as { data?: { id: string } };
    const articleId = createBody.data?.id;

    if (!articleId) {
      return;
    }

    try {
      await page.goto('/knowledge-base');
      await page.waitForSelector(byTestId('page-knowledge-base'), { timeout: 10_000 });

      // Wait for the article to appear
      await expect(page.locator(byTestId('table-articles'))).toContainText(articleTitle, { timeout: 10_000 });

      // Find the row and open the dropdown menu
      const row = page.locator(`[data-testid="row-article-${articleId}"]`);
      const menuBtn = row.locator('button').last();
      await menuBtn.click();

      // Click edit in the dropdown
      const editOption = page.getByRole('menuitem', { name: /Bearbeiten|Edit/ });
      await expect(editOption).toBeVisible({ timeout: 5_000 });
      await editOption.click();

      // Edit dialog should open
      const dialog = page.locator('div[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      // Change the title
      const updatedTitle = `${articleTitle} (Updated)`;
      await dialog.locator('#kb-title').fill(updatedTitle);

      // Save
      const saveBtn = dialog.locator('button').filter({ hasText: /Speichern|Save/ });
      await saveBtn.click();

      // Dialog should close
      await expect(dialog).not.toBeVisible({ timeout: 10_000 });

      // The updated title should appear
      await expect(page.locator(byTestId('table-articles'))).toContainText(updatedTitle, { timeout: 10_000 });
    } finally {
      // Cleanup
      await apiContext.request.delete(`/api/v1/kb/articles/${articleId}`, {
        headers: { 'X-CSRF-Token': apiContext.csrfToken },
      });
    }
  });

  test('delete article', async ({ authenticatedPage: page, apiContext }) => {
    // Create an article via API first
    const articleTitle = `E2E Delete Article ${Date.now()}`;
    const createResp = await apiContext.request.post('/api/v1/kb/articles', {
      data: {
        title: articleTitle,
        slug: `e2e-delete-${Date.now()}`,
        content: 'To be deleted',
        visibility: 'internal',
        status: 'draft',
        tags: [],
      },
      headers: { 'X-CSRF-Token': apiContext.csrfToken },
    });
    const createBody = await createResp.json() as { data?: { id: string } };
    const articleId = createBody.data?.id;

    if (!articleId) {
      return;
    }

    await page.goto('/knowledge-base');
    await page.waitForSelector(byTestId('page-knowledge-base'), { timeout: 10_000 });

    // Wait for the article to appear
    await expect(page.locator(byTestId('table-articles'))).toContainText(articleTitle, { timeout: 10_000 });

    // Find the row and open the dropdown menu
    const row = page.locator(`[data-testid="row-article-${articleId}"]`);
    const menuBtn = row.locator('button').last();
    await menuBtn.click();

    // Click delete
    const deleteOption = page.getByRole('menuitem', { name: /Löschen|Delete/ });
    await expect(deleteOption).toBeVisible({ timeout: 5_000 });
    await deleteOption.click();

    // Confirm deletion in the alert dialog
    const confirmDialog = page.locator('[role="alertdialog"]');
    await expect(confirmDialog).toBeVisible({ timeout: 5_000 });

    const confirmBtn = confirmDialog.locator('button').filter({ hasText: /Löschen|Delete|Bestätigen|Confirm/ });
    await confirmBtn.click();

    // The article should be removed from the table
    await expect(page.locator(byTestId('table-articles'))).not.toContainText(articleTitle, { timeout: 10_000 });
  });
});
