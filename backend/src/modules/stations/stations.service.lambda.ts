import { randomUUID } from 'node:crypto';
import {
  BadRequestError,
  ConflictError,
  ResourceNotFoundError,
  ServiceError,
  UnauthorizedError,
} from '../../common/serviceErrors';
import { isLambdaErrorPayload } from '../../common/lambdaContracts';
import { type LambdaErrorResponse } from '../../common/wrapperTypes';
import { env } from '../../config/env';
import { AwsLambdaInvoker, type LambdaInvoker } from '../../utils/lambdaInvoker';
import { createLogger } from '../../utils/logger';
import { wrapLambdaRequest } from '../../common/wrappers';
import { DEFAULT_PAGE_SIZE } from '../../common/constants';
import type {
  AdminCreateStationRequest,
  AdminCreateStationResponse,
  AdminDeleteStationResponse,
  AdminUpdateStationStateRequest,
  AdminUpdateStationStateResponse,
  AdminUpdateStationPortsResponse,
  LambdaAdminCreateStationResponse,
  LambdaAdminDeleteStationResponse,
  LambdaAdminUpdateStationStateResponse,
  LambdaStation,
  Meta,
  StationBase,
  StationBaseCollectionResponse,
  StationLifecycleState,
} from './stations.types';
import {
  mapLambdaAdminCreateStationResponse,
  mapLambdaDeleteStationResponse,
  mapLambdaStation,
  mapLambdaStationList,
  mapLambdaAdminUpdateStationStateResponse,
  mapLambdaStationsListMeta,
} from './stations.types';
import type { ListStationsParams, StationsService } from './stations.interface';

const logger = createLogger('stations.service');
const LAMBDA_INVOKER: LambdaInvoker = new AwsLambdaInvoker(env.awsRegion);

function throwFromStationsLambdaError(result: LambdaErrorResponse): never {
  const msg = result.error;
  const code = result.code ?? 'UNKNOWN';
  if (code === 'NOT_FOUND') {
    throw new ResourceNotFoundError(msg, 'NOT_FOUND');
  }
  if (code === 'UNAUTHORIZED') {
    throw new UnauthorizedError(msg, code);
  }
  if (code === 'INVALID_REQUEST' || code === 'INVALID_STATE') {
    throw new BadRequestError(msg, String(code));
  }
  if (code === 'TRANSACTION_CANCELED') {
    throw new ConflictError(msg, String(code));
  }
  if (code === 'ALREADY_EXISTS') {
    throw new ConflictError(msg, code);
  }
  if (code === 'CONSTRAINT_VIOLATION') {
    throw new ConflictError(msg, code);
  }
  throw new ServiceError(`stations lambda: ${msg}`, 502, code);
}

export class StationsServiceLambda implements StationsService {
  async list(params: ListStationsParams, callerId: string): Promise<StationBaseCollectionResponse> {
    const { city, owner, state, orderBy, page = 1, pageSize = DEFAULT_PAGE_SIZE } = params;
    logger.debug('Invoking stations lambda: list', { params, callerId });

    const data: Record<string, unknown> = {};
    if (city !== undefined) data.city = city;
    if (owner !== undefined) data.owner = owner;
    if (state !== undefined) data.state = state;
    if (orderBy !== undefined) data.orderBy = orderBy;

    const result = await LAMBDA_INVOKER.invokeJson<{
      data: LambdaStation[] | LambdaStation | null;
      meta?: Record<string, unknown>;
    } | LambdaErrorResponse>(env.stationsLambdaFunctionName, wrapLambdaRequest('getAllStations', callerId, data, { page, pageSize }));

    if (isLambdaErrorPayload(result)) {
      throwFromStationsLambdaError(result);
    }

    const stations = mapLambdaStationList(result.data);
    const fallbackMeta: Meta = {
      page,
      pageSize,
      totalItems: stations.length,
      totalPages: Math.max(1, Math.ceil(stations.length / pageSize)),
    };
    const meta = mapLambdaStationsListMeta(result.meta as Parameters<typeof mapLambdaStationsListMeta>[0], fallbackMeta);

    return { data: stations, meta };
  }

  async getById(stationId: string, callerId: string): Promise<StationBase> {
    logger.debug('Invoking stations lambda: getById', { stationId, callerId });
    const result = await LAMBDA_INVOKER.invokeJson<{ data: LambdaStation | null } | LambdaErrorResponse>(
      env.stationsLambdaFunctionName,
      wrapLambdaRequest('getStationById', callerId, { stationId })
    );
    if (isLambdaErrorPayload(result)) {
      throwFromStationsLambdaError(result);
    }
    if (!result.data) {
      throw new ResourceNotFoundError('Station not found');
    }
    return mapLambdaStation(result.data);
  }

  async create(payload: AdminCreateStationRequest, callerId: string): Promise<AdminCreateStationResponse> {
    logger.debug('Invoking stations lambda: create', { payload, callerId });
    const result = await LAMBDA_INVOKER.invokeJson<{ data: LambdaAdminCreateStationResponse } | LambdaErrorResponse>(
      env.stationsLambdaWriteFunctionName,
      wrapLambdaRequest('writeStation', callerId, payload)
    );
    if (isLambdaErrorPayload(result)) {
      throwFromStationsLambdaError(result);
    }
    return mapLambdaAdminCreateStationResponse(result.data);
  }

  async updateStationState(
    stationId: string,
    oldState: StationLifecycleState,
    newState: StationLifecycleState,
    callerId: string
  ): Promise<AdminUpdateStationStateResponse> {
    logger.debug('Invoking stations write lambda: updateStationState', {
      stationId,
      oldState,
      newState,
      callerId,
    });
    const result = await LAMBDA_INVOKER.invokeJson<{ data: LambdaAdminUpdateStationStateResponse } | LambdaErrorResponse>(
      env.stationsLambdaWriteFunctionName,
      wrapLambdaRequest<AdminUpdateStationStateRequest, unknown>('changeStationState', callerId, { stationId, oldState, newState })
    );
    if (isLambdaErrorPayload(result)) {
      throwFromStationsLambdaError(result);
    }
    return mapLambdaAdminUpdateStationStateResponse(result.data);
  }

  async updateStationPorts(
    stationId: string,
    deltaPorts: number,
    callerId: string
  ): Promise<AdminUpdateStationPortsResponse> {
    logger.debug('Invoking stations write lambda: update_station_ports', {
      stationId,
      deltaPorts,
      callerId,
    });

    const operations = [
      {
        station_id: stationId,
        delta: deltaPorts,
        event_id: randomUUID(),
      },
    ];

    const result = await LAMBDA_INVOKER.invokeJson<
      { data: { operations: typeof operations } } | LambdaErrorResponse
    >(
      env.stationsLambdaWriteFunctionName,
      wrapLambdaRequest('update_station_ports', callerId, operations)
    );

    if (isLambdaErrorPayload(result)) {
      throwFromStationsLambdaError(result);
    }

    const station = await this.getById(stationId, callerId);
    return {
      updatedAt: station.updatedAt,
      ports: station.ports,
      occupiedPorts: station.occupiedPorts ?? 0,
    };
  }

  async deleteStation(stationId: string, callerId: string): Promise<AdminDeleteStationResponse> {
    logger.debug('Invoking stations write lambda: deleteStation', {
      stationId,
      callerId,
    });
    const result = await LAMBDA_INVOKER.invokeJson<{ data: LambdaAdminDeleteStationResponse } | LambdaErrorResponse>(
      env.stationsLambdaWriteFunctionName,
      wrapLambdaRequest('deleteStation', callerId, {
        stationId,
      })
    );
    if (isLambdaErrorPayload(result)) {
      throwFromStationsLambdaError(result);
    }
    return mapLambdaDeleteStationResponse(result.data);
  }
}
