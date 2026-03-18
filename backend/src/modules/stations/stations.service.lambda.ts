import { ResourceNotFoundError } from '../../common/serviceErrors';
import { env } from '../../config/env';
import { AwsLambdaInvoker, type LambdaInvoker } from '../../utils/lambdaInvoker';
import { createLogger } from '../../utils/logger';
import { wrapLambdaRequest } from '../../common/wrappers';
import type {
  AdminCreateStationRequest,
  AdminCreateStationResponse,
  StationBase,
  StationState,
  StationsService
} from './stations.types';

const logger = createLogger('stations.service');
const LAMBDA_INVOKER: LambdaInvoker = new AwsLambdaInvoker(env.awsRegion);

export class StationsServiceLambda implements StationsService {
  async list(callerId: string): Promise<StationBase[]> {
    logger.debug('Invoking stations lambda: list', { callerId });
    const result = await LAMBDA_INVOKER.invokeJson<StationBase[]>(
      env.stationsLambdaFunctionName,
      wrapLambdaRequest('list_stations', callerId, {})
    );
    return result;
  }

  async getById(stationId: string, callerId: string): Promise<StationBase> {
    logger.debug('Invoking stations lambda: getById', { stationId, callerId });
    const result = await LAMBDA_INVOKER.invokeJson<StationBase | null>(
      env.stationsLambdaFunctionName,
      wrapLambdaRequest(
        'get_station_by_id',
        callerId,
        {
          stationId
        }
      )
    );
    if (!result) {
      throw new ResourceNotFoundError('Station not found');
    }
    return result;
  }

  async create(payload: AdminCreateStationRequest, callerId: string): Promise<AdminCreateStationResponse> {
    logger.debug('Invoking stations lambda: create', { payload, callerId });
    const result = await LAMBDA_INVOKER.invokeJson<AdminCreateStationResponse>(
      env.stationsLambdaFunctionName,
      wrapLambdaRequest(
        'create_station',
        callerId,
        {
          payload
        }
      )
    );
    return result;
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
    const result = await LAMBDA_INVOKER.invokeJson<StationBase>(
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
    return result;
  }
}
