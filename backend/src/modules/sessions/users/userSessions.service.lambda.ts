import {
  isLambdaErrorPayload,
  LambdaSuccessPayload,
  type LambdaGetSessionByStationInvokeData,
  type LambdaGetSessionByStationRequest,
  type LambdaGetSessionByUserInvokeData,
  type LambdaGetSessionByUserRequest,
} from '../../../common/lambdaContracts';
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
  mapLambdaUserSessionsByStation,
  mapLambdaUserStationPortUpdate,
} from './userSessions.mapper';
import type { UserSessionsIService } from './userSessions.service.interface';
import type {
  LambdaGetUserSessionsSuccessData,
  LambdaUserUpdateStationPortsData,
  LambdaUserUpdateStationPortsSuccessData,
  UserSessionHistoryPage,
  UserSessionHistoryQuery,
  UserSession,
  UserSessionPortState,
  UserSessionPortUpdateResponse,
  UserPaymentRequest,
  UserPaymentResponse,
  UserPaymentResponseLambda,
} from './userSessions.types';
import { addCommandToQuery, CommandQueueRequest, CommandQueueResponse } from '../../../utils/sqsCommandQueue';

const logger = createLogger('sessions.users.service');
const LAMBDA_INVOKER: LambdaInvoker = new AwsLambdaInvoker(env.awsRegion);

type StationUpdateData = {
  userId: string;
  stationId: string;
  portCode: string;
  oldState: UserSessionPortState;
  newState: 'BOOKED' | 'OCCUPIED' | 'FREE';
};

function throwFromUserSessionsLambdaError(result: LambdaErrorResponse, collectorSource: string): never {
  const message = result.error;
  const code = result.code ?? 'UNKNOWN';
  const opts = { collectorSource };

  if (code === 'NOT_FOUND') {
    throw new ResourceNotFoundError(message, code, opts);
  }
  if (code === 'UNAUTHORIZED') {
    throw new UnauthorizedError(message, code, opts);
  }
  if (code === 'INVALID_REQUEST' || code === 'INVALID_STATE') {
    throw new BadRequestError(message, code, opts);
  }

  throw new ServiceError(`user sessions lambda: ${message}`, 502, code, opts);
}

export class UserSessionsServiceLambda implements UserSessionsIService {
  private static readonly RDS_MAX_PAGE_SIZE = 200;
  
  async createManualPayment(request: UserPaymentRequest): Promise<UserPaymentResponse> {
    logger.debug('.createManualPayment Request =', request);
    const { userId } = request;
    const lambdaName = env.stationsPortsWriteLambdaFunctionName;
    const actionName = 'paySessionUser';
    const lambdaPayload = wrapLambdaRequest<UserPaymentRequest, Record<string, never>>(
      actionName, userId, request
    );
    logger.debug(`.createManualPayment calling Lambda=${lambdaName}, Action=${actionName}, Payload=`, lambdaPayload);
    const result = await LAMBDA_INVOKER.
      invokeJson<LambdaSuccessPayload<UserPaymentResponseLambda> | LambdaErrorResponse>(
        lambdaName,
        lambdaPayload
      );
    logger.debug(".createManualPayment Lambda Response=", result);

    if (isLambdaErrorPayload(result)) {
      throwFromUserSessionsLambdaError(result, lambdaName);
    };
    const paidSession = (result.data as UserPaymentResponseLambda).paid_session;
    if (
      !paidSession ||
      typeof paidSession.user_id !== 'string' ||
      typeof paidSession.session_id !== 'string' ||
      typeof paidSession.paid_at !== 'string'
    ) {
      throw new ServiceError('user sessions lambda: invalid paySessionUser response', 502, 'INVALID_RESPONSE', {
        collectorSource: lambdaName,
      });
    }
    const { user_id, session_id, paid_at } = paidSession;
    const response: UserPaymentResponse = { userId: user_id, sessionId: session_id, paidAt: paid_at };
    logger.debug(".createManualPayment responding with the Payload: ", response);
    return response;
  };

  private async updateStationPort(
    { userId, stationId, portCode, oldState, newState }: StationUpdateData
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
      throwFromUserSessionsLambdaError(result, env.stationsPortsWriteLambdaFunctionName);
    }

    if (!result.data || typeof result.data.entity_key !== 'string') {
      throw new ServiceError('user sessions lambda: invalid port update response', 502, 'INVALID_RESPONSE', {
        collectorSource: env.stationsPortsWriteLambdaFunctionName,
      });
    }

    return mapLambdaUserStationPortUpdate(result.data);
  }

  private async sendUpdatePortCommand(
    { userId, stationId, portCode, oldState, newState }: StationUpdateData
  ): Promise<CommandQueueResponse> {
    logger.debug('Sending command to change port state: ', {
      userId,
      stationId,
      portCode,
      oldState,
      newState,
    });
    const queueRequest: CommandQueueRequest = {
      callerId: userId,
      targetFn: "charging-stations-write-station-ports-dynamo",
      action: "userUpdateStationPorts",
      groupId: `${userId}`,
      deduplicationId: `${userId}-${stationId}-${portCode}-${newState}`,
    };
    logger.debug(`Sending groupId=${queueRequest.groupId}, deduplicationId=${queueRequest.deduplicationId}`);
    const requestData = {
      userId,
      stationId,
      portCode,
      oldState,
      newState,
    };
    try {
      const response = await addCommandToQuery(queueRequest, requestData);
      logger.debug(`Response from SQS, messageId=${response.messageId}`);
      return response;
    }
    catch (error) {
      logger.error("Error sending message to SQS Command query:", error);
      throw new ServiceError(
        "Error invoking Command SQS on changing port state",
        502,
        "NO_RESPONSE",
      );
    }
  };

  private async executePortUpdate(
    updateData: StationUpdateData
  ): Promise<CommandQueueResponse | UserSessionPortUpdateResponse> {
    if (env.lambdaCallMode === "async") {
      return this.sendUpdatePortCommand(updateData);
    }
    return this.updateStationPort(updateData);
  };

  async getUserSessions(userId: string, latest = false): Promise<UserSession[]> {
    logger.debug('Invoking ports read lambda: getSessionByUser', { userId });

    const result = await LAMBDA_INVOKER.invokeJson<
      { data: LambdaGetUserSessionsSuccessData } | LambdaErrorResponse
    >(
      env.stationsPortsReadLambdaFunctionName,
      wrapLambdaRequest<
        LambdaGetSessionByUserInvokeData,
        LambdaGetSessionByUserRequest['meta']
      >('getSessionByUser', userId, { userId, latest })
    );

    if (isLambdaErrorPayload(result)) {
      throwFromUserSessionsLambdaError(result, env.stationsPortsReadLambdaFunctionName);
    }

    if (!result.data || !Array.isArray(result.data.session)) {
      throw new ServiceError('user sessions lambda: invalid response', 502, 'INVALID_RESPONSE', {
        collectorSource: env.stationsPortsReadLambdaFunctionName,
      });
    }

    return mapLambdaUserSessions(result.data);
  }

  async getUserHistory(query: UserSessionHistoryQuery): Promise<UserSessionHistoryPage> {
    const collected: UserSession[] = [];
    let currentPage = 1;
    let totalLambdaPages = 1;

    do {
      const result = await LAMBDA_INVOKER.invokeJson<
        { data: unknown[]; meta?: { total_pages?: number } } | LambdaErrorResponse
      >(
        env.sessionsReadLambdaFunctionName,
        wrapLambdaRequest(
          'getSessions',
          query.userId,
          {
            userId: query.userId,
            ...(query.sessionId ? { sessionId: query.sessionId } : {}),
            ...(query.stationId ? { stationId: query.stationId } : {}),
            ...(query.state ? { state: query.state } : {}),
            ...(query.orderBy ? { orderBy: query.orderBy } : {}),
          },
          { page: currentPage, pageSize: UserSessionsServiceLambda.RDS_MAX_PAGE_SIZE }
        )
      );

      if (isLambdaErrorPayload(result)) {
        throwFromUserSessionsLambdaError(result, env.sessionsReadLambdaFunctionName);
      }

      if (!result.data || !Array.isArray(result.data)) {
        throw new ServiceError('sessions rds lambda: invalid response', 502, 'INVALID_RESPONSE', {
          collectorSource: env.sessionsReadLambdaFunctionName,
        });
      }

      collected.push(...mapLambdaUserSessionsByStation(result.data));
      totalLambdaPages = result.meta?.total_pages ?? 0;
      currentPage += 1;
    } while (currentPage <= totalLambdaPages);

    const dateFromMs = query.dateFrom ? Date.parse(query.dateFrom) : undefined;
    const dateToMs = query.dateTo ? Date.parse(query.dateTo) : undefined;

    const filtered = collected.filter((session) => {
      const startedAtSource = session.startedAt ?? session.createdAt;
      const startedAtMs = Date.parse(startedAtSource);
      if (Number.isNaN(startedAtMs)) return false;
      if (dateFromMs !== undefined && startedAtMs < dateFromMs) return false;
      if (dateToMs !== undefined && startedAtMs > dateToMs) return false;
      return true;
    });

    const totalItems = filtered.length;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
    const safePage = totalPages === 0 ? 1 : Math.min(query.page, totalPages);
    const offset = (safePage - 1) * query.pageSize;
    const sessions = filtered.slice(offset, offset + query.pageSize);

    return {
      sessions,
      totalItems,
      totalPages,
      page: safePage,
      pageSize: query.pageSize,
    };
  }

  async getSessionsByStation(stationId: string): Promise<UserSession[]> {
    logger.debug('Invoking ports read lambda: getSessionByStation', { stationId });

    const result = await LAMBDA_INVOKER.invokeJson<
      { data: { sessions: unknown[] } } | LambdaErrorResponse
    >(
      env.stationsPortsReadLambdaFunctionName,
      wrapLambdaRequest<
        LambdaGetSessionByStationInvokeData,
        LambdaGetSessionByStationRequest['meta']
      >('getSessionByStation', stationId, { stationId })
    );

    if (isLambdaErrorPayload(result)) {
      throwFromUserSessionsLambdaError(result, env.stationsPortsReadLambdaFunctionName);
    }

    if (!result.data || !Array.isArray(result.data.sessions)) {
      throw new ServiceError('user sessions lambda: invalid station sessions response', 502, 'INVALID_RESPONSE', {
        collectorSource: env.stationsPortsReadLambdaFunctionName,
      });
    }

    return mapLambdaUserSessionsByStation(result.data.sessions);
  }

  async createBooking(
    userId: string,
    stationId: string,
    portCode: string,
    oldState: UserSessionPortState,
  ): Promise<CommandQueueResponse | UserSessionPortUpdateResponse> {
    return this.executePortUpdate({ userId, stationId, portCode, oldState, newState: 'BOOKED'});
  }

  async startChargingSession(
    userId: string,
    stationId: string,
    portCode: string,
    oldState: UserSessionPortState,
  ): Promise<CommandQueueResponse | UserSessionPortUpdateResponse> {
    return this.executePortUpdate({ userId, stationId, portCode, oldState, newState: 'OCCUPIED'});
  }

  async stopBooking(
    userId: string,
    stationId: string,
    portCode: string,
    oldState: UserSessionPortState,
  ): Promise<CommandQueueResponse | UserSessionPortUpdateResponse> {
    return this.executePortUpdate({ userId, stationId, portCode, oldState, newState: 'FREE'});
  }

  async stopChargingSession(
    userId: string,
    stationId: string,
    portCode: string,
    oldState: UserSessionPortState,
  ): Promise<CommandQueueResponse | UserSessionPortUpdateResponse> {
    return this.executePortUpdate({ userId, stationId, portCode, oldState, newState: 'FREE'});
  }
}
