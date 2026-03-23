import { env } from '../../config/env';
import { AwsLambdaInvoker, type LambdaInvoker } from '../../utils/lambdaInvoker';
import { createLogger } from '../../utils/logger';
import { wrapLambdaRequest } from '../../common/wrappers';
import { type LambdaErrorResponse } from '../../common/wrapperTypes';
import {
  AdminUserDetails,
  GetUserDetailsFilters,
  LambdaUserInfo,
  ListUsersFilters,
  ListUsersResult,
  UpdateProfilePayload,
  UpdateUserEnabledPayload,
  UpdateUserRolePayload,
  UserInfo,
  UserRole,
  mapLambdaUser,
  mapLambdaUsers
} from './users.types';
import { UsersService } from './users.service.interface';
import { applyListFiltersAndPage } from './users.listHelpers';
import { BadRequestError, ResourceNotFoundError } from '../../common/serviceErrors';
import { CognitoUser } from './cognito/types';
import { unpackAdminGetUserResponse } from './cognito/utils';
import { cognitoApiClient } from './cognito/api';
import { ADMIN_GROUP, SUPPORT_GROUP } from '../../common/authRoles';

const logger = createLogger('users.service', 'debug');
const LAMBDA_INVOKER: LambdaInvoker = new AwsLambdaInvoker(env.awsRegion);

interface LambdaUserResponse {
  data: LambdaUserInfo;
}

interface LambdaListUsersResponse {
  data: LambdaUserInfo[];
  totalItems?: number;
}

function isLambdaErrorResponse(result: unknown): result is LambdaErrorResponse {
  return !!result && typeof result === 'object' && 'error' in result;
}

export class UsersServiceLambda implements UsersService {
  async getMyInfo(userId: string): Promise<UserInfo> {
    logger.debug('Invoking userInfo lambda: getMyInfo', { userId });
    const result = await LAMBDA_INVOKER.invokeJson<LambdaUserResponse | LambdaErrorResponse>(
      env.userInfoLambdaFunctionName,
      wrapLambdaRequest(
        'getUserById',
        userId,
        {userId,}
      )
    );

    if (isLambdaErrorResponse(result)) {
      throw new Error(`userInfo lambda error: ${result.error}`);
    }

    return mapLambdaUser(result.data);
  }

  async getUserById(adminId: string, userId: string): Promise<UserInfo> {
    logger.debug('Invoking userInfo lambda: getUserById (admin)', { adminId, userId });
    const result = await LAMBDA_INVOKER.invokeJson<LambdaUserResponse | LambdaErrorResponse>(
      env.userInfoLambdaFunctionName,
      wrapLambdaRequest(
        'getUserById',
        adminId,
        {userId,}
      )
    );

    if (isLambdaErrorResponse(result)) {
      if (result.code === 'USER_NOT_FOUND' || result.code === 'NOT_FOUND' || result.error.toLowerCase().includes('not found')) {
        throw new ResourceNotFoundError(`User not found: ${userId}`);
      }
      throw new Error(`userInfo lambda error: ${result.error}`);
    }

    return mapLambdaUser(result.data);
  }

  async listUsers(adminId: string, filters: ListUsersFilters): Promise<ListUsersResult> {
    /**
     * Must use **get-user-info** (`charging-stations-get-user-info`), same Lambda as getUserById.
     * `write-user-rds` is a Cognito trigger / different contract — it does **not** handle `getAllUsers`.
     */
    logger.debug('Invoking get-user-info lambda: listUsers (getAllUsers)', { adminId, filters });
    const result = await LAMBDA_INVOKER.invokeJson<LambdaListUsersResponse | LambdaUserInfo[] | LambdaErrorResponse>(
      env.userInfoLambdaFunctionName,
      wrapLambdaRequest(
        'getAllUsers',
        adminId,
        {
          role: filters.role,
          status: filters.status
        },
        {
          page: filters.page ?? 1,
          pageSize: filters.pageSize ?? 200
        }
      )
    );

    if (isLambdaErrorResponse(result)) {
      throw new Error(`get-user-info lambda error: ${result.error}`);
    }

    let mapped: UserInfo[];
    if (Array.isArray(result)) {
      mapped = mapLambdaUsers(result);
    } else {
      mapped = mapLambdaUsers(result.data);
    }

    const { data, totalItems } = applyListFiltersAndPage(mapped, filters);
    logger.debug('Returning listUsers result: ', { totalItems, pageReturned: data.length });
    return { data, totalItems };
  }

  async updateOwnProfile(userId: string, payload: UpdateProfilePayload): Promise<void> {
    logger.debug('Invoking userManagement lambda: updateOwnProfile', { userId });
    await LAMBDA_INVOKER.invokeJson(
      env.userManagementLambdaFunctionName,
      wrapLambdaRequest(
        'updateOwnProfile',
        userId,
        {
          userId,
          payload
        }
      )
    );
  }

  async updateUserProfileAsAdmin(adminId: string, userId: string, payload: UpdateProfilePayload): Promise<void> {
    logger.debug('Invoking userManagement lambda: updateUserProfileAsAdmin', { adminId, userId });
    await LAMBDA_INVOKER.invokeJson(
      env.userManagementLambdaFunctionName,
      wrapLambdaRequest(
        'updateUserProfileAsAdmin',
        adminId,
        {
          adminId,
          userId,
          payload
        }
      )
    );
  }
  // COGNITO METHODS GROUP
  async getUserRole(adminId: string, userId: string): Promise<UserRole> {
    logger.debug('Getting user role: ', { adminId, userId });
    const groups = await cognitoApiClient.listUserGroups(userId);
    if (groups.includes(ADMIN_GROUP)) {
        return { role: ADMIN_GROUP };
    }
    if (groups.includes(SUPPORT_GROUP)) {
        return { role: SUPPORT_GROUP };
    }
    return { role: "USER" };
  }

  async getUserDetails(
    adminId: string,
    userId: string,
    filters: GetUserDetailsFilters
  ): Promise<AdminUserDetails> {
    logger.debug('Getting user details: ', { adminId, userId, filters });
    const response = await cognitoApiClient.getUserDetails(userId);
    logger.debug('Cognito response: ', { cognitoResponse: response });
    if (!response) {
      throw new ResourceNotFoundError(`User ${userId} not found`, 'USER_NOT_FOUND');
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
  }

  async enableUser(
    adminId: string,
    userId: string,
    payload: UpdateUserEnabledPayload
  ): Promise<void> {
    logger.debug('Enabling user: ', { adminId, userId, payload });
    await cognitoApiClient.enableUser(userId);
    logger.debug('User enabled: ', { adminId, userId });
  }

  async disableUser(
    adminId: string,
    userId: string,
    payload: UpdateUserEnabledPayload
  ): Promise<void> {
    logger.debug('Disabling user: ', { adminId, userId, payload });
    await cognitoApiClient.disableUser(userId);
    logger.debug('User disabled: ', { adminId, userId });
  }

  async updateUserRole(adminId: string, userId: string, payload: UpdateUserRolePayload): Promise<void> {
    logger.debug('Invoking userManagement lambda: updateUserRole', { adminId, userId, payload });
    
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

    await LAMBDA_INVOKER.invokeJson(
      env.userManagementLambdaFunctionName,
      wrapLambdaRequest(
        'changeUserRole',
        adminId,
        {
          userId,
          userRole: payload.newRole,
        }
      )
    );
  }

  async deleteUser(adminId: string, userId: string): Promise<void> {
    logger.debug('Invoking userManagement lambda: deleteUser', { adminId, userId });
    await LAMBDA_INVOKER.invokeJson(
      env.userManagementLambdaFunctionName,
      wrapLambdaRequest(
        'deleteUser',
        adminId,
        {
          adminId,
          userId
        }
      )
    );
  }
}