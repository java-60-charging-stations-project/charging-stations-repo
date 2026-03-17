import type { NextFunction, Request, Response } from 'express';
import { ServiceError } from '../common/serviceErrors';

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error({
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  });

  if (res.headersSent) {
    return;
  }

  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({
      error: {
        code: error.errorCode,
        message: error.message,
      },
    });
    return;
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
  });
}