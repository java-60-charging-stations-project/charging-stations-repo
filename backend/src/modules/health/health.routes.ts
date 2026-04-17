import { Router } from 'express';
import { invokeHealthLambda } from './health.service';

export function healthRouter(): Router {
  const router = Router();

  // Single health endpoint backed by Lambda.
  router.get('/health', async (_req, res) => {
    const result = await invokeHealthLambda();
    res.status(result.code).json(result);
  });

  return router;
}