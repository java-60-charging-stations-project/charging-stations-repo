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
    entityKey: row.entity_key ?? '',
    portCode: row.port_code,
    state: row.state,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    timeBookedAt: row.time_booked_at,
    timeBookedBefore: row.time_booked_before,
    startedAt: row.started_at,
    stoppedAt: row.stopped_at,
    endedAt: row.ended_at,
    tariff: row.tariff,
    currentCost: row.current_cost,
    energyConsumedKwh: row.energy_consumed_kwh,
    estimatedMinutesRemaining: row.estimated_minutes_remaining,
    durationMinutes: row.duration_minutes,
    bookingDurationMinutes: row.booking_duration_minutes,
    chargeLevelPercent: row.charge_level_percent,
    finalCost: row.final_cost,
    paidAt: row.paid_at,
  };
}

export function mapLambdaUserSessions(data: LambdaGetUserSessionsSuccessData): UserSession[] {
  return data.session.map(mapLambdaUserSession);
}

export function mapLambdaUserSessionsByStation(rows: unknown[]): UserSession[] {
  return rows
    .filter(
      (row): row is LambdaUserSessionRow =>
        typeof row === 'object' &&
        row !== null &&
        'session_id' in row &&
        typeof (row as { session_id?: unknown }).session_id === 'string'
    )
    .map(mapLambdaUserSession);
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
    sessionId: data.session_id,
  };
}
