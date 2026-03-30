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
import {
  mapLambdaUserSessions,
  mapLambdaUserStationPortUpdate,
} from './userSessions.mapper';
import type { UserSessionsIService } from './userSessions.service.interface';
import type {
  LambdaGetUserSessionsSuccessData,
  LambdaUserUpdateStationPortsData,
  LambdaUserUpdateStationPortsSuccessData,
  UserSession,
  UserSessionPortState,
  UserSessionPortUpdateResponse,
} from './userSessions.types';

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
  private async updateStationPort(
    userId: string,
    stationId: string,
    portCode: string,
    oldState: UserSessionPortState,
    newState: 'BOOKED' | 'OCCUPIED',
  ): Promise<UserSessionPortUpdateResponse> {
    logger.debug('Invoking ports write lambda: userUpdateStationPorts', {
      userId,
      stationId,
      portCode,
      oldState,
      newState,
    });

    const result = await LAMBDA_INVOKER.invokeJson<
      { data: LambdaUserUpdateStationPortsSuccessData } | LambdaErrorResponse
    >(
      env.stationsPortsWriteLambdaFunctionName,
      wrapLambdaRequest<LambdaUserUpdateStationPortsData, Record<string, never>>(
        'userUpdateStationPorts',
        userId,
        {
          userId,
          stationId,
          portCode,
          oldState,
          newState,
        }
      )
    );

    if (isLambdaErrorPayload(result)) {
      throwFromUserSessionsLambdaError(result);
    }

    if (!result.data || typeof result.data.entity_key !== 'string') {
      throw new ServiceError('user sessions lambda: invalid port update response', 502, 'INVALID_RESPONSE');
    }

    return mapLambdaUserStationPortUpdate(result.data);
  }

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

  async createBooking(
    userId: string,
    stationId: string,
    portCode: string,
    oldState: UserSessionPortState,
  ): Promise<UserSessionPortUpdateResponse> {
    return this.updateStationPort(userId, stationId, portCode, oldState, 'BOOKED');
  }

  async startChargingSession(
    userId: string,
    stationId: string,
    portCode: string,
    oldState: UserSessionPortState,
  ): Promise<UserSessionPortUpdateResponse> {
    return this.updateStationPort(userId, stationId, portCode, oldState, 'OCCUPIED');
  }
}
