import { ResourceNotFoundError } from '../../common/serviceErrors';
import { env } from '../../config/env';
import { AwsLambdaInvoker, type LambdaInvoker } from '../../utils/lambdaInvoker';
import { createLogger } from '../../utils/logger';
import { wrapLambdaRequest } from '../../common/wrappers';
import type {
  AdminCreateStationRequest,
  AdminCreateStationResponse,
  AdminDeleteStationResponse,
  AdminUpdateStationStateRequest,
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
      wrapLambdaRequest('getAllStations', callerId, {})
    );
    return mapLambdaStationList(result.data);
  }

  async getById(stationId: string, callerId: string): Promise<StationBase> {
    logger.debug('Invoking stations lambda: getById', { stationId, callerId });
    const result = await LAMBDA_INVOKER.invokeJson<{ data: LambdaStation | null }>(
      env.stationsLambdaFunctionName,
      wrapLambdaRequest(
        'getStationById',
        callerId,
        {stationId,}
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
        'writeStation',
        callerId,
        payload
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
      wrapLambdaRequest<AdminUpdateStationStateRequest, unknown>(
          'changeStationState',
          callerId,
          { stationId, oldState, newState },
      )
    );
    return result.data;
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
