import type { Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';

import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNoContent,
} from '../../lib/response.js';
import { getDb, type TypedDb } from '../../config/database.js';
import { emailInboundConfigs } from '../../db/schema/index.js';
import * as emailService from './email.service.js';
import type { InboundEmailData } from './email.service.js';
import { ImapPoller } from './imap-poller.js';
import type {
  PaginationParams,
  EmailFilterParams,
  CreateEmailConfigInput,
  UpdateEmailConfigInput,
} from '@opsweave/shared';

// ─── Config Controllers ───────────────────────────────────

/**
 * GET /api/v1/email/configs
 */
export async function listConfigs(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const params = ((req as unknown as Record<string, unknown>)['parsedQuery'] ?? req.query) as unknown as PaginationParams;

  const { configs, total } = await emailService.listEmailConfigs(tenantId, params);
  sendPaginated(res, configs, total, params.page ?? 1, params.limit ?? 25);
}

/**
 * GET /api/v1/email/configs/:id
 */
export async function getConfig(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };

  const config = await emailService.getEmailConfig(tenantId, id);
  sendSuccess(res, config);
}

/**
 * POST /api/v1/email/configs
 */
export async function createConfig(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const data = req.body as CreateEmailConfigInput;

  const config = await emailService.createEmailConfig(tenantId, data);
  sendCreated(res, config);
}

/**
 * PUT /api/v1/email/configs/:id
 */
export async function updateConfig(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };
  const data = req.body as UpdateEmailConfigInput;

  const config = await emailService.updateEmailConfig(tenantId, id, data);
  sendSuccess(res, config);
}

/**
 * DELETE /api/v1/email/configs/:id
 */
export async function deleteConfig(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };

  await emailService.deleteEmailConfig(tenantId, id);
  sendNoContent(res);
}

// ─── Message Controllers ──────────────────────────────────

/**
 * GET /api/v1/email/messages
 */
export async function listMessages(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const params = ((req as unknown as Record<string, unknown>)['parsedQuery'] ?? req.query) as unknown as EmailFilterParams;

  const { messages, total } = await emailService.listEmailMessages(tenantId, params);
  sendPaginated(res, messages, total, params.page ?? 1, params.limit ?? 25);
}

/**
 * GET /api/v1/email/messages/:id
 */
export async function getMessage(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };

  const message = await emailService.getEmailMessage(tenantId, id);
  sendSuccess(res, message);
}

// ─── Connection Test Controller ───────────────────────────

/**
 * POST /api/v1/email/configs/:id/test
 *
 * Tests connectivity for the given email inbound config.
 * For IMAP configs: establishes a live connection and returns the list of
 * available mailboxes.
 * For webhook-based configs: returns immediately (no server-side connection
 * to verify).
 */
export async function testConnection(
  req: Request,
  res: Response,
): Promise<void> {
  const tenantId = req.tenantId!;
  const { id } = req.params as { id: string };

  const config = await emailService.getEmailConfig(tenantId, id);

  if (config.provider !== 'imap') {
    sendSuccess(res, {
      success: true,
      message:
        'Webhook-basierte Provider benötigen keinen Verbindungstest. ' +
        'Konfigurieren Sie die Webhook-URL in Ihrem E-Mail-Provider.',
    });
    return;
  }

  const poller = new ImapPoller(config);
  const result = await poller.testConnection();
  sendSuccess(res, result);
}

// ─── Webhook Controller ───────────────────────────────────

/**
 * POST /api/v1/email/webhook
 *
 * Public endpoint — called by external email providers (Mailgun, SendGrid, etc.).
 * No auth middleware on this route.
 *
 * Mailgun format: req.body fields include `sender`, `Subject`, `body-plain`,
 *   `Message-Id`, `In-Reply-To`, `To`, `recipient`.
 *
 * SendGrid format: req.body is an array of inbound parse event objects,
 *   each with `from`, `subject`, `text`, `html`, `headers`, `to`,
 *   `message-id`.
 *
 * TODO: validate webhook secret for each provider.
 */
export async function processWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  const body = req.body as Record<string, unknown> | Array<Record<string, unknown>>;

  let emailData: InboundEmailData;
  let toAddress: string;

  if (Array.isArray(body)) {
    // SendGrid inbound parse — array of events
    const event = body[0] ?? {};

    const from = (event['from'] as string | undefined) ?? '';
    const fromParts = parseFromAddress(from);

    toAddress = (event['to'] as string | undefined) ?? '';

    emailData = {
      message_id: (event['message-id'] as string | undefined) ?? `sg-${Date.now()}@opsweave`,
      from_address: fromParts.address,
      from_name: fromParts.name ?? null,
      to_address: toAddress,
      subject: (event['subject'] as string | undefined) ?? '(no subject)',
      body_text: (event['text'] as string | undefined) ?? null,
      body_html: (event['html'] as string | undefined) ?? null,
      headers: parseHeadersString(event['headers'] as string | undefined),
      thread_reference: (event['in-reply-to'] as string | undefined) ?? null,
      received_at: new Date().toISOString(),
    };
  } else {
    // Mailgun inbound — flat object
    const from = (body['sender'] as string | undefined) ?? (body['From'] as string | undefined) ?? '';
    const fromParts = parseFromAddress(from);

    toAddress = (body['recipient'] as string | undefined)
      ?? (body['To'] as string | undefined)
      ?? '';

    const threadRef = [
      body['In-Reply-To'] as string | undefined,
      body['References'] as string | undefined,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() || null;

    emailData = {
      message_id: (body['Message-Id'] as string | undefined) ?? `mg-${Date.now()}@opsweave`,
      from_address: fromParts.address,
      from_name: fromParts.name ?? null,
      to_address: toAddress,
      subject: (body['Subject'] as string | undefined) ?? '(no subject)',
      body_text: (body['body-plain'] as string | undefined) ?? null,
      body_html: (body['body-html'] as string | undefined) ?? null,
      headers: {},
      thread_reference: threadRef,
      received_at: new Date().toISOString(),
    };
  }

  // Resolve the tenant and config from the recipient address.
  // Strategy: find the first active config whose to_address matches,
  // falling back to the first active config for the tenant if req.tenantId
  // is available (e.g. from a query param set by a reverse proxy).
  //
  // When called by an email provider the request is unauthenticated, so
  // tenantId may be absent. In that case we look up the config by address.
  const tenantId = req.tenantId ?? null;

  const d = getDb() as TypedDb;

  let configRow: { id: string; tenant_id: string } | undefined;

  if (tenantId) {
    const conditions = [
      eq(emailInboundConfigs.tenant_id, tenantId),
      eq(emailInboundConfigs.is_active, 1),
    ];

    // Prefer the config whose address matches the recipient
    const allConfigs = await d
      .select({ id: emailInboundConfigs.id, tenant_id: emailInboundConfigs.tenant_id })
      .from(emailInboundConfigs)
      .where(and(...conditions));

    configRow = allConfigs[0];
  } else {
    // No tenant context: look up by matching config name/address is not
    // directly supported without an extra address column. Fall back to
    // returning a 200 immediately so the provider does not retry.
    sendSuccess(res, { received: true, processed: false, reason: 'no_tenant_context' });
    return;
  }

  if (!configRow) {
    sendSuccess(res, { received: true, processed: false, reason: 'no_active_config' });
    return;
  }

  const result = await emailService.processInboundEmail(
    configRow.tenant_id,
    configRow.id,
    emailData,
  );

  sendSuccess(res, {
    received: true,
    processed: true,
    message_id: result.message.id,
    ticket_id: result.message.ticket_id,
    is_new: result.isNew,
  });
}

// ─── Private Helpers ──────────────────────────────────────

/**
 * Parse a "Name <email>" or plain email address string.
 */
function parseFromAddress(raw: string): { address: string; name: string | null } {
  if (!raw) {
    return { address: '', name: null };
  }

  const match = raw.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    const name = match[1]!.trim().replace(/^["']|["']$/g, '');
    return { address: match[2]!.trim(), name: name || null };
  }

  return { address: raw.trim(), name: null };
}

/**
 * Parse a raw headers string (e.g. from SendGrid) into a key-value map.
 * Handles multi-line (folded) header values.
 */
function parseHeadersString(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};

  const headers: Record<string, unknown> = {};

  const lines = raw.split(/\r?\n/);
  let currentKey: string | null = null;

  for (const line of lines) {
    if (/^\s+/.test(line) && currentKey) {
      // Folded continuation line
      const existing = headers[currentKey];
      headers[currentKey] = `${String(existing)} ${line.trim()}`;
    } else {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        currentKey = line.slice(0, colonIdx).trim().toLowerCase();
        headers[currentKey] = line.slice(colonIdx + 1).trim();
      }
    }
  }

  return headers;
}
