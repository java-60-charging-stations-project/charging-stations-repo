import { env } from '../../../config/env';
import { UserSessionsServiceLambda } from './userSessions.service.lambda';
import type { UserSessionsIService } from './userSessions.service.interface';
import { UserSessionsServiceLocal } from './userSessions.service.local';

export function buildUserSessionsService(): UserSessionsIService {
  if (env.environment === 'local') {
    return new UserSessionsServiceLocal();
  }

  return new UserSessionsServiceLambda();
}
