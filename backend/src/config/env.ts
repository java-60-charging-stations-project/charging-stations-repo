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

  // users — reads (getUserById, getAllUsers) → `charging-stations-get-user-info` only
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

  stationsPortsReadLambdaFunctionName: String(
    process.env.STATIONS_PORTS_READ_LAMBDA_FUNCTION_NAME ??
      'arn:aws:lambda:il-central-1:852215679994:function:charging-stations-get-ports-sessions-dynamo'
  ),

  sessionsReadLambdaFunctionName: String(
    process.env.SESSIONS_READ_LAMBDA_FUNCTION_NAME ??
      'arn:aws:lambda:il-central-1:852215679994:function:charging-stations-get-session-rds-info'
  ),

  /**
   * RDS logs read Lambda (`lambda/db/read/get_logs_info.py`, action `getLogs`).
   */
  logsReadLambdaFunctionName: String(
    process.env.LOGS_READ_LAMBDA_FUNCTION_NAME ??
      'arn:aws:lambda:il-central-1:852215679994:function:charging-stations-read-logs-rds'
  ),

  /**
   * RDS logs write Lambda (`lambda/db/write/write_logs_rds.py`, actions `write_logs`, `resolveLog`).
   */
  logsWriteLambdaFunctionName: String(
    process.env.LOGS_WRITE_LAMBDA_FUNCTION_NAME ??
      'arn:aws:lambda:il-central-1:852215679994:function:charging-stations-write-logs-rds'
  ),

  stationsPortsWriteLambdaFunctionName: String(
    process.env.STATIONS_PORTS_WRITE_LAMBDA_FUNCTION_NAME ??
      'arn:aws:lambda:il-central-1:852215679994:function:charging-stations-write-station-ports-dynamo'
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

  /** Valkey / Redis-compatible cache (ElastiCache Valkey, local Valkey, etc.). Wire `VALKEY_ENABLED=true` and URL or host. */
  valkey: {
    enabled: readBool('VALKEY_ENABLED', false),
    /** Full URL: `redis://…` or `rediss://…` (TLS). If set, host/port/password below are ignored. */
    url: process.env.VALKEY_URL?.trim() || undefined,
    host: process.env.VALKEY_HOST?.trim() || undefined,
    port: Number(process.env.VALKEY_PORT ?? 6379),
    username: process.env.VALKEY_USERNAME?.trim() || undefined,
    password: process.env.VALKEY_PASSWORD ?? undefined,
    tls: readBool('VALKEY_TLS', false),
    db: Number(process.env.VALKEY_DB ?? 0),
    /** Prepended to every cache key (namespace). */
    keyPrefix: String(process.env.VALKEY_KEY_PREFIX ?? 'charging:'),
    connectTimeoutMs: Number(process.env.VALKEY_CONNECT_TIMEOUT_MS ?? 10_000),
    /** When true, TLS uses default Node verification (works with AWS ElastiCache CA). */
    tlsRejectUnauthorized: readBool('VALKEY_TLS_REJECT_UNAUTHORIZED', true),
  },
};
