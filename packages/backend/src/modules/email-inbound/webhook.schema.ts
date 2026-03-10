import { z } from 'zod';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

import { config } from '../../config/index.js';
// AUDIT-FIX: H-11 — Structured logging
import logger from '../../lib/logger.js';
// AUDIT-FIX: M-12 — Use standard error response helper
import { sendError } from '../../lib/response.js';

// AUDIT-FIX: C-09 — Zod schemas for Mailgun and SendGrid webhook payloads

/**
 * Mailgun inbound webhook payload.
 * Relevant fields for email→ticket conversion.
 */
export const mailgunWebhookSchema = z.object({
  sender: z.string().email().optional(),
  From: z.string().optional(),
  recipient: z.string().optional(),
  To: z.string().optional(),
  Subject: z.string().optional().default('(no subject)'),
  'body-plain': z.string().nullable().optional(),
  'body-html': z.string().nullable().optional(),
  'Message-Id': z.string().optional(),
  'In-Reply-To': z.string().optional(),
  References: z.string().optional(),
  // Mailgun signature fields
  timestamp: z.string().optional(),
  token: z.string().optional(),
  signature: z.string().optional(),
}).passthrough();

/**
 * SendGrid inbound parse event (single entry).
 */
const sendgridEventSchema = z.object({
  from: z.string().optional().default(''),
  to: z.string().optional().default(''),
  subject: z.string().optional().default('(no subject)'),
  text: z.string().nullable().optional(),
  html: z.string().nullable().optional(),
  headers: z.string().optional(),
  'message-id': z.string().optional(),
  'in-reply-to': z.string().optional(),
}).passthrough();

/**
 * SendGrid sends an array of events or a single object depending on config.
 */
export const sendgridWebhookSchema = z.array(sendgridEventSchema).min(1);

/**
 * Union schema: accepts either Mailgun (object) or SendGrid (array) format.
 */
export const webhookPayloadSchema = z.union([
  sendgridWebhookSchema,
  mailgunWebhookSchema,
]);

// AUDIT-FIX: C-08 — Webhook signature validation middleware

/**
 * Validate Mailgun HMAC-SHA256 signature.
 * Mailgun signs: timestamp + token with the webhook signing key.
 */
function verifyMailgunSignature(
  timestamp: string,
  token: string,
  signature: string,
  secret: string,
): boolean {
  const computed = createHmac('sha256', secret)
    .update(timestamp + token)
    .digest('hex');

  try {
    return timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  } catch {
    return false;
  }
}

/**
 * Validate SendGrid HMAC-SHA256 signature.
 * SendGrid signs the raw body with the verification key (x-twilio-email-event-webhook-signature).
 */
function verifySendgridSignature(
  body: string,
  signatureHeader: string,
  secret: string,
): boolean {
  const computed = createHmac('sha256', secret)
    .update(body)
    .digest('base64');

  try {
    return timingSafeEqual(
      Buffer.from(computed, 'base64'),
      Buffer.from(signatureHeader, 'base64'),
    );
  } catch {
    return false;
  }
}

/**
 * Middleware that validates the webhook signature for Mailgun and SendGrid.
 * If emailWebhookSecret is not configured, the middleware is skipped
 * with a warning (to not break existing dev setups).
 */
export function validateWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const secret = config.emailWebhookSecret;

  // If no secret is configured, skip validation (dev/test only)
  if (!secret) {
    if (config.nodeEnv === 'production') {
      // AUDIT-FIX: H-11 — Structured logging
      logger.warn('EMAIL_WEBHOOK_SECRET is not set in production — webhook signature validation disabled');
    }
    next();
    return;
  }

  const body = req.body;

  if (Array.isArray(body)) {
    // SendGrid format — check header signature
    const sigHeader =
      (req.headers['x-twilio-email-event-webhook-signature'] as string) ?? '';

    if (!sigHeader) {
      sendError(res, 401, 'UNAUTHORIZED', 'Missing webhook signature header');
      return;
    }

    // SendGrid signs the raw body; we need the raw body string.
    // Express stores it if we configure express.json with verify callback.
    // As a fallback, stringify the parsed body.
    const rawBody = (req as unknown as Record<string, unknown>)['rawBody'] as string
      ?? JSON.stringify(body);

    if (!verifySendgridSignature(rawBody, sigHeader, secret)) {
      sendError(res, 401, 'UNAUTHORIZED', 'Invalid webhook signature');
      return;
    }
  } else {
    // Mailgun format — check timestamp + token + signature fields
    const timestamp = (body as Record<string, unknown>)['timestamp'] as string | undefined;
    const token = (body as Record<string, unknown>)['token'] as string | undefined;
    const signature = (body as Record<string, unknown>)['signature'] as string | undefined;

    if (!timestamp || !token || !signature) {
      sendError(res, 401, 'UNAUTHORIZED', 'Missing webhook signature fields (timestamp, token, signature)');
      return;
    }

    if (!verifyMailgunSignature(timestamp, token, signature, secret)) {
      sendError(res, 401, 'UNAUTHORIZED', 'Invalid webhook signature');
      return;
    }
  }

  next();
}
