import { env } from '../../config/env';
import { StationsServiceLambda } from './stations.service.lambda';
import { StationsServiceLocal } from './stations.service.local';
import type { StationsService } from './stations.types';

export function buildStationsService(): StationsService {
  if (env.environment === 'local') {
    return new StationsServiceLocal();
  }

  return new StationsServiceLambda();
}
