import type { Request, Response, NextFunction } from 'express';
import { type ZodSchema } from 'zod';

/**
 * Generic Zod validation middleware for the request **body**.
 *
 * Parses `req.body` against the given schema. On success the parsed
 * (and potentially transformed) data replaces `req.body`.
 * On failure the ZodError propagates to the global error handler.
 *
 * Usage:
 * ```ts
 * router.post('/tickets', validate(CreateTicketSchema), createTicket);
 * ```
 */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // parseAsync is unnecessary here — Zod parse is synchronous
    // and throws ZodError on validation failure.
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Re-throw so the global error handler formats it
      throw result.error;
    }

    // Replace body with the validated + transformed data
    req.body = result.data;
    next();
  };
}

/**
 * Validate query parameters.
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      throw result.error;
    }

    // Attach parsed query — Express query is read-only on the type,
    // so we cast through unknown to allow replacement.
    (req as unknown as Record<string, unknown>)['query'] = result.data;
    next();
  };
}

/**
 * Validate route parameters.
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      throw result.error;
    }

    (req as unknown as Record<string, unknown>)['params'] = result.data;
    next();
  };
}
