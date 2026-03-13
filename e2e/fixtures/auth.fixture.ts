import { test as base, type Page, type APIRequestContext } from '@playwright/test';

const API_BASE = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@opsweave.local';
const ADMIN_PASSWORD = 'changeme';

/**
 * Auth credentials returned after a successful login.
 */
interface AuthCookies {
  tokenCookie: string;
  csrfToken: string;
  rawCookieHeader: string;
}

/**
 * Log in via the API and extract auth cookies + CSRF token.
 */
async function loginViaApi(
  request: APIRequestContext,
  email = ADMIN_EMAIL,
  password = ADMIN_PASSWORD,
): Promise<AuthCookies> {
  const response = await request.post(`${API_BASE}/api/v1/auth/login`, {
    data: { email, password },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Login failed (${response.status()}): ${body}`);
  }

  // Playwright merges multiple Set-Cookie headers into one comma-separated string,
  // but Expires values also contain commas (e.g. "Sat, 14 Mar 2026").
  // Use regex to extract cookie values directly instead of splitting.
  const headers = response.headers();
  const setCookieHeader = headers['set-cookie'] ?? '';

  const tokenMatch = setCookieHeader.match(/opsweave_token=([^;]+)/);
  const csrfMatch = setCookieHeader.match(/opsweave_csrf=([^;]+)/);

  const tokenCookie = tokenMatch?.[1] ?? '';
  const csrfToken = csrfMatch?.[1] ?? '';

  // Fallback: also check the response body (backend returns token in body too)
  if (!tokenCookie || !csrfToken) {
    const body = await response.json();
    const bodyToken = body?.data?.token ?? '';

    if (!tokenCookie && !bodyToken) {
      throw new Error('Login response did not contain opsweave_token cookie or body token');
    }
    if (!csrfToken) {
      // If no CSRF cookie, the backend may not set it in some configurations.
      // For API-only tests, we can use Bearer auth instead.
      // Try to extract from headers using headersArray if available.
      const allHeaders = response.headersArray();
      for (const h of allHeaders) {
        if (h.name.toLowerCase() === 'set-cookie') {
          const m = h.value.match(/opsweave_csrf=([^;]+)/);
          if (m) {
            return {
              tokenCookie: tokenCookie || bodyToken,
              csrfToken: m[1],
              rawCookieHeader: `opsweave_token=${tokenCookie || bodyToken}; opsweave_csrf=${m[1]}`,
            };
          }
        }
      }
      throw new Error('Login response did not contain opsweave_csrf cookie');
    }
  }

  const rawCookieHeader = `opsweave_token=${tokenCookie}; opsweave_csrf=${csrfToken}`;

  return { tokenCookie, csrfToken, rawCookieHeader };
}

/**
 * Set auth cookies on a Playwright Page so it appears logged in.
 */
async function setPageCookies(page: Page, auth: AuthCookies): Promise<void> {
  await page.context().addCookies([
    {
      name: 'opsweave_token',
      value: auth.tokenCookie,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
    {
      name: 'opsweave_csrf',
      value: auth.csrfToken,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      sameSite: 'Lax',
    },
  ]);
}

// ─── Fixture type declarations ───────────────────────────────

interface AuthFixtures {
  /** A page that is already authenticated as admin. */
  authenticatedPage: Page;
  /** Alias for authenticatedPage (admin credentials). */
  adminPage: Page;
  /** An API request context with auth cookies pre-set for direct API calls. */
  apiContext: {
    request: APIRequestContext;
    csrfToken: string;
  };
}

// ─── Exported test fixture ───────────────────────────────────

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Login via the UI so the Zustand auth store is properly initialized
    await page.goto('/login');
    await page.locator('[data-testid="input-email"]').fill(ADMIN_EMAIL);
    await page.locator('[data-testid="input-password"]').fill(ADMIN_PASSWORD);
    await page.locator('[data-testid="btn-login"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 15_000,
    });
    await use(page);
  },

  adminPage: async ({ authenticatedPage }, use) => {
    await use(authenticatedPage);
  },

  apiContext: async ({ playwright }, use) => {
    const request = await playwright.request.newContext();
    const auth = await loginViaApi(request);

    // Create a new context that includes auth cookies on every request
    const authedRequest = await playwright.request.newContext({
      baseURL: API_BASE,
      extraHTTPHeaders: {
        Cookie: auth.rawCookieHeader,
        'X-CSRF-Token': auth.csrfToken,
      },
    });

    await use({ request: authedRequest, csrfToken: auth.csrfToken });

    await authedRequest.dispose();
    await request.dispose();
  },
});

export { expect } from '@playwright/test';
export { loginViaApi };
