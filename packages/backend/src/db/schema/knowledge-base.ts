import { sqliteTable, text, index, unique, primaryKey } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants.js';
import { users } from './users.js';
import { tickets } from './tickets.js';

// =============================================================================
// kb_articles — Knowledge Base Articles
// =============================================================================

export const kbArticles = sqliteTable(
  'kb_articles',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    content: text('content').notNull().default(''),
    category: text('category'),
    tags: text('tags').notNull().default('[]'),
    visibility: text('visibility').notNull().default('internal'),
    status: text('status').notNull().default('draft'),
    author_id: text('author_id')
      .notNull()
      .references(() => users.id),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
    published_at: text('published_at'),
  },
  (t) => [
    unique('uq_kb_tenant_slug').on(t.tenant_id, t.slug),
    index('idx_kb_tenant').on(t.tenant_id),
    index('idx_kb_tenant_status').on(t.tenant_id, t.status),
    index('idx_kb_tenant_visibility').on(t.tenant_id, t.visibility),
    index('idx_kb_tenant_category').on(t.tenant_id, t.category),
  ],
);

// =============================================================================
// kb_article_links — Junction: article <-> ticket
// =============================================================================

export const kbArticleLinks = sqliteTable(
  'kb_article_links',
  {
    article_id: text('article_id')
      .notNull()
      .references(() => kbArticles.id),
    ticket_id: text('ticket_id')
      .notNull()
      .references(() => tickets.id),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
  },
  (t) => [
    primaryKey({ columns: [t.article_id, t.ticket_id] }),
    index('idx_kal_tenant').on(t.tenant_id),
    index('idx_kal_article').on(t.article_id),
    index('idx_kal_ticket').on(t.ticket_id),
  ],
);
