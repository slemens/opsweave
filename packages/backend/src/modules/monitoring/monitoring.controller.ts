import type { Request, Response } from 'express';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../lib/response.js';
import { requireTenantId } from '../../lib/context.js';
import * as monitoringService from './monitoring.service.js';

// =============================================================================
// Sources
// =============================================================================

export function listSources(req: Request, res: Response) {
  const data = monitoringService.listSources(requireTenantId(req));
  sendSuccess(res, data);
}

export function getSource(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const data = monitoringService.getSource(requireTenantId(req), id);
  sendSuccess(res, data);
}

export function createSource(req: Request, res: Response) {
  const data = monitoringService.createSource(requireTenantId(req), req.body);
  sendCreated(res, data);
}

export function updateSource(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const data = monitoringService.updateSource(requireTenantId(req), id, req.body);
  sendSuccess(res, data);
}

export function deleteSource(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  monitoringService.deleteSource(requireTenantId(req), id);
  sendNoContent(res);
}

// =============================================================================
// Events
// =============================================================================

export function listEvents(req: Request, res: Response) {
  const filters = {
    source_id: req.query.source_id as string | undefined,
    state: req.query.state as string | undefined,
    hostname: req.query.hostname as string | undefined,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    processed: req.query.processed as string | undefined,
    q: req.query.q as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  };
  const result = monitoringService.listEvents(requireTenantId(req), filters);
  sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.limit);
}

export function getEvent(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const data = monitoringService.getEvent(requireTenantId(req), id);
  sendSuccess(res, data);
}

export function acknowledgeEvent(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const data = monitoringService.acknowledgeEvent(requireTenantId(req), id);
  sendSuccess(res, data);
}

// =============================================================================
// Webhook (public — auth via webhook_secret)
// =============================================================================

export function webhookIngest(req: Request, res: Response) {
  const { sourceId } = req.params as { sourceId: string };
  const secret = (req.headers['x-webhook-secret'] as string) || (req.query.secret as string) || '';

  const { tenantId } = monitoringService.validateWebhookSecret(sourceId, secret);

  // Accept array or single event
  const payloads: monitoringService.WebhookPayload[] = Array.isArray(req.body) ? req.body : [req.body];
  const results = payloads.map((payload) => monitoringService.ingestWebhookEvent(tenantId, sourceId, payload));

  sendSuccess(res, { received: results.length, events: results });
}

// =============================================================================
// Stats
// =============================================================================

export function getStats(req: Request, res: Response) {
  const data = monitoringService.getEventStats(requireTenantId(req));
  sendSuccess(res, data);
}
