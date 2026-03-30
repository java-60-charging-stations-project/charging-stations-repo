import type {
  LambdaGetUserSessionsSuccessData,
  LambdaUserUpdateStationPortsSuccessData,
  LambdaUserSessionRow,
  UserSessionPortUpdateResponse,
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

export function mapLambdaUserStationPortUpdate(
  data: LambdaUserUpdateStationPortsSuccessData
): UserSessionPortUpdateResponse {
  return {
    stationId: data.station_id,
    // The Lambda returns the port code in `entity_key` for this action.
    portCode: data.entity_key,
    newState: data.new_state,
    updatedAt: data.updated_at,
    timeBookedAt: data.time_booked_at,
    timeBookedBefore: data.time_booked_before,
  };
}
