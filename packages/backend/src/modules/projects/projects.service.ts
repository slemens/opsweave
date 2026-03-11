import { eq, and, count, desc, asc, like, or, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import { projects, projectAssets } from '../../db/schema/index.js';
import { assets } from '../../db/schema/index.js';
import { tickets } from '../../db/schema/index.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import type { CreateProjectInput, UpdateProjectInput, AddProjectAssetInput, ProjectFilterParams } from '@opsweave/shared';

function db(): TypedDb {
  return getDb() as TypedDb;
}

/**
 * List projects for a tenant with optional filtering and pagination.
 */
export async function listProjects(
  tenantId: string,
  params: ProjectFilterParams,
): Promise<{ data: unknown[]; total: number }> {
  const d = db();
  const conditions = [eq(projects.tenant_id, tenantId)];

  if (params.status) {
    conditions.push(eq(projects.status, params.status));
  }
  if (params.customer_id) {
    conditions.push(eq(projects.customer_id, params.customer_id));
  }
  if (params.q) {
    conditions.push(
      or(
        like(projects.name, `%${params.q}%`),
        like(projects.code, `%${params.q}%`),
      )!,
    );
  }

  const where = and(...conditions);
  const offset = (params.page - 1) * params.limit;

  const [totalResult, rows] = await Promise.all([
    d.select({ count: count() }).from(projects).where(where),
    d
      .select()
      .from(projects)
      .where(where)
      .orderBy(params.order === 'asc' ? asc(projects.created_at) : desc(projects.created_at))
      .limit(params.limit)
      .offset(offset),
  ]);

  return {
    data: rows,
    total: totalResult[0]?.count ?? 0,
  };
}

/**
 * Get a single project by ID.
 */
export async function getProject(
  tenantId: string,
  projectId: string,
): Promise<unknown> {
  const d = db();
  const [row] = await d
    .select()
    .from(projects)
    .where(and(eq(projects.tenant_id, tenantId), eq(projects.id, projectId)))
    .limit(1);

  if (!row) throw new NotFoundError('Project not found');
  return row;
}

/**
 * Create a new project.
 */
export async function createProject(
  tenantId: string,
  data: CreateProjectInput,
): Promise<unknown> {
  const d = db();
  const now = new Date().toISOString();
  const id = uuidv4();

  try {
    await d.insert(projects).values({
      id,
      tenant_id: tenantId,
      name: data.name,
      code: data.code,
      customer_id: data.customer_id ?? null,
      description: data.description ?? null,
      status: data.status ?? 'active',
      start_date: data.start_date ?? null,
      end_date: data.end_date ?? null,
      created_at: now,
      updated_at: now,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      throw new ConflictError(`Project with code "${data.code}" already exists`);
    }
    throw err;
  }

  return getProject(tenantId, id);
}

/**
 * Update an existing project.
 */
export async function updateProject(
  tenantId: string,
  projectId: string,
  data: UpdateProjectInput,
): Promise<unknown> {
  const d = db();

  const [existing] = await d
    .select()
    .from(projects)
    .where(and(eq(projects.tenant_id, tenantId), eq(projects.id, projectId)))
    .limit(1);

  if (!existing) throw new NotFoundError('Project not found');

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.customer_id !== undefined) updateData.customer_id = data.customer_id;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.start_date !== undefined) updateData.start_date = data.start_date;
  if (data.end_date !== undefined) updateData.end_date = data.end_date;

  try {
    await d
      .update(projects)
      .set(updateData)
      .where(and(eq(projects.tenant_id, tenantId), eq(projects.id, projectId)));
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      throw new ConflictError(`Project with code "${data.code}" already exists`);
    }
    throw err;
  }

  return getProject(tenantId, projectId);
}

/**
 * Delete a project. Fails if project has linked assets.
 */
export async function deleteProject(
  tenantId: string,
  projectId: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select()
    .from(projects)
    .where(and(eq(projects.tenant_id, tenantId), eq(projects.id, projectId)))
    .limit(1);

  if (!existing) throw new NotFoundError('Project not found');

  // Remove all project-asset links first
  await d
    .delete(projectAssets)
    .where(and(eq(projectAssets.tenant_id, tenantId), eq(projectAssets.project_id, projectId)));

  await d
    .delete(projects)
    .where(and(eq(projects.tenant_id, tenantId), eq(projects.id, projectId)));
}

/**
 * List assets linked to a project.
 */
export async function listProjectAssets(
  tenantId: string,
  projectId: string,
): Promise<unknown[]> {
  const d = db();

  // Verify project exists
  const [project] = await d
    .select()
    .from(projects)
    .where(and(eq(projects.tenant_id, tenantId), eq(projects.id, projectId)))
    .limit(1);

  if (!project) throw new NotFoundError('Project not found');

  const rows = await d
    .select({
      project_id: projectAssets.project_id,
      asset_id: projectAssets.asset_id,
      role: projectAssets.role,
      added_at: projectAssets.added_at,
      asset_name: assets.name,
      asset_display_name: assets.display_name,
      asset_type: assets.asset_type,
      asset_status: assets.status,
    })
    .from(projectAssets)
    .innerJoin(assets, eq(projectAssets.asset_id, assets.id))
    .where(and(eq(projectAssets.tenant_id, tenantId), eq(projectAssets.project_id, projectId)))
    .orderBy(asc(projectAssets.added_at));

  return rows;
}

/**
 * Add an asset to a project.
 */
export async function addProjectAsset(
  tenantId: string,
  projectId: string,
  data: AddProjectAssetInput,
): Promise<unknown> {
  const d = db();

  // Verify project exists
  const [project] = await d
    .select()
    .from(projects)
    .where(and(eq(projects.tenant_id, tenantId), eq(projects.id, projectId)))
    .limit(1);

  if (!project) throw new NotFoundError('Project not found');

  // Verify asset exists and belongs to tenant
  const [asset] = await d
    .select()
    .from(assets)
    .where(and(eq(assets.tenant_id, tenantId), eq(assets.id, data.asset_id)))
    .limit(1);

  if (!asset) throw new NotFoundError('Asset not found');

  const now = new Date().toISOString();

  try {
    await d.insert(projectAssets).values({
      project_id: projectId,
      asset_id: data.asset_id,
      tenant_id: tenantId,
      role: data.role ?? null,
      added_at: now,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      throw new ConflictError('Asset is already linked to this project');
    }
    throw err;
  }

  return { project_id: projectId, asset_id: data.asset_id, role: data.role ?? null, added_at: now };
}

/**
 * Remove an asset from a project.
 */
export async function removeProjectAsset(
  tenantId: string,
  projectId: string,
  assetId: string,
): Promise<void> {
  const d = db();

  const [link] = await d
    .select()
    .from(projectAssets)
    .where(
      and(
        eq(projectAssets.tenant_id, tenantId),
        eq(projectAssets.project_id, projectId),
        eq(projectAssets.asset_id, assetId),
      ),
    )
    .limit(1);

  if (!link) throw new NotFoundError('Project-asset link not found');

  await d
    .delete(projectAssets)
    .where(
      and(
        eq(projectAssets.tenant_id, tenantId),
        eq(projectAssets.project_id, projectId),
        eq(projectAssets.asset_id, assetId),
      ),
    );
}

/**
 * List tickets related to a project (via project's linked assets).
 */
export async function listProjectTickets(
  tenantId: string,
  projectId: string,
): Promise<unknown[]> {
  const d = db();

  // Verify project exists
  const [project] = await d
    .select()
    .from(projects)
    .where(and(eq(projects.tenant_id, tenantId), eq(projects.id, projectId)))
    .limit(1);

  if (!project) throw new NotFoundError('Project not found');

  // Get asset IDs linked to this project
  const linkedAssets = await d
    .select({ asset_id: projectAssets.asset_id })
    .from(projectAssets)
    .where(and(eq(projectAssets.tenant_id, tenantId), eq(projectAssets.project_id, projectId)));

  const assetIds = linkedAssets.map((r) => r.asset_id);

  if (assetIds.length === 0) return [];

  // Find tickets linked to those assets OR directly assigned to this project
  const conditions = [eq(tickets.tenant_id, tenantId)];
  const ticketCondition = or(
    inArray(tickets.asset_id, assetIds),
    eq(tickets.project_id, projectId),
  );
  conditions.push(ticketCondition!);

  const rows = await d
    .select()
    .from(tickets)
    .where(and(...conditions))
    .orderBy(desc(tickets.created_at));

  return rows;
}
