"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function readBool(name, defaultValue) {
    const raw = process.env[name];
    if (raw === undefined)
        return defaultValue;
    return ['1', 'true', 'yes', 'y', 'on'].includes(raw.toLowerCase());
}
exports.env = {
    port: Number(process.env.PORT ?? 8000),
    apiPrefix: String(process.env.API_PREFIX ?? ''),
    corsOrigin: String(process.env.CORS_ORIGIN ?? '*'),
    // health
    useLambda: readBool('USE_LAMBDA', false),
    awsRegion: String(process.env.AWS_REGION ?? process.env.COGNITO_REGION ?? 'il-central-1'),
    healthLambdaFunctionName: String(process.env.HEALTH_LAMBDA_FUNCTION_NAME ?? 'charging-stations-health'),
    // auth
    authDisabled: readBool('AUTH_DISABLED', true),
    cognitoRegion: String(process.env.COGNITO_REGION ?? 'il-central-1'),
    cognitoUserPoolId: String(process.env.COGNITO_USER_POOL_ID ?? ''),
    cognitoClientId: String(process.env.COGNITO_CLIENT_ID ?? ''),
    // misc
    environment: String(process.env.ENVIRONMENT ?? 'local'),
    logLevel: String(process.env.LOG_LEVEL ?? 'info')
};
