import { eq, and, count, like, or, asc, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import {
  customers,
  assets,
  tickets,
  slaAssignments,
  slaDefinitions,
  verticalCatalogs,
  verticalCatalogOverrides,
  horizontalCatalog,
  customerPortalUsers,
} from '../../db/schema/index.js';
import { NotFoundError } from '../../lib/errors.js';
import type { PaginationParams } from '@opsweave/shared';

// ─── DB Helper ────────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}

// ─── Types ────────────────────────────────────────────────

interface CustomerRow {
  id: string;
  tenant_id: string;
  name: string;
  industry: string | null;
  contact_email: string | null;
  is_active: number;
  created_at: string;
}

interface CreateCustomerData {
  name: string;
  industry?: string | null;
  contact_email?: string | null;
}

interface UpdateCustomerData {
  name?: string;
  industry?: string | null;
  contact_email?: string | null;
  is_active?: number;
}

// ─── Service ──────────────────────────────────────────────

/**
 * List customers for a tenant.
 */
export async function listCustomers(
  tenantId: string,
  params: PaginationParams,
): Promise<{ customers: CustomerRow[]; total: number }> {
  const d = db();
  const { page, limit, q, sort, order } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(customers.tenant_id, tenantId)];

  if (q) {
    conditions.push(
      or(
        like(customers.name, `%${q}%`),
        like(customers.contact_email, `%${q}%`),
      )!,
    );
  }

  const [totalResult] = await d
    .select({ count: count() })
    .from(customers)
    .where(and(...conditions));

  const total = totalResult?.count ?? 0;

  const sortColumn = sort === 'name' ? customers.name
    : sort === 'industry' ? customers.industry
    : customers.created_at;

  const orderFn = order === 'asc' ? asc : desc;

  const rows = await d
    .select()
    .from(customers)
    .where(and(...conditions))
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset);

  return { customers: rows, total };
}

/**
 * Get a single customer.
 */
export async function getCustomer(
  tenantId: string,
  customerId: string,
): Promise<CustomerRow> {
  const d = db();

  const rows = await d
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.id, customerId),
        eq(customers.tenant_id, tenantId),
      ),
    )
    .limit(1);

  const customer = rows[0];
  if (!customer) {
    throw new NotFoundError('Customer not found');
  }

  return customer;
}

/**
 * Create a new customer.
 */
export async function createCustomer(
  tenantId: string,
  data: CreateCustomerData,
): Promise<CustomerRow> {
  const d = db();
  const now = new Date().toISOString();
  const customerId = uuidv4();

  const [created] = await d
    .insert(customers)
    .values({
      id: customerId,
      tenant_id: tenantId,
      name: data.name,
      industry: data.industry ?? null,
      contact_email: data.contact_email ?? null,
      is_active: 1,
      created_at: now,
    })
    .returning();

  return created!;
}

/**
 * Update an existing customer.
 */
export async function updateCustomer(
  tenantId: string,
  customerId: string,
  data: UpdateCustomerData,
): Promise<CustomerRow> {
  const d = db();

  const existing = await d
    .select({ id: customers.id })
    .from(customers)
    .where(
      and(
        eq(customers.id, customerId),
        eq(customers.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    throw new NotFoundError('Customer not found');
  }

  const updateSet: Record<string, unknown> = {};

  if (data.name !== undefined) updateSet['name'] = data.name;
  if (data.industry !== undefined) updateSet['industry'] = data.industry;
  if (data.contact_email !== undefined) updateSet['contact_email'] = data.contact_email;
  if (data.is_active !== undefined) updateSet['is_active'] = data.is_active;

  if (Object.keys(updateSet).length === 0) {
    const rows = await d
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);
    return rows[0]!;
  }

  const [updated] = await d
    .update(customers)
    .set(updateSet)
    .where(
      and(
        eq(customers.id, customerId),
        eq(customers.tenant_id, tenantId),
      ),
    )
    .returning();

  if (!updated) {
    throw new NotFoundError('Customer not found');
  }

  return updated;
}

// ─── Customer Overview (aggregated data) ─────────────────

export interface CustomerOverview {
  customer: CustomerRow;
  stats: {
    total_assets: number;
    total_tickets: number;
    open_tickets: number;
    sla_breached_tickets: number;
    portal_users: number;
  };
  assets: Array<{
    id: string;
    display_name: string;
    asset_type: string;
    status: string;
    sla_tier: string;
  }>;
  recent_tickets: Array<{
    id: string;
    ticket_number: string;
    title: string;
    status: string;
    priority: string;
    sla_breached: number;
    created_at: string;
  }>;
  sla: {
    definition: {
      id: string;
      name: string;
      response_time_minutes: number;
      resolution_time_minutes: number;
      business_hours: string;
    } | null;
    assignment_id: string | null;
  };
  vertical_catalogs: Array<{
    id: string;
    name: string;
    base_catalog_name: string | null;
    industry: string | null;
    status: string;
    override_count: number;
  }>;
}

/**
 * Get a comprehensive overview of a customer including assets, tickets, SLAs, and services.
 */
export async function getCustomerOverview(
  tenantId: string,
  customerId: string,
): Promise<CustomerOverview> {
  const d = db();

  // Get customer
  const customer = await getCustomer(tenantId, customerId);

  // Count assets
  const [assetCountResult] = await d
    .select({ cnt: count() })
    .from(assets)
    .where(and(eq(assets.tenant_id, tenantId), eq(assets.customer_id, customerId)));
  const totalAssets = assetCountResult?.cnt ?? 0;

  // Get asset list
  const assetList = await d
    .select({
      id: assets.id,
      display_name: assets.display_name,
      asset_type: assets.asset_type,
      status: assets.status,
      sla_tier: assets.sla_tier,
    })
    .from(assets)
    .where(and(eq(assets.tenant_id, tenantId), eq(assets.customer_id, customerId)))
    .orderBy(asc(assets.display_name))
    .limit(50);

  // Count tickets
  const [ticketCountResult] = await d
    .select({ cnt: count() })
    .from(tickets)
    .where(and(eq(tickets.tenant_id, tenantId), eq(tickets.customer_id, customerId)));
  const totalTickets = ticketCountResult?.cnt ?? 0;

  // Count open tickets
  const [openTicketResult] = await d
    .select({ cnt: count() })
    .from(tickets)
    .where(and(
      eq(tickets.tenant_id, tenantId),
      eq(tickets.customer_id, customerId),
      or(eq(tickets.status, 'open'), eq(tickets.status, 'in_progress')),
    ));
  const openTickets = openTicketResult?.cnt ?? 0;

  // Count SLA-breached tickets
  const [breachedResult] = await d
    .select({ cnt: count() })
    .from(tickets)
    .where(and(
      eq(tickets.tenant_id, tenantId),
      eq(tickets.customer_id, customerId),
      eq(tickets.sla_breached, 1),
    ));
  const slaBreachedTickets = breachedResult?.cnt ?? 0;

  // Recent tickets (last 10)
  const recentTickets = await d
    .select({
      id: tickets.id,
      ticket_number: tickets.ticket_number,
      title: tickets.title,
      status: tickets.status,
      priority: tickets.priority,
      sla_breached: tickets.sla_breached,
      created_at: tickets.created_at,
    })
    .from(tickets)
    .where(and(eq(tickets.tenant_id, tenantId), eq(tickets.customer_id, customerId)))
    .orderBy(desc(tickets.created_at))
    .limit(10);

  // Portal users count
  const [portalResult] = await d
    .select({ cnt: count() })
    .from(customerPortalUsers)
    .where(and(eq(customerPortalUsers.tenant_id, tenantId), eq(customerPortalUsers.customer_id, customerId)));
  const portalUsers = portalResult?.cnt ?? 0;

  // SLA assignment for this customer
  let slaDef: CustomerOverview['sla']['definition'] = null;
  let slaAssignmentId: string | null = null;

  const slaAssignment = await d
    .select({
      id: slaAssignments.id,
      sla_definition_id: slaAssignments.sla_definition_id,
    })
    .from(slaAssignments)
    .where(and(
      eq(slaAssignments.tenant_id, tenantId),
      eq(slaAssignments.customer_id, customerId),
    ))
    .orderBy(desc(slaAssignments.priority))
    .limit(1);

  if (slaAssignment.length > 0) {
    slaAssignmentId = slaAssignment[0]!.id;
    const [def] = await d
      .select({
        id: slaDefinitions.id,
        name: slaDefinitions.name,
        response_time_minutes: slaDefinitions.response_time_minutes,
        resolution_time_minutes: slaDefinitions.resolution_time_minutes,
        business_hours: slaDefinitions.business_hours,
      })
      .from(slaDefinitions)
      .where(eq(slaDefinitions.id, slaAssignment[0]!.sla_definition_id))
      .limit(1);
    if (def) slaDef = def;
  }

  // Vertical catalogs for this customer
  const vcRows = await d
    .select({
      id: verticalCatalogs.id,
      name: verticalCatalogs.name,
      base_catalog_name: horizontalCatalog.name,
      industry: verticalCatalogs.industry,
      status: verticalCatalogs.status,
    })
    .from(verticalCatalogs)
    .leftJoin(horizontalCatalog, eq(verticalCatalogs.base_catalog_id, horizontalCatalog.id))
    .where(and(eq(verticalCatalogs.tenant_id, tenantId), eq(verticalCatalogs.customer_id, customerId)));

  // Count overrides per VC
  const vertCatalogs = [];
  for (const vc of vcRows) {
    const [ovCount] = await d
      .select({ cnt: count() })
      .from(verticalCatalogOverrides)
      .where(eq(verticalCatalogOverrides.vertical_id, vc.id));
    vertCatalogs.push({
      ...vc,
      base_catalog_name: vc.base_catalog_name ?? null,
      override_count: ovCount?.cnt ?? 0,
    });
  }

  return {
    customer,
    stats: {
      total_assets: totalAssets,
      total_tickets: totalTickets,
      open_tickets: openTickets,
      sla_breached_tickets: slaBreachedTickets,
      portal_users: portalUsers,
    },
    assets: assetList,
    recent_tickets: recentTickets,
    sla: {
      definition: slaDef,
      assignment_id: slaAssignmentId,
    },
    vertical_catalogs: vertCatalogs,
  };
}
