import { test as authTest } from './auth.fixture.js';
import type { APIRequestContext } from '@playwright/test';

// ─── Types for test data helpers ─────────────────────────────

interface CreatedEntity {
  type: string;
  id: string;
}

interface TestDataHelpers {
  /** Create a ticket via API. Returns the created ticket object. */
  createTicket: (data?: Partial<TicketInput>) => Promise<Record<string, unknown>>;
  /** Create an asset via API. Returns the created asset object. */
  createAsset: (data?: Partial<AssetInput>) => Promise<Record<string, unknown>>;
  /** Create a user via API. Returns the created user object. */
  createUser: (data?: Partial<UserInput>) => Promise<Record<string, unknown>>;
  /** Manually track an entity for cleanup. */
  track: (type: string, id: string) => void;
}

interface TicketInput {
  title: string;
  description: string;
  ticket_type: string;
  priority: string;
  status: string;
}

interface AssetInput {
  name: string;
  display_name: string;
  asset_type: string;
  status: string;
}

interface UserInput {
  email: string;
  display_name: string;
  password: string;
  language: string;
}

// ─── Helper to make API calls ────────────────────────────────

async function apiPost(
  request: APIRequestContext,
  csrfToken: string,
  path: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await request.post(path, {
    data,
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`POST ${path} failed (${response.status()}): ${body}`);
  }

  const json = (await response.json()) as { data: Record<string, unknown> };
  return json.data;
}

async function apiDelete(
  request: APIRequestContext,
  csrfToken: string,
  path: string,
): Promise<void> {
  const response = await request.delete(path, {
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  });

  // 404 is fine during cleanup — entity may already be deleted
  if (!response.ok() && response.status() !== 404) {
    const body = await response.text();
    throw new Error(`DELETE ${path} failed (${response.status()}): ${body}`);
  }
}

// ─── Fixture type declaration ────────────────────────────────

interface TestDataFixtures {
  testData: TestDataHelpers;
}

// ─── Exported test fixture ───────────────────────────────────

export const test = authTest.extend<TestDataFixtures>({
  testData: async ({ apiContext }, use) => {
    const created: CreatedEntity[] = [];
    const { request, csrfToken } = apiContext;

    const track = (type: string, id: string) => {
      created.push({ type, id });
    };

    const helpers: TestDataHelpers = {
      createTicket: async (data = {}) => {
        const defaults: TicketInput = {
          title: `E2E Test Ticket ${Date.now()}`,
          description: 'Created by Playwright E2E test',
          ticket_type: 'incident',
          priority: 'medium',
          status: 'open',
        };
        const merged = { ...defaults, ...data };
        const result = await apiPost(request, csrfToken, '/api/v1/tickets', merged);
        const id = result.id as string;
        track('tickets', id);
        return result;
      },

      createAsset: async (data = {}) => {
        const ts = Date.now();
        const defaults: AssetInput = {
          name: `e2e-asset-${ts}`,
          display_name: `E2E Test Asset ${ts}`,
          asset_type: 'server_virtual',
          status: 'active',
        };
        const merged = { ...defaults, ...data };
        const result = await apiPost(request, csrfToken, '/api/v1/assets', merged);
        const id = result.id as string;
        track('assets', id);
        return result;
      },

      createUser: async (data = {}) => {
        const ts = Date.now();
        const defaults: UserInput = {
          email: `e2e-user-${ts}@test.local`,
          display_name: `E2E User ${ts}`,
          password: 'TestPassword123!',
          language: 'en',
        };
        const merged = { ...defaults, ...data };
        const result = await apiPost(request, csrfToken, '/api/v1/users', merged);
        const id = result.id as string;
        track('users', id);
        return result;
      },

      track,
    };

    await use(helpers);

    // ─── Cleanup created entities (reverse order) ─────────
    for (const entity of [...created].reverse()) {
      try {
        await apiDelete(request, csrfToken, `/api/v1/${entity.type}/${entity.id}`);
      } catch {
        // Best-effort cleanup; don't fail the test
      }
    }
  },
});

export { expect } from '@playwright/test';
