import { CommandQueueResponse } from '../../../utils/sqsCommandQueue';
import type {
  UserSessionHistoryPage,
  UserSessionHistoryQuery,
  UserSession,
  UserSessionPortState,
  UserSessionPortUpdateResponse,
  UserPaymentResponse,
  UserPaymentRequest,
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
  ): Promise<CommandQueueResponse | UserSessionPortUpdateResponse>;

  startChargingSession(
    userId: string,
    stationId: string,
    portCode: string,
    oldState: UserSessionPortState,
  ): Promise<CommandQueueResponse | UserSessionPortUpdateResponse>;

  stopBooking(
    userId: string,
    stationId: string,
    portCode: string,
    oldState: UserSessionPortState,
  ): Promise<CommandQueueResponse | UserSessionPortUpdateResponse>;

  stopChargingSession(
    userId: string,
    stationId: string,
    portCode: string,
    oldState: UserSessionPortState,
  ): Promise<CommandQueueResponse | UserSessionPortUpdateResponse>;

  createManualPayment(paymentRequest: UserPaymentRequest): Promise<UserPaymentResponse>;
};
