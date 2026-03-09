import { eq, and, count, like, or, asc, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import { customers } from '../../db/schema/index.js';
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
