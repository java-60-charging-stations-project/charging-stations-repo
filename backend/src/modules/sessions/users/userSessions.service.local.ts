import { randomUUID } from 'node:crypto';
import type { UserSessionsIService } from './userSessions.service.interface';
import type {
  UserSession,
  UserSessionPortState,
  UserSessionPortUpdateResponse,
  UserSessionState,
} from './userSessions.types';

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

  async createBooking(
    userId: string,
    stationId: string,
    portCode: string,
    _oldState: UserSessionPortState,
  ): Promise<UserSessionPortUpdateResponse> {
    const now = new Date();
    const updatedAt = now.toISOString();
    const timeBookedBefore = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

    this.appendLocalSession(userId, stationId, portCode, 'BOOKED', updatedAt);

    return {
      stationId,
      portCode,
      newState: 'BOOKED',
      updatedAt,
      timeBookedAt: updatedAt,
      timeBookedBefore,
    };
  }

  async startChargingSession(
    userId: string,
    stationId: string,
    portCode: string,
    _oldState: UserSessionPortState,
  ): Promise<UserSessionPortUpdateResponse> {
    const updatedAt = new Date().toISOString();

    this.appendLocalSession(userId, stationId, portCode, 'ACTIVE', updatedAt);

    return {
      stationId,
      portCode,
      newState: 'OCCUPIED',
      updatedAt,
    };
  }

  private appendLocalSession(
    userId: string,
    stationId: string,
    portCode: string,
    state: UserSessionState,
    timestamp: string,
  ): void {
    const sessionId = randomUUID();

    LOCAL_USER_SESSIONS.push({
      sessionId,
      stationId,
      entityKey: `PORT#${portCode}#SESSION#${sessionId}`,
      portCode,
      state,
      userId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
}
