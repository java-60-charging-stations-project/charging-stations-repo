import type {
  UserSession,
  UserSessionPortState,
  UserSessionPortUpdateResponse,
} from './userSessions.types';

export interface UserSessionsIService {
  getUserSessions(userId: string): Promise<UserSession[]>;

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
};
