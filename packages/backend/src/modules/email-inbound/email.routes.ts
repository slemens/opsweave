import { Router, json } from 'express';

import { requireRole } from '../../middleware/auth.js';
import { validate, validateQuery, validateParams } from '../../middleware/validate.js';
import {
  paginationSchema,
  idParamSchema,
  createEmailConfigSchema,
  updateEmailConfigSchema,
  emailFilterSchema,
} from '@opsweave/shared';

import {
  listConfigs,
  getConfig,
  createConfig,
  updateConfig,
  deleteConfig,
  testConnection,
  listMessages,
  getMessage,
  processWebhook,
} from './email.controller.js';
import { validateWebhookSignature, webhookPayloadSchema } from './webhook.schema.js';

// ─── Router ───────────────────────────────────────────────

const emailRouter = Router();

// ─── Public Webhook Router (no auth) ─────────────────────
// Mounted OUTSIDE the protectedRouter in routes/index.ts so that
// external email providers (Mailgun, SendGrid) can reach it without JWT.
// Auth is handled via webhook signature validation middleware.
const emailWebhookRouter = Router();
emailWebhookRouter.post(
  '/email/webhook',
  json({ limit: '5mb' }),
  validateWebhookSignature,
  validate(webhookPayloadSchema),
  processWebhook,
);

// ─── Authenticated Routes ─────────────────────────────────
// Note: emailRouter is mounted inside protectedRouter (routes/index.ts),
// which already applies requireAuth + tenantMiddleware + auditMiddleware.

// ─── Config Routes ────────────────────────────────────────

/**
 * GET /api/v1/email/configs
 * List email inbound configs.
 */
emailRouter.get(
  '/configs',
  validateQuery(paginationSchema),
  listConfigs,
);

/**
 * POST /api/v1/email/configs
 * Create a new email inbound config.
 */
emailRouter.post(
  '/configs',
  requireRole('admin', 'manager'),
  validate(createEmailConfigSchema),
  createConfig,
);

/**
 * GET /api/v1/email/configs/:id
 * Get a single email inbound config.
 */
emailRouter.get(
  '/configs/:id',
  validateParams(idParamSchema),
  getConfig,
);

/**
 * PUT /api/v1/email/configs/:id
 * Update an email inbound config.
 */
emailRouter.put(
  '/configs/:id',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  validate(updateEmailConfigSchema),
  updateConfig,
);

/**
 * DELETE /api/v1/email/configs/:id
 * Delete an email inbound config.
 */
emailRouter.delete(
  '/configs/:id',
  requireRole('admin'),
  validateParams(idParamSchema),
  deleteConfig,
);

/**
 * POST /api/v1/email/configs/:id/test
 * Test the connection for an email inbound config.
 * For IMAP: verifies credentials and returns available mailboxes.
 * For webhook-based providers: returns a static success message.
 */
emailRouter.post(
  '/configs/:id/test',
  requireRole('admin', 'manager'),
  validateParams(idParamSchema),
  testConnection,
);

// ─── Message Routes ───────────────────────────────────────

/**
 * GET /api/v1/email/messages
 * List email messages with optional filters (config_id, processed).
 */
emailRouter.get(
  '/messages',
  validateQuery(emailFilterSchema),
  listMessages,
);

/**
 * GET /api/v1/email/messages/:id
 * Get a single email message.
 */
emailRouter.get(
  '/messages/:id',
  validateParams(idParamSchema),
  getMessage,
);

export { emailRouter, emailWebhookRouter };
