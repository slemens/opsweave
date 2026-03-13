import i18n from '@/i18n/config';

const BASE_URL = '/api/v1';

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

export class ApiRequestError extends Error {
  public readonly status: number;
  public readonly errors?: Record<string, string[]>;

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.errors = errors;
  }
}

/**
 * Read the CSRF token from the `opsweave_csrf` cookie.
 * This cookie is NOT httpOnly and is set by the backend on login.
 */
function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)opsweave_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]!) : null;
}

function getTenantId(): string | null {
  try {
    const stored = localStorage.getItem('opsweave_auth');
    if (stored) {
      const parsed = JSON.parse(stored) as { state?: { tenantId?: string } };
      return parsed.state?.tenantId ?? null;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, params, headers: customHeaders, ...init } = options;

  // Build URL with query params
  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) {
      url += `?${qs}`;
    }
  }

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept-Language': i18n.language || 'de',
    ...(customHeaders as Record<string, string>),
  };

  // CSRF token for mutating requests (cookie-based auth)
  const method = (init.method ?? 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) {
      headers['X-CSRF-Token'] = csrf;
    }
  }

  const tenantId = getTenantId();
  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: 'include', // Send httpOnly cookies
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    // Session expired or invalid — clear auth state and redirect to login
    if (response.status === 401 && !endpoint.startsWith('/auth/')) {
      const { useAuthStore } = await import('@/stores/auth-store');
      useAuthStore.getState().clearAuth();
      window.location.href = '/login?reason=session_expired';
      throw new ApiRequestError(401, 'Session expired');
    }

    let errorBody: ApiError | undefined;
    try {
      errorBody = (await response.json()) as ApiError;
    } catch {
      // Response body may not be JSON
    }

    throw new ApiRequestError(
      response.status,
      errorBody?.message ?? `Request failed with status ${response.status}`,
      errorBody?.errors,
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  const json = await response.json() as Record<string, unknown>;

  // API responses use two envelopes:
  // - Success:    { data: T }           → unwrap to T
  // - Paginated:  { data: T[], meta: {} } → keep as-is (caller expects { data, meta })
  if ('data' in json && 'meta' in json) {
    // Paginated response — return full shape
    return json as T;
  }
  if ('data' in json) {
    // Simple success envelope — unwrap
    return json.data as T;
  }

  return json as T;
}

export const apiClient = {
  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'POST', body });
  },

  put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'PUT', body });
  },

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'PATCH', body });
  },

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};
