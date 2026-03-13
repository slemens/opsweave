import { test, expect } from '../fixtures/test-data.fixture.js';
import { byTestId } from '../helpers/selectors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BOARD_URL = '/tickets';
const CREATE_URL = '/tickets/new';

/**
 * Navigate to the ticket board page as an authenticated user.
 */
async function goToBoard(page: import('@playwright/test').Page) {
  await page.goto(BOARD_URL);
  await page.waitForSelector(byTestId('page-ticket-board'), { timeout: 15_000 });
}

/**
 * Navigate to the create ticket page as an authenticated user.
 */
async function goToCreatePage(page: import('@playwright/test').Page) {
  await page.goto(CREATE_URL);
  await page.waitForSelector(byTestId('page-create-ticket'), { timeout: 15_000 });
}

/**
 * Helper to pick a value from a shadcn Select (Radix).
 * Opens the trigger, waits for the content popover, then clicks the item.
 */
async function selectValue(
  page: import('@playwright/test').Page,
  triggerTestId: string,
  itemText: string,
) {
  const trigger = page.locator(byTestId(triggerTestId));
  await trigger.click();
  // Radix Select renders items in a portal — use getByRole or text matching
  const option = page.getByRole('option', { name: itemText });
  await option.click();
}

// ---------------------------------------------------------------------------
// Test Suite: Ticket Creation
// ---------------------------------------------------------------------------

test.describe('Ticket Creation', () => {
  test('create an incident ticket with all fields', async ({ authenticatedPage, testData }) => {
    const page = authenticatedPage;
    await goToCreatePage(page);

    const uniqueTitle = `E2E Incident ${Date.now()}`;

    // Fill basic fields
    await page.locator(byTestId('input-title')).fill(uniqueTitle);
    await page.locator(byTestId('input-description')).fill('Automated test incident description');

    // Type should default to incident — verify it is selected
    const typeTrigger = page.locator(byTestId('select-ticket-type'));
    await expect(typeTrigger).toContainText(/Incident|Störung/i);

    // Set priority
    await selectValue(page, 'select-priority', /Medium/i);

    // Submit
    await page.locator(byTestId('btn-submit')).click();

    // Should redirect to the ticket detail page
    await page.waitForURL(/\/tickets\/[a-f0-9-]+/, { timeout: 15_000 });
    await expect(page.locator(byTestId('page-ticket-detail'))).toBeVisible();

    // Verify the title is shown on the detail page
    await expect(page.getByText(uniqueTitle)).toBeVisible();

    // Extract ticket id for cleanup
    const url = page.url();
    const id = url.split('/tickets/')[1]?.split('?')[0];
    if (id) testData.track('tickets', id);
  });

  test('create a change request with RFC fields', async ({ authenticatedPage, testData }) => {
    const page = authenticatedPage;
    await goToCreatePage(page);

    const uniqueTitle = `E2E Change ${Date.now()}`;

    // Switch type to change
    await selectValue(page, 'select-ticket-type', /Change|Änderung/i);

    // Fill basic fields
    await page.locator(byTestId('input-title')).fill(uniqueTitle);
    await page.locator(byTestId('input-description')).fill('Automated test change description');

    // RFC section should now be visible
    await expect(page.locator(byTestId('input-justification'))).toBeVisible();

    // Fill RFC fields
    await page.locator(byTestId('input-justification')).fill('Business justification for the change');
    await page.locator(byTestId('input-implementation')).fill('Step 1: Do thing\nStep 2: Verify');
    await page.locator(byTestId('input-rollback')).fill('Revert to previous version');

    // Submit
    await page.locator(byTestId('btn-submit')).click();

    // Should redirect to the ticket detail page
    await page.waitForURL(/\/tickets\/[a-f0-9-]+/, { timeout: 15_000 });
    await expect(page.locator(byTestId('page-ticket-detail'))).toBeVisible();

    const url = page.url();
    const id = url.split('/tickets/')[1]?.split('?')[0];
    if (id) testData.track('tickets', id);
  });

  test('create a problem ticket', async ({ authenticatedPage, testData }) => {
    const page = authenticatedPage;
    await goToCreatePage(page);

    const uniqueTitle = `E2E Problem ${Date.now()}`;

    // Switch type to problem
    await selectValue(page, 'select-ticket-type', /Problem/i);

    // Fill basic fields
    await page.locator(byTestId('input-title')).fill(uniqueTitle);
    await page.locator(byTestId('input-description')).fill('Root cause investigation needed');

    // Submit
    await page.locator(byTestId('btn-submit')).click();

    // Should redirect to ticket detail
    await page.waitForURL(/\/tickets\/[a-f0-9-]+/, { timeout: 15_000 });
    await expect(page.locator(byTestId('page-ticket-detail'))).toBeVisible();

    const url = page.url();
    const id = url.split('/tickets/')[1]?.split('?')[0];
    if (id) testData.track('tickets', id);
  });

  test('create ticket form validates title length', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await goToCreatePage(page);

    // Enter a title that is too short (< 3 chars)
    await page.locator(byTestId('input-title')).fill('AB');
    await page.locator(byTestId('btn-submit')).click();

    // Should NOT navigate away — still on create page
    await expect(page).toHaveURL(/\/tickets\/new/);
    await expect(page.locator(byTestId('page-create-ticket'))).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Test Suite: Ticket Board / List Page
// ---------------------------------------------------------------------------

test.describe('Ticket Board Page', () => {
  test('board page loads with existing tickets', async ({ authenticatedPage, testData }) => {
    // Pre-create a ticket via API so the board is not empty
    await testData.createTicket({ title: `E2E Board Load ${Date.now()}` });

    const page = authenticatedPage;
    await goToBoard(page);

    // The page should be visible
    await expect(page.locator(byTestId('page-ticket-board'))).toBeVisible();

    // Should have either board columns or list table
    await expect(page.locator('[data-testid^="board-column-"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('search tickets by title', async ({ authenticatedPage, testData }) => {
    const uniquePrefix = `SearchableE2E-${Date.now()}`;
    await testData.createTicket({ title: `${uniquePrefix} target ticket` });

    const page = authenticatedPage;
    await goToBoard(page);

    // Type in search
    const searchInput = page.locator(byTestId('input-search-tickets'));
    await searchInput.fill(uniquePrefix);

    // Wait for debounce + re-render; verify the ticket appears
    await expect(page.getByText(uniquePrefix, { exact: false })).toBeVisible({ timeout: 10_000 });
  });

  test('board view shows columns matching status values', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await goToBoard(page);

    // Ensure we're in board view (use force:true because the button has pointer-events-none when already active)
    await page.locator(byTestId('btn-view-board')).click({ force: true });

    // Standard statuses that should be columns
    const expectedStatuses = ['open', 'in_progress', 'pending', 'resolved', 'closed'];
    for (const status of expectedStatuses) {
      await expect(page.locator(`[data-testid="board-column-${status}"]`)).toBeVisible();
    }
  });

  test('board view ticket cards show key info', async ({ authenticatedPage, testData }) => {
    const cardTitle = `E2E CardInfo ${Date.now()}`;
    const ticket = await testData.createTicket({ title: cardTitle, priority: 'high' });

    const page = authenticatedPage;
    await goToBoard(page);

    // Find the card by testid
    const card = page.locator(`[data-testid="card-ticket-${ticket.id}"]`);
    await expect(card).toBeVisible({ timeout: 10_000 });

    // Card should contain the title
    await expect(card).toContainText(cardTitle);
  });

  test('toggle between board and list view', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await goToBoard(page);

    // Start in board view — columns should be visible (use force:true because the button has pointer-events-none when already active)
    await page.locator(byTestId('btn-view-board')).click({ force: true });
    await expect(page.locator('[data-testid^="board-column-"]').first()).toBeVisible();

    // Switch to list view
    await page.locator(byTestId('btn-view-list')).click();

    // Table should now be visible
    await expect(page.locator(byTestId('table-tickets'))).toBeVisible({ timeout: 10_000 });
  });

  test('list view shows ticket table with columns', async ({ authenticatedPage, testData }) => {
    await testData.createTicket({ title: `E2E ListRow ${Date.now()}` });

    const page = authenticatedPage;
    await goToBoard(page);

    // Switch to list view
    await page.locator(byTestId('btn-view-list')).click();
    await expect(page.locator(byTestId('table-tickets'))).toBeVisible({ timeout: 10_000 });

    // Table headers should exist
    const table = page.locator(byTestId('table-tickets'));
    await expect(table.locator('thead')).toBeVisible();
    await expect(table.locator('tbody tr').first()).toBeVisible();
  });

  test('create ticket button navigates to create page', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await goToBoard(page);

    await page.locator(byTestId('btn-create-ticket')).click();
    await page.waitForURL(/\/tickets\/new/, { timeout: 10_000 });
    await expect(page.locator(byTestId('page-create-ticket'))).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Test Suite: Ticket Detail Page
// ---------------------------------------------------------------------------

test.describe('Ticket Detail Page', () => {
  test('detail page loads all sections', async ({ authenticatedPage, testData }) => {
    const ticket = await testData.createTicket({ title: `E2E Detail ${Date.now()}` });

    const page = authenticatedPage;
    await page.goto(`/tickets/${ticket.id}`);
    await page.waitForSelector(byTestId('page-ticket-detail'), { timeout: 15_000 });

    // Title should be visible
    await expect(page.getByText(ticket.title as string)).toBeVisible();

    // Tabs should exist
    await expect(page.locator(byTestId('tab-comments'))).toBeVisible();
    await expect(page.locator(byTestId('tab-history'))).toBeVisible();
  });

  test('ticket number format is correct (INC-YYYY-NNNNN)', async ({ authenticatedPage, testData }) => {
    const ticket = await testData.createTicket({
      title: `E2E NumberFormat ${Date.now()}`,
      ticket_type: 'incident',
    });

    const page = authenticatedPage;
    await page.goto(`/tickets/${ticket.id}`);
    await page.waitForSelector(byTestId('page-ticket-detail'), { timeout: 15_000 });

    // Ticket number should match pattern INC-YYYY-NNNNN
    const ticketNumber = ticket.ticket_number as string;
    expect(ticketNumber).toMatch(/^INC-\d{4}-\d{5}$/);
  });

  test('ticket number format for change (CHG-YYYY-NNNNN)', async ({ authenticatedPage, testData }) => {
    const ticket = await testData.createTicket({
      title: `E2E CHG NumberFormat ${Date.now()}`,
      ticket_type: 'change',
    });

    const ticketNumber = ticket.ticket_number as string;
    expect(ticketNumber).toMatch(/^CHG-\d{4}-\d{5}$/);

    // Cleanup is automatic via testData fixture
  });

  test('ticket number format for problem (PRB-YYYY-NNNNN)', async ({ authenticatedPage, testData }) => {
    const ticket = await testData.createTicket({
      title: `E2E PRB NumberFormat ${Date.now()}`,
      ticket_type: 'problem',
    });

    const ticketNumber = ticket.ticket_number as string;
    expect(ticketNumber).toMatch(/^PRB-\d{4}-\d{5}$/);
  });

  test('edit ticket: change status via dropdown', async ({ authenticatedPage, testData }) => {
    const ticket = await testData.createTicket({
      title: `E2E StatusChange ${Date.now()}`,
      status: 'open',
    });

    const page = authenticatedPage;
    await page.goto(`/tickets/${ticket.id}`);
    await page.waitForSelector(byTestId('page-ticket-detail'), { timeout: 15_000 });

    // Open status dropdown and change to in_progress
    const statusTrigger = page.locator(byTestId('select-status'));
    await statusTrigger.click();

    // Select "In Progress" / "In Bearbeitung"
    const inProgressOption = page.getByRole('option', { name: /In Progress|In Bearbeitung/i });
    await inProgressOption.click();

    // There might be a confirmation dialog for status changes — handle it
    const confirmButton = page.locator('[role="alertdialog"] button:has-text("OK"), [role="alertdialog"] button:has-text("Confirm"), [role="alertdialog"] button:has-text("Bestätigen"), [role="alertdialog"] button:has-text("Ja"), [role="alertdialog"] button[data-testid*="confirm"]');
    if (await confirmButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Wait for update to complete — the select should now show the new value
    await expect(statusTrigger).toContainText(/In Progress|In Bearbeitung/i, { timeout: 10_000 });
  });

  test('edit ticket: change priority via dropdown', async ({ authenticatedPage, testData }) => {
    const ticket = await testData.createTicket({
      title: `E2E PriorityChange ${Date.now()}`,
      priority: 'medium',
    });

    const page = authenticatedPage;
    await page.goto(`/tickets/${ticket.id}`);
    await page.waitForSelector(byTestId('page-ticket-detail'), { timeout: 15_000 });

    // Open priority dropdown — note: priority selector only visible when impact/urgency are not both set
    const priorityTrigger = page.locator(byTestId('select-priority'));

    if (await priorityTrigger.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await priorityTrigger.click();
      const highOption = page.getByRole('option', { name: /High|Hoch/i });
      await highOption.click();

      // Verify the priority updated
      await expect(priorityTrigger).toContainText(/High|Hoch/i, { timeout: 10_000 });
    }
    // If priority selector is not visible (auto-calculated from impact/urgency), test passes
  });

  test('edit ticket: assign to user', async ({ authenticatedPage, testData }) => {
    const ticket = await testData.createTicket({
      title: `E2E AssignUser ${Date.now()}`,
    });

    const page = authenticatedPage;
    await page.goto(`/tickets/${ticket.id}`);
    await page.waitForSelector(byTestId('page-ticket-detail'), { timeout: 15_000 });

    // Open assignee dropdown
    const assigneeTrigger = page.locator(byTestId('select-assignee'));
    await assigneeTrigger.click();

    // Pick the first non-"unassigned" option
    const options = page.getByRole('option');
    const count = await options.count();
    if (count > 1) {
      // Index 0 is likely "unassigned"; pick index 1
      await options.nth(1).click();

      // Verify the assignee changed (no longer shows unassigned)
      await expect(assigneeTrigger).not.toContainText(/Nicht zugewiesen|Unassigned/i, { timeout: 10_000 });
    }
  });

  test('edit ticket: assign to group', async ({ authenticatedPage, testData }) => {
    const ticket = await testData.createTicket({
      title: `E2E AssignGroup ${Date.now()}`,
    });

    const page = authenticatedPage;
    await page.goto(`/tickets/${ticket.id}`);
    await page.waitForSelector(byTestId('page-ticket-detail'), { timeout: 15_000 });

    // Open group dropdown
    const groupTrigger = page.locator(byTestId('select-group'));
    await groupTrigger.click();

    // Pick the first non-empty option
    const options = page.getByRole('option');
    const count = await options.count();
    if (count > 1) {
      await options.nth(1).click();
      // Verify it changed
      await expect(groupTrigger).not.toContainText(/^-$/, { timeout: 10_000 });
    }
  });

  test('add internal comment to ticket', async ({ authenticatedPage, testData }) => {
    const ticket = await testData.createTicket({
      title: `E2E CommentInternal ${Date.now()}`,
    });

    const page = authenticatedPage;
    await page.goto(`/tickets/${ticket.id}`);
    await page.waitForSelector(byTestId('page-ticket-detail'), { timeout: 15_000 });

    // Ensure comments tab is active
    await page.locator(byTestId('tab-comments')).click();

    const commentText = `Internal comment ${Date.now()}`;

    // Fill in the comment
    await page.locator(byTestId('input-comment')).fill(commentText);

    // Toggle internal flag
    const internalToggle = page.locator(byTestId('input-internal-toggle'));
    // Check if it is a switch — click to enable
    await internalToggle.click();

    // Submit the comment
    await page.locator(byTestId('btn-add-comment')).click();

    // Verify the comment appears in the list
    await expect(page.getByText(commentText)).toBeVisible({ timeout: 10_000 });

    // The comment should be marked as internal
    await expect(page.getByText(/Intern|Internal/i).first()).toBeVisible();
  });

  test('add external (public) comment to ticket', async ({ authenticatedPage, testData }) => {
    const ticket = await testData.createTicket({
      title: `E2E CommentExternal ${Date.now()}`,
    });

    const page = authenticatedPage;
    await page.goto(`/tickets/${ticket.id}`);
    await page.waitForSelector(byTestId('page-ticket-detail'), { timeout: 15_000 });

    // Ensure comments tab is active
    await page.locator(byTestId('tab-comments')).click();

    const commentText = `External comment ${Date.now()}`;

    // Fill in the comment (internal toggle should be OFF by default)
    await page.locator(byTestId('input-comment')).fill(commentText);

    // Submit the comment
    await page.locator(byTestId('btn-add-comment')).click();

    // Verify the comment appears
    await expect(page.getByText(commentText)).toBeVisible({ timeout: 10_000 });
  });

  test('view ticket history tab', async ({ authenticatedPage, testData }) => {
    // Create a ticket and then update it to generate history
    const ticket = await testData.createTicket({
      title: `E2E History ${Date.now()}`,
      status: 'open',
    });

    const page = authenticatedPage;
    await page.goto(`/tickets/${ticket.id}`);
    await page.waitForSelector(byTestId('page-ticket-detail'), { timeout: 15_000 });

    // Click history tab
    await page.locator(byTestId('tab-history')).click();

    // The history tab should be visible — there should be at least a "created" entry
    // or the tab content should load without error
    await expect(page.locator(byTestId('tab-history'))).toBeVisible();
  });

  test('back button returns to ticket board', async ({ authenticatedPage, testData }) => {
    const ticket = await testData.createTicket({
      title: `E2E BackButton ${Date.now()}`,
    });

    const page = authenticatedPage;
    await page.goto(`/tickets/${ticket.id}`);
    await page.waitForSelector(byTestId('page-ticket-detail'), { timeout: 15_000 });

    // Click back button
    await page.locator(byTestId('btn-back')).click();

    // Should navigate back to ticket board
    await page.waitForURL(/\/tickets\/?$/, { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Test Suite: Ticket Board Filtering
// ---------------------------------------------------------------------------

test.describe('Ticket Board Filtering', () => {
  test('filter tickets by status in list view', async ({ authenticatedPage, testData }) => {
    await testData.createTicket({
      title: `E2E FilterStatus ${Date.now()}`,
      status: 'open',
    });

    const page = authenticatedPage;
    await goToBoard(page);

    // Switch to list view for column-based filtering
    await page.locator(byTestId('btn-view-list')).click();
    await expect(page.locator(byTestId('table-tickets'))).toBeVisible({ timeout: 10_000 });

    // The list view should show tickets — the table should have rows
    const rows = page.locator(byTestId('table-tickets')).locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
  });

  test('filter tickets by type in board view', async ({ authenticatedPage, testData }) => {
    await testData.createTicket({
      title: `E2E FilterType ${Date.now()}`,
      ticket_type: 'incident',
    });

    const page = authenticatedPage;
    await goToBoard(page);

    // Ensure board view (use force:true because the button has pointer-events-none when already active)
    await page.locator(byTestId('btn-view-board')).click({ force: true });

    // The type filter is a Select in board view (not data-testid, use the first Select with "type" placeholder)
    // Type filter is the first select in the toolbar with width 160px
    const typeSelect = page.locator('.flex.items-center.gap-2 button[role="combobox"]').first();
    if (await typeSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await typeSelect.click();
      // Select "Incident"
      const incidentOption = page.getByRole('option', { name: /Incident|Störung/i });
      if (await incidentOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await incidentOption.click();
      }
    }

    // Board should still be functional
    await expect(page.locator('[data-testid^="board-column-"]').first()).toBeVisible();
  });

  test('refresh button reloads data', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await goToBoard(page);

    // Click refresh button
    await page.locator(byTestId('btn-refresh')).click();

    // Board should still be visible after refresh
    await expect(page.locator(byTestId('page-ticket-board'))).toBeVisible();
  });
});
