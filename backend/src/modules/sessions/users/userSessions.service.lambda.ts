import { isLambdaErrorPayload } from '../../../common/lambdaContracts';
import { type LambdaErrorResponse } from '../../../common/wrapperTypes';
import { wrapLambdaRequest } from '../../../common/wrappers';
import {
  BadRequestError,
  ResourceNotFoundError,
  ServiceError,
  UnauthorizedError,
} from '../../../common/serviceErrors';
import { env } from '../../../config/env';
import { AwsLambdaInvoker, type LambdaInvoker } from '../../../utils/lambdaInvoker';
import { createLogger } from '../../../utils/logger';
import { mapLambdaUserSessions } from './userSessions.mapper';
import type { UserSessionsIService } from './userSessions.service.interface';
import type { LambdaGetUserSessionsSuccessData, UserSession } from './userSessions.types';

const logger = createLogger('sessions.users.service');
const LAMBDA_INVOKER: LambdaInvoker = new AwsLambdaInvoker(env.awsRegion);

function throwFromUserSessionsLambdaError(result: LambdaErrorResponse): never {
  const message = result.error;
  const code = result.code ?? 'UNKNOWN';

  if (code === 'NOT_FOUND') {
    throw new ResourceNotFoundError(message, code);
  }
  if (code === 'UNAUTHORIZED') {
    throw new UnauthorizedError(message, code);
  }
  if (code === 'INVALID_REQUEST' || code === 'INVALID_STATE') {
    throw new BadRequestError(message, code);
  }

  throw new ServiceError(`user sessions lambda: ${message}`, 502, code);
}

export class UserSessionsServiceLambda implements UserSessionsIService {
  async getUserSessions(userId: string): Promise<UserSession[]> {
    logger.debug('Invoking ports read lambda: getSessionByUser', { userId });

    const result = await LAMBDA_INVOKER.invokeJson<
      { data: LambdaGetUserSessionsSuccessData } | LambdaErrorResponse
    >(
      env.stationsPortsReadLambdaFunctionName,
      wrapLambdaRequest('getSessionByUser', userId, { userId })
    );

    if (isLambdaErrorPayload(result)) {
      throwFromUserSessionsLambdaError(result);
    }

    if (!result.data || !Array.isArray(result.data.session)) {
      throw new ServiceError('user sessions lambda: invalid response', 502, 'INVALID_RESPONSE');
    }

    return mapLambdaUserSessions(result.data);
  }
}
