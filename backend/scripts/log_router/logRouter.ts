import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

const AWS_REGION = process.env.AWS_REGION ?? 'il-central-1';
const LOG_PROCESSOR_FUNCTION_ARN = process.env.LOG_PROCESSOR_FUNCTION_ARN;

type LambdaEvent = Record<string, unknown>;
type LambdaContext = Record<string, unknown>;
type HandlerResult = { data: { message: string } } | { error: string };

export const handler = async (
  event: LambdaEvent,
  _context: LambdaContext,
): Promise<HandlerResult> => {
  console.log(`Handler called with event: ${JSON.stringify(event)}`);

  if (!LOG_PROCESSOR_FUNCTION_ARN) {
    const message = 'LOG_PROCESSOR_FUNCTION_ARN is not set';
    console.log(`Error invoking write_logs: ${message}`);
    return { error: `Error invoking write_logs: ${message}` };
  }

  const client = new LambdaClient({ region: AWS_REGION });

  const resp = await client.send(
    new InvokeCommand({
      FunctionName: LOG_PROCESSOR_FUNCTION_ARN,
      InvocationType: 'Event',
      Payload: Buffer.from(JSON.stringify(event), 'utf-8'),
    }),
  );

  if (resp.StatusCode !== 202) {
    console.error(`Error invoking write_logs: ${JSON.stringify(resp)}`);
    return { error: `Error invoking write_logs: ${JSON.stringify(resp)}` };
  }

  if (resp.FunctionError) {
    console.log(`Error invoking write_logs: ${resp.FunctionError}`);
    return { error: `Error invoking write_logs: ${resp.FunctionError}` };
  }

  console.log(`Successfully invoked write_logs: ${JSON.stringify(resp)}`);
  return { data: { message: 'Log router invoked successfully' } };
};
