import { test, expect } from '../fixtures/test-data.fixture.js';
import {
  login,
  apiGet,
  apiPost,
  apiDelete,
  createTicket,
  deleteTicket,
} from '../helpers/api.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_BASE = 'http://localhost:3000';

/**
 * Raw fetch without auth cookies — for testing 401 responses.
 */
async function unauthenticatedPost(
  path: string,
  data: Record<string, unknown>,
): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

async function unauthenticatedGet(path: string): Promise<Response> {
  return fetch(`${API_BASE}${path}`);
}

// ---------------------------------------------------------------------------
// Test Suite: Ticket CRUD via API
// ---------------------------------------------------------------------------

test.describe('Tickets API — CRUD', () => {
  test('GET /api/v1/tickets returns list with pagination', async ({ apiContext }) => {
    const { request } = apiContext;

    const response = await request.get('/api/v1/tickets?page=1&limit=10');
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta).toHaveProperty('total');
    expect(body.meta).toHaveProperty('page');
    expect(body.meta).toHaveProperty('limit');
  });

  test('POST /api/v1/tickets creates ticket and returns 201', async ({ apiContext }) => {
    const { request, csrfToken } = apiContext;

    const payload = {
      title: `API Test Ticket ${Date.now()}`,
      description: 'Created via API E2E test',
      ticket_type: 'incident',
      priority: 'medium',
      source: 'api',
    };

    const response = await request.post('/api/v1/tickets', {
      data: payload,
      headers: { 'X-CSRF-Token': csrfToken },
    });

    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('id');
    expect(body.data.title).toBe(payload.title);
    expect(body.data.ticket_type).toBe('incident');
    expect(body.data.priority).toBe('medium');
    expect(body.data.ticket_number).toMatch(/^INC-\d{4}-\d{5}$/);

    // Cleanup
    await request.delete(`/api/v1/tickets/${body.data.id}`, {
      headers: { 'X-CSRF-Token': csrfToken },
    });
  });

  test('GET /api/v1/tickets/:id returns ticket detail', async ({ apiContext, testData }) => {
    const ticket = await testData.createTicket({ title: `API Detail ${Date.now()}` });
    const { request } = apiContext;

    const response = await request.get(`/api/v1/tickets/${ticket.id}`);
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body.data.id).toBe(ticket.id);
    expect(body.data.title).toBe(ticket.title);
  });

  test('PUT /api/v1/tickets/:id updates ticket', async ({ apiContext, testData }) => {
    const ticket = await testData.createTicket({ title: `API Update ${Date.now()}` });
    const { request, csrfToken } = apiContext;

    const updatedTitle = `Updated ${Date.now()}`;
    const response = await request.put(`/api/v1/tickets/${ticket.id}`, {
      data: { title: updatedTitle },
      headers: { 'X-CSRF-Token': csrfToken },
    });

    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.data.title).toBe(updatedTitle);
  });

  test('PATCH /api/v1/tickets/:id/status changes status', async ({ apiContext, testData }) => {
    const ticket = await testData.createTicket({
      title: `API StatusPatch ${Date.now()}`,
      status: 'open',
    });
    const { request, csrfToken } = apiContext;

    const response = await request.patch(`/api/v1/tickets/${ticket.id}/status`, {
      data: { status: 'in_progress' },
      headers: { 'X-CSRF-Token': csrfToken },
    });

    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.data.status).toBe('in_progress');
  });

  test('PATCH /api/v1/tickets/:id/priority changes priority', async ({ apiContext, testData }) => {
    const ticket = await testData.createTicket({
      title: `API PriorityPatch ${Date.now()}`,
      priority: 'low',
    });
    const { request, csrfToken } = apiContext;

    const response = await request.patch(`/api/v1/tickets/${ticket.id}/priority`, {
      data: { priority: 'critical' },
      headers: { 'X-CSRF-Token': csrfToken },
    });

    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.data.priority).toBe('critical');
  });

  test('PATCH /api/v1/tickets/:id/assign assigns ticket', async ({ apiContext, testData }) => {
    const ticket = await testData.createTicket({
      title: `API Assign ${Date.now()}`,
    });
    const { request, csrfToken } = apiContext;

    // Get a user to assign to
    const usersResponse = await request.get('/api/v1/users');
    const usersBody = await usersResponse.json();
    const firstUser = usersBody.data?.[0];

    if (firstUser) {
      const response = await request.patch(`/api/v1/tickets/${ticket.id}/assign`, {
        data: { assignee_id: firstUser.id },
        headers: { 'X-CSRF-Token': csrfToken },
      });

      expect(response.ok()).toBe(true);

      const body = await response.json();
      expect(body.data.assignee_id).toBe(firstUser.id);
    }
  });
});

// ---------------------------------------------------------------------------
// Test Suite: Ticket Comments API
// ---------------------------------------------------------------------------

test.describe('Tickets API — Comments', () => {
  test('POST /api/v1/tickets/:id/comments adds comment', async ({ apiContext, testData }) => {
    const ticket = await testData.createTicket({
      title: `API Comment ${Date.now()}`,
    });
    const { request, csrfToken } = apiContext;

    const response = await request.post(`/api/v1/tickets/${ticket.id}/comments`, {
      data: {
        content: 'This is an API test comment',
        is_internal: false,
      },
      headers: { 'X-CSRF-Token': csrfToken },
    });

    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.data).toHaveProperty('id');
    expect(body.data.content).toBe('This is an API test comment');
  });

  test('POST /api/v1/tickets/:id/comments adds internal comment', async ({ apiContext, testData }) => {
    const ticket = await testData.createTicket({
      title: `API InternalComment ${Date.now()}`,
    });
    const { request, csrfToken } = apiContext;

    const response = await request.post(`/api/v1/tickets/${ticket.id}/comments`, {
      data: {
        content: 'Internal note for the team',
        is_internal: true,
      },
      headers: { 'X-CSRF-Token': csrfToken },
    });

    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.data.content).toBe('Internal note for the team');
    // is_internal is stored as integer 0/1 in SQLite
    expect([true, 1]).toContain(body.data.is_internal);
  });

  test('GET /api/v1/tickets/:id/comments returns comments', async ({ apiContext, testData }) => {
    const ticket = await testData.createTicket({
      title: `API GetComments ${Date.now()}`,
    });
    const { request, csrfToken } = apiContext;

    // Add a comment first
    await request.post(`/api/v1/tickets/${ticket.id}/comments`, {
      data: { content: 'A comment to retrieve', is_internal: false },
      headers: { 'X-CSRF-Token': csrfToken },
    });

    // Retrieve comments
    const response = await request.get(`/api/v1/tickets/${ticket.id}/comments`);
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data.some((c: { content: string }) => c.content === 'A comment to retrieve')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test Suite: Ticket History API
// ---------------------------------------------------------------------------

test.describe('Tickets API — History', () => {
  test('GET /api/v1/tickets/:id/history returns history', async ({ apiContext, testData }) => {
    const ticket = await testData.createTicket({
      title: `API History ${Date.now()}`,
      status: 'open',
    });
    const { request, csrfToken } = apiContext;

    // Generate a history entry by changing status
    await request.patch(`/api/v1/tickets/${ticket.id}/status`, {
      data: { status: 'in_progress' },
      headers: { 'X-CSRF-Token': csrfToken },
    });

    // Retrieve history
    const response = await request.get(`/api/v1/tickets/${ticket.id}/history`);
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    // At least one history entry should be for 'status'
    const statusChange = body.data.find(
      (h: { field_changed: string }) => h.field_changed === 'status',
    );
    expect(statusChange).toBeDefined();
    expect(statusChange.new_value).toBe('in_progress');
  });
});

// ---------------------------------------------------------------------------
// Test Suite: Ticket Stats API
// ---------------------------------------------------------------------------

test.describe('Tickets API — Stats', () => {
  test('GET /api/v1/tickets/stats returns statistics', async ({ apiContext }) => {
    const { request } = apiContext;

    const response = await request.get('/api/v1/tickets/stats');
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body).toHaveProperty('data');
    // Stats should include some numeric aggregations
    const data = body.data;
    expect(data).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Test Suite: Authentication & Tenant Scoping
// ---------------------------------------------------------------------------

test.describe('Tickets API — Auth & Tenant Scoping', () => {
  test('ticket creation requires authentication (401 without token)', async () => {
    const response = await unauthenticatedPost('/api/v1/tickets', {
      title: 'Should fail',
      description: 'Unauthenticated request',
      ticket_type: 'incident',
      priority: 'medium',
      source: 'api',
    });

    expect(response.status).toBe(401);
  });

  test('ticket listing requires authentication (401 without token)', async () => {
    const response = await unauthenticatedGet('/api/v1/tickets');
    expect(response.status).toBe(401);
  });

  test('ticket is tenant-scoped (cannot access with fake ID)', async ({ apiContext, testData }) => {
    const ticket = await testData.createTicket({
      title: `API TenantScope ${Date.now()}`,
    });
    const { request } = apiContext;

    // Accessing the ticket with its real ID should work
    const validResponse = await request.get(`/api/v1/tickets/${ticket.id}`);
    expect(validResponse.ok()).toBe(true);

    // Accessing a non-existent ticket ID should return 404
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const invalidResponse = await request.get(`/api/v1/tickets/${fakeId}`);
    expect(invalidResponse.status()).toBe(404);
  });

  test('GET /api/v1/tickets/:id returns 404 for non-existent ticket', async ({ apiContext }) => {
    const { request } = apiContext;
    const fakeId = '99999999-9999-9999-9999-999999999999';

    const response = await request.get(`/api/v1/tickets/${fakeId}`);
    expect(response.status()).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Test Suite: Ticket Creation Variants
// ---------------------------------------------------------------------------

test.describe('Tickets API — Creation Variants', () => {
  test('create incident ticket via API', async ({ apiContext }) => {
    const { request, csrfToken } = apiContext;

    const response = await request.post('/api/v1/tickets', {
      data: {
        title: `API Incident ${Date.now()}`,
        description: 'Incident ticket',
        ticket_type: 'incident',
        priority: 'high',
        source: 'api',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.data.ticket_type).toBe('incident');
    expect(body.data.ticket_number).toMatch(/^INC-/);

    // Cleanup
    await request.delete(`/api/v1/tickets/${body.data.id}`, {
      headers: { 'X-CSRF-Token': csrfToken },
    });
  });

  test('create change request via API', async ({ apiContext }) => {
    const { request, csrfToken } = apiContext;

    const response = await request.post('/api/v1/tickets', {
      data: {
        title: `API Change ${Date.now()}`,
        description: 'Change request ticket',
        ticket_type: 'change',
        priority: 'medium',
        source: 'api',
        change_justification: 'Business need',
        change_implementation: 'Deploy new version',
        change_rollback_plan: 'Rollback to v1',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.data.ticket_type).toBe('change');
    expect(body.data.ticket_number).toMatch(/^CHG-/);

    // Cleanup
    await request.delete(`/api/v1/tickets/${body.data.id}`, {
      headers: { 'X-CSRF-Token': csrfToken },
    });
  });

  test('create problem ticket via API', async ({ apiContext }) => {
    const { request, csrfToken } = apiContext;

    const response = await request.post('/api/v1/tickets', {
      data: {
        title: `API Problem ${Date.now()}`,
        description: 'Problem investigation',
        ticket_type: 'problem',
        priority: 'low',
        source: 'api',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.data.ticket_type).toBe('problem');
    expect(body.data.ticket_number).toMatch(/^PRB-/);

    // Cleanup
    await request.delete(`/api/v1/tickets/${body.data.id}`, {
      headers: { 'X-CSRF-Token': csrfToken },
    });
  });

  test('ticket creation with missing title fails validation', async ({ apiContext }) => {
    const { request, csrfToken } = apiContext;

    const response = await request.post('/api/v1/tickets', {
      data: {
        description: 'No title provided',
        ticket_type: 'incident',
        priority: 'medium',
        source: 'api',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    });

    // Should fail with 400 (validation error)
    expect(response.status()).toBe(400);
  });

  test('GET /api/v1/tickets supports pagination parameters', async ({ apiContext, testData }) => {
    // Create a few tickets
    await testData.createTicket({ title: `API Page1 ${Date.now()}` });
    await testData.createTicket({ title: `API Page2 ${Date.now()}` });

    const { request } = apiContext;

    // Request with explicit pagination
    const response = await request.get('/api/v1/tickets?page=1&limit=1');
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.meta.limit).toBe(1);
    expect(body.data.length).toBeLessThanOrEqual(1);
    expect(body.meta.total).toBeGreaterThanOrEqual(2);
  });

  test('GET /api/v1/tickets supports sorting', async ({ apiContext }) => {
    const { request } = apiContext;

    const response = await request.get('/api/v1/tickets?sort=created_at&order=desc&limit=5');
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(Array.isArray(body.data)).toBe(true);

    // Verify descending order — each ticket's created_at should be >= the next
    if (body.data.length > 1) {
      for (let i = 0; i < body.data.length - 1; i++) {
        const current = new Date(body.data[i].created_at).getTime();
        const next = new Date(body.data[i + 1].created_at).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    }
  });
});
