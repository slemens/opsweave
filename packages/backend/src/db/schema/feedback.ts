import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// =============================================================================
// feedback_entries — Public feedback board, NO tenant_id (global)
// =============================================================================

export const feedbackEntries = sqliteTable(
  'feedback_entries',
  {
    id: text('id').primaryKey(),
    author_name: text('author_name').notNull(),
    entry_type: text('entry_type').notNull().default('feedback'), // bug | feature | improvement | question | feedback
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    status: text('status').notNull().default('open'), // open | in_progress | done | wont_fix
    votes: integer('votes').notNull().default(0),
    created_at: text('created_at').notNull(),
  },
  (t) => [
    index('idx_feedback_type').on(t.entry_type),
    index('idx_feedback_created').on(t.created_at),
  ],
);
