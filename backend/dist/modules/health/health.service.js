"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LambdaHealthService = exports.MockHealthService = void 0;
exports.buildHealthService = buildHealthService;
const env_1 = require("../../config/env");
const lambdaInvoker_1 = require("../../utils/lambdaInvoker");
class MockHealthService {
    async check() {
        return { code: 200, status: 'running' };
    }
}
exports.MockHealthService = MockHealthService;
class LambdaHealthService {
    invoker;
    constructor(invoker) {
        this.invoker = invoker;
    }
    async check() {
        // Contract with lambda: we send a minimal event
        const lambdaResponse = await this.invoker.invokeJson(env_1.env.healthLambdaFunctionName, { action: 'health' });
        // We expect lambda to respond in the same contract
        if (typeof lambdaResponse?.code !== 'number' || typeof lambdaResponse?.status !== 'string') {
            return { code: 502, status: 'bad-health-response' };
        }
        return lambdaResponse;
    }
}
exports.LambdaHealthService = LambdaHealthService;
function buildHealthService() {
    if (!env_1.env.useLambda)
        return new MockHealthService();
    return new LambdaHealthService(new lambdaInvoker_1.AwsLambdaInvoker(env_1.env.awsRegion));
}
