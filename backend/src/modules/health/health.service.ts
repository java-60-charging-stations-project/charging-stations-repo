import { env } from '../../config/env';
import { AwsLambdaInvoker, type LambdaInvoker } from '../../utils/lambdaInvoker';
import { createLogger } from '../../utils/logger';
import { wrapLambdaRequest } from '../../common/wrappers';
import { addHealthCommandToQuery, CommandQueueResponse } from '../../utils/sqsCommandQueue';
import { randomUUID } from 'crypto';
import { ServiceError } from '../../common/serviceErrors';
import { apiResponse, LambdaErrorResponse } from '../../common/wrapperTypes';
import { isLambdaErrorPayload } from '../../common/lambdaContracts';

const logger = createLogger('health.service');

export interface HealthRecordRequest {
  userId: string;
  messageId: string;
};

export interface HealthRecordResponse {
  healthy: boolean;
};

type HealthLambdaResponse = { health_record: null } | {
  health_record: {
    "station_id": string;
    "entity_key": string;
    "exp_time": number;
  }
}


/**
 * `charging-stations-health` returns this directly — not `LambdaSuccessPayload`
 * (`lambda/routes/health/app.py`).
 */
export interface HealthResponse {
  code: number;
  status: string;
};

const LAMBDA_INVOKER: LambdaInvoker = new AwsLambdaInvoker(env.awsRegion);

const defaultCallerId = "guest";

/**
 * Invokes the health Lambda. Pass `callerId` (e.g. Cognito `sub`) so `caller_id` in the payload
 * reflects the authenticated user for audit; omit for system/internal checks.
 */
export async function invokeHealthLambda(callerId?: string): Promise<HealthResponse> {
  const effectiveCaller = callerId?.trim() || defaultCallerId;
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
    throw new ServiceError(
      "Error invoking Command query (SQS)",
      502,
      "NO_RESPONSE",
      { collectorSource: env.healthLambdaFunctionName }
    );
  }
};

/**
 * Invokes the `charging-stations-get-ports-sessions-dynamo` Lambda with action `getHealthRecord`
 * and payload `{ userId, messageId }`. Falls back to `defaultCallerId` when `userId` is empty.
 * Returns the raw Lambda response so the caller can forward it as-is.
 */
export async function invokeHealthRecordLambda(
  messageId: string,
  userId?: string
): Promise<HealthRecordResponse> {
  const effectiveUserId = userId?.trim() || defaultCallerId;
  const lambdaName = env.stationsPortsReadLambdaFunctionName;
  const actionName = 'getHealthRecord';
  const payload = wrapLambdaRequest<HealthRecordRequest, Record<string, never>>(
    actionName,
    effectiveUserId,
    { userId: effectiveUserId, messageId }
  );

  try {
    logger.debug(`Invoking ${lambdaName} action=${actionName}`, {
      userId: effectiveUserId,
      messageId,
    });
    const lambdaResponse = await LAMBDA_INVOKER.
      invokeJson<apiResponse<HealthLambdaResponse> | LambdaErrorResponse>(lambdaName, payload);
    logger.debug(`Lambda response: ${JSON.stringify(lambdaResponse)}`);
    if (isLambdaErrorPayload(lambdaResponse)) {
      throw new ServiceError(
        "Error response lambda",
        502,
        "ERROR_LAMBDA_RESPONSE",
        { collectorSource: lambdaName }
      );
    }
    const response: HealthLambdaResponse = lambdaResponse.data;
    logger.debug(`Unpacked response=${JSON.stringify(response)}`);
    const healthy = response.health_record? true : false;
    logger.debug(`Final response: healthy = ${healthy}`);
    return { healthy };
  } catch (error) {
    logger.error(`Error invoking ${lambdaName} action=${actionName}: ${error}`);
    throw new ServiceError(
      `Error invoking ${lambdaName}`,
      502,
      'NO_RESPONSE',
      { collectorSource: lambdaName }
    );
  }
}

export async function executeHealthRequest(callerId?: string): Promise<HealthResponse | CommandQueueResponse> {
  const effectiveCaller = callerId?.trim() || 'guest';
  const lambdaCallMode = env.lambdaCallMode;
  logger.debug(".executeHealthRequest lambdaCallMode = ", lambdaCallMode);
  if (lambdaCallMode === "sync") {
    return invokeHealthLambda(effectiveCaller);
  };
  const requestId = randomUUID();
  try {
    const response = await addHealthCommandToQuery(effectiveCaller, requestId);
    logger.debug(`SQS response = ${response.messageId}`);

    return response;
  }
  catch (error) {
    logger.error("Error sending message to SQS Command query:", error);
    throw new ServiceError(
      "Error invoking Command query (SQS)",
      502,
      "NO_RESPONSE",
    );
  }
}