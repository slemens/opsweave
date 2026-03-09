import { eq, and, count, like, desc, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import {
  emailInboundConfigs,
  emailMessages,
  tickets,
  ticketComments,
} from '../../db/schema/index.js';
import { NotFoundError } from '../../lib/errors.js';
import type {
  CreateEmailConfigInput,
  UpdateEmailConfigInput,
  EmailFilterParams,
  PaginationParams,
} from '@opsweave/shared';
import { TICKET_NUMBER_PREFIXES } from '@opsweave/shared';

// ─── DB Helper ────────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}

// ─── Types ────────────────────────────────────────────────

interface EmailConfigRow {
  id: string;
  tenant_id: string;
  name: string;
  provider: string;
  config: string;
  target_group_id: string | null;
  default_ticket_type: string;
  is_active: number;
  created_at: string;
}

interface EmailMessageRow {
  id: string;
  tenant_id: string;
  config_id: string;
  message_id: string;
  from_address: string;
  from_name: string | null;
  to_address: string;
  subject: string;
  body_text: string | null;
  body_html: string | null;
  headers: string;
  ticket_id: string | null;
  is_reply: number;
  thread_reference: string | null;
  processed: number;
  received_at: string;
  processed_at: string | null;
}

export interface InboundEmailData {
  message_id: string;
  from_address: string;
  from_name?: string | null;
  to_address: string;
  subject: string;
  body_text?: string | null;
  body_html?: string | null;
  headers?: Record<string, unknown>;
  thread_reference?: string | null;
  received_at?: string;
}

// ─── Ticket Number Helper ─────────────────────────────────

/**
 * Generate a ticket number in the format INC-YYYY-NNNNN.
 * Counts existing tickets of the given type for the tenant to determine
 * the next sequential number.
 */
async function generateTicketNumber(
  tenantId: string,
  ticketType: string,
): Promise<string> {
  const d = db();
  const year = new Date().getFullYear().toString();
  const prefix = TICKET_NUMBER_PREFIXES[ticketType] ?? 'INC';

  const [result] = await d
    .select({ count: count() })
    .from(tickets)
    .where(
      and(
        eq(tickets.tenant_id, tenantId),
        eq(tickets.ticket_type, ticketType),
      ),
    );

  const total = (result?.count ?? 0) + 1;
  const padded = String(total).padStart(5, '0');

  return `${prefix}-${year}-${padded}`;
}

// ─── Email Config Service ─────────────────────────────────

/**
 * List email inbound configs for a tenant.
 */
export async function listEmailConfigs(
  tenantId: string,
  params: PaginationParams,
): Promise<{ configs: EmailConfigRow[]; total: number }> {
  const d = db();
  const { page, limit, q } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(emailInboundConfigs.tenant_id, tenantId)];

  if (q) {
    conditions.push(
      like(emailInboundConfigs.name, `%${q}%`),
    );
  }

  const [totalResult] = await d
    .select({ count: count() })
    .from(emailInboundConfigs)
    .where(and(...conditions));

  const total = totalResult?.count ?? 0;

  const rows = await d
    .select()
    .from(emailInboundConfigs)
    .where(and(...conditions))
    .orderBy(desc(emailInboundConfigs.created_at))
    .limit(limit)
    .offset(offset);

  return { configs: rows, total };
}

/**
 * Get a single email inbound config.
 */
export async function getEmailConfig(
  tenantId: string,
  configId: string,
): Promise<EmailConfigRow> {
  const d = db();

  const rows = await d
    .select()
    .from(emailInboundConfigs)
    .where(
      and(
        eq(emailInboundConfigs.id, configId),
        eq(emailInboundConfigs.tenant_id, tenantId),
      ),
    )
    .limit(1);

  const config = rows[0];
  if (!config) {
    throw new NotFoundError('Email config not found');
  }

  return config;
}

/**
 * Create a new email inbound config.
 */
export async function createEmailConfig(
  tenantId: string,
  data: CreateEmailConfigInput,
): Promise<EmailConfigRow> {
  const d = db();
  const now = new Date().toISOString();
  const id = uuidv4();

  const [created] = await d
    .insert(emailInboundConfigs)
    .values({
      id,
      tenant_id: tenantId,
      name: data.name,
      provider: data.provider,
      config: JSON.stringify(data.config ?? {}),
      target_group_id: data.target_group_id ?? null,
      default_ticket_type: data.default_ticket_type ?? 'incident',
      is_active: data.is_active === false ? 0 : 1,
      created_at: now,
    })
    .returning();

  return created!;
}

/**
 * Update an existing email inbound config.
 */
export async function updateEmailConfig(
  tenantId: string,
  configId: string,
  data: UpdateEmailConfigInput,
): Promise<EmailConfigRow> {
  const d = db();

  const existing = await d
    .select({ id: emailInboundConfigs.id })
    .from(emailInboundConfigs)
    .where(
      and(
        eq(emailInboundConfigs.id, configId),
        eq(emailInboundConfigs.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    throw new NotFoundError('Email config not found');
  }

  const updateSet: Record<string, unknown> = {};

  if (data.name !== undefined) updateSet['name'] = data.name;
  if (data.provider !== undefined) updateSet['provider'] = data.provider;
  if (data.config !== undefined) updateSet['config'] = JSON.stringify(data.config);
  if (data.target_group_id !== undefined) updateSet['target_group_id'] = data.target_group_id;
  if (data.default_ticket_type !== undefined) updateSet['default_ticket_type'] = data.default_ticket_type;
  if (data.is_active !== undefined) updateSet['is_active'] = data.is_active === false ? 0 : 1;

  if (Object.keys(updateSet).length === 0) {
    const rows = await d
      .select()
      .from(emailInboundConfigs)
      .where(eq(emailInboundConfigs.id, configId))
      .limit(1);
    return rows[0]!;
  }

  const [updated] = await d
    .update(emailInboundConfigs)
    .set(updateSet)
    .where(
      and(
        eq(emailInboundConfigs.id, configId),
        eq(emailInboundConfigs.tenant_id, tenantId),
      ),
    )
    .returning();

  if (!updated) {
    throw new NotFoundError('Email config not found');
  }

  return updated;
}

/**
 * Delete an email inbound config.
 */
export async function deleteEmailConfig(
  tenantId: string,
  configId: string,
): Promise<void> {
  const d = db();

  const existing = await d
    .select({ id: emailInboundConfigs.id })
    .from(emailInboundConfigs)
    .where(
      and(
        eq(emailInboundConfigs.id, configId),
        eq(emailInboundConfigs.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    throw new NotFoundError('Email config not found');
  }

  await d
    .delete(emailInboundConfigs)
    .where(
      and(
        eq(emailInboundConfigs.id, configId),
        eq(emailInboundConfigs.tenant_id, tenantId),
      ),
    );
}

// ─── Email Message Service ────────────────────────────────

/**
 * List email messages for a tenant with optional filters.
 */
export async function listEmailMessages(
  tenantId: string,
  params: EmailFilterParams,
): Promise<{ messages: EmailMessageRow[]; total: number }> {
  const d = db();
  const { page, limit, config_id, processed } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(emailMessages.tenant_id, tenantId)];

  if (config_id) {
    conditions.push(eq(emailMessages.config_id, config_id));
  }

  if (processed === 'true') {
    conditions.push(eq(emailMessages.processed, 1));
  } else if (processed === 'false') {
    conditions.push(eq(emailMessages.processed, 0));
  }

  const [totalResult] = await d
    .select({ count: count() })
    .from(emailMessages)
    .where(and(...conditions));

  const total = totalResult?.count ?? 0;

  const rows = await d
    .select()
    .from(emailMessages)
    .where(and(...conditions))
    .orderBy(desc(emailMessages.received_at))
    .limit(limit)
    .offset(offset);

  return { messages: rows, total };
}

/**
 * Get a single email message.
 */
export async function getEmailMessage(
  tenantId: string,
  messageId: string,
): Promise<EmailMessageRow> {
  const d = db();

  const rows = await d
    .select()
    .from(emailMessages)
    .where(
      and(
        eq(emailMessages.id, messageId),
        eq(emailMessages.tenant_id, tenantId),
      ),
    )
    .limit(1);

  const message = rows[0];
  if (!message) {
    throw new NotFoundError('Email message not found');
  }

  return message;
}

// ─── Inbound Email Processing ─────────────────────────────

/**
 * Process an inbound email:
 * 1. Dedup by message_id
 * 2. Thread-match via thread_reference or subject ticket number
 * 3. If matched: add comment to existing ticket
 * 4. If no match: create new ticket and assign to config's target group
 * 5. Insert email_message record
 */
export async function processInboundEmail(
  tenantId: string,
  configId: string,
  emailData: InboundEmailData,
): Promise<{ message: EmailMessageRow; ticket: unknown; isNew: boolean }> {
  const d = db();
  const now = new Date().toISOString();

  // 1. Dedup: check for existing message_id within tenant
  const existingMsg = await d
    .select({ id: emailMessages.id })
    .from(emailMessages)
    .where(
      and(
        eq(emailMessages.tenant_id, tenantId),
        eq(emailMessages.message_id, emailData.message_id),
      ),
    )
    .limit(1);

  if (existingMsg.length > 0) {
    // Already processed — retrieve and return the existing message
    const rows = await d
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.id, existingMsg[0]!.id))
      .limit(1);

    const existingMessage = rows[0]!;
    const existingTicket = existingMessage.ticket_id
      ? await d.select().from(tickets).where(eq(tickets.id, existingMessage.ticket_id)).limit(1).then((r) => r[0] ?? null)
      : null;

    return { message: existingMessage, ticket: existingTicket, isNew: false };
  }

  // 2. Thread-matching
  let matchedTicketId: string | null = null;

  // 2a. Check thread_reference against known message_ids
  if (emailData.thread_reference) {
    const threadRefs = emailData.thread_reference
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (threadRefs.length > 0) {
      const refConditions = threadRefs.map((ref) =>
        eq(emailMessages.message_id, ref),
      );

      const refMatches = await d
        .select({ ticket_id: emailMessages.ticket_id })
        .from(emailMessages)
        .where(
          and(
            eq(emailMessages.tenant_id, tenantId),
            or(...refConditions),
          ),
        )
        .limit(1);

      if (refMatches.length > 0 && refMatches[0]!.ticket_id) {
        matchedTicketId = refMatches[0]!.ticket_id;
      }
    }
  }

  // 2b. Check subject for ticket number pattern: [INC-YYYY-NNNNN], [CHG-YYYY-NNNNN], [PRB-YYYY-NNNNN]
  if (!matchedTicketId) {
    const ticketNumberMatch = emailData.subject.match(
      /\[(INC|CHG|PRB)-\d{4}-\d{5}\]/,
    );
    if (ticketNumberMatch) {
      const ticketNumber = ticketNumberMatch[0]!.slice(1, -1); // strip brackets

      const ticketMatches = await d
        .select({ id: tickets.id })
        .from(tickets)
        .where(
          and(
            eq(tickets.tenant_id, tenantId),
            eq(tickets.ticket_number, ticketNumber),
          ),
        )
        .limit(1);

      if (ticketMatches.length > 0) {
        matchedTicketId = ticketMatches[0]!.id;
      }
    }
  }

  // 3. Resolve or create ticket
  let isNew = false;
  let resolvedTicketId: string;
  let ticketRow: unknown;

  if (matchedTicketId) {
    // 3a. Matched existing ticket: add as comment
    resolvedTicketId = matchedTicketId;

    const commentId = uuidv4();
    const commentContent = emailData.body_text ?? emailData.body_html ?? '(no body)';

    await d.insert(ticketComments).values({
      id: commentId,
      tenant_id: tenantId,
      ticket_id: resolvedTicketId,
      author_id: 'system', // email inbound — system actor
      content: `**Von:** ${emailData.from_name ? `${emailData.from_name} <${emailData.from_address}>` : emailData.from_address}\n\n${commentContent}`,
      is_internal: 0,
      source: 'email',
      created_at: now,
    });

    const ticketRows = await d
      .select()
      .from(tickets)
      .where(eq(tickets.id, resolvedTicketId))
      .limit(1);

    ticketRow = ticketRows[0] ?? null;
    isNew = false;
  } else {
    // 3b. No match: load config and create new ticket
    const configRows = await d
      .select()
      .from(emailInboundConfigs)
      .where(
        and(
          eq(emailInboundConfigs.id, configId),
          eq(emailInboundConfigs.tenant_id, tenantId),
        ),
      )
      .limit(1);

    const emailConfig = configRows[0];
    if (!emailConfig) {
      throw new NotFoundError('Email config not found');
    }

    const ticketType = emailConfig.default_ticket_type;
    const ticketNumber = await generateTicketNumber(tenantId, ticketType);
    const newTicketId = uuidv4();

    const [newTicket] = await d
      .insert(tickets)
      .values({
        id: newTicketId,
        tenant_id: tenantId,
        ticket_number: ticketNumber,
        ticket_type: ticketType,
        subtype: null,
        title: emailData.subject,
        description: emailData.body_text ?? emailData.body_html ?? '',
        status: 'open',
        priority: 'medium',
        impact: null,
        urgency: null,
        asset_id: null,
        assignee_id: null,
        assignee_group_id: emailConfig.target_group_id ?? null,
        reporter_id: 'system',
        customer_id: null,
        category_id: null,
        workflow_instance_id: null,
        current_step_id: null,
        sla_tier: null,
        sla_response_due: null,
        sla_resolve_due: null,
        sla_breached: 0,
        parent_ticket_id: null,
        source: 'email',
        created_at: now,
        updated_at: now,
        resolved_at: null,
        closed_at: null,
        created_by: 'system',
      })
      .returning();

    resolvedTicketId = newTicketId;
    ticketRow = newTicket ?? null;
    isNew = true;
  }

  // 5. Insert email_message record
  const emailMessageId = uuidv4();

  const [insertedMessage] = await d
    .insert(emailMessages)
    .values({
      id: emailMessageId,
      tenant_id: tenantId,
      config_id: configId,
      message_id: emailData.message_id,
      from_address: emailData.from_address,
      from_name: emailData.from_name ?? null,
      to_address: emailData.to_address,
      subject: emailData.subject,
      body_text: emailData.body_text ?? null,
      body_html: emailData.body_html ?? null,
      headers: JSON.stringify(emailData.headers ?? {}),
      ticket_id: resolvedTicketId,
      is_reply: matchedTicketId ? 1 : 0,
      thread_reference: emailData.thread_reference ?? null,
      processed: 1,
      received_at: emailData.received_at ?? now,
      processed_at: now,
    })
    .returning();

  return {
    message: insertedMessage!,
    ticket: ticketRow,
    isNew,
  };
}
