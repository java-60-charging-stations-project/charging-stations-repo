import { randomUUID } from 'node:crypto';
import type { UserSessionsIService } from './userSessions.service.interface';
import type {
  UserSessionHistoryPage,
  UserSessionHistoryQuery,
  UserSession,
  UserSessionPortState,
  UserSessionPortUpdateResponse,
  UserSessionState,
  UserPaymentRequest,
  UserPaymentResponse,
} from './userSessions.types';
import { ConflictError, ResourceNotFoundError } from '../../../common/serviceErrors';

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
  async getUserSessions(userId: string, _latest?: boolean): Promise<UserSession[]> {
    return LOCAL_USER_SESSIONS.filter((session) => session.userId === userId);
  }

  async getSessionsByStation(stationId: string): Promise<UserSession[]> {
    return LOCAL_USER_SESSIONS.filter((session) => session.stationId === stationId);
  }

  async getUserHistory(query: UserSessionHistoryQuery): Promise<UserSessionHistoryPage> {
    const dateFromMs = query.dateFrom ? Date.parse(query.dateFrom) : undefined;
    const dateToMs = query.dateTo ? Date.parse(query.dateTo) : undefined;

    const filtered = LOCAL_USER_SESSIONS.filter((session) => {
      if (session.userId !== query.userId) return false;
      if (query.sessionId && session.sessionId !== query.sessionId) return false;
      if (query.stationId && session.stationId !== query.stationId) return false;
      if (query.state && session.state !== query.state) return false;

      const startedAtSource = session.startedAt ?? session.createdAt;
      const startedAtMs = Date.parse(startedAtSource);
      if (Number.isNaN(startedAtMs)) return false;
      if (dateFromMs !== undefined && startedAtMs < dateFromMs) return false;
      if (dateToMs !== undefined && startedAtMs > dateToMs) return false;
      return true;
    });

    const totalItems = filtered.length;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
    const safePage = totalPages === 0 ? 1 : Math.min(query.page, totalPages);
    const offset = (safePage - 1) * query.pageSize;

    return {
      sessions: filtered.slice(offset, offset + query.pageSize),
      totalItems,
      totalPages,
      page: safePage,
      pageSize: query.pageSize,
    };
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

  async stopBooking(
    userId: string,
    stationId: string,
    portCode: string,
    _oldState: UserSessionPortState,
  ): Promise<UserSessionPortUpdateResponse> {
    const updatedAt = new Date().toISOString();
    for (const s of LOCAL_USER_SESSIONS) {
      if (s.userId === userId && s.stationId === stationId && s.portCode === portCode && s.state === 'BOOKED') {
        s.state = 'UNPAID';
        s.updatedAt = updatedAt;
      }
    }
    return { stationId, portCode, newState: 'FREE', updatedAt };
  }

  async stopChargingSession(
    userId: string,
    stationId: string,
    portCode: string,
    _oldState: UserSessionPortState,
  ): Promise<UserSessionPortUpdateResponse> {
    const updatedAt = new Date().toISOString();
    for (const s of LOCAL_USER_SESSIONS) {
      if (s.userId === userId && s.stationId === stationId && s.portCode === portCode && s.state === 'ACTIVE') {
        s.state = 'UNPAID';
        s.updatedAt = updatedAt;
      }
    }
    return { stationId, portCode, newState: 'FREE', updatedAt };
  }

  async createManualPayment(paymentRequest: UserPaymentRequest): Promise<UserPaymentResponse> {
    
    const { userId, stationId, entityKey } = paymentRequest;

    const sessionToPay = LOCAL_USER_SESSIONS.find((session: UserSession) => {
      session.userId === userId && session.stationId === stationId && session.entityKey === entityKey
    });

    if (!sessionToPay) {
      throw new ResourceNotFoundError(`Cannot find session by userId=${userId}, stationId=${stationId}, entityKey=${entityKey}`);
    }
    const { sessionId, state } = sessionToPay;
    if (state !== "UNPAID") {
      throw new ConflictError(`Session sessionId=${sessionId} is not in the UNPAID state`);
    }
    const paidAt = new Date().toISOString();
    sessionToPay.state = "PAID";
    sessionToPay.paidAt = paidAt;

    return { userId, sessionId, paidAt };
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
