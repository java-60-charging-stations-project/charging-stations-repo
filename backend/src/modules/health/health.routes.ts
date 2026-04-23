import { Router } from 'express';
import { executeHealthRequest, invokeHealthRecordLambda } from './health.service';
import { BadRequestError } from '../../common/serviceErrors';

export function healthRouter(): Router {
  const router = Router();
  router.get('/health', async (req, res) => {
    res.status(200).json({code: 200, status: "healthy"});
  });

  // Single health endpoint backed by Lambda.
  router.get('/health/api', async (req, res) => {
    const callerId = req.user?.sub;
    const result = await executeHealthRequest(callerId);
    res.status(200).json(result);
  });

  // Fetch a stored health record by messageId from the ports/sessions Dynamo Lambda.
  router.get('/health-response', async (req, res) => {
    const messageId = typeof req.query.messageId === 'string' ? req.query.messageId.trim() : '';
    if (!messageId) {
      throw new BadRequestError('messageId is required', 'INVALID_REQUEST');
    }
    const userId = typeof req.query.userId === 'string' ? req.query.userId.trim() : undefined;
    const result = await invokeHealthRecordLambda(messageId, userId);
    res.status(200).json(result);
  });

  return router;
}