import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type {
  CollectorErrorLog,
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

function buildCollectorErrorLog(
  req: Request,
  message: string,
  event: string,
  /** Prefer Lambda function name/ARN when the fault came from Lambda so collectors can dedupe. */
  sourceService?: string
): CollectorErrorLog {
  const nowIso = new Date().toISOString();
  const resolverId = req.user?.sub ?? 'guest';
  return {
    level: 'ERROR',
    message,
    service: 'backend',
    event,
    source_service: sourceService,
    caller_id: resolverId,
    request_id: req.get('x-request-id') ?? undefined,
    timestamp: nowIso,
    log_id: randomUUID(),
    resolve_time: nowIso,
    resolver_id: resolverId,
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
    const collectorSource = error.collectorSource;
    const collectorEvent =
      error.statusCode === 403
        ? 'FORBIDDEN_RESPONSE'
        : error.errorCode === 'LAMBDA_INVOKE_FAILED'
          ? 'LAMBDA_TRANSPORT_ERROR'
          : error.collectorSource
            ? 'LAMBDA_RESPONSE_ERROR'
            : 'SERVICE_ERROR';

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
      logger.collectorError(
        buildCollectorErrorLog(req, error.message, collectorEvent, collectorSource)
      );
    } else {
      const meta: ServiceErrorLogContext = {
        errorCode: error.errorCode,
        statusCode: error.statusCode,
        message: error.message,
        ...getRequestLogContext(req),
      };
      logger.error('Service error returned', meta);
      logger.collectorError(
        buildCollectorErrorLog(req, error.message, collectorEvent, collectorSource)
      );
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
    const validationMessage = formatZodError(error);
    const meta: ValidationErrorLogContext = {
      message: validationMessage,
      ...getRequestLogContext(req),
    };
    logger.warn('Validation error returned', meta);
    logger.collectorError(
      buildCollectorErrorLog(req, validationMessage, 'VALIDATION_ERROR')
    );

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: validationMessage,
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
  logger.collectorError(
    buildCollectorErrorLog(req, meta.message, 'UNHANDLED_ERROR')
  );

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
  });
}