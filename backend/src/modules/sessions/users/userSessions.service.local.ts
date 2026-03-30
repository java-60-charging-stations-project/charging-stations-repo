import type { UserSessionsIService } from './userSessions.service.interface';
import type { UserSession } from './userSessions.types';

const LOCAL_USER_SESSIONS: UserSession[] = [
  {
    sessionId: 'session-1',
    stationId: '139c59db-0663-465e-a3a3-6839c5782167',
    entityKey: 'entity-1',
    portCode: 'PORT-A4',
    state: 'BOOKED',
    userId: '7a33b28c-c021-703d-33e4-844c9bbc4cf6',
    createdAt: '2021-01-01',
    updatedAt: '2021-01-01',
  }
];

export class UserSessionsServiceLocal implements UserSessionsIService {
  async getUserSessions(userId: string): Promise<UserSession[]> {
    return LOCAL_USER_SESSIONS.filter((session) => session.userId === userId);
  }
}
