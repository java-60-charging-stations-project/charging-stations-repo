import type { NextFunction, Request, Response } from 'express';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // eslint-disable-next-line no-console
  console.error(err);

  // Basic safe error response
  const message = err instanceof Error ? err.message : 'Unexpected error';
  const status = 500;
  res.status(status).json({
    code: status,
    error: {
      message
    }
  });
}
