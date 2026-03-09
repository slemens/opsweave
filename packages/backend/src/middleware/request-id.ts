import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Assigns a unique request ID to every incoming request.
 *
 * If the client sends an `X-Request-ID` header it is reused;
 * otherwise a new UUIDv4 is generated.
 *
 * The ID is exposed on `req.requestId` and as the
 * `X-Request-ID` response header for correlation.
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && incoming.length > 0 ? incoming : uuidv4();

  req.requestId = id;
  res.setHeader('X-Request-ID', id);

  next();
}
