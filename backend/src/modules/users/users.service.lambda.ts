import { env } from '../../config/env';
import { AwsLambdaInvoker, type LambdaInvoker } from '../../utils/lambdaInvoker';
import { createLogger } from '../../utils/logger';
import { wrapLambdaRequest } from '../../common/wrappers';
import { type LambdaErrorResponse } from '../../common/wrapperTypes';
import { ListUsersFilters, ListUsersResult, UpdateProfilePayload, UserInfo, UsersService } from './users.types';

const logger = createLogger('users.service', 'debug');
const LAMBDA_INVOKER: LambdaInvoker = new AwsLambdaInvoker(env.awsRegion);

export class UsersServiceLambda implements UsersService {
  async getMyInfo(userId: string): Promise<UserInfo> {
    logger.debug('Invoking userInfo lambda: getMyInfo', { userId });
    const result = await LAMBDA_INVOKER.invokeJson<UserInfo | LambdaErrorResponse>(
      env.userInfoLambdaFunctionName,
      wrapLambdaRequest(
        'get_user_by_id',
        userId,
        {
          user_id: userId
        }
      )
    );

    if ('error' in result) {
      throw new Error(`userInfo lambda error: ${result.error}`);
    }

    return result as UserInfo;
  }

  async getUserById(adminId: string, userId: string): Promise<UserInfo | null> {
    logger.debug('Invoking userInfo lambda: getUserById (admin)', { adminId, userId });
    const result = await LAMBDA_INVOKER.invokeJson<UserInfo | LambdaErrorResponse>(
      env.userInfoLambdaFunctionName,
      wrapLambdaRequest(
        'get_user_by_id',
        adminId,
        {
          user_id: userId
        }
      )
    );

    if ('error' in result) {
      if (result.code === 'USER_NOT_FOUND' || result.error.toLowerCase().includes('not found')) {
        return null;
      }
      throw new Error(`userInfo lambda error: ${result.error}`);
    }

    return result as UserInfo;
  }

  async listUsers(adminId: string, filters: ListUsersFilters): Promise<ListUsersResult> {
    logger.debug('Invoking userManagement lambda: listUsers', { adminId, filters });
    const result = await LAMBDA_INVOKER.invokeJson<ListUsersResult | UserInfo[] | LambdaErrorResponse>(
      env.userManagementLambdaFunctionName,
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

    if ('error' in (result as LambdaErrorResponse)) {
      const err = result as LambdaErrorResponse;
      throw new Error(`userManagement lambda error: ${err.error}`);
    }

    if (Array.isArray(result)) {
      logger.debug('Returning Array result: ', { data: result, totalItems: result.length });
      return { data: result, totalItems: result.length };
    }
    logger.debug('Returning: ', result);
    return result as ListUsersResult;
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

  async updateUserRole(adminId: string, userId: string, role: string): Promise<void> {
    logger.debug('Invoking userManagement lambda: updateUserRole', { adminId, userId, role });
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
          role,
          user_pool_id
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