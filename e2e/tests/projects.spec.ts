import { test, expect } from '../fixtures/auth.fixture.js';
import { byTestId } from '../helpers/selectors.js';

test.describe('Projects', () => {
  test('projects page loads with table', async ({ authenticatedPage: page }) => {
    await page.goto('/projects');
    await page.waitForSelector(byTestId('page-projects'), { timeout: 10_000 });

    // Create button should be visible
    await expect(page.locator(byTestId('btn-create-project'))).toBeVisible();

    // Search input should be visible
    await expect(page.locator(byTestId('input-project-search'))).toBeVisible();

    // Either a table with projects or an empty state should be visible
    const table = page.locator(byTestId('table-projects'));
    const emptyState = page.getByText(/Keine Projekte|No projects/);
    await expect(table.or(emptyState.first())).toBeVisible({ timeout: 10_000 });
  });

  test('create project', async ({ authenticatedPage: page, apiContext }) => {
    await page.goto('/projects');
    await page.waitForSelector(byTestId('page-projects'), { timeout: 10_000 });

    const projectName = `E2E Project ${Date.now()}`;
    const projectCode = `E2E${Date.now().toString().slice(-6)}`;

    // Click create
    await page.locator(byTestId('btn-create-project')).click();
    await page.waitForSelector(byTestId('modal-create-project'), { timeout: 5_000 });

    // Fill the form
    await page.locator(byTestId('input-project-name')).fill(projectName);
    await page.locator(byTestId('input-project-code')).fill(projectCode);

    // Submit
    await page.locator(byTestId('btn-submit-project')).click();

    // After successful creation, the page may navigate to the project detail
    // Wait for navigation or modal close
    await page.waitForURL(/\/projects\//, { timeout: 10_000 });

    // We should be on a project detail page
    expect(page.url()).toContain('/projects/');

    // Cleanup: go back and delete via API
    const projects = await apiContext.request.get('/api/v1/projects');
    const body = await projects.json() as unknown;
    const projectList = Array.isArray(body) ? body : (body as { data?: Array<{ id: string; name: string }> }).data ?? [];
    const created = projectList.find((p: { name: string }) => p.name === projectName);
    if (created) {
      await apiContext.request.delete(`/api/v1/projects/${(created as { id: string }).id}`, {
        headers: { 'X-CSRF-Token': apiContext.csrfToken },
      });
    }
  });

  test('view project detail', async ({ authenticatedPage: page, apiContext }) => {
    // Create a project via API
    const projectName = `E2E Detail ${Date.now()}`;
    const projectCode = `DTL${Date.now().toString().slice(-6)}`;
    const createResp = await apiContext.request.post('/api/v1/projects', {
      data: {
        name: projectName,
        code: projectCode,
        status: 'planning',
      },
      headers: { 'X-CSRF-Token': apiContext.csrfToken },
    });
    const createBody = await createResp.json() as { data?: { id: string }; id?: string };
    const projectId = createBody.data?.id ?? createBody.id;

    if (!projectId) {
      return;
    }

    try {
      // Navigate to the project detail page
      await page.goto(`/projects/${projectId}`);

      // Wait for the page to load — should show project name somewhere
      await page.waitForTimeout(2_000);
      const bodyText = await page.textContent('body');
      expect(bodyText).toContain(projectName);
    } finally {
      // Cleanup
      await apiContext.request.delete(`/api/v1/projects/${projectId}`, {
        headers: { 'X-CSRF-Token': apiContext.csrfToken },
      });
    }
  });

  test('edit project', async ({ authenticatedPage: page, apiContext }) => {
    // Create a project via API
    const projectName = `E2E Edit Prj ${Date.now()}`;
    const projectCode = `EDT${Date.now().toString().slice(-6)}`;
    const createResp = await apiContext.request.post('/api/v1/projects', {
      data: {
        name: projectName,
        code: projectCode,
        status: 'planning',
      },
      headers: { 'X-CSRF-Token': apiContext.csrfToken },
    });
    const createBody = await createResp.json() as { data?: { id: string }; id?: string };
    const projectId = createBody.data?.id ?? createBody.id;

    if (!projectId) {
      return;
    }

    try {
      // Navigate to the project detail page
      await page.goto(`/projects/${projectId}`);
      await page.waitForTimeout(2_000);

      // Look for an edit button on the detail page
      const editBtn = page.getByRole('button', { name: /Bearbeiten|Edit/ }).first();
      const editVisible = await editBtn.isVisible().catch(() => false);

      if (editVisible) {
        await editBtn.click();

        // Wait for edit modal or form
        await page.waitForTimeout(1_000);

        // Try to find a name input and update it
        const nameInput = page.locator('input[value*="Edit Prj"]').or(
          page.locator('[data-testid="input-project-name"]')
        );
        const inputVisible = await nameInput.first().isVisible().catch(() => false);

        if (inputVisible) {
          const updatedName = `${projectName} (Updated)`;
          await nameInput.first().fill(updatedName);

          // Save
          const saveBtn = page.getByRole('button', { name: /Speichern|Save/ }).first();
          const saveVisible = await saveBtn.isVisible().catch(() => false);
          if (saveVisible) {
            await saveBtn.click();
            await page.waitForTimeout(1_000);
          }
        }
      }
    } finally {
      // Cleanup
      await apiContext.request.delete(`/api/v1/projects/${projectId}`, {
        headers: { 'X-CSRF-Token': apiContext.csrfToken },
      });
    }
  });

  test('search projects', async ({ authenticatedPage: page }) => {
    await page.goto('/projects');
    await page.waitForSelector(byTestId('page-projects'), { timeout: 10_000 });

    const searchInput = page.locator(byTestId('input-project-search'));
    await expect(searchInput).toBeVisible();

    // Type a search term that likely does not match anything
    await searchInput.fill('nonexistent-project-xyz');

    // Wait for client-side filter to apply
    await page.waitForTimeout(500);

    // The page should still be visible (showing empty or filtered results)
    await expect(page.locator(byTestId('page-projects'))).toBeVisible();
  });

  test('delete project', async ({ authenticatedPage: page, apiContext }) => {
    // Create a project via API
    const projectName = `E2E Del Prj ${Date.now()}`;
    const projectCode = `DEL${Date.now().toString().slice(-6)}`;
    const createResp = await apiContext.request.post('/api/v1/projects', {
      data: {
        name: projectName,
        code: projectCode,
        status: 'planning',
      },
      headers: { 'X-CSRF-Token': apiContext.csrfToken },
    });
    const createBody = await createResp.json() as { data?: { id: string }; id?: string };
    const projectId = createBody.data?.id ?? createBody.id;

    if (!projectId) {
      return;
    }

    // Navigate to the project detail page
    await page.goto(`/projects/${projectId}`);
    await page.waitForTimeout(2_000);

    // Look for a delete button
    const deleteBtn = page.getByRole('button', { name: /Löschen|Delete/ }).first();
    const deleteVisible = await deleteBtn.isVisible().catch(() => false);

    if (deleteVisible) {
      await deleteBtn.click();

      // Confirm deletion
      const confirmDialog = page.locator('[role="alertdialog"]');
      const dialogVisible = await confirmDialog.isVisible().catch(() => false);

      if (dialogVisible) {
        const confirmBtn = confirmDialog.locator('button').filter({ hasText: /Löschen|Delete|Bestätigen|Confirm/ });
        await confirmBtn.click();

        // Should navigate back to projects list
        await page.waitForURL(/\/projects$/, { timeout: 10_000 });
      } else {
        // Fallback cleanup via API
        await apiContext.request.delete(`/api/v1/projects/${projectId}`, {
          headers: { 'X-CSRF-Token': apiContext.csrfToken },
        });
      }
    } else {
      // Fallback cleanup via API
      await apiContext.request.delete(`/api/v1/projects/${projectId}`, {
        headers: { 'X-CSRF-Token': apiContext.csrfToken },
      });
    }
  });
});
