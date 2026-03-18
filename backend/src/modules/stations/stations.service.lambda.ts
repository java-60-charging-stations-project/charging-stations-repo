import { ResourceNotFoundError } from '../../common/serviceErrors';
import { env } from '../../config/env';
import { AwsLambdaInvoker, type LambdaInvoker } from '../../utils/lambdaInvoker';
import { createLogger } from '../../utils/logger';
import type { AdminCreateStationRequest, AdminCreateStationResponse, StationBase, StationState, StationsService } from './stations.types';

const logger = createLogger('stations.service');
const LAMBDA_INVOKER: LambdaInvoker = new AwsLambdaInvoker(env.awsRegion);

export class StationsServiceLambda implements StationsService {
  async list(callerId: string): Promise<StationBase[]> {
    logger.debug('Invoking stations lambda: list', { callerId });
    const result = await LAMBDA_INVOKER.invokeJson<StationBase[]>(env.stationsLambdaFunctionName, {
      action: 'list_stations',
      caller_id: callerId
    });
    return result;
  }

  async getById(stationId: string, callerId: string): Promise<StationBase> {
    logger.debug('Invoking stations lambda: getById', { stationId, callerId });
    const result = await LAMBDA_INVOKER.invokeJson<StationBase | null>(env.stationsLambdaFunctionName, {
      action: 'get_station_by_id',
      stationId,
      caller_id: callerId
    });
    if (!result) {
      throw new ResourceNotFoundError('Station not found');
    }
    return result;
  }

  async create(payload: AdminCreateStationRequest, callerId: string): Promise<AdminCreateStationResponse> {
    logger.debug('Invoking stations lambda: create', { payload, callerId });
    const result = await LAMBDA_INVOKER.invokeJson<AdminCreateStationResponse>(env.stationsLambdaFunctionName, {
      action: 'create_station',
      caller_id: callerId,
      payload
    });
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
    const result = await LAMBDA_INVOKER.invokeJson<StationBase>(env.stationsLambdaFunctionName, {
      action: 'update_station_status',
      stationId,
      status,
      caller_id: callerId,
      caller_groups: callerGroups
    });
    return result;
  }
}
