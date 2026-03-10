import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers.js';

test.describe('Tickets', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display ticket list or board', async ({ page }) => {
    await page.goto('/tickets');
    // The default view is a Kanban board (Card-based columns) or a list (table).
    // Board view: cards with role="button" inside column divs
    // List view: a <table> element
    const content = page
      .locator('table, [role="button"], h1, h2')
      .first();
    await expect(content).toBeVisible({ timeout: 15000 });
  });

  test('should navigate to ticket creation page', async ({ page }) => {
    await page.goto('/tickets');
    // Look for the create / new ticket button (navigates to /tickets/new)
    const createBtn = page
      .locator(
        'button:has-text("Neues Ticket"), button:has-text("New Ticket"), button:has-text("Erstellen"), button:has-text("Create"), a:has-text("Neues Ticket"), a:has-text("New Ticket")'
      )
      .first();
    await createBtn.waitFor({ timeout: 15000 });
    await createBtn.click();
    // Should navigate to the ticket creation page
    await expect(page).toHaveURL(/\/tickets\/new/, { timeout: 10000 });
    // The creation page should have a form with a title input
    await expect(page.locator('input, textarea, form').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display ticket detail when clicking a ticket', async ({ page }) => {
    // Use list view for more predictable element selection
    await page.goto('/tickets?view=list');
    // Wait for either a table row (list view) or a card button (board view)
    const clickable = page
      .locator('table tbody tr, [role="button"]')
      .first();
    await clickable.waitFor({ timeout: 15000 });
    await clickable.click();
    // URL must change to /tickets/:id
    await expect(page).toHaveURL(/\/tickets\/.+/, { timeout: 10000 });
    // A heading should be visible on the detail page
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display ticket comment section on detail page', async ({ page }) => {
    // Use list view for more predictable element selection
    await page.goto('/tickets?view=list');
    const clickable = page
      .locator('table tbody tr, [role="button"]')
      .first();
    await clickable.waitFor({ timeout: 15000 });
    await clickable.click();
    await expect(page).toHaveURL(/\/tickets\/.+/, { timeout: 10000 });
    // The detail page has a Tabs component with a "comments" tab that is active by default.
    // It contains a Textarea for adding comments and/or existing comment items.
    const commentArea = page
      .locator('textarea, [data-testid="comment-input"], [data-testid="comments"], [role="tabpanel"]')
      .first();
    await expect(commentArea).toBeVisible({ timeout: 15000 });
  });
});
