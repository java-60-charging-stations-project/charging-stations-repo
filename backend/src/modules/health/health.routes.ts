import { Router } from 'express';
import { executeHealthRequest } from './health.service';

export function healthRouter(): Router {
  const router = Router();

  // Single health endpoint backed by Lambda.
  router.get('/health', async (req, res) => {
    const callerId = req.user?.sub;
    const result = await executeHealthRequest(callerId);
    res.status(200).json(result);
  });

  return router;
}