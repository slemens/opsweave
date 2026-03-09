import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq, and, desc, like, or, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import {
  customerPortalUsers,
  customers,
  tickets,
  ticketComments,
  kbArticles,
  tenants,
} from '../../db/schema/index.js';
import { UnauthorizedError, NotFoundError } from '../../lib/errors.js';
import type {
  CreatePortalTicketInput,
  CreatePortalCommentInput,
  PortalLoginInput,
  PaginationParams,
} from '@opsweave/shared';

// ─── Constants ──────────────────────────────────────────────

const JWT_SECRET =
  process.env['JWT_SECRET'] ?? 'opsweave-dev-secret-change-in-production';

// ─── DB Helper ──────────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}

// ─── JWT Payload ────────────────────────────────────────────

export interface PortalJwtPayload {
  sub: string;
  email: string;
  displayName: string;
  customerId: string;
  tenantId: string;
  portal: true;
}

// ─── Auth ────────────────────────────────────────────────────

/**
 * Authenticate a portal user.
 * Resolves the tenant by slug, verifies the portal user credentials,
 * updates last_login, and returns a signed JWT with portal: true.
 */
export async function portalLogin(input: PortalLoginInput): Promise<{
  token: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    customerId: string;
    tenantId: string;
  };
}> {
  const d = db();

  // Resolve tenant by slug
  const tenantRows = await d
    .select()
    .from(tenants)
    .where(and(eq(tenants.slug, input.tenantSlug), eq(tenants.is_active, 1)))
    .limit(1);

  const tenant = tenantRows[0];
  if (!tenant) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Find portal user by email within this tenant
  const portalUserRows = await d
    .select()
    .from(customerPortalUsers)
    .where(
      and(
        eq(customerPortalUsers.email, input.email.toLowerCase()),
        eq(customerPortalUsers.tenant_id, tenant.id),
      ),
    )
    .limit(1);

  const portalUser = portalUserRows[0];
  if (!portalUser) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Check account is active
  if (portalUser.is_active !== 1) {
    throw new UnauthorizedError('Account is deactivated');
  }

  // Verify password
  const passwordValid = await bcrypt.compare(
    input.password,
    portalUser.password_hash,
  );
  if (!passwordValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Update last_login
  const now = new Date().toISOString();
  await d
    .update(customerPortalUsers)
    .set({ last_login: now })
    .where(eq(customerPortalUsers.id, portalUser.id));

  // Sign portal JWT
  const payload: PortalJwtPayload = {
    sub: portalUser.id,
    email: portalUser.email,
    displayName: portalUser.display_name,
    customerId: portalUser.customer_id,
    tenantId: tenant.id,
    portal: true,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

  return {
    token,
    user: {
      id: portalUser.id,
      email: portalUser.email,
      displayName: portalUser.display_name,
      customerId: portalUser.customer_id,
      tenantId: tenant.id,
    },
  };
}

/**
 * Return the current portal user together with their customer info.
 */
export async function getPortalMe(
  tenantId: string,
  portalUserId: string,
): Promise<{
  id: string;
  email: string;
  displayName: string;
  customerId: string;
  tenantId: string;
  customer: {
    id: string;
    name: string;
    industry: string | null;
    contact_email: string | null;
  };
}> {
  const d = db();

  const portalUserRows = await d
    .select()
    .from(customerPortalUsers)
    .where(
      and(
        eq(customerPortalUsers.id, portalUserId),
        eq(customerPortalUsers.tenant_id, tenantId),
      ),
    )
    .limit(1);

  const portalUser = portalUserRows[0];
  if (!portalUser) {
    throw new NotFoundError('Portal user not found');
  }

  const customerRows = await d
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.id, portalUser.customer_id),
        eq(customers.tenant_id, tenantId),
      ),
    )
    .limit(1);

  const customer = customerRows[0];
  if (!customer) {
    throw new NotFoundError('Customer not found');
  }

  return {
    id: portalUser.id,
    email: portalUser.email,
    displayName: portalUser.display_name,
    customerId: portalUser.customer_id,
    tenantId,
    customer: {
      id: customer.id,
      name: customer.name,
      industry: customer.industry,
      contact_email: customer.contact_email,
    },
  };
}

// ─── Tickets ─────────────────────────────────────────────────

/**
 * List tickets that belong to the portal user's customer within the tenant.
 */
export async function listPortalTickets(
  tenantId: string,
  customerId: string,
  params: PaginationParams,
): Promise<{ tickets: typeof tickets.$inferSelect[]; total: number }> {
  const d = db();
  const { page, limit } = params;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(tickets.tenant_id, tenantId),
    eq(tickets.customer_id, customerId),
  ];

  const [totalResult] = await d
    .select({ count: count() })
    .from(tickets)
    .where(and(...conditions));

  const total = totalResult?.count ?? 0;

  const rows = await d
    .select()
    .from(tickets)
    .where(and(...conditions))
    .orderBy(desc(tickets.created_at))
    .limit(limit)
    .offset(offset);

  return { tickets: rows, total };
}

/**
 * Get a single ticket, verifying it belongs to the customer.
 * Includes all non-internal, non-system comments.
 */
export async function getPortalTicket(
  tenantId: string,
  customerId: string,
  ticketId: string,
): Promise<{
  ticket: typeof tickets.$inferSelect;
  comments: typeof ticketComments.$inferSelect[];
}> {
  const d = db();

  const ticketRows = await d
    .select()
    .from(tickets)
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.tenant_id, tenantId),
        eq(tickets.customer_id, customerId),
      ),
    )
    .limit(1);

  const ticket = ticketRows[0];
  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  // Fetch only external (non-internal, non-system) comments
  const comments = await d
    .select()
    .from(ticketComments)
    .where(
      and(
        eq(ticketComments.ticket_id, ticketId),
        eq(ticketComments.tenant_id, tenantId),
        eq(ticketComments.is_internal, 0),
      ),
    )
    .orderBy(desc(ticketComments.created_at));

  // Filter out system-sourced comments in application layer
  // (avoids dialect-specific string comparison on the source column)
  const externalComments = comments.filter((c) => c.source !== 'system');

  return { ticket, comments: externalComments };
}

/**
 * Create a new ticket on behalf of a portal user.
 * Sets source='portal', customer_id=customerId.
 */
export async function createPortalTicket(
  tenantId: string,
  customerId: string,
  portalUserId: string,
  data: CreatePortalTicketInput,
): Promise<typeof tickets.$inferSelect> {
  const d = db();
  const now = new Date().toISOString();
  const ticketId = uuidv4();

  const type = data.ticket_type ?? 'incident';
  const prefix =
    type === 'incident' ? 'INC' : type === 'change' ? 'CHG' : 'PRB';
  const year = new Date().getFullYear();

  const [existingCount] = await d
    .select({ count: count() })
    .from(tickets)
    .where(
      and(
        eq(tickets.tenant_id, tenantId),
        eq(tickets.ticket_type, type),
      ),
    );

  const num = (existingCount?.count ?? 0) + 1;
  const ticket_number = `${prefix}-${year}-${String(num).padStart(5, '0')}`;

  const [created] = await d
    .insert(tickets)
    .values({
      id: ticketId,
      tenant_id: tenantId,
      ticket_number,
      ticket_type: type,
      subtype: null,
      title: data.title,
      description: data.description ?? '',
      status: 'open',
      priority: data.priority ?? 'medium',
      impact: null,
      urgency: null,
      asset_id: null,
      assignee_id: null,
      assignee_group_id: null,
      reporter_id: portalUserId,
      customer_id: customerId,
      category_id: null,
      workflow_instance_id: null,
      current_step_id: null,
      sla_tier: null,
      sla_response_due: null,
      sla_resolve_due: null,
      sla_breached: 0,
      parent_ticket_id: null,
      source: 'portal',
      created_at: now,
      updated_at: now,
      resolved_at: null,
      closed_at: null,
      created_by: portalUserId,
    })
    .returning();

  return created!;
}

/**
 * Add an external comment to a ticket, verifying the ticket belongs to
 * the customer.
 */
export async function addPortalComment(
  tenantId: string,
  customerId: string,
  ticketId: string,
  portalUserId: string,
  data: CreatePortalCommentInput,
): Promise<typeof ticketComments.$inferSelect> {
  const d = db();

  // Verify the ticket belongs to this customer
  const ticketRows = await d
    .select({ id: tickets.id })
    .from(tickets)
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.tenant_id, tenantId),
        eq(tickets.customer_id, customerId),
      ),
    )
    .limit(1);

  if (ticketRows.length === 0) {
    throw new NotFoundError('Ticket not found');
  }

  const now = new Date().toISOString();
  const commentId = uuidv4();

  const [created] = await d
    .insert(ticketComments)
    .values({
      id: commentId,
      tenant_id: tenantId,
      ticket_id: ticketId,
      author_id: portalUserId,
      content: data.content,
      is_internal: 0,
      source: 'customer',
      created_at: now,
    })
    .returning();

  return created!;
}

// ─── Knowledge Base ──────────────────────────────────────────

/**
 * List publicly visible, published KB articles for the tenant.
 * Optionally filters by a search term matching title or category.
 */
export async function listPublicKb(
  tenantId: string,
  q?: string,
): Promise<typeof kbArticles.$inferSelect[]> {
  const d = db();

  const conditions = [
    eq(kbArticles.tenant_id, tenantId),
    eq(kbArticles.visibility, 'public'),
    eq(kbArticles.status, 'published'),
  ];

  if (q) {
    conditions.push(
      or(
        like(kbArticles.title, `%${q}%`),
        like(kbArticles.category, `%${q}%`),
      )!,
    );
  }

  const rows = await d
    .select()
    .from(kbArticles)
    .where(and(...conditions))
    .orderBy(desc(kbArticles.published_at));

  return rows;
}
