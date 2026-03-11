import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import { serviceProfiles, serviceEntitlements } from '../../db/schema/index.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import type {
  CreateServiceProfileInput,
  UpdateServiceProfileInput,
  CreateServiceEntitlementInput,
} from '@opsweave/shared';

function db(): TypedDb {
  return getDb() as TypedDb;
}

// =============================================================================
// Service Profiles
// =============================================================================

/**
 * List all service profiles for a tenant.
 */
export async function listServiceProfiles(
  tenantId: string,
): Promise<unknown[]> {
  const d = db();
  const rows = await d
    .select()
    .from(serviceProfiles)
    .where(eq(serviceProfiles.tenant_id, tenantId))
    .orderBy(serviceProfiles.name);
  return rows;
}

/**
 * Get a single service profile by ID.
 */
export async function getServiceProfile(
  tenantId: string,
  id: string,
): Promise<unknown> {
  const d = db();
  const [row] = await d
    .select()
    .from(serviceProfiles)
    .where(and(eq(serviceProfiles.tenant_id, tenantId), eq(serviceProfiles.id, id)))
    .limit(1);

  if (!row) throw new NotFoundError('Service profile not found');
  return row;
}

/**
 * Create a new service profile.
 */
export async function createServiceProfile(
  tenantId: string,
  data: CreateServiceProfileInput,
): Promise<unknown> {
  const d = db();
  const now = new Date().toISOString();
  const id = uuidv4();

  try {
    await d.insert(serviceProfiles).values({
      id,
      tenant_id: tenantId,
      name: data.name,
      description: data.description ?? null,
      dimensions: JSON.stringify(data.dimensions ?? {}),
      sla_definition_id: data.sla_definition_id ?? null,
      is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
      created_at: now,
      updated_at: now,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      throw new ConflictError(`Service profile with name "${data.name}" already exists`);
    }
    throw err;
  }

  return getServiceProfile(tenantId, id);
}

/**
 * Update an existing service profile.
 */
export async function updateServiceProfile(
  tenantId: string,
  id: string,
  data: UpdateServiceProfileInput,
): Promise<unknown> {
  const d = db();

  const [existing] = await d
    .select()
    .from(serviceProfiles)
    .where(and(eq(serviceProfiles.tenant_id, tenantId), eq(serviceProfiles.id, id)))
    .limit(1);

  if (!existing) throw new NotFoundError('Service profile not found');

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.dimensions !== undefined) updateData.dimensions = JSON.stringify(data.dimensions);
  if (data.sla_definition_id !== undefined) updateData.sla_definition_id = data.sla_definition_id;
  if (data.is_active !== undefined) updateData.is_active = data.is_active ? 1 : 0;

  try {
    await d
      .update(serviceProfiles)
      .set(updateData)
      .where(and(eq(serviceProfiles.tenant_id, tenantId), eq(serviceProfiles.id, id)));
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      throw new ConflictError(`Service profile with name "${data.name}" already exists`);
    }
    throw err;
  }

  return getServiceProfile(tenantId, id);
}

/**
 * Delete a service profile.
 */
export async function deleteServiceProfile(
  tenantId: string,
  id: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select()
    .from(serviceProfiles)
    .where(and(eq(serviceProfiles.tenant_id, tenantId), eq(serviceProfiles.id, id)))
    .limit(1);

  if (!existing) throw new NotFoundError('Service profile not found');

  // Remove entitlements referencing this profile first
  await d
    .delete(serviceEntitlements)
    .where(and(eq(serviceEntitlements.tenant_id, tenantId), eq(serviceEntitlements.profile_id, id)));

  await d
    .delete(serviceProfiles)
    .where(and(eq(serviceProfiles.tenant_id, tenantId), eq(serviceProfiles.id, id)));
}

// =============================================================================
// Service Entitlements
// =============================================================================

/**
 * List service entitlements for a tenant with optional filters.
 */
export async function listServiceEntitlements(
  tenantId: string,
  filters?: { customer_id?: string; service_id?: string },
): Promise<unknown[]> {
  const d = db();
  const conditions = [eq(serviceEntitlements.tenant_id, tenantId)];

  if (filters?.customer_id) {
    conditions.push(eq(serviceEntitlements.customer_id, filters.customer_id));
  }
  if (filters?.service_id) {
    conditions.push(eq(serviceEntitlements.service_id, filters.service_id));
  }

  const rows = await d
    .select()
    .from(serviceEntitlements)
    .where(and(...conditions))
    .orderBy(serviceEntitlements.effective_from);

  return rows;
}

/**
 * Create a new service entitlement.
 */
export async function createServiceEntitlement(
  tenantId: string,
  data: CreateServiceEntitlementInput,
): Promise<unknown> {
  const d = db();
  const now = new Date().toISOString();
  const id = uuidv4();

  await d.insert(serviceEntitlements).values({
    id,
    tenant_id: tenantId,
    customer_id: data.customer_id,
    service_id: data.service_id,
    profile_id: data.profile_id ?? null,
    scope: JSON.stringify(data.scope ?? {}),
    effective_from: data.effective_from,
    effective_until: data.effective_until ?? null,
    created_at: now,
  });

  // Return the created entitlement
  const [row] = await d
    .select()
    .from(serviceEntitlements)
    .where(and(eq(serviceEntitlements.tenant_id, tenantId), eq(serviceEntitlements.id, id)))
    .limit(1);

  return row;
}

/**
 * Delete a service entitlement.
 */
export async function deleteServiceEntitlement(
  tenantId: string,
  id: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select()
    .from(serviceEntitlements)
    .where(and(eq(serviceEntitlements.tenant_id, tenantId), eq(serviceEntitlements.id, id)))
    .limit(1);

  if (!existing) throw new NotFoundError('Service entitlement not found');

  await d
    .delete(serviceEntitlements)
    .where(and(eq(serviceEntitlements.tenant_id, tenantId), eq(serviceEntitlements.id, id)));
}
