import type {
  LambdaGetUserSessionsSuccessData,
  LambdaUserSessionRow,
  UserSession,
} from './userSessions.types';

export function mapLambdaUserSession(row: LambdaUserSessionRow): UserSession {
  return {
    sessionId: row.session_id,
    stationId: row.station_id,
    entityKey: row.entity_key,
    portCode: row.port_code,
    state: row.state,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapLambdaUserSessions(data: LambdaGetUserSessionsSuccessData): UserSession[] {
  return data.session.map(mapLambdaUserSession);
}
