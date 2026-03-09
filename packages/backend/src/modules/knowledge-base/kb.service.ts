import { eq, and, count, like, or, desc, asc, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import { kbArticles, kbArticleLinks, users } from '../../db/schema/index.js';
import { NotFoundError } from '../../lib/errors.js';
import type { CreateKbArticleInput, UpdateKbArticleInput, KbFilterParams } from '@opsweave/shared';

// ─── DB Helper ────────────────────────────────────────────

function db(): TypedDb {
  return getDb() as TypedDb;
}

// ─── Types ────────────────────────────────────────────────

interface KbArticleRow {
  id: string;
  tenant_id: string;
  title: string;
  slug: string;
  content: string;
  category: string | null;
  tags: string[];
  visibility: string;
  status: string;
  author_id: string;
  author_name: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

// ─── Slug Helpers ─────────────────────────────────────────

/**
 * Generate a URL-safe slug from a title.
 * Converts to lowercase, strips non-alphanumeric characters, collapses hyphens.
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200);
}

/**
 * Ensure the slug is unique for the given tenant.
 * Appends -2, -3, ... until a free slot is found.
 */
async function ensureUniqueSlug(
  d: TypedDb,
  tenantId: string,
  baseSlug: string,
  excludeId?: string,
): Promise<string> {
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const conditions = [
      eq(kbArticles.tenant_id, tenantId),
      eq(kbArticles.slug, candidate),
    ];

    if (excludeId) {
      // When updating, exclude the article being updated from the uniqueness check
      const rows = await d
        .select({ id: kbArticles.id })
        .from(kbArticles)
        .where(and(...conditions))
        .limit(1);

      if (rows.length === 0 || rows[0]!.id === excludeId) {
        return candidate;
      }
    } else {
      const rows = await d
        .select({ id: kbArticles.id })
        .from(kbArticles)
        .where(and(...conditions))
        .limit(1);

      if (rows.length === 0) {
        return candidate;
      }
    }

    suffix += 1;
    // Truncate base to leave room for the suffix
    const base = baseSlug.slice(0, 195);
    candidate = `${base}-${suffix}`;
  }
}

// ─── Tag Helpers ──────────────────────────────────────────

/**
 * Parse tags from DB text (JSON array) to string[].
 */
function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as string[];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Stringify tags array to JSON text for storage.
 */
function stringifyTags(tags: string[]): string {
  return JSON.stringify(tags);
}

/**
 * Shape a raw DB row (with stringified tags) into the public KbArticleRow format.
 */
function shapeArticle(
  row: {
    id: string;
    tenant_id: string;
    title: string;
    slug: string;
    content: string;
    category: string | null;
    tags: string;
    visibility: string;
    status: string;
    author_id: string;
    created_at: string;
    updated_at: string;
    published_at: string | null;
  },
  authorName: string | null,
): KbArticleRow {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    category: row.category,
    tags: parseTags(row.tags),
    visibility: row.visibility,
    status: row.status,
    author_id: row.author_id,
    author_name: authorName,
    created_at: row.created_at,
    updated_at: row.updated_at,
    published_at: row.published_at,
  };
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * List KB articles for a tenant with pagination and optional filters.
 * Filters: q (search title/content), status, visibility, category.
 * Joins with users table to return author display_name.
 */
export async function listKbArticles(
  tenantId: string,
  params: KbFilterParams,
): Promise<{ articles: KbArticleRow[]; total: number }> {
  const d = db();
  const { page, limit, q, status, visibility, category, order, linked_ticket_id } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(kbArticles.tenant_id, tenantId)];

  if (q) {
    conditions.push(
      or(
        like(kbArticles.title, `%${q}%`),
        like(kbArticles.content, `%${q}%`),
      )!,
    );
  }

  if (status) {
    conditions.push(eq(kbArticles.status, status));
  }

  if (visibility) {
    conditions.push(eq(kbArticles.visibility, visibility));
  }

  if (category) {
    conditions.push(eq(kbArticles.category, category));
  }

  if (linked_ticket_id) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${kbArticleLinks}
        WHERE ${kbArticleLinks.article_id} = ${kbArticles.id}
          AND ${kbArticleLinks.ticket_id} = ${linked_ticket_id}
          AND ${kbArticleLinks.tenant_id} = ${tenantId}
      )`,
    );
  }

  const [totalResult] = await d
    .select({ count: count() })
    .from(kbArticles)
    .where(and(...conditions));

  const total = totalResult?.count ?? 0;

  const orderFn = order === 'asc' ? asc : desc;

  const rows = await d
    .select({
      id: kbArticles.id,
      tenant_id: kbArticles.tenant_id,
      title: kbArticles.title,
      slug: kbArticles.slug,
      content: kbArticles.content,
      category: kbArticles.category,
      tags: kbArticles.tags,
      visibility: kbArticles.visibility,
      status: kbArticles.status,
      author_id: kbArticles.author_id,
      author_name: users.display_name,
      created_at: kbArticles.created_at,
      updated_at: kbArticles.updated_at,
      published_at: kbArticles.published_at,
    })
    .from(kbArticles)
    .leftJoin(users, eq(kbArticles.author_id, users.id))
    .where(and(...conditions))
    .orderBy(orderFn(kbArticles.created_at))
    .limit(limit)
    .offset(offset);

  const articles: KbArticleRow[] = rows.map((row) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    category: row.category,
    tags: parseTags(row.tags),
    visibility: row.visibility,
    status: row.status,
    author_id: row.author_id,
    author_name: row.author_name ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    published_at: row.published_at,
  }));

  return { articles, total };
}

/**
 * Get a single KB article by ID, including linked ticket IDs.
 * Throws NotFoundError if the article does not belong to the tenant.
 */
export async function getKbArticle(
  tenantId: string,
  articleId: string,
): Promise<KbArticleRow & { linked_ticket_ids: string[] }> {
  const d = db();

  const rows = await d
    .select({
      id: kbArticles.id,
      tenant_id: kbArticles.tenant_id,
      title: kbArticles.title,
      slug: kbArticles.slug,
      content: kbArticles.content,
      category: kbArticles.category,
      tags: kbArticles.tags,
      visibility: kbArticles.visibility,
      status: kbArticles.status,
      author_id: kbArticles.author_id,
      author_name: users.display_name,
      created_at: kbArticles.created_at,
      updated_at: kbArticles.updated_at,
      published_at: kbArticles.published_at,
    })
    .from(kbArticles)
    .leftJoin(users, eq(kbArticles.author_id, users.id))
    .where(
      and(
        eq(kbArticles.id, articleId),
        eq(kbArticles.tenant_id, tenantId),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new NotFoundError('KB article not found');
  }

  // Fetch linked ticket IDs
  const linkRows = await d
    .select({ ticket_id: kbArticleLinks.ticket_id })
    .from(kbArticleLinks)
    .where(
      and(
        eq(kbArticleLinks.article_id, articleId),
        eq(kbArticleLinks.tenant_id, tenantId),
      ),
    );

  return {
    ...shapeArticle(row as Parameters<typeof shapeArticle>[0], row.author_name ?? null),
    linked_ticket_ids: linkRows.map((l) => l.ticket_id),
  };
}

/**
 * Create a new KB article.
 * Auto-generates slug from title if not provided.
 * Sets published_at when status is 'published'.
 */
export async function createKbArticle(
  tenantId: string,
  data: CreateKbArticleInput,
  userId: string,
): Promise<KbArticleRow & { linked_ticket_ids: string[] }> {
  const d = db();
  const now = new Date().toISOString();
  const id = uuidv4();

  // Determine slug: use provided slug or auto-generate from title
  const rawSlug = data.slug ?? generateSlug(data.title);
  const slug = await ensureUniqueSlug(d, tenantId, rawSlug);

  const publishedAt = data.status === 'published' ? now : null;

  await d.insert(kbArticles).values({
    id,
    tenant_id: tenantId,
    title: data.title,
    slug,
    content: data.content ?? '',
    category: data.category ?? null,
    tags: stringifyTags(data.tags ?? []),
    visibility: data.visibility ?? 'internal',
    status: data.status ?? 'draft',
    author_id: userId,
    created_at: now,
    updated_at: now,
    published_at: publishedAt,
  });

  return getKbArticle(tenantId, id);
}

/**
 * Update an existing KB article.
 * Sets published_at when status transitions to 'published' (only if not already set).
 * Throws NotFoundError if not found.
 */
export async function updateKbArticle(
  tenantId: string,
  articleId: string,
  data: UpdateKbArticleInput,
): Promise<KbArticleRow & { linked_ticket_ids: string[] }> {
  const d = db();

  const [existing] = await d
    .select({
      id: kbArticles.id,
      slug: kbArticles.slug,
      status: kbArticles.status,
      published_at: kbArticles.published_at,
    })
    .from(kbArticles)
    .where(
      and(
        eq(kbArticles.id, articleId),
        eq(kbArticles.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('KB article not found');
  }

  const now = new Date().toISOString();
  const updateSet: Record<string, unknown> = { updated_at: now };

  if (data.title !== undefined) {
    updateSet['title'] = data.title;
  }

  if (data.slug !== undefined) {
    // Caller provided an explicit slug — ensure it's unique (excluding self)
    const uniqueSlug = await ensureUniqueSlug(d, tenantId, data.slug, articleId);
    updateSet['slug'] = uniqueSlug;
  } else if (data.title !== undefined) {
    // Title changed but no explicit slug: regenerate from new title, ensure uniqueness
    const newSlug = await ensureUniqueSlug(
      d,
      tenantId,
      generateSlug(data.title),
      articleId,
    );
    updateSet['slug'] = newSlug;
  }

  if (data.content !== undefined) updateSet['content'] = data.content;
  if (data.category !== undefined) updateSet['category'] = data.category;
  if (data.tags !== undefined) updateSet['tags'] = stringifyTags(data.tags);
  if (data.visibility !== undefined) updateSet['visibility'] = data.visibility;

  if (data.status !== undefined) {
    updateSet['status'] = data.status;
    // Set published_at only when transitioning to published for the first time
    if (data.status === 'published' && !existing.published_at) {
      updateSet['published_at'] = now;
    }
  }

  await d
    .update(kbArticles)
    .set(updateSet)
    .where(
      and(
        eq(kbArticles.id, articleId),
        eq(kbArticles.tenant_id, tenantId),
      ),
    );

  return getKbArticle(tenantId, articleId);
}

/**
 * Delete a KB article and its associated links.
 * Throws NotFoundError if not found.
 */
export async function deleteKbArticle(
  tenantId: string,
  articleId: string,
): Promise<void> {
  const d = db();

  const [existing] = await d
    .select({ id: kbArticles.id })
    .from(kbArticles)
    .where(
      and(
        eq(kbArticles.id, articleId),
        eq(kbArticles.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('KB article not found');
  }

  // Remove all ticket links first (FK would block deletion otherwise)
  await d
    .delete(kbArticleLinks)
    .where(
      and(
        eq(kbArticleLinks.article_id, articleId),
        eq(kbArticleLinks.tenant_id, tenantId),
      ),
    );

  await d
    .delete(kbArticles)
    .where(
      and(
        eq(kbArticles.id, articleId),
        eq(kbArticles.tenant_id, tenantId),
      ),
    );
}

/**
 * Link a KB article to a ticket.
 * Silently succeeds if the link already exists (idempotent).
 */
export async function linkArticleToTicket(
  tenantId: string,
  articleId: string,
  ticketId: string,
): Promise<void> {
  const d = db();

  // Verify the article belongs to the tenant
  const [article] = await d
    .select({ id: kbArticles.id })
    .from(kbArticles)
    .where(
      and(
        eq(kbArticles.id, articleId),
        eq(kbArticles.tenant_id, tenantId),
      ),
    )
    .limit(1);

  if (!article) {
    throw new NotFoundError('KB article not found');
  }

  await d
    .insert(kbArticleLinks)
    .values({
      article_id: articleId,
      ticket_id: ticketId,
      tenant_id: tenantId,
    })
    .onConflictDoNothing();
}

/**
 * Remove a link between a KB article and a ticket.
 * Silently succeeds if the link does not exist.
 */
export async function unlinkArticleFromTicket(
  tenantId: string,
  articleId: string,
  ticketId: string,
): Promise<void> {
  const d = db();

  await d
    .delete(kbArticleLinks)
    .where(
      and(
        eq(kbArticleLinks.article_id, articleId),
        eq(kbArticleLinks.ticket_id, ticketId),
        eq(kbArticleLinks.tenant_id, tenantId),
      ),
    );
}

/**
 * List publicly visible, published KB articles for a tenant.
 * Used by the customer portal — always enforces visibility='public' and status='published'.
 */
export async function listPublicArticles(
  tenantId: string,
  params: KbFilterParams,
): Promise<{ articles: KbArticleRow[]; total: number }> {
  // Force public+published regardless of what caller passes
  return listKbArticles(tenantId, {
    ...params,
    visibility: 'public',
    status: 'published',
  });
}
