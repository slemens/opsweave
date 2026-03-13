/**
 * Direct API helpers for E2E tests.
 *
 * These use native fetch (not Playwright browser) for fast,
 * headless API interactions — useful for setup/teardown and
 * API-level smoke tests.
 */

const API_BASE = 'http://localhost:3000';

// ─── Types ───────────────────────────────────────────────────

interface AuthResult {
  tokenCookie: string;
  csrfToken: string;
  cookieHeader: string;
  user: Record<string, unknown>;
}

interface ApiOptions {
  cookieHeader: string;
  csrfToken: string;
}

// ─── Auth ────────────────────────────────────────────────────

/**
 * Login via API and return auth cookies + user info.
 */
export async function login(
  email = 'admin@opsweave.local',
  password = 'changeme',
): Promise<AuthResult> {
  const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    redirect: 'manual',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Login failed (${response.status}): ${body}`);
  }

  const setCookies = response.headers.getSetCookie?.() ?? [];
  let tokenCookie = '';
  let csrfToken = '';

  for (const cookie of setCookies) {
    const match = cookie.match(/^([^=]+)=([^;]+)/);
    if (!match) continue;
    const [, name, value] = match;
    if (name === 'opsweave_token') tokenCookie = value!;
    if (name === 'opsweave_csrf') csrfToken = value!;
  }

  if (!tokenCookie || !csrfToken) {
    throw new Error('Login did not return expected cookies');
  }

  const json = (await response.json()) as { data: { user: Record<string, unknown> } };

  return {
    tokenCookie,
    csrfToken,
    cookieHeader: `opsweave_token=${tokenCookie}; opsweave_csrf=${csrfToken}`,
    user: json.data.user,
  };
}

// ─── Generic API calls ──────────────────────────────────────

/**
 * Perform an authenticated GET request.
 */
export async function apiGet(
  path: string,
  auth: ApiOptions,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Cookie: auth.cookieHeader,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GET ${path} failed (${response.status}): ${body}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

/**
 * Perform an authenticated POST request.
 */
export async function apiPost(
  path: string,
  data: Record<string, unknown>,
  auth: ApiOptions,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: auth.cookieHeader,
      'X-CSRF-Token': auth.csrfToken,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`POST ${path} failed (${response.status}): ${body}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

/**
 * Perform an authenticated PUT request.
 */
export async function apiPut(
  path: string,
  data: Record<string, unknown>,
  auth: ApiOptions,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: auth.cookieHeader,
      'X-CSRF-Token': auth.csrfToken,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PUT ${path} failed (${response.status}): ${body}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

/**
 * Perform an authenticated DELETE request.
 */
export async function apiDelete(
  path: string,
  auth: ApiOptions,
): Promise<void> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: {
      Cookie: auth.cookieHeader,
      'X-CSRF-Token': auth.csrfToken,
    },
  });

  if (!response.ok && response.status !== 404) {
    const body = await response.text();
    throw new Error(`DELETE ${path} failed (${response.status}): ${body}`);
  }
}

// ─── CRUD shortcuts ─────────────────────────────────────────

export async function createTicket(
  auth: ApiOptions,
  data: Partial<{
    title: string;
    description: string;
    ticket_type: string;
    priority: string;
    status: string;
  }> = {},
): Promise<Record<string, unknown>> {
  const defaults = {
    title: `E2E Ticket ${Date.now()}`,
    description: 'Created by E2E API helper',
    ticket_type: 'incident',
    priority: 'medium',
    status: 'open',
  };
  const result = await apiPost('/api/v1/tickets', { ...defaults, ...data }, auth);
  return (result as { data: Record<string, unknown> }).data;
}

export async function createAsset(
  auth: ApiOptions,
  data: Partial<{
    name: string;
    display_name: string;
    asset_type: string;
    status: string;
  }> = {},
): Promise<Record<string, unknown>> {
  const ts = Date.now();
  const defaults = {
    name: `e2e-asset-${ts}`,
    display_name: `E2E Asset ${ts}`,
    asset_type: 'server_virtual',
    status: 'active',
  };
  const result = await apiPost('/api/v1/assets', { ...defaults, ...data }, auth);
  return (result as { data: Record<string, unknown> }).data;
}

export async function deleteTicket(auth: ApiOptions, id: string): Promise<void> {
  await apiDelete(`/api/v1/tickets/${id}`, auth);
}

export async function deleteAsset(auth: ApiOptions, id: string): Promise<void> {
  await apiDelete(`/api/v1/assets/${id}`, auth);
}

// ─── Health check ────────────────────────────────────────────

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/system/health`);
    return response.ok;
  } catch {
    return false;
  }
}
