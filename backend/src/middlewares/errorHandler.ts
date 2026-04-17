import type { NextFunction, Request, Response } from 'express';
import type {
  ForbiddenLogContext,
  RequestLogContext,
  ServiceErrorLogContext,
  UnhandledErrorLogContext,
  ValidationErrorLogContext,
} from '../common/logContracts';
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

function getRequestLogContext(req: Request): RequestLogContext {
  return {
    method: req.method,
    path: req.path,
    userId: req.user?.sub,
    query: req.query,
    params: req.params,
  };
}


export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (res.headersSent) {
    return;
  }

  if (error instanceof ServiceError) {
    if (error.statusCode === 403) {
      const meta: ForbiddenLogContext = {
        errorCode: error.errorCode,
        message: error.message,
        ...getRequestLogContext(req),
        userGroups: req.user?.groups ?? [],
        ip: req.ip,
        userAgent: req.get('user-agent'),
      };
      logger.warn('Forbidden response returned', meta);
    } else {
      const meta: ServiceErrorLogContext = {
        errorCode: error.errorCode,
        statusCode: error.statusCode,
        message: error.message,
        ...getRequestLogContext(req),
      };
      logger.error('Service error returned', meta);
    }

    res.status(error.statusCode).json({
      error: {
        code: error.errorCode,
        message: error.message,
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    const meta: ValidationErrorLogContext = {
      message: formatZodError(error),
      ...getRequestLogContext(req),
    };
    logger.warn('Validation error returned', meta);

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: formatZodError(error),
      },
    });
    return;
  }

  const meta: UnhandledErrorLogContext = {
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    ...getRequestLogContext(req),
  };
  logger.error('Unhandled error returned', meta);

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
  });
}