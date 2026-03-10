import { eq, and, like, or, count, desc, asc, ne } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import { knownErrors, tickets, users } from '../../db/schema/index.js';
import { NotFoundError } from '../../lib/errors.js';

// ─── DB Helper ────────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}

// ─── Types ────────────────────────────────────────────────

export interface KnownErrorRow {
  id: string;
  tenant_id: string;
  title: string;
  symptom: string;
  workaround: string | null;
  root_cause: string | null;
  status: string;
  problem_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateKnownErrorInput {
  title: string;
  symptom: string;
  workaround?: string | null;
  root_cause?: string | null;
  status?: string;
  problem_id?: string | null;
}

export interface UpdateKnownErrorInput {
  title?: string;
  symptom?: string;
  workaround?: string | null;
  root_cause?: string | null;
  status?: string;
  problem_id?: string | null;
}

export interface KnownErrorFilterParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
  q?: string;
  status?: string;
}

// ─── Service ──────────────────────────────────────────────

export async function listKnownErrors(
  tenantId: string,
  params: KnownErrorFilterParams,
): Promise<{ items: unknown[]; total: number }> {
  const d = db();
  const { page, limit, sort, order, q, status } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(knownErrors.tenant_id, tenantId)];
  if (status) conditions.push(eq(knownErrors.status, status));
  if (q) {
    conditions.push(
      or(
        like(knownErrors.title, `%${q}%`),
        like(knownErrors.symptom, `%${q}%`),
      )!,
    );
  }

  const [totalResult] = await d
    .select({ count: count() })
    .from(knownErrors)
    .where(and(...conditions));

  const total = totalResult?.count ?? 0;

  const sortColumn = sort === 'title' ? knownErrors.title
    : sort === 'status' ? knownErrors.status
    : sort === 'updated_at' ? knownErrors.updated_at
    : knownErrors.created_at;

  const orderFn = order === 'asc' ? asc : desc;

  const rows = await d
    .select({
      id: knownErrors.id,
      tenant_id: knownErrors.tenant_id,
      title: knownErrors.title,
      symptom: knownErrors.symptom,
      workaround: knownErrors.workaround,
      root_cause: knownErrors.root_cause,
      status: knownErrors.status,
      problem_id: knownErrors.problem_id,
      created_by: knownErrors.created_by,
      created_at: knownErrors.created_at,
      updated_at: knownErrors.updated_at,
      problem_number: tickets.ticket_number,
      problem_title: tickets.title,
      creator_name: users.display_name,
    })
    .from(knownErrors)
    .leftJoin(tickets, eq(knownErrors.problem_id, tickets.id))
    .leftJoin(users, eq(knownErrors.created_by, users.id))
    .where(and(...conditions))
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset);

  const items = rows.map((row) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    title: row.title,
    symptom: row.symptom,
    workaround: row.workaround,
    root_cause: row.root_cause,
    status: row.status,
    problem_id: row.problem_id,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    problem: row.problem_id ? { id: row.problem_id, ticket_number: row.problem_number ?? '', title: row.problem_title ?? '' } : null,
    creator: { id: row.created_by, display_name: row.creator_name ?? '' },
  }));

  return { items, total };
}

export async function getKnownError(
  tenantId: string,
  id: string,
): Promise<unknown> {
  const d = db();

  const rows = await d
    .select({
      id: knownErrors.id,
      tenant_id: knownErrors.tenant_id,
      title: knownErrors.title,
      symptom: knownErrors.symptom,
      workaround: knownErrors.workaround,
      root_cause: knownErrors.root_cause,
      status: knownErrors.status,
      problem_id: knownErrors.problem_id,
      created_by: knownErrors.created_by,
      created_at: knownErrors.created_at,
      updated_at: knownErrors.updated_at,
      problem_number: tickets.ticket_number,
      problem_title: tickets.title,
      creator_name: users.display_name,
    })
    .from(knownErrors)
    .leftJoin(tickets, eq(knownErrors.problem_id, tickets.id))
    .leftJoin(users, eq(knownErrors.created_by, users.id))
    .where(and(eq(knownErrors.id, id), eq(knownErrors.tenant_id, tenantId)))
    .limit(1);

  const row = rows[0];
  if (!row) throw new NotFoundError('Known error not found');

  return {
    ...row,
    problem: row.problem_id ? { id: row.problem_id, ticket_number: row.problem_number ?? '', title: row.problem_title ?? '' } : null,
    creator: { id: row.created_by, display_name: row.creator_name ?? '' },
  };
}

export async function createKnownError(
  tenantId: string,
  data: CreateKnownErrorInput,
  userId: string,
): Promise<unknown> {
  const d = db();
  const id = uuidv4();
  const now = new Date().toISOString();

  await d.insert(knownErrors).values({
    id,
    tenant_id: tenantId,
    title: data.title,
    symptom: data.symptom,
    workaround: data.workaround ?? null,
    root_cause: data.root_cause ?? null,
    status: data.status ?? 'identified',
    problem_id: data.problem_id ?? null,
    created_by: userId,
    created_at: now,
    updated_at: now,
  });

  return getKnownError(tenantId, id);
}

export async function updateKnownError(
  tenantId: string,
  id: string,
  data: UpdateKnownErrorInput,
): Promise<unknown> {
  const d = db();
  const now = new Date().toISOString();

  // Verify exists
  await getKnownError(tenantId, id);

  const updateSet: Record<string, unknown> = { updated_at: now };
  if (data.title !== undefined) updateSet.title = data.title;
  if (data.symptom !== undefined) updateSet.symptom = data.symptom;
  if (data.workaround !== undefined) updateSet.workaround = data.workaround;
  if (data.root_cause !== undefined) updateSet.root_cause = data.root_cause;
  if (data.status !== undefined) updateSet.status = data.status;
  if (data.problem_id !== undefined) updateSet.problem_id = data.problem_id;

  await d
    .update(knownErrors)
    .set(updateSet)
    .where(and(eq(knownErrors.id, id), eq(knownErrors.tenant_id, tenantId)));

  return getKnownError(tenantId, id);
}

export async function deleteKnownError(
  tenantId: string,
  id: string,
): Promise<void> {
  const d = db();
  await getKnownError(tenantId, id); // throws if not found

  await d
    .delete(knownErrors)
    .where(and(eq(knownErrors.id, id), eq(knownErrors.tenant_id, tenantId)));
}

/**
 * Search known errors for incident linking (non-resolved only).
 */
export async function searchKnownErrors(
  tenantId: string,
  query: string,
): Promise<unknown[]> {
  const d = db();

  const rows = await d
    .select({
      id: knownErrors.id,
      title: knownErrors.title,
      symptom: knownErrors.symptom,
      workaround: knownErrors.workaround,
      status: knownErrors.status,
    })
    .from(knownErrors)
    .where(
      and(
        eq(knownErrors.tenant_id, tenantId),
        ne(knownErrors.status, 'resolved'),
        or(
          like(knownErrors.title, `%${query}%`),
          like(knownErrors.symptom, `%${query}%`),
        ),
      ),
    )
    .limit(20);

  return rows;
}
