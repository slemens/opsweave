import { eq, and, count, like, or, asc, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import {
  assigneeGroups,
  userGroupMemberships,
  users,
  tickets,
} from '../../db/schema/index.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import type { PaginationParams } from '@opsweave/shared';

// ─── DB Helper ────────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}

// ─── Types ────────────────────────────────────────────────

interface GroupRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  group_type: string;
  parent_group_id: string | null;
  created_at: string;
}

interface GroupWithMemberCount extends GroupRow {
  member_count: number;
}

interface GroupMember {
  user_id: string;
  email: string;
  display_name: string;
  role_in_group: string;
}

interface CreateGroupData {
  name: string;
  description?: string | null;
  group_type?: string;
  parent_group_id?: string | null;
}

interface UpdateGroupData {
  name?: string;
  description?: string | null;
  group_type?: string;
  parent_group_id?: string | null;
}

// ─── Service ──────────────────────────────────────────────

/**
 * List assignee groups for a tenant.
 */
export async function listGroups(
  tenantId: string,
  params: PaginationParams,
): Promise<{ groups: GroupRow[]; total: number }> {
  const d = db();
  const { page, limit, q, sort, order } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(assigneeGroups.tenant_id, tenantId)];

  if (q) {
    conditions.push(
      or(
        like(assigneeGroups.name, `%${q}%`),
        like(assigneeGroups.description, `%${q}%`),
      )!,
    );
  }

  const [totalResult] = await d
    .select({ count: count() })
    .from(assigneeGroups)
    .where(and(...conditions));

  const total = totalResult?.count ?? 0;

  const sortColumn = sort === 'name' ? assigneeGroups.name
    : sort === 'group_type' ? assigneeGroups.group_type
    : assigneeGroups.created_at;

  const orderFn = order === 'asc' ? asc : desc;

  const rows = await d
    .select()
    .from(assigneeGroups)
    .where(and(...conditions))
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset);

  return { groups: rows, total };
}

/**
 * Get a single group with its member count.
 */
export async function getGroup(
  tenantId: string,
  groupId: string,
): Promise<GroupWithMemberCount> {
  const d = db();

  const rows = await d
    .select()
    .from(assigneeGroups)
    .where(
      and(
        eq(assigneeGroups.id, groupId),
        eq(assigneeGroups.tenant_id, tenantId),
      ),
    )
    .limit(1);

  const group = rows[0];
  if (!group) {
    throw new NotFoundError('Group not found');
  }

  const [memberCountResult] = await d
    .select({ count: count() })
    .from(userGroupMemberships)
    .where(
      and(
        eq(userGroupMemberships.group_id, groupId),
        eq(userGroupMemberships.tenant_id, tenantId),
      ),
    );

  return {
    ...group,
    member_count: memberCountResult?.count ?? 0,
  };
}

/**
 * Create a new assignee group.
 */
export async function createGroup(
  tenantId: string,
  data: CreateGroupData,
): Promise<GroupRow> {
  const d = db();

  if (data.parent_group_id) {
    const parent = await d
      .select({ id: assigneeGroups.id })
      .from(assigneeGroups)
      .where(
        and(
          eq(assigneeGroups.id, data.parent_group_id),
          eq(assigneeGroups.tenant_id, tenantId),
        ),
      )
      .limit(1);

    if (parent.length === 0) {
      throw new NotFoundError('Parent group not found in this tenant');
    }
  }

  const now = new Date().toISOString();
  const groupId = uuidv4();

  const [created] = await d
    .insert(assigneeGroups)
    .values({
      id: groupId,
      tenant_id: tenantId,
      name: data.name,
      description: data.description ?? null,
      group_type: data.group_type ?? 'support',
      parent_group_id: data.parent_group_id ?? null,
      created_at: now,
    })
    .returning();

  return created!;
}

/**
 * Update an existing group.
 */
export async function updateGroup(
  tenantId: string,
  groupId: string,
  data: UpdateGroupData,
): Promise<GroupRow> {
  const d = db();

  const existing = await d
    .select({ id: assigneeGroups.id })
    .from(assigneeGroups)
    .where(
      and(
        eq(assigneeGroups.id, groupId),
        eq(assigneeGroups.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    throw new NotFoundError('Group not found');
  }

  if (data.parent_group_id) {
    if (data.parent_group_id === groupId) {
      throw new ConflictError('A group cannot be its own parent');
    }

    const parent = await d
      .select({ id: assigneeGroups.id })
      .from(assigneeGroups)
      .where(
        and(
          eq(assigneeGroups.id, data.parent_group_id),
          eq(assigneeGroups.tenant_id, tenantId),
        ),
      )
      .limit(1);

    if (parent.length === 0) {
      throw new NotFoundError('Parent group not found in this tenant');
    }
  }

  const updateSet: Record<string, unknown> = {};

  if (data.name !== undefined) updateSet['name'] = data.name;
  if (data.description !== undefined) updateSet['description'] = data.description;
  if (data.group_type !== undefined) updateSet['group_type'] = data.group_type;
  if (data.parent_group_id !== undefined) updateSet['parent_group_id'] = data.parent_group_id;

  if (Object.keys(updateSet).length === 0) {
    const rows = await d
      .select()
      .from(assigneeGroups)
      .where(eq(assigneeGroups.id, groupId))
      .limit(1);
    return rows[0]!;
  }

  const [updated] = await d
    .update(assigneeGroups)
    .set(updateSet)
    .where(
      and(
        eq(assigneeGroups.id, groupId),
        eq(assigneeGroups.tenant_id, tenantId),
      ),
    )
    .returning();

  if (!updated) {
    throw new NotFoundError('Group not found');
  }

  return updated;
}

/**
 * Delete a group.
 */
export async function deleteGroup(
  tenantId: string,
  groupId: string,
): Promise<void> {
  const d = db();

  const existing = await d
    .select({ id: assigneeGroups.id })
    .from(assigneeGroups)
    .where(
      and(
        eq(assigneeGroups.id, groupId),
        eq(assigneeGroups.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    throw new NotFoundError('Group not found');
  }

  await d
    .delete(userGroupMemberships)
    .where(
      and(
        eq(userGroupMemberships.group_id, groupId),
        eq(userGroupMemberships.tenant_id, tenantId),
      ),
    );

  await d
    .delete(assigneeGroups)
    .where(
      and(
        eq(assigneeGroups.id, groupId),
        eq(assigneeGroups.tenant_id, tenantId),
      ),
    );
}

/**
 * List members of a group.
 */
export async function listGroupMembers(
  tenantId: string,
  groupId: string,
): Promise<GroupMember[]> {
  const d = db();

  const existing = await d
    .select({ id: assigneeGroups.id })
    .from(assigneeGroups)
    .where(
      and(
        eq(assigneeGroups.id, groupId),
        eq(assigneeGroups.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    throw new NotFoundError('Group not found');
  }

  const members = await d
    .select({
      user_id: users.id,
      email: users.email,
      display_name: users.display_name,
      role_in_group: userGroupMemberships.role_in_group,
    })
    .from(userGroupMemberships)
    .innerJoin(users, eq(userGroupMemberships.user_id, users.id))
    .where(
      and(
        eq(userGroupMemberships.group_id, groupId),
        eq(userGroupMemberships.tenant_id, tenantId),
      ),
    );

  return members;
}

/**
 * Add a user to a group.
 */
export async function addGroupMember(
  tenantId: string,
  groupId: string,
  userId: string,
  roleInGroup: string,
): Promise<void> {
  const d = db();

  const group = await d
    .select({ id: assigneeGroups.id })
    .from(assigneeGroups)
    .where(
      and(
        eq(assigneeGroups.id, groupId),
        eq(assigneeGroups.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (group.length === 0) {
    throw new NotFoundError('Group not found');
  }

  const existing = await d
    .select({ user_id: userGroupMemberships.user_id })
    .from(userGroupMemberships)
    .where(
      and(
        eq(userGroupMemberships.group_id, groupId),
        eq(userGroupMemberships.user_id, userId),
        eq(userGroupMemberships.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    throw new ConflictError('User is already a member of this group');
  }

  await d.insert(userGroupMemberships).values({
    user_id: userId,
    group_id: groupId,
    tenant_id: tenantId,
    role_in_group: roleInGroup,
  });
}

/**
 * Remove a user from a group.
 */
export async function removeGroupMember(
  tenantId: string,
  groupId: string,
  userId: string,
): Promise<void> {
  const d = db();

  const existing = await d
    .select({ user_id: userGroupMemberships.user_id })
    .from(userGroupMemberships)
    .where(
      and(
        eq(userGroupMemberships.group_id, groupId),
        eq(userGroupMemberships.user_id, userId),
        eq(userGroupMemberships.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    throw new NotFoundError('User is not a member of this group');
  }

  await d
    .delete(userGroupMemberships)
    .where(
      and(
        eq(userGroupMemberships.group_id, groupId),
        eq(userGroupMemberships.user_id, userId),
        eq(userGroupMemberships.tenant_id, tenantId),
      ),
    );
}

/**
 * Get tickets assigned to a group.
 */
export async function getGroupTickets(
  tenantId: string,
  groupId: string,
  params: PaginationParams,
): Promise<{ tickets: unknown[]; total: number }> {
  const d = db();
  const { page, limit, sort, order } = params;
  const offset = (page - 1) * limit;

  const group = await d
    .select({ id: assigneeGroups.id })
    .from(assigneeGroups)
    .where(
      and(
        eq(assigneeGroups.id, groupId),
        eq(assigneeGroups.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (group.length === 0) {
    throw new NotFoundError('Group not found');
  }

  const conditions = [
    eq(tickets.tenant_id, tenantId),
    eq(tickets.assignee_group_id, groupId),
  ];

  const [totalResult] = await d
    .select({ count: count() })
    .from(tickets)
    .where(and(...conditions));

  const total = totalResult?.count ?? 0;

  const sortColumn = sort === 'priority' ? tickets.priority
    : sort === 'status' ? tickets.status
    : sort === 'title' ? tickets.title
    : sort === 'updated_at' ? tickets.updated_at
    : tickets.created_at;

  const orderFn = order === 'asc' ? asc : desc;

  const rows = await d
    .select()
    .from(tickets)
    .where(and(...conditions))
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset);

  return { tickets: rows, total };
}
