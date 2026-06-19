import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(`${service}: ${message}`, 502);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.requestId || 'unknown';

  if (err instanceof AppError) {
    logger.warn(
      {
        requestId,
        error: err.message,
        statusCode: err.statusCode,
        path: req.path,
      },
      'Operational error'
    );

    res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode,
      requestId,
    });
    return;
  }

  // Unexpected errors
  logger.error(
    {
      requestId,
      error: err.message,
      stack: err.stack,
      path: req.path,
    },
    'Unexpected error'
  );

  res.status(500).json({
    error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
    statusCode: 500,
    requestId,
  });
}
