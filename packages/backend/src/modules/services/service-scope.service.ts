import { eq, and, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import logger from '../../lib/logger.js';
import { serviceScopeItems, serviceDescriptions } from '../../db/schema/index.js';
import { NotFoundError } from '../../lib/errors.js';
import type {
  CreateServiceScopeItemInput,
  UpdateServiceScopeItemInput,
} from '@opsweave/shared';

// ─── DB Helper ────────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}

// ─── Types ────────────────────────────────────────────────

export interface ServiceScopeItem {
  id: string;
  tenant_id: string;
  service_id: string;
  item_description: string;
  scope_type: string;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────

async function verifyServiceExists(tenantId: string, serviceId: string): Promise<void> {
  const d = db();
  const [svc] = await d
    .select({ id: serviceDescriptions.id })
    .from(serviceDescriptions)
    .where(
      and(
        eq(serviceDescriptions.tenant_id, tenantId),
        eq(serviceDescriptions.id, serviceId),
      ),
    )
    .limit(1);

  if (!svc) {
    throw new NotFoundError('Service description not found');
  }
}

// ─── Service Scope Items ─────────────────────────────────

/**
 * List all scope items for a service, ordered by sort_order.
 */
export async function listByService(
  serviceId: string,
  tenantId: string,
): Promise<ServiceScopeItem[]> {
  const d = db();

  await verifyServiceExists(tenantId, serviceId);

  const rows = await d
    .select({
      id: serviceScopeItems.id,
      tenant_id: serviceScopeItems.tenant_id,
      service_id: serviceScopeItems.service_id,
      item_description: serviceScopeItems.item_description,
      scope_type: serviceScopeItems.scope_type,
      sort_order: serviceScopeItems.sort_order,
      notes: serviceScopeItems.notes,
      created_at: serviceScopeItems.created_at,
      updated_at: serviceScopeItems.updated_at,
    })
    .from(serviceScopeItems)
    .where(
      and(
        eq(serviceScopeItems.tenant_id, tenantId),
        eq(serviceScopeItems.service_id, serviceId),
      ),
    )
    .orderBy(asc(serviceScopeItems.sort_order), asc(serviceScopeItems.created_at));

  return rows;
}

/**
 * Create a new scope item for a service.
 */
export async function create(
  serviceId: string,
  tenantId: string,
  data: CreateServiceScopeItemInput,
): Promise<ServiceScopeItem> {
  const d = db();

  await verifyServiceExists(tenantId, serviceId);

  const now = new Date().toISOString();
  const id = uuidv4();

  await d.insert(serviceScopeItems).values({
    id,
    tenant_id: tenantId,
    service_id: serviceId,
    item_description: data.item_description,
    scope_type: data.scope_type ?? 'included',
    sort_order: data.sort_order ?? 0,
    notes: data.notes ?? null,
    created_at: now,
    updated_at: now,
  });

  logger.debug({ id, serviceId, scopeType: data.scope_type }, 'Created service scope item');

  const [created] = await d
    .select()
    .from(serviceScopeItems)
    .where(eq(serviceScopeItems.id, id))
    .limit(1);

  return created as ServiceScopeItem;
}

/**
 * Update an existing scope item.
 */
export async function update(
  id: string,
  tenantId: string,
  data: UpdateServiceScopeItemInput,
): Promise<ServiceScopeItem> {
  const d = db();

  const [existing] = await d
    .select({ id: serviceScopeItems.id })
    .from(serviceScopeItems)
    .where(
      and(
        eq(serviceScopeItems.id, id),
        eq(serviceScopeItems.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Scope item not found');
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.item_description !== undefined) updateData.item_description = data.item_description;
  if (data.scope_type !== undefined) updateData.scope_type = data.scope_type;
  if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;
  if (data.notes !== undefined) updateData.notes = data.notes;

  await d
    .update(serviceScopeItems)
    .set(updateData)
    .where(
      and(
        eq(serviceScopeItems.id, id),
        eq(serviceScopeItems.tenant_id, tenantId),
      ),
    );

  const [updated] = await d
    .select()
    .from(serviceScopeItems)
    .where(eq(serviceScopeItems.id, id))
    .limit(1);

  return updated as ServiceScopeItem;
}

/**
 * Delete a scope item.
 */
export async function remove(
  id: string,
  tenantId: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select({ id: serviceScopeItems.id })
    .from(serviceScopeItems)
    .where(
      and(
        eq(serviceScopeItems.id, id),
        eq(serviceScopeItems.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Scope item not found');
  }

  await d
    .delete(serviceScopeItems)
    .where(
      and(
        eq(serviceScopeItems.id, id),
        eq(serviceScopeItems.tenant_id, tenantId),
      ),
    );
}

/**
 * Reorder scope items by setting sort_order based on the provided array of IDs.
 */
export async function reorder(
  serviceId: string,
  tenantId: string,
  itemIds: string[],
): Promise<ServiceScopeItem[]> {
  const d = db();

  await verifyServiceExists(tenantId, serviceId);

  for (let i = 0; i < itemIds.length; i++) {
    const itemId = itemIds[i]!;
    await d
      .update(serviceScopeItems)
      .set({ sort_order: i, updated_at: new Date().toISOString() })
      .where(
        and(
          eq(serviceScopeItems.id, itemId),
          eq(serviceScopeItems.tenant_id, tenantId),
          eq(serviceScopeItems.service_id, serviceId),
        ),
      );
  }

  return listByService(serviceId, tenantId);
}
