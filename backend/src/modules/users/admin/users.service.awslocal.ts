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
} from '../users.types';
import { UsersService } from '../users.service.interface';
import { ResourceNotFoundError, InternalServerError, BadRequestError } from '../../../common/serviceErrors';
import { cognitoApiClient } from '../cognito/api';
import { getUserInfoFromCognitoUser,
    unpackAdminGetUserResponse,
    unpackListUsersResponse } from '../cognito/utils';
import { createLogger } from '../../../utils/logger';
import { CognitoUser } from '../cognito/types';
import { ADMIN_GROUP, SUPPORT_GROUP } from '../../../common/authRoles';

const logger = createLogger('UsersServiceAwsLocal');

function throwUserNotFoundError(userId: string): never {
    throw new ResourceNotFoundError(`User ${userId} not found`, 'USER_NOT_FOUND');
}

export class UsersServiceAwsLocal {

    async getMyInfo(_userId: string): Promise<UserInfo> {
        logger.debug('Getting my info: ', { _userId });
        const cognitoResponse: AdminGetUserResponse = await cognitoApiClient.getUser(_userId);
        if (!cognitoResponse) {
            throwUserNotFoundError(_userId);
        }
        logger.debug('Cognito response: ', { cognitoResponse });
        const cognitoUser: CognitoUser = unpackAdminGetUserResponse(cognitoResponse);
        return getUserInfoFromCognitoUser(cognitoUser);
    }

    async getUserById(_adminId: string, _userId: string): Promise<UserInfo> {
        logger.debug('Getting user by id: ', { _adminId, _userId });
        const cognitoResponse = await cognitoApiClient.getUser(_userId);
        if (!cognitoResponse) {
            throwUserNotFoundError(_userId);
        }
        logger.debug('Cognito response: ', { cognitoResponse });
        const cognitoUser: CognitoUser = unpackAdminGetUserResponse(cognitoResponse);
        return getUserInfoFromCognitoUser(cognitoUser);
    }

    // async listUsers(_adminId: string, _filters: ListUsersFilters): Promise<ListUsersResult> {
    //     logger.debug('Listing users: ', { _adminId, _filters });
    //     const cognitoResponse = await cognitoApiClient.listUsers();
    //     if (!cognitoResponse) {
    //         throw new InternalServerError();
    //     }
    //     logger.debug('Cognito response: ', { cognitoResponse });
    //     const users: CognitoUser[] = unpackListUsersResponse(cognitoResponse);
    //     return {
    //         data: users.map(user => getUserInfoFromCognitoUser(user)),
    //         totalItems: users.length,
    //     };
    // }

    async updateUserRole(adminId: string, userId: string, payload: UpdateUserRolePayload): Promise<void> {
        logger.debug('Updating user role: ', { adminId, userId, payload });
        const { oldRole, newRole, email } = payload;
        if (oldRole === newRole) {
            throw new BadRequestError('Old role and new role are the same');
        }
        const currentRole = await this.getUserRole(adminId, userId);
        if (currentRole.role !== oldRole) {
            throw new BadRequestError('User is not in the old role group');
        }
        if (currentRole.role === newRole) {
            throw new BadRequestError('User is already in the new role group');
        }
        if (oldRole !== "USER") {
            await cognitoApiClient.removeUserFromGroup(userId, oldRole);
            logger.debug('User removed from old role group: ', { userId, oldRole });
        }
        if (newRole !== "USER") {
            await cognitoApiClient.addUserToGroup(userId, newRole);
            logger.debug('User added to new role group: ', { userId, newRole });
        }
    }

    async getUserRole(_adminId: string, _userId: string): Promise<UserRole> {
        logger.debug('Getting user role: ', { _adminId, _userId });
        const groups = await cognitoApiClient.listUserGroups(_userId);
        if (groups.includes(ADMIN_GROUP)) {
            return { role: ADMIN_GROUP };
        }
        if (groups.includes(SUPPORT_GROUP)) {
            return { role: SUPPORT_GROUP };
        }
        return { role: "USER" };
    }

    async getUserDetails(adminId: string, userId: string, filters: GetUserDetailsFilters): Promise<AdminUserDetails> {
        logger.debug('Getting user details: ', { adminId, userId, filters });
        const response = await cognitoApiClient.getUser(userId);
        if (!response) {
            throwUserNotFoundError(userId);
        }
        logger.debug('Cognito response: ', { cognitoResponse: response });
        const user: CognitoUser = unpackAdminGetUserResponse(response);
        const role = await this.getUserRole(adminId, userId);

        return {
            userId: user.userId,
            username: user.email,
            email: user.email,
            name: user.name,
            createDate: user.createDate,
            lastModifiedDate: user.lastModifiedDate,
            enabled: user.enabled,
            status: user.status,
            role: role.role,
        };
    };

    async enableUser( adminId: string, userId: string, payload: UpdateUserEnabledPayload ): Promise<void> {
        logger.debug('Enabling user: ', { adminId, userId, payload });
        await cognitoApiClient.enableUser(userId);
        logger.debug('User enabled: ', { adminId, userId });
    }

    async disableUser(adminId: string, userId: string, payload: UpdateUserEnabledPayload): Promise<void> {
        logger.debug('Disabling user: ', { adminId, userId, payload });
        await cognitoApiClient.disableUser(userId);
        logger.debug('User disabled: ', { adminId, userId });
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
