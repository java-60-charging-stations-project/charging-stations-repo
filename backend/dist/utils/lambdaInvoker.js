"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsLambdaInvoker = void 0;
const client_lambda_1 = require("@aws-sdk/client-lambda");
class AwsLambdaInvoker {
    client;
    constructor(region) {
        this.client = new client_lambda_1.LambdaClient({ region });
    }
    async invokeJson(functionName, payload) {
        const cmd = new client_lambda_1.InvokeCommand({
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
            return {};
        }
        return JSON.parse(raw);
    }
}
exports.AwsLambdaInvoker = AwsLambdaInvoker;
