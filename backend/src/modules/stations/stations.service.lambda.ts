import { env } from '../../config/env';
import { AwsLambdaInvoker, type LambdaInvoker } from '../../utils/lambdaInvoker';
import { createLogger } from '../../utils/logger';
import type { StationDto, StationStatus, StationsService } from './stations.types';

const logger = createLogger('stations.service');
const LAMBDA_INVOKER: LambdaInvoker = new AwsLambdaInvoker(env.awsRegion);

export class StationsServiceLambda implements StationsService {
  async list(callerId: string): Promise<StationDto[]> {
    logger.debug('Invoking stations lambda: list', { callerId });
    const result = await LAMBDA_INVOKER.invokeJson<StationDto[]>(env.stationsLambdaFunctionName, {
      action: 'list_stations',
      caller_id: callerId
    });
    return result;
  }

  async getById(stationId: string, callerId: string): Promise<StationDto | null> {
    logger.debug('Invoking stations lambda: getById', { stationId, callerId });
    const result = await LAMBDA_INVOKER.invokeJson<StationDto | null>(env.stationsLambdaFunctionName, {
      action: 'get_station_by_id',
      stationId,
      caller_id: callerId
    });
    return result;
  }

  async create(payload: Omit<StationDto, 'stationId' | 'status'>, callerId: string): Promise<StationDto> {
    logger.debug('Invoking stations lambda: create', { payload, callerId });
    const result = await LAMBDA_INVOKER.invokeJson<StationDto>(env.stationsLambdaFunctionName, {
      action: 'create_station',
      caller_id: callerId,
      payload
    });
    return result;
  }

  async updateStatus(
    stationId: string,
    status: StationStatus,
    callerId: string,
    callerGroups: string[]
  ): Promise<StationDto> {
    logger.debug('Invoking stations lambda: updateStatus', {
      stationId,
      status,
      callerId,
      callerGroups
    });
    const result = await LAMBDA_INVOKER.invokeJson<StationDto>(env.stationsLambdaFunctionName, {
      action: 'update_station_status',
      stationId,
      status,
      caller_id: callerId,
      caller_groups: callerGroups
    });
    return result;
  }
}
