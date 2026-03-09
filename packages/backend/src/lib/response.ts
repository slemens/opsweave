import type { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

// ─── Response Shapes ───────────────────────────────────────

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiPaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: Record<string, unknown>;
}

// ─── Helpers ───────────────────────────────────────────────

/**
 * Send a successful JSON response.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  status: number = StatusCodes.OK,
): void {
  const body: ApiSuccessResponse<T> = { data };
  res.status(status).json(body);
}

/**
 * Send a successful JSON response with a `201 Created` status.
 */
export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, StatusCodes.CREATED);
}

/**
 * Send a paginated JSON response.
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
): void {
  const totalPages = Math.ceil(total / limit);
  const body: ApiPaginatedResponse<T> = {
    data,
    meta: { total, page, limit, totalPages },
  };
  res.status(StatusCodes.OK).json(body);
}

/**
 * Send an error JSON response.
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): void {
  const body: ApiErrorResponse = {
    error: { code, message, ...(details ? { details } : {}) },
  };
  res.status(statusCode).json(body);
}

/**
 * Send a 204 No Content response (e.g. after DELETE).
 */
export function sendNoContent(res: Response): void {
  res.status(StatusCodes.NO_CONTENT).send();
}
