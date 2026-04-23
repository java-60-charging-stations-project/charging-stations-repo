import { SQSClient, SendMessageCommand, SendMessageCommandOutput } from "@aws-sdk/client-sqs";
import { env } from "../config/env";
import { createLogger } from "./logger";

const logger = createLogger("sqs.client");

let sqsClient: SQSClient | undefined = undefined;

export function getSQSClient(): SQSClient | undefined {
    if (sqsClient) {
        return sqsClient;
    }
    const sqsRegion = env.awsRegion;
    if (!sqsRegion && env.lambdaCallMode === "async") {
        throw new Error("With asynchronous lambda call mode the AWS region must be provided");
    }
    sqsClient = new SQSClient({ region: env.awsRegion });

    return sqsClient;
};

export function getCommandQueueUrl() {
    const url = env.commandQueueUrl;
    if (!url && env.lambdaCallMode?.toLowerCase() === "async") {
        throw new Error("Configuration error: no command queue URL provided");
    }
    return url;
};

export type SQSRequestOptions = {
    DelaySeconds?: number;
    MessageDeduplicationId?: string;
    MessageGroupId?: string;
}

export async function putMessageToQuery(
    client: SQSClient,
    queueUrl: string,
    body: string,
    options: SQSRequestOptions = {}
): Promise<SendMessageCommandOutput> {
    const params = {
        QueueUrl: queueUrl,
        MessageBody: body,
        ...options
    };

    try {
        const data = await client.send(new SendMessageCommand(params));
        logger.debug("Success, Message ID:", data.MessageId);
        return data;
    } catch (err) {
        logger.error("Error sending message: ", err);
        throw err;
    }
};