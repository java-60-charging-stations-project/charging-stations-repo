import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { fromNodeProviderChain, fromTemporaryCredentials } from '@aws-sdk/credential-providers';

import { env } from '../../../config/env';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('users.cognito.client');

const DEFAULT_DURATION_SECONDS = 3600;
const DEFAULT_ROLE_SESSION_NAME = 'charging-stations-backend-cognito';

function getDurationInSeconds(): number {
    const configValue = env.cognitoAssumeRoleDurationSeconds;
    if (!configValue) return DEFAULT_DURATION_SECONDS;

    const numValue = Number(configValue);
    if (!Number.isInteger(numValue) || numValue < 900 || numValue > 43200) {
        throw new Error(
            'COGNITO_ASSUME_ROLE_DURATION_SECONDS must be an integer between 900 and 43200.'
        );
    }

    return numValue;
}

const crossAccountConfig = {
    roleArn: env.cognitoCrossAccountRoleArn,
    externalId: env.cognitoCrossAccountExternalId,
    roleSessionName: env.cognitoAssumeRoleSessionName ?? DEFAULT_ROLE_SESSION_NAME,
    durationSeconds: getDurationInSeconds(),
} as const;


let cachedClient: CognitoIdentityProviderClient | undefined;

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
export function getCognitoClient(): CognitoIdentityProviderClient {
    if (cachedClient) {
        return cachedClient;
    }

    const region = env.cognitoRegion || env.awsRegion;
    if (!region) {
        throw new Error('Cognito region is not configured.');
    }

    if (crossAccountConfig.roleArn) {
        logger.debug('Using cross-account Cognito configuration: ', { crossAccountConfig });
        cachedClient = new CognitoIdentityProviderClient({
            region,
            credentials: crossAccountConfig.roleArn
                ? fromTemporaryCredentials({
                    masterCredentials: fromNodeProviderChain(),
                    clientConfig: { region },
                    params: {
                        RoleArn: crossAccountConfig.roleArn,
                        RoleSessionName: crossAccountConfig.roleSessionName,
                        ExternalId: crossAccountConfig.externalId,
                        DurationSeconds: crossAccountConfig.durationSeconds
                    }
                })
                : undefined
        });
    }
    else {
        logger.debug('Using local Cognito configuration');
        cachedClient = new CognitoIdentityProviderClient({
            region,
        });
    }
    return cachedClient;
}
