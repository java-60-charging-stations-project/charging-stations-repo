import type { ChargingSessionRecord } from './sessions.types';

export interface SessionsService {
  getById(sessionId: string): Promise<ChargingSessionRecord | null>;
  listByUserId(userId: string): Promise<ChargingSessionRecord[]>;
  listAll(): Promise<ChargingSessionRecord[]>;
}

/** In-memory mock — swap for Lambda-backed implementation when available */
const MOCK: ChargingSessionRecord[] = [
  {
    sessionId: 'sess-local-001',
    userId: 'local-user',
    stationId: 'station-demo-1',
    portId: 'port-1',
    startedAt: '2025-03-10T12:00:00.000Z',
    endedAt: null,
    status: 'ACTIVE',
    energyKwh: 2.1,
    diagnostics: 'Mock session for AUTH_DISABLED / local dev',
    internalNote: null,
    billingCents: null
  },
  {
    sessionId: 'sess-demo-001',
    userId: 'user-sample-001',
    stationId: 'station-demo-1',
    portId: 'port-1',
    startedAt: '2025-01-15T10:00:00.000Z',
    endedAt: '2025-01-15T11:30:00.000Z',
    status: 'COMPLETED',
    energyKwh: 18.4,
    diagnostics: 'Charge curve nominal',
    internalNote: null,
    billingCents: 1840
  },
  {
    sessionId: 'sess-demo-002',
    userId: 'user-sample-002',
    stationId: 'station-demo-2',
    portId: 'port-2',
    startedAt: '2025-03-01T08:00:00.000Z',
    endedAt: null,
    status: 'ACTIVE',
    energyKwh: 4.2,
    diagnostics: 'OCPP session active',
    internalNote: 'Pilot user',
    billingCents: null
  }
];

export class MockSessionsService implements SessionsService {
  async getById(sessionId: string): Promise<ChargingSessionRecord | null> {
    return MOCK.find((s) => s.sessionId === sessionId) ?? null;
  }

  async listByUserId(userId: string): Promise<ChargingSessionRecord[]> {
    return MOCK.filter((s) => s.userId === userId);
  }

  async listAll(): Promise<ChargingSessionRecord[]> {
    return [...MOCK];
  }
}

export function buildSessionsService(): SessionsService {
  return new MockSessionsService();
}
