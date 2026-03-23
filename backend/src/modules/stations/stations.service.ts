import { env } from '../../config/env';
import { StationsServiceLambda } from './stations.service.lambda';
import { StationsServiceLocal } from './local/stations.service.local';
import type { StationsService } from './stations.interface';

export function buildStationsService(): StationsService {
  if (env.environment === 'local') {
    return new StationsServiceLocal();
  }

  return new StationsServiceLambda();
}
