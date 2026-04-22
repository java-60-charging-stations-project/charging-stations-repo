import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import type { LambdaInvokeLogContext, LambdaResultLogContext } from '../common/logContracts';
import { ServiceError } from '../common/serviceErrors';
import { createLogger } from './logger';

const logger = createLogger("lambda.invoker");

export interface LambdaInvoker {
  invokeJson<TResponse>(functionName: string, payload: unknown): Promise<TResponse>;
}

export class AwsLambdaInvoker implements LambdaInvoker {
  private readonly client: LambdaClient;

  constructor(region: string) {
    this.client = new LambdaClient({ region });
  }

  async invokeJson<TResponse>(functionName: string, payload: unknown): Promise<TResponse> {
    const invokeMeta: LambdaInvokeLogContext = { functionName };
    const cmd = new InvokeCommand({
      FunctionName: functionName,
      Payload: Buffer.from(JSON.stringify(payload))
    });

    const res = await this.client.send(cmd);
    const raw = res.Payload ? Buffer.from(res.Payload).toString('utf-8') : '';
    const resultMeta: LambdaResultLogContext = {
      functionName,
      payloadSize: raw.length,
      functionError: res.FunctionError,
    };
    logger.debug('Lambda raw response received', resultMeta);

    if (res.FunctionError) {
      throw new ServiceError(
        `Lambda runtime error (${res.FunctionError}). Payload: ${raw}`,
        502,
        'LAMBDA_INVOKE_FAILED',
        { collectorSource: functionName },
      );
    }

    if (!raw) {
      logger.debug('Lambda response is empty object', invokeMeta);
      return {} as any;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new ServiceError(
        'Lambda returned invalid JSON',
        502,
        'LAMBDA_INVOKE_FAILED',
        { collectorSource: functionName },
      );
    }

    logger.debug('Lambda payload parsed', {
      ...invokeMeta,
      parsedType: typeof parsed,
      hasBodyProperty: Boolean(parsed && typeof parsed === 'object' && 'body' in parsed),
    });

    // If lambda returns API Gateway proxy format: { statusCode, body: "..." }
    if (
      parsed &&
      typeof parsed === 'object' &&
      'body' in parsed &&
      typeof (parsed as { body?: unknown }).body === 'string'
    ) {
      logger.debug('Lambda response in API Gateway proxy format', invokeMeta);
      try {
        return JSON.parse((parsed as { body: string }).body) as TResponse;
      } catch {
        throw new ServiceError(
          'Lambda API Gateway proxy body is not valid JSON',
          502,
          'LAMBDA_INVOKE_FAILED',
          { collectorSource: functionName },
        );
      }
    }
    logger.debug('Lambda response returned as plain JSON', invokeMeta);
    return parsed as TResponse;
  }
}
