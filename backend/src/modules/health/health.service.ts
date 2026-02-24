import { env } from '../../config/env';
import { AwsLambdaInvoker, type LambdaInvoker } from '../../utils/lambdaInvoker';
import type { HealthResponse } from './health.types';

export interface HealthService {
  check(): Promise<HealthResponse>;
}

export class MockHealthService implements HealthService {
  async check(): Promise<HealthResponse> {
    return { code: 200, status: 'running' };
  }
}

export class LambdaHealthService implements HealthService {
  constructor(private readonly invoker: LambdaInvoker) {}

  async check(): Promise<HealthResponse> {
    // Contract with lambda: we send a minimal event
    const lambdaResponse = await this.invoker.invokeJson<HealthResponse>(
      env.healthLambdaFunctionName,
      { action: 'health' }
    );

    // We expect lambda to respond in the same contract
    if (typeof lambdaResponse?.code !== 'number' || typeof lambdaResponse?.status !== 'string') {
      return { code: 502, status: 'bad-health-response' };
    }

    return lambdaResponse;
  }
}

export function buildHealthService(): HealthService {
  if (!env.useLambda) return new MockHealthService();
  return new LambdaHealthService(new AwsLambdaInvoker(env.awsRegion));
}
