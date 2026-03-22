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
    ListUsersCommand,
    ListUsersResponse,
    
} from '@aws-sdk/client-cognito-identity-provider';
import { getCognitoClient } from './client';
import { createLogger } from '../../../utils/logger';
import { env } from '../../../config/env';

const logger = createLogger('users.cognito.api');

export class CognitoUsersAPI {
    constructor(
        private readonly client: CognitoIdentityProviderClient,
        private readonly userPoolId: string,
    ) {
        if (!userPoolId) {
            throw new Error('User pool ID is required');
        }
        if (!client) {
            throw new Error('Cognito client is required');
        }
    }

    async addUserToGroup(userIdentifier: string, groupName: string) {
        logger.debug('Adding user to group: ', { userIdentifier, groupName, userPoolId: this.userPoolId });
        const command = new AdminAddUserToGroupCommand({
            UserPoolId: this.userPoolId,
            Username: userIdentifier,
            GroupName: groupName,
        });
        const response = await this.client.send(command);
        logger.debug('User added to group, response: ', response);
        return response;
    }

    async removeUserFromGroup(userIdentifier: string, groupName: string) {
        logger.debug('Removing user from group: ', { userIdentifier, groupName, userPoolId: this.userPoolId });
        const command = new AdminRemoveUserFromGroupCommand({
            UserPoolId: this.userPoolId,
            Username: userIdentifier,
            GroupName: groupName,
        });
        const response = await this.client.send(command);
        logger.debug('User removed from group, response: ', response);
        return response;
    }

    async getUserDetails(userIdentifier: string): Promise<AdminGetUserResponse> {
        logger.debug('Getting user details: ', { userIdentifier, userPoolId: this.userPoolId });
        const command = new AdminGetUserCommand({
            UserPoolId: this.userPoolId,
            Username: userIdentifier,
        });
        const response: AdminGetUserResponse = await this.client.send(command);
        logger.debug('Cognito user details response: ', response);
        return response;
    }

    async listUserGroups(userIdentifier: string): Promise<string[]> {
        logger.debug('Listing user groups: ', { userIdentifier, userPoolId: this.userPoolId });
        const command = new AdminListGroupsForUserCommand({
            Username: userIdentifier,
            UserPoolId: this.userPoolId,
        });
        const response: AdminListGroupsForUserResponse = await this.client.send(command);
        logger.debug('Cognito user groups response: ', response);
        return response.Groups?.map(group => group.GroupName ?? '') ?? [];
    }

    async enableUser(userIdentifier: string) {
        logger.debug('Enabling user: ', { userIdentifier, userPoolId: this.userPoolId });
        const command = new AdminEnableUserCommand({
            UserPoolId: this.userPoolId,
            Username: userIdentifier,
        });
        const response = await this.client.send(command);
        logger.debug('User enabled, response: ', response);
        return response;
    }

    async disableUser(userIdentifier: string) {
        logger.debug('Disabling user: ', { userIdentifier, userPoolId: this.userPoolId });
        const command = new AdminDisableUserCommand({
            UserPoolId: this.userPoolId,
            Username: userIdentifier,
        });
        const response = await this.client.send(command);
        logger.debug('User disabled, response: ', response);
        return response;
    }

    async listUsers(): Promise<ListUsersResponse> {
        logger.debug('Listing users: ', { userPoolId: this.userPoolId });
        const command = new ListUsersCommand({
            UserPoolId: this.userPoolId,
        });
        return this.client.send(command);

    }
}

export const cognitoApiClient = new CognitoUsersAPI(getCognitoClient(), env.cognitoUserPoolId);
