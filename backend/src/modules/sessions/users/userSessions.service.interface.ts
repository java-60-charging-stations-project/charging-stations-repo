import type {
  UserSessionHistoryPage,
  UserSessionHistoryQuery,
  UserSession,
  UserSessionPortState,
  UserSessionPortUpdateResponse,
  UserPaymentResponse,
  UserPaymentRequest,
  UserPortUpdateResponse,
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
  ): Promise<UserPortUpdateResponse>;

  startChargingSession(
    userId: string,
    stationId: string,
    portCode: string,
    oldState: UserSessionPortState,
  ): Promise<UserPortUpdateResponse>;

  stopBooking(
    userId: string,
    stationId: string,
    portCode: string,
    oldState: UserSessionPortState,
  ): Promise<UserPortUpdateResponse>;

  stopChargingSession(
    userId: string,
    stationId: string,
    portCode: string,
    oldState: UserSessionPortState,
  ): Promise<UserPortUpdateResponse>;

  createManualPayment(paymentRequest: UserPaymentRequest): Promise<UserPaymentResponse>;
};
