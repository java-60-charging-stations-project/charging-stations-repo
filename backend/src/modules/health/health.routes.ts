import { Router } from 'express';
import { invokeHealthLambda } from './health.service';

export function healthRouter(): Router {
  const router = Router();

  // Health check for the API itself
  router.get('/health', async (_req, res) => {
    const result =  { code: 200, status: 'running' };
    res.status(result.code).json(result);
  });

  // Health check for the API, including lambda functions
  router.get('/health/api', async (_req, res) => {
    const result = await invokeHealthLambda();
    res.status(result.code).json(result);
  });

  return router;
}