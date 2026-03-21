import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { fromNodeProviderChain, fromTemporaryCredentials } from '@aws-sdk/credential-providers';

import { env } from '../../../config/env';

let cachedClient: CognitoIdentityProviderClient | undefined;

function readOptionalEnv(name: string): string | undefined {
    const raw = process.env[name]?.trim();
    return raw ? raw : undefined;
}

function readRoleDurationSeconds(): number | undefined {
    const raw = readOptionalEnv('COGNITO_ASSUME_ROLE_DURATION_SECONDS');
    if (!raw) return undefined;

    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 900 || parsed > 43200) {
    throw new Error(
        'COGNITO_ASSUME_ROLE_DURATION_SECONDS must be an integer between 900 and 43200.'
    );
    }

    return parsed;
}

/**
 * Returns a Cognito client for user-pool admin operations.
 *
 * By default, the client uses the standard AWS credential chain:
 * - ECS task role in production
 * - local AWS profile / env vars in development
 *
 * If `COGNITO_CROSS_ACCOUNT_ROLE_ARN` is set, the client first resolves the
 * base credentials and then assumes the target role in the user-pool owner
 * account via STS.
 */
export function getCognitoIdentityProviderClient(): CognitoIdentityProviderClient {
    if (cachedClient) {
        return cachedClient;
    }

    const region = env.cognitoRegion || env.awsRegion;
    if (!region) {
        throw new Error('Cognito region is not configured.');
    }

    const crossAccountRoleArn = readOptionalEnv('COGNITO_CROSS_ACCOUNT_ROLE_ARN');
    const externalId = readOptionalEnv('COGNITO_CROSS_ACCOUNT_EXTERNAL_ID');
    const roleSessionName =
        readOptionalEnv('COGNITO_ASSUME_ROLE_SESSION_NAME') ??
        'charging-stations-backend-cognito';
    const durationSeconds = readRoleDurationSeconds();

    cachedClient = new CognitoIdentityProviderClient({
        region,
        credentials: crossAccountRoleArn
        ? fromTemporaryCredentials({
            masterCredentials: fromNodeProviderChain(),
            clientConfig: { region },
            params: {
                RoleArn: crossAccountRoleArn,
                RoleSessionName: roleSessionName,
                ExternalId: externalId,
                DurationSeconds: durationSeconds
            }
            })
        : undefined
    });

    return cachedClient;
}
