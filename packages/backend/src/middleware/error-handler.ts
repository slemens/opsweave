import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { StatusCodes } from 'http-status-codes';

import { AppError } from '../lib/errors.js';
import { sendError } from '../lib/response.js';
// AUDIT-FIX: H-11 — Structured logging
import logger from '../lib/logger.js';

/**
 * Global error-handling middleware.
 *
 * Express 5 automatically catches async errors, so this handler
 * will receive both synchronously thrown and rejected-promise errors.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ── Zod validation errors ────────────────────────────────
  if (err instanceof ZodError) {
    const details: Record<string, unknown> = {
      issues: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    };

    sendError(
      res,
      StatusCodes.BAD_REQUEST,
      'VALIDATION_ERROR',
      'Validation failed',
      details,
    );
    return;
  }

  // ── Known application errors ─────────────────────────────
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // ── Unknown / unexpected errors ──────────────────────────
  const message =
    err instanceof Error ? err.message : 'An unexpected error occurred';

  // AUDIT-FIX: H-11 — Structured logging
  logger.error({ err }, 'Unhandled error');

  sendError(
    res,
    StatusCodes.INTERNAL_SERVER_ERROR,
    'INTERNAL_ERROR',
    process.env['NODE_ENV'] === 'production'
      ? 'An unexpected error occurred'
      : message,
  );
}
