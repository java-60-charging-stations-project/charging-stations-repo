import { 
    CognitoIdentityProviderClient,
    AdminAddUserToGroupCommand,
    AdminRemoveUserFromGroupCommand,
    AdminGetUserCommand,
    AdminGetUserResponse,
    AdminListGroupsForUserCommand,
    AdminListGroupsForUserResponse,
    AdminEnableUserCommand,
    AdminDisableUserCommand,

} from '@aws-sdk/client-cognito-identity-provider';
import { getCognitoClient } from './client';
import { createLogger } from '../../../utils/logger';
import { env } from '../../../config/env';
import { UserDetails } from './types';
const logger = createLogger('users.cognito.api');

const defaultCognitoClient: CognitoIdentityProviderClient = getCognitoClient();
const defaultUserPoolId: string = env.cognitoUserPoolId;

export async function addUserToGroup(
    userIdentifier: string,
    groupName: string,
    userPoolId: string = defaultUserPoolId,
    client: CognitoIdentityProviderClient = defaultCognitoClient,
) {
    logger.debug('Adding user to group: ', { userIdentifier, groupName, userPoolId });
    const input = { // AdminAddUserToGroupRequest
        UserPoolId: userPoolId, // required
        Username: userIdentifier, // required
        GroupName: groupName, // required
    };
    const command = new AdminAddUserToGroupCommand(input);
    const response = await client.send(command);
    logger.debug('User added to group, response: ', response);
    return response;
};

export async function removeUserFromGroup(
    userIdentifier: string,
    groupName: string,
    userPoolId: string = defaultUserPoolId,
    client: CognitoIdentityProviderClient = defaultCognitoClient,
) {
    logger.debug('Removing user from group: ', { userIdentifier, groupName, userPoolId });
    const input = { // AdminRemoveUserFromGroupRequest
        UserPoolId: userPoolId, // required
        Username: userIdentifier, // required
        GroupName: groupName, // required
    };
    const command = new AdminRemoveUserFromGroupCommand(input);
    const response = await client.send(command);
    logger.debug('User removed from group, response: ', response);
    return response;
};

function getCognitoAttribute(cognitoResponse: AdminGetUserResponse, attributeName: string): string | undefined {
    return cognitoResponse.UserAttributes?.find(
        attribute => attribute.Name === attributeName
    )?.Value;
}

export async function getUserDetails(
    userIdentifier: string,
    userPoolId: string = defaultUserPoolId,
    client: CognitoIdentityProviderClient = defaultCognitoClient,
): Promise<UserDetails> {
    logger.debug('Getting user details: ', { userIdentifier, userPoolId });
    const input = { // AdminGetUserRequest
        UserPoolId: "STRING_VALUE", // required
        Username: "STRING_VALUE", // required
        };
    const command = new AdminGetUserCommand(input);
    const response: AdminGetUserResponse = await client.send(command);
    logger.debug('Cognito user details response: ', response);
    return {
        username: response.Username,
        name: getCognitoAttribute(response, 'name'),
        email: getCognitoAttribute(response, 'email'),
        createDate: response.UserCreateDate?.toISOString(),
        lastModifiedDate: response.UserLastModifiedDate?.toISOString(),
        enabled: response.Enabled,
        status: response.UserStatus,
    }
};

export async function listUserGroups(
    userIdentifier: string,
    userPoolId: string = defaultUserPoolId,
    client: CognitoIdentityProviderClient = defaultCognitoClient,
): Promise<string[]> {
    logger.debug('Listing user groups: ', { userIdentifier, userPoolId });
    const input = { // AdminListGroupsForUserRequest
        Username: userIdentifier, // required
        UserPoolId: userPoolId, // required
    };
    const command = new AdminListGroupsForUserCommand(input);
    const response: AdminListGroupsForUserResponse = await client.send(command);
    logger.debug('Cognito user groups response: ', response);
    return response.Groups?.map(group => group.GroupName ?? '') ?? [];
};

export async function enableUser(
    userIdentifier: string,
    userPoolId: string = defaultUserPoolId,
    client: CognitoIdentityProviderClient = defaultCognitoClient,
) {
    logger.debug('Enabling user: ', { userIdentifier, userPoolId });
    const input = { // AdminEnableUserRequest
        UserPoolId: userPoolId, // required
        Username: userIdentifier, // required
    };
    const command = new AdminEnableUserCommand(input);
    const response = await client.send(command);
    logger.debug('User enabled, response: ', response);
    return response;
};

export async function disableUser(
    userIdentifier: string,
    userPoolId: string = defaultUserPoolId,
    client: CognitoIdentityProviderClient = defaultCognitoClient,
) {
    logger.debug('Disabling user: ', { userIdentifier, userPoolId });
    const input = { // AdminDisableUserRequest
        UserPoolId: userPoolId, // required
        Username: userIdentifier, // required
    };
    const command = new AdminDisableUserCommand(input);
    const response = await client.send(command);
    logger.debug('User disabled, response: ', response);
    return response;
};