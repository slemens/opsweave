import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';

import { getDb, type TypedDb } from '../../config/database.js';
import { feedbackEntries } from '../../db/schema/index.js';
import { sendSuccess, sendCreated } from '../../lib/response.js';

function db(): TypedDb {
  return getDb() as TypedDb;
}

/** GET /api/v1/feedback */
export async function list(_req: Request, res: Response): Promise<void> {
  const rows = await db()
    .select()
    .from(feedbackEntries)
    .orderBy(desc(feedbackEntries.created_at));

  sendSuccess(res, rows);
}

/** POST /api/v1/feedback */
export async function create(req: Request, res: Response): Promise<void> {
  const { authorName, entryType, title, description } = req.body as {
    authorName?: string;
    entryType?: string;
    title?: string;
    description?: string;
  };

  if (!authorName?.trim() || !title?.trim()) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'authorName and title are required' },
    });
    return;
  }

  const validTypes = ['bug', 'feature', 'improvement', 'question', 'feedback'];
  const type = validTypes.includes(entryType ?? '') ? entryType! : 'feedback';

  const id = uuidv4();
  const now = new Date().toISOString();

  await db().insert(feedbackEntries).values({
    id,
    author_name: authorName.trim(),
    entry_type: type,
    title: title.trim(),
    description: (description ?? '').trim(),
    status: 'open',
    votes: 0,
    created_at: now,
  });

  const [row] = await db()
    .select()
    .from(feedbackEntries)
    .where(eq(feedbackEntries.id, id));

  sendCreated(res, row);
}

/** POST /api/v1/feedback/:id/vote */
export async function vote(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const d = db();

  const [existing] = await d
    .select()
    .from(feedbackEntries)
    .where(eq(feedbackEntries.id, id));

  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Entry not found' } });
    return;
  }

  await d
    .update(feedbackEntries)
    .set({ votes: existing.votes + 1 })
    .where(eq(feedbackEntries.id, id));

  const [updated] = await d
    .select()
    .from(feedbackEntries)
    .where(eq(feedbackEntries.id, id));

  sendSuccess(res, updated);
}
