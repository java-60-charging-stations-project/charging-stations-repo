import { env } from '../../config/env';
import { AwsLambdaInvoker, type LambdaInvoker } from '../../utils/lambdaInvoker';
import { createLogger } from '../../utils/logger';
import { wrapLambdaRequest } from '../../common/wrappers';
import { isLambdaErrorPayload } from '../../common/lambdaContracts';
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
import {
  BadRequestError,
  ResourceNotFoundError,
  ServiceError,
  UnauthorizedError,
} from '../../common/serviceErrors';

const logger = createLogger('users.service', 'debug');
const LAMBDA_INVOKER: LambdaInvoker = new AwsLambdaInvoker(env.awsRegion);

interface LambdaUserResponse {
  data: LambdaUserInfo;
}

interface LambdaListUsersResponse {
  data: LambdaUserInfo[];
  totalItems?: number;
}

function throwFromUserInfoLambdaError(result: LambdaErrorResponse): never {
  const msg = result.error;
  const code = result.code ?? 'UNKNOWN';
  if (code === 'NOT_FOUND' || code === 'USER_NOT_FOUND' || msg.toLowerCase().includes('not found')) {
    throw new ResourceNotFoundError(msg, code === 'USER_NOT_FOUND' ? 'USER_NOT_FOUND' : 'NOT_FOUND');
  }
  if (code === 'UNAUTHORIZED') {
    throw new UnauthorizedError(msg, code);
  }
  if (code === 'INVALID_REQUEST') {
    throw new BadRequestError(msg, code);
  }
  throw new ServiceError(`userInfo lambda: ${msg}`, 502, code);
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

    if (isLambdaErrorPayload(result)) {
      throwFromUserInfoLambdaError(result);
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

    if (isLambdaErrorPayload(result)) {
      throwFromUserInfoLambdaError(result);
    }

    return mapLambdaUser(result.data);
  }

  async listUsers(adminId: string, filters: ListUsersFilters): Promise<ListUsersResult> {
    /**
     * Must use **get-user-info** (`charging-stations-get-user-info`), same Lambda as getUserById.
     * `write-user-rds` is a Cognito trigger / different contract — it does **not** handle `getAllUsers`.
     */
    logger.debug('Invoking get-user-info lambda: listUsers (getAllUsers)', { adminId, filters });
    const result = await LAMBDA_INVOKER.invokeJson<LambdaListUsersResponse | LambdaErrorResponse>(
      env.userInfoLambdaFunctionName,
      wrapLambdaRequest(
        'getAllUsers',
        adminId,
        {},
        {
          page: filters.page ?? 1,
          pageSize: filters.pageSize ?? 200
        }
      )
    );

    if (isLambdaErrorPayload(result)) {
      if (
        result.code === 'NOT_FOUND' &&
        typeof result.error === 'string' &&
        result.error.toLowerCase().includes('no users')
      ) {
        return { data: [], totalItems: 0 };
      }
      throwFromUserInfoLambdaError(result);
    }

    const mapped = mapLambdaUsers(result.data);

    const { data, totalItems } = applyListFiltersAndPage(mapped, filters);
    logger.debug('Returning listUsers result: ', { totalItems, pageReturned: data.length });
    return { data, totalItems };
  }

  async updateOwnProfile(userId: string, payload: UpdateProfilePayload): Promise<void> {
    logger.debug('Invoking userManagement lambda: updateOwnProfile', { userId });
    const result = await LAMBDA_INVOKER.invokeJson<Record<string, unknown> | LambdaErrorResponse>(
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
    if (isLambdaErrorPayload(result)) {
      throwFromUserInfoLambdaError(result);
    }
  }
}