import { ADMIN_GROUP, SUPPORT_GROUP } from '../../common/authRoles';

/**

 * Charging session — internal record (before role-based projection).
 * Replace mock source with Lambda/Dynamo when `SessionsService` is wired to AWS.
 */
export type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export interface ChargingSessionRecord {
  sessionId: string;
  userId: string;
  stationId: string;
  portId: string;
  startedAt: string;
  endedAt: string | null;
  status: SessionStatus;
  energyKwh: number | null;
  /** Support: operational / diagnostic summary */
  diagnostics: string | null;
  /** Admin: free-form internal note */
  internalNote: string | null;
  /** Admin: rough billing in minor units (e.g. cents) */
  billingCents: number | null;
}


/** Authenticated end-user: own sessions only — no billing / internal fields */
export interface ChargingSessionUserView {
  role: 'USER';
  sessionId: string;
  stationId: string;
  portId: string;
  startedAt: string;
  endedAt: string | null;
  status: SessionStatus;
  energyKwh: number | null;
}

/** Support: can list all / by user; sees user linkage + diagnostics */
export interface ChargingSessionSupportView {
  role: 'SUPPORT';
  sessionId: string;
  userId: string;
  stationId: string;
  portId: string;
  startedAt: string;
  endedAt: string | null;
  status: SessionStatus;
  energyKwh: number | null;
  diagnostics: string | null;
}

/** Admin: full record for operations */
export interface ChargingSessionAdminView {
  role: 'ADMIN';
  sessionId: string;
  userId: string;
  stationId: string;
  portId: string;
  startedAt: string;
  endedAt: string | null;
  status: SessionStatus;
  energyKwh: number | null;
  diagnostics: string | null;
  internalNote: string | null;
  billingCents: number | null;
}

export type ChargingSessionResponse =
  | ChargingSessionUserView
  | ChargingSessionSupportView
  | ChargingSessionAdminView;

export type ViewerRole = 'USER' | 'SUPPORT' | 'ADMIN';

export function resolveViewerRole(groups: string[] | undefined): ViewerRole {
  const g = groups ?? [];
  if (g.includes(ADMIN_GROUP)) return 'ADMIN';
  if (g.includes(SUPPORT_GROUP)) return 'SUPPORT';
  return 'USER';
}

export function projectSession(record: ChargingSessionRecord, viewer: ViewerRole): ChargingSessionResponse {
  if (viewer === 'ADMIN') {
    return {
      role: 'ADMIN',
      sessionId: record.sessionId,
      userId: record.userId,
      stationId: record.stationId,
      portId: record.portId,
      startedAt: record.startedAt,
      endedAt: record.endedAt,
      status: record.status,
      energyKwh: record.energyKwh,
      diagnostics: record.diagnostics,
      internalNote: record.internalNote,
      billingCents: record.billingCents
    };
  }
  if (viewer === 'SUPPORT') {
    return {
      role: 'SUPPORT',
      sessionId: record.sessionId,
      userId: record.userId,
      stationId: record.stationId,
      portId: record.portId,
      startedAt: record.startedAt,
      endedAt: record.endedAt,
      status: record.status,
      energyKwh: record.energyKwh,
      diagnostics: record.diagnostics
    };
  }
  return {
    role: 'USER',
    sessionId: record.sessionId,
    stationId: record.stationId,
    portId: record.portId,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    status: record.status,
    energyKwh: record.energyKwh
  };
}
