export type UserSessionState = 'BOOKED' | 'ACTIVE' | 'UNPAID';

export interface UserSession {
  sessionId: string;
  stationId: string;
  entityKey: string;
  portCode: string;
  state: UserSessionState;
  userId: string;
  createdAt: string;
  updatedAt: string;
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
}

export interface LambdaGetUserSessionsSuccessData {
  session: LambdaUserSessionRow[];
}
