import { env } from '../../config/env';
import { AwsLambdaInvoker, type LambdaInvoker } from '../../utils/lambdaInvoker';
import { createLogger } from '../../utils/logger';

export interface HealthResponse {
  code: number;
  status: string;
}

const LAMBDA_INVOKER: LambdaInvoker = new AwsLambdaInvoker(env.awsRegion);

const logger = createLogger('health.service');

export async function invokeHealthLambda(): Promise<HealthResponse> {
  try {
    logger.debug(`Invoking health Lambda function: ${env.healthLambdaFunctionName}`);
    const lambdaResponse = await LAMBDA_INVOKER.invokeJson<HealthResponse>(
      env.healthLambdaFunctionName,
      { action: 'health' }
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