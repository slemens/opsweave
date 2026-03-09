import { StatusCodes } from 'http-status-codes';

/**
 * Base application error with HTTP status semantics.
 * All custom errors extend this class.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    // Maintain prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: Record<string, unknown>) {
    super(message, StatusCodes.NOT_FOUND, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: Record<string, unknown>) {
    super(message, StatusCodes.UNAUTHORIZED, 'UNAUTHORIZED', details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details?: Record<string, unknown>) {
    super(message, StatusCodes.FORBIDDEN, 'FORBIDDEN', details);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', details?: Record<string, unknown>) {
    super(message, StatusCodes.CONFLICT, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: Record<string, unknown>) {
    super(message, StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class LicenseLimitError extends AppError {
  constructor(message: string = 'License limit reached', details?: Record<string, unknown>) {
    super(message, StatusCodes.FORBIDDEN, 'LICENSE_LIMIT', details);
    this.name = 'LicenseLimitError';
  }
}
