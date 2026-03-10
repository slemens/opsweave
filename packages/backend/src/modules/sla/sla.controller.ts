import type { Request, Response } from 'express';
import { sendSuccess, sendCreated, sendNoContent } from '../../lib/response.js';
// AUDIT-FIX: M-04 — Safe context accessors instead of non-null assertions
import { requireTenantId } from '../../lib/context.js';
import * as slaService from './sla.service.js';

// ─── SLA Definitions ──────────────────────────────────────

export function listDefinitions(req: Request, res: Response) {
  const data = slaService.listSlaDefinitions(requireTenantId(req));
  sendSuccess(res, data);
}

export function getDefinition(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const data = slaService.getSlaDefinition(requireTenantId(req), id);
  sendSuccess(res, data);
}

export function createDefinition(req: Request, res: Response) {
  const data = slaService.createSlaDefinition(requireTenantId(req), req.body);
  sendCreated(res, data);
}

export function updateDefinition(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const data = slaService.updateSlaDefinition(requireTenantId(req), id, req.body);
  sendSuccess(res, data);
}

export function deleteDefinition(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  slaService.deleteSlaDefinition(requireTenantId(req), id);
  sendNoContent(res);
}

// ─── SLA Assignments ──────────────────────────────────────

export function listAssignments(req: Request, res: Response) {
  const data = slaService.listSlaAssignments(requireTenantId(req));
  sendSuccess(res, data);
}

export function createAssignment(req: Request, res: Response) {
  const data = slaService.createSlaAssignment(requireTenantId(req), req.body);
  sendCreated(res, data);
}

export function deleteAssignment(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  slaService.deleteSlaAssignment(requireTenantId(req), id);
  sendNoContent(res);
}

// ─── SLA Resolution (preview) ─────────────────────────────

// ─── SLA Reports ──────────────────────────────────────────

export function performanceReport(req: Request, res: Response) {
  const days = parseInt(req.query['days'] as string, 10) || 30;
  const data = slaService.getSlaPerformanceReport(requireTenantId(req), days);
  sendSuccess(res, data);
}

export function resolveEffective(req: Request, res: Response) {
  const { asset_id, customer_id, service_id } = req.query as Record<string, string>;
  const result = slaService.resolveEffectiveSla(requireTenantId(req), {
    asset_id: asset_id || null,
    customer_id: customer_id || null,
    service_id: service_id || null,
  });
  sendSuccess(res, result);
}
