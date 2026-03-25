import { ResourceNotFoundError } from '../../common/serviceErrors';
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
  LambdaAdminUpdateStationStateResponse,
  LambdaStation,
  Meta,
  StationBase,
  StationBaseCollectionResponse,
  StationState,
} from './stations.types';
import {
  mapLambdaAdminCreateStationResponse,
  mapLambdaStation,
  mapLambdaStationList,
  mapLambdaAdminUpdateStationStateResponse,
  mapLambdaAdminUpdateStationPortsResponse,
} from './stations.types';
import type { ListStationsParams, StationsService } from './stations.interface';

const logger = createLogger('stations.service');
const LAMBDA_INVOKER: LambdaInvoker = new AwsLambdaInvoker(env.awsRegion);

export class StationsServiceLambda implements StationsService {
  async list(params: ListStationsParams, callerId: string): Promise<StationBaseCollectionResponse> {
    const { city, owner, state, orderBy, page = 1, pageSize = DEFAULT_PAGE_SIZE } = params;
    logger.debug('Invoking stations lambda: list', { params, callerId });

    const data: Record<string, unknown> = {};
    if (city !== undefined) data.city = city;
    if (owner !== undefined) data.owner = owner;
    if (state !== undefined) data.state = state;
    if (orderBy !== undefined) data.orderBy = orderBy;

    const result = await LAMBDA_INVOKER.invokeJson<{ data: LambdaStation[] | LambdaStation | null; meta?: Meta }>(
      env.stationsLambdaFunctionName,
      wrapLambdaRequest('getAllStations', callerId, data, { page, pageSize })
    );

    const stations = mapLambdaStationList(result.data);
    const meta: Meta = result.meta ?? {
      page,
      pageSize,
      totalItems: stations.length,
      totalPages: Math.max(1, Math.ceil(stations.length / pageSize)),
    };

    return { data: stations, meta };
  }

  async getById(stationId: string, callerId: string): Promise<StationBase> {
    logger.debug('Invoking stations lambda: getById', { stationId, callerId });
    const result = await LAMBDA_INVOKER.invokeJson<{ data: LambdaStation | null }>(
      env.stationsLambdaFunctionName,
      wrapLambdaRequest(
        'getStationById',
        callerId,
        { stationId, }
      )
    );
    if (!result.data) {
      throw new ResourceNotFoundError('Station not found');
    }
    return mapLambdaStation(result.data);
  }

  async create(payload: AdminCreateStationRequest, callerId: string): Promise<AdminCreateStationResponse> {
    logger.debug('Invoking stations lambda: create', { payload, callerId });
    const result = await LAMBDA_INVOKER.invokeJson<{ data: LambdaAdminCreateStationResponse }>(
      env.stationsLambdaWriteFunctionName,
      wrapLambdaRequest(
        'writeStation',
        callerId,
        payload
      )
    );
    return mapLambdaAdminCreateStationResponse(result.data);
  }

  async updateStationState(
    stationId: string,
    oldState: StationState,
    newState: StationState,
    callerId: string
  ): Promise<AdminUpdateStationStateResponse> {
    logger.debug('Invoking stations write lambda: updateStationState', {
      stationId,
      oldState,
      newState,
      callerId
    });
    const result = await LAMBDA_INVOKER.invokeJson<{ data: LambdaAdminUpdateStationStateResponse }>(
      env.stationsLambdaWriteFunctionName,
      wrapLambdaRequest<AdminUpdateStationStateRequest, unknown>(
        'changeStationState',
        callerId,
        { stationId, oldState, newState },
      )
    );
    return mapLambdaAdminUpdateStationStateResponse(result.data);
  }

  async updateStationPorts(
    stationId: string,
    deltaPorts: number,
    callerId: string
  ): Promise<AdminUpdateStationPortsResponse> {
    logger.debug('Invoking stations write lambda: updateStationPorts', {
      stationId,
      deltaPorts,
      callerId
    });

    const result = await LAMBDA_INVOKER.invokeJson<{ data: { updated_at: string; ports: number; occupied_ports?: number } }>(
      env.stationsLambdaWriteFunctionName,
      wrapLambdaRequest<unknown, unknown>(
        'changeStationPorts',
        callerId,
        { stationId, deltaPorts },
      )
    );

    return mapLambdaAdminUpdateStationPortsResponse(result.data);
  }

  async deleteStation(
    stationId: string,
    callerId: string
  ): Promise<AdminDeleteStationResponse> {
    logger.debug('Invoking stations write lambda: deleteStation', {
      stationId,
      callerId
    });
    const result = await LAMBDA_INVOKER.invokeJson<{ data: AdminDeleteStationResponse }>(
      env.stationsLambdaWriteFunctionName,
      wrapLambdaRequest(
        'deleteStation',
        callerId,
        {
          stationId
        }
      )
    );
    return result.data;
  }
}
