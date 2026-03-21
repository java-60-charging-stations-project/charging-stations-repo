import { Router } from 'express';
import { verifyCognitoJwt } from '../../middlewares/auth';
import { createLogger } from '../../utils/logger';
import { invokeHealthLambda } from './health.service';

const logger = createLogger('health.routes');

export function healthRouter(): Router {
  const router = Router();

  // Health check for the API itself
  router.get('/health', async (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Health check for the API, including lambda functions (no auth — for ops / load balancers)
  router.get('/health/api', async (_req, res) => {
    const result = await invokeHealthLambda();
    res.status(result.code).json(result);
  });

  /**
   * Secured integration check (deliverable: JWT → structured logs → Lambda → JSON response).
   * Only authenticated users; `caller_id` sent to Lambda is the Cognito `sub`.
   * Logs are JSON lines on stdout (picked up by CloudWatch when the API runs in AWS).
   */
  router.get('/health/secured-lambda', verifyCognitoJwt, async (req, res) => {
    const sub = req.user?.sub ?? '';
    logger.info('Secured Lambda integration: authorized request', {
      path: req.path,
      method: req.method,
      sub,
      integration: 'health-lambda'
    });

    const lambdaResult = await invokeHealthLambda(sub);

    logger.info('Secured Lambda integration: Lambda returned', {
      sub,
      lambdaCode: lambdaResult.code,
      lambdaStatus: lambdaResult.status
    });

    const httpStatus = lambdaResult.code >= 100 && lambdaResult.code < 600 ? lambdaResult.code : 502;
    res.status(httpStatus).json({
      success: lambdaResult.code < 400,
      user: { sub },
      lambda: lambdaResult
    });
  });

  return router;
}