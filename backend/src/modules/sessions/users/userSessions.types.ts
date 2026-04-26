export type UserSessionState = "BOOKED" | "ACTIVE" | "UNPAID" | "PAID";
export type UserSessionPortState = 'FREE' | 'BOOKED' | 'OCCUPIED' | 'ERROR' | 'DISABLED';

export interface UserSession {
  sessionId: string;
  stationId: string;
  entityKey: string;
  portCode: string;
  state: UserSessionState;
  userId: string;
  createdAt: string;
  updatedAt: string;
  timeBookedAt?: string | null;
  timeBookedBefore?: string | null;
  startedAt?: string | null;
  stoppedAt?: string | null;
  endedAt?: string | null;
  tariff?: number | string | null;
  currentCost?: number | string | null;
  energyConsumedKwh?: number | string | null;
  estimatedMinutesRemaining?: number | null;
  durationMinutes?: number | null;
  bookingDurationMinutes?: number | null;
  chargeLevelPercent?: number | null;
  finalCost?: number | string | null;
  paidAt?: string | null;
}

export interface LambdaUserSessionRow {
  session_id: string;
  station_id: string;
  entity_key?: string;
  port_code: string;
  state: UserSessionState;
  user_id: string;
  created_at: string;
  updated_at: string;
  time_booked_at?: string | null;
  time_booked_before?: string | null;
  started_at?: string | null;
  stopped_at?: string | null;
  ended_at?: string | null;
  tariff?: number | string | null;
  current_cost?: number | string | null;
  energy_consumed_kwh?: number | string | null;
  estimated_minutes_remaining?: number | null;
  duration_minutes?: number | null;
  booking_duration_minutes?: number | null;
  charge_level_percent?: number | null;
  final_cost?: number | string | null;
  paid_at?: string | null;
}

export interface LambdaGetUserSessionsSuccessData {
  session: LambdaUserSessionRow[];
}

export interface UserSessionHistoryQuery {
  userId: string;
  sessionId?: string;
  stationId?: string;
  state?: UserSessionState;
  orderBy?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
}

export interface UserSessionHistoryPage {
  sessions: UserSession[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface LambdaGetStationSessionsSuccessData {
  sessions: LambdaUserSessionRow[];
}

export interface UserSessionPortUpdateResponse {
  stationId: string;
  portCode: string;
  newState: string;
  updatedAt: string;
  timeBookedAt?: string;
  timeBookedBefore?: string;
  sessionId?: string;
}

export interface UserSessionPortUpdateResponseAsync {
  messageId: string;
}

export interface UserPortUpdateSyncResponse {
  type: "sync";
  response: UserSessionPortUpdateResponse;
}

export interface UserPortUpdateAsyncResponse {
  type: "async";
  response: UserSessionPortUpdateResponseAsync;
}

export type UserPortUpdateResponse = UserPortUpdateSyncResponse | UserPortUpdateAsyncResponse;

export interface LambdaUserUpdateStationPortsData {
  stationId: string;
  portCode: string;
  oldState: UserSessionPortState;
  newState: 'BOOKED' | 'OCCUPIED' | 'FREE';
  userId: string;
}

export interface LambdaUserUpdateStationPortsSuccessData {
  station_id: string;
  entity_key: string;
  new_state: string;
  updated_at: string;
  time_booked_at?: string;
  time_booked_before?: string;
  session_id?: string;
}

// User manual payment types
export interface UserPaymentRequest {
  stationId: string;
  entityKey: string;
  userId: string;
};

export interface UserPaymentResponseLambda {
  paid_session: {
    user_id: string;
    session_id: string;
    paid_at: string;
  };
}

export interface UserPaymentResponse {
  userId: string;
  sessionId: string;
  paidAt: string;
};