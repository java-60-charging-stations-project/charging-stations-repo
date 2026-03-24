import { env } from '../../config/env';
import { AwsLambdaInvoker, type LambdaInvoker } from '../../utils/lambdaInvoker';
import { createLogger } from '../../utils/logger';
import { wrapLambdaRequest } from '../../common/wrappers';
import { type LambdaErrorResponse } from '../../common/wrapperTypes';
import {
  LambdaUserInfo,
  ListUsersFilters,
  ListUsersResult,
  UpdateProfilePayload,
  UserInfo,
  mapLambdaUser,
  mapLambdaUsers
} from './users.types';
import { UsersService } from './users.service.interface';
import { applyListFiltersAndPage } from './users.listHelpers';
import {  ResourceNotFoundError } from '../../common/serviceErrors';

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
}