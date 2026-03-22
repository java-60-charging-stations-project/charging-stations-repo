import { AdminGetUserResponse } from '@aws-sdk/client-cognito-identity-provider';
import {
    AdminUserDetails,
    GetUserDetailsFilters,
    ListUsersFilters,
    ListUsersResult,
    UpdateProfilePayload,
    UpdateUserEnabledPayload,
    UpdateUserRolePayload,
    UserInfo,
    UserRole,
    UsersService,
} from './users.types';
import { ResourceNotFoundError, InternalServerError } from '../../common/serviceErrors';
import { cognitoApiClient } from './cognito/api';
import { getUserInfoFromCognitoUser,
    unpackAdminGetUserResponse,
    unpackListUsersResponse } from './cognito/utils';
import { createLogger } from '../../utils/logger';
import { CognitoUser } from './cognito/types';

const logger = createLogger('UsersServiceAwsLocal');

function throwUserNotFoundError(userId: string): never {
    throw new ResourceNotFoundError(`User ${userId} not found`, 'USER_NOT_FOUND');
}

export class UsersServiceAwsLocal implements UsersService {

    async getMyInfo(_userId: string): Promise<UserInfo> {
        logger.debug('Getting my info: ', { _userId });
        const cognitoResponse: AdminGetUserResponse = await cognitoApiClient.getUserDetails(_userId);
        if (!cognitoResponse) {
            throwUserNotFoundError(_userId);
        }
        logger.debug('Cognito response: ', { cognitoResponse });
        const cognitoUser: CognitoUser = unpackAdminGetUserResponse(cognitoResponse);
        return getUserInfoFromCognitoUser(cognitoUser);
    }

    async getUserById(_adminId: string, _userId: string): Promise<UserInfo | null> {
        logger.debug('Getting user by id: ', { _adminId, _userId });
        const cognitoResponse = await cognitoApiClient.getUserDetails(_userId);
        if (!cognitoResponse) {
            throwUserNotFoundError(_userId);
        }
        logger.debug('Cognito response: ', { cognitoResponse });
        const cognitoUser: CognitoUser = unpackAdminGetUserResponse(cognitoResponse);
        return getUserInfoFromCognitoUser(cognitoUser);
    }

    async listUsers(_adminId: string, _filters: ListUsersFilters): Promise<ListUsersResult> {
        logger.debug('Listing users: ', { _adminId, _filters });
        const cognitoResponse = await cognitoApiClient.listUsers();
        if (!cognitoResponse) {
            throw new InternalServerError();
        }
        logger.debug('Cognito response: ', { cognitoResponse });
        const users: CognitoUser[] = unpackListUsersResponse(cognitoResponse);
        return {
            data: users.map(user => getUserInfoFromCognitoUser(user)),
            totalItems: users.length,
        };
    }

    async updateUserRole(
        _adminId: string,
        _userId: string,
        _payload: UpdateUserRolePayload
    ): Promise<void> {
        throw new Error('Not implemented');
    }

    async getUserRole(_adminId: string, _userId: string): Promise<UserRole | null> {
        throw new Error('Not implemented');
    }

    async getUserDetails(
        _adminId: string,
        _userId: string,
        _filters: GetUserDetailsFilters
    ): Promise<AdminUserDetails | null> {
        throw new Error('Not implemented');
    }

    async enableUser(
        _adminId: string,
        _userId: string,
        _payload: UpdateUserEnabledPayload
    ): Promise<void> {
        throw new Error('Not implemented');
    }

    async disableUser(
        _adminId: string,
        _userId: string,
        _payload: UpdateUserEnabledPayload
    ): Promise<void> {
        throw new Error('Not implemented');
    }
    updateOwnProfile(userId: string, payload: UpdateProfilePayload): Promise<void> {
        throw new Error('Method not implemented.');
    }
    updateUserProfileAsAdmin(adminId: string, userId: string, payload: UpdateProfilePayload): Promise<void> {
        throw new Error('Method not implemented.');
    }
    deleteUser(adminId: string, userId: string): Promise<void> {
        throw new Error('Method not implemented.');
    }
}
