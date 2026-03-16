import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
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
    const cmd = new InvokeCommand({
      FunctionName: functionName,
      Payload: Buffer.from(JSON.stringify(payload))
    });

    const res = await this.client.send(cmd);
    const raw = res.Payload ? Buffer.from(res.Payload).toString('utf-8') : '';
    logger.debug("raw = ", raw);

    if (res.FunctionError) {
      throw new Error(`Lambda error: ${res.FunctionError}. Payload: ${raw}`);
    }

    if (!raw) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logger.debug("RESPONSE {}");
      return {} as any;
    }

    const parsed = JSON.parse(raw);
    logger.debug("parsed = ", parsed);
    logger.debug("{typeof parsed, 'body' in parsed} =  ", {typeOfParsed: typeof parsed, BodyInParsed: 'body' in parsed });

    // If lambda returns API Gateway proxy format: { statusCode, body: "..." }
    if (
      parsed &&
      typeof parsed === 'object' &&
      'body' in parsed &&
      typeof (parsed as any).body === 'string'
    ) {
      logger.debug("RESPONSE if: ", JSON.parse((parsed as any).body));
      return JSON.parse((parsed as any).body) as TResponse;
    }
    logger.debug("RESPONSE last: ", parsed);
    return parsed as TResponse;
  }
}
