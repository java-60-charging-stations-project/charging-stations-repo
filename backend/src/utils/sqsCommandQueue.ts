import { getCommandQueueUrl, getSQSClient, putMessageToQuery } from "./sqsUtils";

export type CommandQueueRequest = {
    callerId: string;
    targetFn: string;
    action: string;
    groupId: string;
    deduplicationId: string;
};

export type CommandQueueResponse = {
    messageId: string;
};

export async function addCommandToQuery(
    request: CommandQueueRequest,
    data: unknown = {},
): Promise<CommandQueueResponse> {
    const client = getSQSClient();
    const url = getCommandQueueUrl();

    if (!client) {
        throw new Error("The SQS client isn't provided");
    };
    if (!url) {
        throw new Error("The Command queue URL isn't provided");
    }

    const {
        callerId,
        targetFn,
        action,
        groupId,
        deduplicationId,
    } = request;

    const options = {
        MessageGroupId: groupId,
        MessageDeduplicationId: deduplicationId,
    };
    const message = JSON.stringify({
        service: {
            callerId,
            targetFn,
            action
        },
        data
    });
    const response = await putMessageToQuery(client, url, message, options);
    const messageId = response.MessageId;
    if (!messageId) {
        throw new Error("Message sending failed. No messageId received.");
    };
    
    return { messageId };
};

export async function addHealthCommandToQuery(callerId: string, requestId: string): Promise<CommandQueueResponse> {
    return addCommandToQuery({
        callerId,
        targetFn: "charging-stations-health",
        action: "getHealth",
        groupId: requestId,
        deduplicationId: requestId,
    });
};