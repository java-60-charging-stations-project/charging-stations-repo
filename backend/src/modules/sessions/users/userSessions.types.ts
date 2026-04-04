export type UserSessionState = 'BOOKED' | 'ACTIVE' | 'UNPAID';
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
}

export interface LambdaUserSessionRow {
  session_id: string;
  station_id: string;
  entity_key: string;
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
}

export interface LambdaGetUserSessionsSuccessData {
  session: LambdaUserSessionRow[];
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
