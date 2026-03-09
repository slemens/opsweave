// ---------------------------------------------------------------------------
// Portal API client — separate from the main internal apiClient.
// Portal users authenticate with their own JWT stored in localStorage under
// 'opsweave_portal_auth', completely independent from the internal auth store.
// ---------------------------------------------------------------------------

const BASE_URL = '/api/v1';

export interface PortalUser {
  id: string;
  email: string;
  displayName: string;
  customerId: string;
  tenantId: string;
}

export interface PortalAuth {
  token: string;
  user: PortalUser;
}

export interface PortalTicket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  ticketType: 'incident' | 'change' | 'problem';
  createdAt: string;
  updatedAt: string;
}

export interface PortalComment {
  id: string;
  content: string;
  source: 'agent' | 'customer' | 'email' | 'system';
  createdAt: string;
  author?: {
    displayName: string;
  };
}

export interface CreatePortalTicketPayload {
  title: string;
  description: string;
  ticketType: 'incident' | 'change';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export function getPortalAuth(): PortalAuth | null {
  try {
    const stored = localStorage.getItem('opsweave_portal_auth');
    if (stored) {
      return JSON.parse(stored) as PortalAuth;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

export function setPortalAuth(auth: PortalAuth): void {
  localStorage.setItem('opsweave_portal_auth', JSON.stringify(auth));
}

export function clearPortalAuth(): void {
  localStorage.removeItem('opsweave_portal_auth');
}

// ---------------------------------------------------------------------------
// Core fetch helper
// ---------------------------------------------------------------------------

export class PortalApiError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'PortalApiError';
    this.status = status;
  }
}

async function portalRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const auth = getPortalAuth();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (auth) {
    headers['Authorization'] = `Bearer ${auth.token}`;
    headers['X-Tenant-ID'] = auth.user.tenantId;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body.error?.message) {
        message = body.error.message;
      }
    } catch {
      // Response body may not be JSON
    }
    throw new PortalApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const json = (await response.json()) as { data?: T };
  return (json.data ?? json) as T;
}

// ---------------------------------------------------------------------------
// Portal API methods
// ---------------------------------------------------------------------------

export const portalApi = {
  // Auth
  login(email: string, password: string, tenantSlug: string): Promise<PortalAuth> {
    return portalRequest<PortalAuth>('/portal/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, tenantSlug }),
    });
  },

  logout(): Promise<void> {
    return portalRequest<void>('/portal/auth/logout', { method: 'POST' });
  },

  me(): Promise<PortalUser> {
    return portalRequest<PortalUser>('/portal/auth/me');
  },

  // Tickets
  listTickets(): Promise<PortalTicket[]> {
    return portalRequest<PortalTicket[]>('/portal/tickets');
  },

  getTicket(id: string): Promise<PortalTicket> {
    return portalRequest<PortalTicket>(`/portal/tickets/${id}`);
  },

  createTicket(payload: CreatePortalTicketPayload): Promise<PortalTicket> {
    return portalRequest<PortalTicket>('/portal/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Comments
  listComments(ticketId: string): Promise<PortalComment[]> {
    return portalRequest<PortalComment[]>(`/portal/tickets/${ticketId}/comments`);
  },

  addComment(ticketId: string, content: string): Promise<PortalComment> {
    return portalRequest<PortalComment>(`/portal/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },
};
