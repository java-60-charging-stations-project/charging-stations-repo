import type { NextFunction, Request, Response } from 'express';
import { ServiceError } from '../common/serviceErrors';
import { ZodError } from 'zod';
import { createLogger } from '../utils/logger';

const logger = createLogger('errorHandler');

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length ? `${issue.path.join('.')}: ` : '';
      return `${path}${issue.message}`;
    })
    .join('; ');
}


export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error("Processing error", {
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

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: formatZodError(error),
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