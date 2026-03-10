import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import { notificationPreferences, users, tenantUserMemberships } from '../../db/schema/index.js';
import logger from '../../lib/logger.js';
import { renderNotificationEmail } from './notification.templates.js';

// ─── DB Helper ────────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}

// ─── Constants ────────────────────────────────────────────

export const NOTIFICATION_EVENT_TYPES = [
  'ticket_assigned',
  'ticket_status_changed',
  'ticket_commented',
  'sla_warning',
  'sla_breached',
  'ticket_escalated',
  'major_incident_declared',
  'major_incident_resolved',
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export interface NotificationPayload {
  ticket_id: string;
  ticket_number: string;
  ticket_title: string;
  ticket_type: string;
  changed_by_name?: string;
  old_value?: string | null;
  new_value?: string | null;
  comment_content?: string;
  field_changed?: string;
}

// ─── Preferences ──────────────────────────────────────────

export async function getPreferences(tenantId: string, userId: string) {
  const d = db();
  const rows = await d
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.tenant_id, tenantId),
        eq(notificationPreferences.user_id, userId),
      ),
    );
  return rows;
}

export async function upsertPreference(
  tenantId: string,
  userId: string,
  eventType: string,
  channel: string,
  enabled: boolean,
) {
  const d = db();
  const now = new Date().toISOString();

  // Check if preference exists
  const existing = await d
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.tenant_id, tenantId),
        eq(notificationPreferences.user_id, userId),
        eq(notificationPreferences.event_type, eventType),
        eq(notificationPreferences.channel, channel),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await d
      .update(notificationPreferences)
      .set({ enabled: enabled ? 1 : 0 })
      .where(eq(notificationPreferences.id, existing[0]!.id));
    return { ...existing[0], enabled: enabled ? 1 : 0 };
  }

  const id = uuidv4();
  const [created] = await d
    .insert(notificationPreferences)
    .values({
      id,
      tenant_id: tenantId,
      user_id: userId,
      event_type: eventType,
      channel,
      enabled: enabled ? 1 : 0,
      created_at: now,
    })
    .returning();

  return created;
}

export async function bulkUpsertPreferences(
  tenantId: string,
  userId: string,
  preferences: Array<{ event_type: string; channel: string; enabled: boolean }>,
) {
  const results = [];
  for (const pref of preferences) {
    const result = await upsertPreference(tenantId, userId, pref.event_type, pref.channel, pref.enabled);
    results.push(result);
  }
  return results;
}

// ─── Notification Dispatch ────────────────────────────────

/**
 * Central notification dispatch: determines affected users, checks preferences,
 * and sends notifications asynchronously (fire-and-forget).
 */
export async function notify(
  tenantId: string,
  eventType: NotificationEventType,
  payload: NotificationPayload,
  affectedUserIds: string[],
) {
  // Fire-and-forget — don't await, just log errors
  void dispatchNotifications(tenantId, eventType, payload, affectedUserIds).catch((err) => {
    logger.error({ err, tenantId, eventType }, 'Notification dispatch failed');
  });
}

async function dispatchNotifications(
  tenantId: string,
  eventType: NotificationEventType,
  payload: NotificationPayload,
  affectedUserIds: string[],
) {
  if (affectedUserIds.length === 0) return;

  const d = db();

  // Get all preferences for affected users for this event type
  for (const userId of affectedUserIds) {
    try {
      // Check if user has a preference for this event
      const prefs = await d
        .select()
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.tenant_id, tenantId),
            eq(notificationPreferences.user_id, userId),
            eq(notificationPreferences.event_type, eventType),
            eq(notificationPreferences.channel, 'email'),
          ),
        )
        .limit(1);

      // Default: enabled (if no preference record exists, notifications are ON)
      const isEnabled = prefs.length === 0 || prefs[0]!.enabled === 1;

      if (!isEnabled) {
        logger.debug({ userId, eventType }, 'Notification disabled by user preference');
        continue;
      }

      // Get user email
      const [user] = await d
        .select({ email: users.email, display_name: users.display_name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user?.email) continue;

      // Render email
      const { subject } = renderNotificationEmail(eventType, payload);

      // Log notification (email sending is a stub until SMTP is configured)
      logger.info(
        { userId, email: user.email, eventType, ticketNumber: payload.ticket_number, subject },
        'Notification queued',
      );

      // TODO: Send actual email via nodemailer when SMTP settings are configured
      // For now, this serves as the notification audit trail via structured logging
    } catch (err) {
      logger.error({ err, userId, eventType }, 'Failed to process notification for user');
    }
  }
}

/**
 * Determine affected users for a ticket event.
 */
export async function getAffectedUsers(
  _tenantId: string,
  ticketAssigneeId: string | null,
  ticketReporterId: string,
  excludeUserId?: string,
): Promise<string[]> {
  const userIds = new Set<string>();

  if (ticketAssigneeId) userIds.add(ticketAssigneeId);
  userIds.add(ticketReporterId);

  // Remove the user who triggered the action
  if (excludeUserId) userIds.delete(excludeUserId);

  return Array.from(userIds);
}

/**
 * Get all admin/manager users in a tenant (for major incident notifications).
 */
export async function getTenantAdminsAndManagers(tenantId: string): Promise<string[]> {
  const d = db();
  const rows = await d
    .select({ user_id: tenantUserMemberships.user_id })
    .from(tenantUserMemberships)
    .where(
      and(
        eq(tenantUserMemberships.tenant_id, tenantId),
      ),
    );

  // Filter for admin/manager roles
  return rows
    .filter((r) => {
      const role = (r as Record<string, unknown>).role as string | undefined;
      return role === 'admin' || role === 'manager';
    })
    .map((r) => r.user_id);
}
