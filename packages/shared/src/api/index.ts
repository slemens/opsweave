// =============================================================================
// OpsWeave — API Response Types
// =============================================================================
// Standard response envelope used by all REST endpoints.
// The UI and external integrations consume the same API shape.
// =============================================================================

// ---------------------------------------------------------------------------
// Response Meta
// ---------------------------------------------------------------------------

export interface ResponseMeta {
  timestamp: string;
  requestId?: string;
}

export interface PaginationMeta extends ResponseMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Success Responses
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  data: T;
  meta: ResponseMeta;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ---------------------------------------------------------------------------
// Error Responses
// ---------------------------------------------------------------------------

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiError {
  error: ApiErrorDetail;
  meta: ResponseMeta;
}

// ---------------------------------------------------------------------------
// API List Params (query string shape for list endpoints)
// ---------------------------------------------------------------------------

export interface ApiListParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  q?: string;
}

// ---------------------------------------------------------------------------
// Common Error Codes
// ---------------------------------------------------------------------------

export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Tenant
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  TENANT_INACTIVE: 'TENANT_INACTIVE',

  // License
  LICENSE_INVALID: 'LICENSE_INVALID',
  LICENSE_EXPIRED: 'LICENSE_EXPIRED',
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',

  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // DAG / Relations
  CYCLE_DETECTED: 'CYCLE_DETECTED',
  SELF_REFERENCE: 'SELF_REFERENCE',
  DUPLICATE_RELATION: 'DUPLICATE_RELATION',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ---------------------------------------------------------------------------
// Helper: Build response envelope
// ---------------------------------------------------------------------------

export function buildResponseMeta(requestId?: string): ResponseMeta {
  return {
    timestamp: new Date().toISOString(),
    ...(requestId ? { requestId } : {}),
  };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
  requestId?: string,
): PaginationMeta {
  return {
    timestamp: new Date().toISOString(),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    ...(requestId ? { requestId } : {}),
  };
}
