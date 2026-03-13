import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { requireTenantId, requireUserId } from '../../lib/context.js';
import { sendSuccess } from '../../lib/response.js';
import {
  getPreferences,
  bulkUpsertPreferences,
  NOTIFICATION_EVENT_TYPES,
} from './notification.service.js';

const notificationRouter = Router();

notificationRouter.use(requireAuth);

// ─── Schemas ──────────────────────────────────────────────

const updatePreferencesSchema = z.object({
  preferences: z.array(
    z.object({
      event_type: z.string(),
      channel: z.string().default('email'),
      enabled: z.union([z.boolean(), z.number()]).transform((v) => (typeof v === 'number' ? v !== 0 : v)),
    }),
  ),
});

// ─── GET /preferences ─────────────────────────────────────
// Returns current user's notification preferences with defaults

notificationRouter.get('/preferences', async (req, res, next) => {
  try {
    const tenantId = requireTenantId(req);
    const userId = requireUserId(req);

    const saved = await getPreferences(tenantId, userId);

    // Build a complete preferences map with defaults (all enabled)
    const prefsMap = new Map(
      saved.map((p) => [`${p.event_type}:${p.channel}`, p]),
    );

    const preferences = NOTIFICATION_EVENT_TYPES.map((eventType) => {
      const key = `${eventType}:email`;
      const existing = prefsMap.get(key);
      return {
        event_type: eventType,
        channel: 'email',
        enabled: existing ? existing.enabled === 1 : true, // default: enabled
      };
    });

    sendSuccess(res, preferences);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /preferences ─────────────────────────────────────
// Bulk update notification preferences

notificationRouter.put(
  '/preferences',
  validate(updatePreferencesSchema),
  async (req, res, next) => {
    try {
      const tenantId = requireTenantId(req);
      const userId = requireUserId(req);
      const { preferences } = req.body;

      await bulkUpsertPreferences(tenantId, userId, preferences);

      // Return updated preferences
      const saved = await getPreferences(tenantId, userId);
      const prefsMap = new Map(
        saved.map((p) => [`${p.event_type}:${p.channel}`, p]),
      );

      const result = NOTIFICATION_EVENT_TYPES.map((eventType) => {
        const key = `${eventType}:email`;
        const existing = prefsMap.get(key);
        return {
          event_type: eventType,
          channel: 'email',
          enabled: existing ? existing.enabled === 1 : true,
        };
      });

      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

export default notificationRouter;
