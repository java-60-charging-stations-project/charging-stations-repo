import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import type { LambdaInvokeLogContext, LambdaResultLogContext } from '../common/logContracts';
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
      throw new Error(`Lambda error: ${res.FunctionError}. Payload: ${raw}`);
    }

    if (!raw) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logger.debug('Lambda response is empty object', invokeMeta);
      return {} as any;
    }

    const parsed = JSON.parse(raw);
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
      typeof (parsed as any).body === 'string'
    ) {
      logger.debug('Lambda response in API Gateway proxy format', invokeMeta);
      return JSON.parse((parsed as any).body) as TResponse;
    }
    logger.debug('Lambda response returned as plain JSON', invokeMeta);
    return parsed as TResponse;
  }
}
