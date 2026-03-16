import type { Request, Response, NextFunction } from 'express';
import { writeAuditLog } from '../modules/audit/audit.service.js';

/**
 * Route-path-to-resource-type mapping.
 * Maps the first segment of the URL path to an audit resource type.
 */
const PATH_TO_RESOURCE: Record<string, string> = {
  tickets: 'ticket',
  assets: 'asset',
  users: 'user',
  groups: 'group',
  customers: 'customer',
  workflows: 'workflow',
  services: 'service',
  compliance: 'compliance',
  'kb': 'kb_article',
  email: 'email_config',
  settings: 'settings',
  license: 'license',
  sla: 'sla',
  'known-errors': 'known_error',
  escalation: 'escalation',
  monitoring: 'monitoring',
  tenants: 'tenant',
  'asset-types': 'asset_type',
  'relation-types': 'relation_type',
  classifications: 'classification',
  capacity: 'capacity',
  projects: 'project',
  'service-profiles': 'service_profile',
  notifications: 'notification',
};

/**
 * HTTP method to action mapping.
 */
const METHOD_TO_ACTION: Record<string, string> = {
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

/**
 * Extract the resource type and resource ID from the request path.
 * E.g. /api/v1/tickets/abc-123/comments → { resource: 'ticket', id: 'abc-123', subResource: 'comments' }
 */
function extractRouteInfo(path: string): { resource: string; id: string | null; subResource: string | null } {
  // Remove /api/v1/ prefix
  const clean = path.replace(/^\/api\/v1\//, '');
  const segments = clean.split('/').filter(Boolean);

  const firstSegment = segments[0] ?? '';
  const resource = PATH_TO_RESOURCE[firstSegment] ?? firstSegment;
  const id = segments[1] && !PATH_TO_RESOURCE[segments[1]] ? segments[1] : null;
  const subResource = segments[2] ?? null;

  return { resource, id, subResource };
}

/**
 * Determine the event type from the HTTP method, resource, and sub-resource.
 * E.g. PATCH /tickets/:id/status → 'ticket.status_change'
 *      POST /tickets → 'ticket.create'
 *      DELETE /assets/:id → 'asset.delete'
 */
function determineEventType(method: string, resource: string, subResource: string | null): string {
  const action = METHOD_TO_ACTION[method];
  if (!action) return `${resource}.unknown`;

  if (subResource) {
    // Special sub-resource actions
    if (subResource === 'status') return `${resource}.status_change`;
    if (subResource === 'assign') return `${resource}.assignment_change`;
    if (subResource === 'priority') return `${resource}.priority_change`;
    if (subResource === 'comments') return `${resource}.comment_add`;
    if (subResource === 'relations') return action === 'delete' ? `${resource}.relation_remove` : `${resource}.relation_add`;
    if (subResource === 'members') return action === 'delete' ? `${resource}.member_remove` : `${resource}.member_add`;
    if (subResource === 'requirements') return `compliance.requirement_${action}`;
    if (subResource === 'activate') return `${resource}.activate`;
    if (subResource === 'deactivate') return `${resource}.deactivate`;
    return `${resource}.${subResource}_${action}`;
  }

  return `${resource}.${action}`;
}

/**
 * Automatic audit logging middleware for all mutating requests (POST, PUT, PATCH, DELETE).
 *
 * Intercepts the response to log ONLY successful operations (2xx status codes).
 * Fire-and-forget — never blocks the response.
 *
 * Captures: who (actor), what (resource + action), when (timestamp),
 * where (IP, user-agent), and context (request body summary).
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();

  // Only audit mutating requests
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    next();
    return;
  }

  // Capture the original end method to intercept response
  const originalEnd = res.end;
  const originalJson = res.json;

  let responseBody: unknown = undefined;

  // Override res.json to capture response body
  res.json = function (body: unknown) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  // Override res.end to write audit log after response is sent
  res.end = function (this: Response, ...args: unknown[]) {
    // Write audit log asynchronously after response completes
    const statusCode = res.statusCode;

    // Only audit successful operations (2xx)
    if (statusCode >= 200 && statusCode < 300) {
      const user = req.user;
      const tenantId = req.tenantId;

      if (user && tenantId) {
        const { resource, id, subResource } = extractRouteInfo(req.originalUrl);
        const eventType = determineEventType(method, resource, subResource);

        // Build details — include request body summary (sanitized)
        const details: Record<string, unknown> = {};

        if (req.body && typeof req.body === 'object') {
          const body = { ...req.body } as Record<string, unknown>;
          // Remove sensitive fields
          delete body['password'];
          delete body['password_hash'];
          delete body['current_password'];
          delete body['new_password'];
          delete body['config']; // May contain credentials (email configs, monitoring)
          delete body['license_key'];
          details['input'] = body;
        }

        // Capture resource ID from response if created
        let resourceId = id;
        if (!resourceId && responseBody && typeof responseBody === 'object') {
          const respObj = responseBody as Record<string, unknown>;
          const data = respObj['data'] as Record<string, unknown> | undefined;
          if (data && typeof data['id'] === 'string') {
            resourceId = data['id'];
          }
        }

        // Fire-and-forget audit log
        writeAuditLog(
          tenantId,
          user.id,
          user.email,
          eventType,
          resource,
          resourceId ?? null,
          details,
          req.ip ?? null,
          req.headers['user-agent'] ?? null,
        );
      }
    }

    // Call original end
    return (originalEnd as (...a: unknown[]) => unknown).apply(this, args);
  } as typeof res.end;

  next();
}
