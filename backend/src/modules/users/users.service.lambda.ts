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
  UsersService,
  mapLambdaUser,
  mapLambdaUsers
} from './users.types';
import { applyListFiltersAndPage } from './users.listHelpers';

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
        'get_user_by_id',
        userId,
        {
          user_id: userId
        }
      )
    );

    if (isLambdaErrorResponse(result)) {
      throw new Error(`userInfo lambda error: ${result.error}`);
    }

    return mapLambdaUser(result.data);
  }

  async getUserById(adminId: string, userId: string): Promise<UserInfo | null> {
    logger.debug('Invoking userInfo lambda: getUserById (admin)', { adminId, userId });
    const result = await LAMBDA_INVOKER.invokeJson<LambdaUserResponse | LambdaErrorResponse>(
      env.userInfoLambdaFunctionName,
      wrapLambdaRequest(
        'get_user_by_id',
        adminId,
        {
          user_id: userId
        }
      )
    );

    if (isLambdaErrorResponse(result)) {
      if (result.code === 'USER_NOT_FOUND' || result.code === 'NOT_FOUND' || result.error.toLowerCase().includes('not found')) {
        return null;
      }
      throw new Error(`userInfo lambda error: ${result.error}`);
    }

    return mapLambdaUser(result.data);
  }

  async listUsers(adminId: string, filters: ListUsersFilters): Promise<ListUsersResult> {
    /**
     * Must use **get-user-info** (`charging-stations-get-user-info`), same Lambda as get_user_by_id.
     * `write-user-rds` is a Cognito trigger / different contract — it does **not** handle `get_all_users`.
     */
    logger.debug('Invoking get-user-info lambda: listUsers (get_all_users)', { adminId, filters });
    const result = await LAMBDA_INVOKER.invokeJson<LambdaListUsersResponse | LambdaUserInfo[] | LambdaErrorResponse>(
      env.userInfoLambdaFunctionName,
      wrapLambdaRequest(
        'get_all_users',
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

  // COGNITO METHODS GROUP
  async getUserRole(adminId: string, userId: string): Promise<UserRole | null> {
    logger.debug('Invoking userManagement lambda: getUserRole', { adminId, userId });
    throw new Error('Not implemented');
  }

  async getUserDetails(
    adminId: string,
    userId: string,
    filters: GetUserDetailsFilters
  ): Promise<AdminUserDetails | null> {
    logger.debug('Invoking userManagement lambda: getUserDetails', { adminId, userId, filters });
    throw new Error('Not implemented');
  }

  async enableUser(
    adminId: string,
    userId: string,
    payload: UpdateUserEnabledPayload
  ): Promise<void> {
    logger.debug('Invoking userManagement lambda: enableUser', { adminId, userId, payload });
    throw new Error('Not implemented');
  }

  async updateUserRole(adminId: string, userId: string, payload: UpdateUserRolePayload): Promise<void> {
    logger.debug('Invoking userManagement lambda: updateUserRole', { adminId, userId, payload });
    const user_pool_id = env.cognitoUserPoolId;
    if (!user_pool_id) {
      throw new Error('COGNITO_USER_POOL_ID is not configured');
    }
    await LAMBDA_INVOKER.invokeJson(
      env.userManagementLambdaFunctionName,
      wrapLambdaRequest(
        'move_user_to_group',
        adminId,
        {
          userId,
          role: payload.newRole,
          user_pool_id
        }
      )
    );
  }
}