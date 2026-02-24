import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

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

    if (res.FunctionError) {
      throw new Error(`Lambda error: ${res.FunctionError}. Payload: ${raw}`);
    }

    if (!raw) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
    }

    return JSON.parse(raw) as TResponse;
  }
}
