import type {
  UserSessionHistoryPage,
  UserSessionHistoryQuery,
  UserSession,
  UserSessionPortState,
  UserSessionPortUpdateResponse,
} from './userSessions.types';

export interface UserSessionsIService {
  getUserSessions(userId: string, latest?: boolean): Promise<UserSession[]>;
  getUserHistory(query: UserSessionHistoryQuery): Promise<UserSessionHistoryPage>;
  getSessionsByStation(stationId: string): Promise<UserSession[]>;

  createBooking(
    userId: string,
    stationId: string,
    portCode: string,
    oldState: UserSessionPortState,
  ): Promise<UserSessionPortUpdateResponse>;

  startChargingSession(
    userId: string,
    stationId: string,
    portCode: string,
    oldState: UserSessionPortState,
  ): Promise<UserSessionPortUpdateResponse>;

  stopBooking(
    userId: string,
    stationId: string,
    portCode: string,
    oldState: UserSessionPortState,
  ): Promise<UserSessionPortUpdateResponse>;

  stopChargingSession(
    userId: string,
    stationId: string,
    portCode: string,
    oldState: UserSessionPortState,
  ): Promise<UserSessionPortUpdateResponse>;
};
