import { randomUUID } from 'node:crypto';
import {
  BadRequestError,
  ConflictError,
  ResourceNotFoundError,
  ServiceError,
  UnauthorizedError,
} from '../../common/serviceErrors';
import {
  isLambdaErrorPayload,
  LambdaDeleteDynamoPortSuccessItem,
  type LambdaDeleteStationPortsData,
  type LambdaGetPortsByStationSuccessData,
  type LambdaInsertStationPortsData,
  type LambdaInsertStationPortsSuccessData,
  type LambdaPortDynamoRow,
} from '../../common/lambdaContracts';
import { type LambdaErrorResponse } from '../../common/wrapperTypes';
import { env } from '../../config/env';
import { AwsLambdaInvoker, type LambdaInvoker } from '../../utils/lambdaInvoker';
import { createLogger } from '../../utils/logger';
import { wrapLambdaRequest } from '../../common/wrappers';
import { DEFAULT_PAGE_SIZE } from '../../common/constants';
import type {
  AddPortsRequest,
  AdminUpdateStationRequest,
  AdminUpdateStationResponse,
  AdminCreateStationRequest,
  AdminCreateStationResponse,
  AdminDeleteStationResponse,
  AdminUpdateStationStateRequest,
  AdminUpdateStationStateResponse,
  AdminUpdateStationPortsResponse,
  LambdaAdminCreateStationResponse,
  LambdaAdminDeleteStationResponse,
  LambdaAdminUpdateStationStateResponse,
  ApiPort,
  LambdaStation,
  Meta,
  StationBase,
  StationBaseCollectionResponse,
  StationLifecycleState,
} from './stations.types';
import {
  mapLambdaAdminCreateStationResponse,
  mapLambdaDeleteStationResponse,
  mapLambdaCreatedPortKeys,
  mapLambdaInsertStationPortsResponse,
  mapLambdaPortRow,
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
  private async getPortRows(stationId: string, callerId: string): Promise<LambdaPortDynamoRow[]> {
    logger.debug('Invoking ports read lambda: getPortsByStation', { stationId, callerId });
    const result = await LAMBDA_INVOKER.invokeJson<
      { data: LambdaGetPortsByStationSuccessData } | LambdaErrorResponse
    >(
      env.stationsPortsReadLambdaFunctionName,
      wrapLambdaRequest('getPortsByStation', callerId, { stationId })
    );
    if (isLambdaErrorPayload(result)) {
      throwFromStationsLambdaError(result);
    }
    const ports = result.data?.ports;
    if (!Array.isArray(ports)) {
      throw new ServiceError('stations ports lambda: invalid response', 502, 'INVALID_RESPONSE');
    }
    return ports;
  }

  private async resolvePortKey(stationId: string, portId: string, callerId: string): Promise<string> {
    if (portId.startsWith('PORT#')) {
      return portId;
    }

    const ports = await this.getPortRows(stationId, callerId);
    const port = ports.find((item) => item.port_id === portId || item.entity_key === portId || item.code === portId);

    if (!port) {
      throw new ResourceNotFoundError('Port not found');
    }
    if (!port.entity_key) {
      throw new ServiceError('stations ports lambda: missing port key', 502, 'INVALID_RESPONSE');
    }

    return port.entity_key;
  }

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

  async getById(stationId: string, callerId: string, includePorts?: boolean): Promise<StationBase> {
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
    const station = mapLambdaStation(result.data);
    if (includePorts) {
      station.ports = await this.getPorts(stationId, callerId);
    }
    return station;
  }

  async getPorts(stationId: string, callerId: string): Promise<ApiPort[]> {
    const ports = await this.getPortRows(stationId, callerId);
    return ports.map(mapLambdaPortRow);
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
      portsCount: station.portsCount,
      occupiedPorts: station.occupiedPorts ?? 0,
    };
  }

  async updateStation(
    stationId: string,
    patch: AdminUpdateStationRequest,
    callerId: string
  ): Promise<AdminUpdateStationResponse> {
    logger.debug('Invoking stations write lambda: updateStation', { stationId, callerId, patchKeys: Object.keys(patch) });

    const payload: Record<string, unknown> = { stationId, ...patch };
    // Lambda expects snake-ish numeric location fields, not nested `location`.
    const result = await LAMBDA_INVOKER.invokeJson<{ data: { station_id?: string } } | LambdaErrorResponse>(
      env.stationsLambdaWriteFunctionName,
      wrapLambdaRequest('updateStation', callerId, payload)
    );
    if (isLambdaErrorPayload(result)) {
      throwFromStationsLambdaError(result);
    }
    return { stationId: result.data?.station_id ?? stationId };
  }

  async addPorts(stationId: string, payload: AddPortsRequest, callerId: string): Promise<ApiPort[]> {
    logger.debug('Invoking ports write lambda: insertStationPorts', {
      stationId,
      portsCount: payload.ports.length,
      callerId,
    });
    const result = await LAMBDA_INVOKER.invokeJson<
      { data: LambdaInsertStationPortsSuccessData } | LambdaErrorResponse
    >(
      env.stationsPortsWriteLambdaFunctionName,
      wrapLambdaRequest<LambdaInsertStationPortsData, Record<string, never>>('insertStationPorts', callerId, {
        stationId,
        ports: payload.ports.map(({ portCode }) => ({
          code: portCode,
          lastMeterKw: 0,
        })),
      })
    );
    if (isLambdaErrorPayload(result)) {
      throwFromStationsLambdaError(result);
    }

    const createdPorts = mapLambdaInsertStationPortsResponse(result.data);
    if (createdPorts) {
      return createdPorts;
    }

    const createdPortKeys = mapLambdaCreatedPortKeys(result.data);
    if (createdPortKeys.length === 0) {
      return [];
    }

    const ports = await this.getPortRows(stationId, callerId);
    const portsByKey = new Map(
      ports
        .filter((port): port is LambdaPortDynamoRow & { entity_key: string } => typeof port.entity_key === 'string')
        .map((port) => [port.entity_key, port])
    );

    return createdPortKeys.map((portKey) => {
      const port = portsByKey.get(portKey);
      if (!port) {
        throw new ServiceError('stations ports lambda: created port not found after insert', 502, 'INVALID_RESPONSE');
      }
      return mapLambdaPortRow(port);
    });
  }

  async deletePort(stationId: string, portId: string, callerId: string): Promise<void> {
    const portKey = await this.resolvePortKey(stationId, portId, callerId);

    logger.debug('Invoking ports write lambda: deleteStationPorts', {
      stationId,
      portId,
      portKey,
      callerId,
    });
    const result = await LAMBDA_INVOKER.invokeJson<
      { data: LambdaDeleteDynamoPortSuccessItem } | LambdaErrorResponse
    >(
      env.stationsPortsWriteLambdaFunctionName,
      wrapLambdaRequest<LambdaDeleteStationPortsData, Record<string, never>>('deleteStationPorts', callerId, {
        stationId,
        portKey,
      })
    );
    if (isLambdaErrorPayload(result)) {
      throwFromStationsLambdaError(result);
    }
    const deletePortData = result.data;
    logger.debug("Delete successful. Lambda response: ", deletePortData);
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
