import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { StatusCodes } from 'http-status-codes';

import { AppError } from '../lib/errors.js';
import { sendError } from '../lib/response.js';

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

  // Log full error in non-production for debugging
  if (process.env['NODE_ENV'] !== 'production') {
    console.error('[ErrorHandler]', err);
  } else {
    // In production, log a sanitised version
    console.error(
      '[ErrorHandler]',
      err instanceof Error ? err.stack : String(err),
    );
  }

  sendError(
    res,
    StatusCodes.INTERNAL_SERVER_ERROR,
    'INTERNAL_ERROR',
    process.env['NODE_ENV'] === 'production'
      ? 'An unexpected error occurred'
      : message,
  );
}
