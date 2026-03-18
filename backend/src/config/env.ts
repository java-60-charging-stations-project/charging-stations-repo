import dotenv from 'dotenv';

dotenv.config();

function readBool(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'y', 'on'].includes(raw.toLowerCase());
}

export const env = {
  port: Number(process.env.PORT ?? 8000),
  apiPrefix: String(process.env.API_PREFIX ?? ''),
  corsOrigin: String(process.env.CORS_ORIGIN ?? '*'),

  // health
  useLambda: readBool('USE_LAMBDA', false),
  awsRegion: String(process.env.AWS_REGION ?? process.env.COGNITO_REGION ?? 'il-central-1'),
  healthLambdaFunctionName: String(process.env.HEALTH_LAMBDA_FUNCTION_NAME ?? 'charging-stations-health'),

  // auth
  authDisabled: readBool('AUTH_DISABLED', false),
  cognitoRegion: String(process.env.COGNITO_REGION ?? 'il-central-1'),
  cognitoUserPoolId: String(process.env.COGNITO_USER_POOL_ID ?? ''),
  cognitoClientId: String(process.env.COGNITO_CLIENT_ID ?? ''),

  // users / admin
  userManagementLambdaFunctionName: String(
    process.env.USER_MANAGEMENT_LAMBDA_FUNCTION_NAME ?? 'arn:aws:lambda:il-central-1:852215679994:function:charging-stations-write-user-rds'
  ),
  userInfoLambdaFunctionName: String(
    process.env.USER_INFO_LAMBDA_FUNCTION_NAME ??
    'arn:aws:lambda:il-central-1:852215679994:function:charging-stations-get-user-info'
  ),

  // stations
  stationsLambdaFunctionName: String(
    process.env.STATIONS_LAMBDA_FUNCTION_NAME ?? 'charging-stations-station-service'
  ),

  // misc
  environment: String(process.env.ENVIRONMENT ?? 'local'),
  logLevel: String(process.env.LOG_LEVEL ?? 'info')
};
