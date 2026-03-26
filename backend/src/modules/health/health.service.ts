import { env } from '../../config/env';
import { AwsLambdaInvoker, type LambdaInvoker } from '../../utils/lambdaInvoker';
import { createLogger } from '../../utils/logger';
import { wrapLambdaRequest } from '../../common/wrappers';

/**
 * `charging-stations-health` returns this directly — not `LambdaSuccessPayload`
 * (`lambda/routes/health/app.py`).
 */
export interface HealthResponse {
  code: number;
  status: string;
}

const LAMBDA_INVOKER: LambdaInvoker = new AwsLambdaInvoker(env.awsRegion);

const logger = createLogger('health.service');

/**
 * Invokes the health Lambda. Pass `callerId` (e.g. Cognito `sub`) so `caller_id` in the payload
 * reflects the authenticated user for audit; omit for system/internal checks.
 */
export async function invokeHealthLambda(callerId?: string): Promise<HealthResponse> {
  const effectiveCaller = callerId?.trim() || 'system';
  try {
    logger.debug(`Invoking health Lambda function: ${env.healthLambdaFunctionName}`, {
      caller_id: effectiveCaller
    });
    const lambdaResponse = await LAMBDA_INVOKER.invokeJson<HealthResponse>(
      env.healthLambdaFunctionName,
      wrapLambdaRequest('health', effectiveCaller, {}, {})
    );
    logger.debug(`Lambda response: ${JSON.stringify(lambdaResponse)}`);

    if (typeof lambdaResponse?.code !== 'number' || typeof lambdaResponse?.status !== 'string') {
      logger.error(`Invalid lambda response: ${JSON.stringify(lambdaResponse)}`);
      return { code: 502, status: 'bad-health-response' };
    }

    return lambdaResponse;
  } catch (error) {
    logger.error(`Error invoking health Lambda function: ${error}`);
    return { code: 502, status: 'no-lambda-response' };
  }
}