import { ResourceNotFoundError } from '../../common/serviceErrors';
import { env } from '../../config/env';
import { AwsLambdaInvoker, type LambdaInvoker } from '../../utils/lambdaInvoker';
import { createLogger } from '../../utils/logger';
import { wrapLambdaRequest } from '../../common/wrappers';
import type {
  AdminCreateStationRequest,
  AdminCreateStationResponse,
  AdminUpdateStationStateResponse,
  LambdaStation,
  StationBase,
  StationState,
  StationsService
} from './stations.types';
import { mapLambdaStation, mapLambdaStationList } from './stations.types';

const logger = createLogger('stations.service');
const LAMBDA_INVOKER: LambdaInvoker = new AwsLambdaInvoker(env.awsRegion);

export class StationsServiceLambda implements StationsService {
  async list(callerId: string): Promise<StationBase[]> {
    logger.debug('Invoking stations lambda: list', { callerId });
    const result = await LAMBDA_INVOKER.invokeJson<{ data: LambdaStation[] | LambdaStation | null }>(
      env.stationsLambdaFunctionName,
      wrapLambdaRequest('get_all_stations', callerId, {})
    );
    return mapLambdaStationList(result.data);
  }

  async getById(stationId: string, callerId: string): Promise<StationBase> {
    logger.debug('Invoking stations lambda: getById', { stationId, callerId });
    const result = await LAMBDA_INVOKER.invokeJson<{ data: LambdaStation | null }>(
      env.stationsLambdaFunctionName,
      wrapLambdaRequest(
        'get_station_by_id',
        callerId,
        {
          station_id: stationId
        }
      )
    );
    if (!result.data) {
      throw new ResourceNotFoundError('Station not found');
    }
    return mapLambdaStation(result.data);
  }

  async create(payload: AdminCreateStationRequest, callerId: string): Promise<AdminCreateStationResponse> {
    logger.debug('Invoking stations lambda: create', { payload, callerId });
    const result = await LAMBDA_INVOKER.invokeJson<{ data: AdminCreateStationResponse }>(
      env.stationsLambdaWriteFunctionName,
      wrapLambdaRequest(
        'write_station',
        callerId,
        payload
      )
    );
    return result.data;
  }

  async updateStatus(
    stationId: string,
    status: StationState,
    callerId: string,
    callerGroups: string[]
  ): Promise<StationBase> {
    logger.debug('Invoking stations lambda: updateStatus', {
      stationId,
      status,
      callerId,
      callerGroups
    });
    const result = await LAMBDA_INVOKER.invokeJson<{ data: StationBase }>(
      env.stationsLambdaFunctionName,
      wrapLambdaRequest(
        'update_station_status',
        callerId,
        {
          stationId,
          status,
          caller_groups: callerGroups
        }
      )
    );
    return result.data;
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
    const result = await LAMBDA_INVOKER.invokeJson<{ data: AdminUpdateStationStateResponse }>(
      env.stationsLambdaWriteFunctionName,
      {
        service: { action: 'change_station_status', caller_id: callerId },
        data: {
          stationId,
          oldState,
          newState,
        }
      }
    );
    return result.data;
  }
}
