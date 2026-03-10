import type { Request, Response } from 'express';
import { sendSuccess, sendCreated, sendNoContent } from '../../lib/response.js';
import * as slaService from './sla.service.js';

// ─── SLA Definitions ──────────────────────────────────────

export function listDefinitions(req: Request, res: Response) {
  const data = slaService.listSlaDefinitions(req.tenantId!);
  sendSuccess(res, data);
}

export function getDefinition(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const data = slaService.getSlaDefinition(req.tenantId!, id);
  sendSuccess(res, data);
}

export function createDefinition(req: Request, res: Response) {
  const data = slaService.createSlaDefinition(req.tenantId!, req.body);
  sendCreated(res, data);
}

export function updateDefinition(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const data = slaService.updateSlaDefinition(req.tenantId!, id, req.body);
  sendSuccess(res, data);
}

export function deleteDefinition(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  slaService.deleteSlaDefinition(req.tenantId!, id);
  sendNoContent(res);
}

// ─── SLA Assignments ──────────────────────────────────────

export function listAssignments(req: Request, res: Response) {
  const data = slaService.listSlaAssignments(req.tenantId!);
  sendSuccess(res, data);
}

export function createAssignment(req: Request, res: Response) {
  const data = slaService.createSlaAssignment(req.tenantId!, req.body);
  sendCreated(res, data);
}

export function deleteAssignment(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  slaService.deleteSlaAssignment(req.tenantId!, id);
  sendNoContent(res);
}

// ─── SLA Resolution (preview) ─────────────────────────────

export function resolveEffective(req: Request, res: Response) {
  const { asset_id, customer_id, service_id } = req.query as Record<string, string>;
  const result = slaService.resolveEffectiveSla(req.tenantId!, {
    asset_id: asset_id || null,
    customer_id: customer_id || null,
    service_id: service_id || null,
  });
  sendSuccess(res, result);
}
