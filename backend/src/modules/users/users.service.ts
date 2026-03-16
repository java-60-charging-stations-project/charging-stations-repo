import { env } from '../../config/env';
import { AwsLambdaInvoker, type LambdaInvoker } from '../../utils/lambdaInvoker';
import { createLogger } from '../../utils/logger';

const logger = createLogger('users.service');
const LAMBDA_INVOKER: LambdaInvoker = new AwsLambdaInvoker(env.awsRegion);

export interface UpdateProfilePayload {
  email?: string;
  address?: string;
}

export interface UserInfo {
  userId: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ListUsersFilters {
  role?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface ListUsersResult {
  data: UserInfo[];
  totalItems: number;
}

export interface UsersService {
  getMyInfo(userId: string): Promise<UserInfo>;
  getUserById(adminId: string, userId: string): Promise<UserInfo | null>;
  listUsers(adminId: string, filters: ListUsersFilters): Promise<ListUsersResult>;
  updateOwnProfile(userId: string, payload: UpdateProfilePayload): Promise<void>;
  updateUserProfileAsAdmin(adminId: string, userId: string, payload: UpdateProfilePayload): Promise<void>;
  updateUserRole(adminId: string, userId: string, role: string): Promise<void>;
  deleteUser(adminId: string, userId: string): Promise<void>;
}

export class LambdaUsersService implements UsersService {
  async getMyInfo(userId: string): Promise<UserInfo> {
    logger.debug('Invoking userInfo lambda: getMyInfo', { userId });
    const result = await LAMBDA_INVOKER.invokeJson<UserInfo | { error?: string }>(
      env.userInfoLambdaFunctionName,
      {
        action: 'get_user_by_id',
        caller_id: userId,
        user_id: userId
      }
    );

    if (result && 'error' in result) {
      throw new Error(`userInfo lambda error: ${result.error}`);
    }

    return result as UserInfo;
  }

  async getUserById(adminId: string, userId: string): Promise<UserInfo | null> {
    logger.debug('Invoking userInfo lambda: getUserById (admin)', { adminId, userId });
    const result = await LAMBDA_INVOKER.invokeJson<UserInfo | { error?: string }>(
      env.userInfoLambdaFunctionName,
      {
        action: 'get_user_by_id',
        caller_id: adminId,
        user_id: userId
      }
    );

    if (result && 'error' in result) {
      if (result.error === 'USER_NOT_FOUND' || String(result.error).toLowerCase().includes('not found')) {
        return null;
      }
      throw new Error(`userInfo lambda error: ${result.error}`);
    }

    return result as UserInfo;
  }

  async listUsers(adminId: string, filters: ListUsersFilters): Promise<ListUsersResult> {
    logger.debug('Invoking userManagement lambda: listUsers', { adminId, filters });
    const result = await LAMBDA_INVOKER.invokeJson<ListUsersResult | UserInfo[]>(
      env.userManagementLambdaFunctionName,
      {
        action: 'get_all_users',
        caller_id: adminId,
        role: filters.role,
        status: filters.status,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 200
      }
    );

    if (Array.isArray(result)) {
      return { data: result, totalItems: result.length };
    }
    return result;
  }

  async updateOwnProfile(userId: string, payload: UpdateProfilePayload): Promise<void> {
    logger.debug('Invoking userManagement lambda: updateOwnProfile', { userId });
    await LAMBDA_INVOKER.invokeJson(env.userManagementLambdaFunctionName, {
      action: 'updateOwnProfile',
      caller_id: userId,
      userId,
      payload
    });
  }

  async updateUserProfileAsAdmin(adminId: string, userId: string, payload: UpdateProfilePayload): Promise<void> {
    logger.debug('Invoking userManagement lambda: updateUserProfileAsAdmin', { adminId, userId });
    await LAMBDA_INVOKER.invokeJson(env.userManagementLambdaFunctionName, {
      action: 'updateUserProfileAsAdmin',
      caller_id: adminId,
      adminId,
      userId,
      payload
    });
  }

  async updateUserRole(adminId: string, userId: string, role: string): Promise<void> {
    logger.debug('Invoking userManagement lambda: updateUserRole', { adminId, userId, role });
    const user_pool_id = env.cognitoUserPoolId;
    if (!user_pool_id) {
      throw new Error("COGNITO_USER_POOL_ID is not configured");
    }
    await LAMBDA_INVOKER.invokeJson(env.userManagementLambdaFunctionName, {
      action: 'move_user_to_group',
      caller_id: adminId,
      userId,
      role,
      user_pool_id,
    });
  }

  async deleteUser(adminId: string, userId: string): Promise<void> {
    logger.debug('Invoking userManagement lambda: deleteUser', { adminId, userId });
    await LAMBDA_INVOKER.invokeJson(env.userManagementLambdaFunctionName, {
      action: 'deleteUser',
      caller_id: adminId,
      adminId,
      userId
    });
  }
}

export function buildUsersService(): UsersService {
  return new LambdaUsersService();
}

