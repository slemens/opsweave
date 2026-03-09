import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

test.describe('Tickets', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display ticket list or board', async ({ page }) => {
    await page.goto('/tickets');
    // Either a table (list view) or a Kanban board should be visible
    const content = page
      .locator('table, [data-testid="ticket-board"]')
      .first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('should open ticket creation dialog', async ({ page }) => {
    await page.goto('/tickets');
    // Look for the create / new ticket button
    const createBtn = page
      .locator(
        'button:has-text("Neues Ticket"), button:has-text("New Ticket"), button:has-text("Erstellen"), button:has-text("Create")'
      )
      .first();
    await createBtn.waitFor({ timeout: 10000 });
    await createBtn.click();
    // A dialog should open
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
  });

  test('should display ticket detail when clicking a ticket', async ({ page }) => {
    await page.goto('/tickets');
    // Wait for at least one clickable ticket row / link
    const firstTicketLink = page
      .locator('table tbody tr td a, [data-testid="ticket-row"]')
      .first();
    await firstTicketLink.waitFor({ timeout: 10000 });
    await firstTicketLink.click();
    // URL must change to /tickets/:id
    await expect(page).toHaveURL(/\/tickets\/.+/);
    // A heading should be visible on the detail page
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should display ticket comment section on detail page', async ({ page }) => {
    await page.goto('/tickets');
    const firstTicketLink = page
      .locator('table tbody tr td a, [data-testid="ticket-row"]')
      .first();
    await firstTicketLink.waitFor({ timeout: 10000 });
    await firstTicketLink.click();
    await expect(page).toHaveURL(/\/tickets\/.+/);
    // Comments section or textarea for a new comment should exist
    const commentArea = page
      .locator('textarea, [data-testid="comment-input"], [data-testid="comments"]')
      .first();
    await expect(commentArea).toBeVisible({ timeout: 10000 });
  });
});
