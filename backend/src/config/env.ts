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

  // users — reads (get_user_by_id, get_all_users) → `charging-stations-get-user-info` only
  userInfoLambdaFunctionName: String(
    process.env.USER_INFO_LAMBDA_FUNCTION_NAME ??
    'arn:aws:lambda:il-central-1:852215679994:function:charging-stations-get-user-info'
  ),
  /** Mutations (profile/role/delete) — must point to a Lambda that implements those actions; not the read Lambda. */
  userManagementLambdaFunctionName: String(
    process.env.USER_MANAGEMENT_LAMBDA_FUNCTION_NAME ?? 'arn:aws:lambda:il-central-1:852215679994:function:charging-stations-write-user-rds'
  ),

  // stations
  stationsLambdaFunctionName: String(
    process.env.STATIONS_LAMBDA_FUNCTION_NAME ?? 
    'arn:aws:lambda:il-central-1:852215679994:function:charging-stations-get-station-info'
  ),

  stationsLambdaWriteFunctionName: String(
    process.env.STATIONS_LAMBDA_WRITE_FUNCTION_NAME ?? 
    'arn:aws:lambda:il-central-1:852215679994:function:charging-stations-write-station-rds'
  ),

  // misc
  environment: String(process.env.ENVIRONMENT ?? 'local'),
  logLevel: String(process.env.LOG_LEVEL ?? 'info'),

  //Cognito settings
  cognitoRegion: String(process.env.COGNITO_REGION ?? 'il-central-1'),
  cognitoUserPoolId: String(process.env.COGNITO_USER_POOL_ID ?? ''),
  cognitoClientId: String(process.env.COGNITO_CLIENT_ID ?? ''),
  //Cross-account Cognito access settings
  cognitoCrossAccountRoleArn: process.env.COGNITO_CROSS_ACCOUNT_ROLE_ARN,
  cognitoAssumeRoleDurationSeconds: process.env.COGNITO_ASSUME_ROLE_DURATION_SECONDS,
  cognitoCrossAccountExternalId: process.env.COGNITO_CROSS_ACCOUNT_EXTERNAL_ID,
  cognitoAssumeRoleSessionName: process.env.COGNITO_ASSUME_ROLE_SESSION_NAME,
};
