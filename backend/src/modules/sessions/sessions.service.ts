import type { ChargingSessionRecord } from './sessions.types';
import { findStationById } from '../stations/local/stations.service.local';

export interface SessionsService {
  getById(sessionId: string): Promise<ChargingSessionRecord | null>;
  listByUserId(userId: string): Promise<ChargingSessionRecord[]>;
  listAll(): Promise<ChargingSessionRecord[]>;
  startSession(userId: string, stationId: string, portId: string): Promise<ChargingSessionRecord>;
  stopSession(userId: string, sessionId: string): Promise<ChargingSessionRecord>;
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
  private sessions: ChargingSessionRecord[] = [...MOCK];

  async getById(sessionId: string): Promise<ChargingSessionRecord | null> {
    return this.sessions.find((s) => s.sessionId === sessionId) ?? null;
  }

  async listByUserId(userId: string): Promise<ChargingSessionRecord[]> {
    return this.sessions.filter((s) => s.userId === userId);
  }

  async listAll(): Promise<ChargingSessionRecord[]> {
    return [...this.sessions];
  }

  async startSession(userId: string, stationId: string, portId: string): Promise<ChargingSessionRecord> {
    const station = findStationById(stationId);
    if (!station) {
      throw new Error('Station not found');
    }
    if (station.state !== 'ACTIVE') {
      throw new Error('Station not in ACTIVE state');
    }
    station.occupiedPorts = station.occupiedPorts ?? 0;

    if (station.occupiedPorts >= station.ports) {
      throw new Error('No free ports available');
    }

    if (station.blockedUntil) {
      const blockedUntil = new Date(station.blockedUntil);
      if (blockedUntil > new Date()) {
        throw new Error('Station temporarily blocked due to previous payment failure');
      }
      station.blockedUntil = null;
    }

    // Эмуляция оплаты в начале сессии (20% шанс ошибки).
    if (Math.random() < 0.2) {
      station.blockedUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      throw new Error('Payment start failed, station blocked for 5 minutes');
    }

    station.occupiedPorts += 1;
    const now = new Date().toISOString();
    const session: ChargingSessionRecord = {
      sessionId: `sess-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      stationId,
      portId,
      startedAt: now,
      endedAt: null,
      status: 'ACTIVE',
      energyKwh: null,
      diagnostics: 'Session started',
      internalNote: null,
      billingCents: null,
    };
    this.sessions.push(session);
    return session;
  }

  async stopSession(userId: string, sessionId: string): Promise<ChargingSessionRecord> {
    const session = this.sessions.find((s) => s.sessionId === sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    if (session.userId !== userId) {
      throw new Error('Unauthorized');
    }
    if (session.status !== 'ACTIVE') {
      throw new Error('Session is not active');
    }

    const station = findStationById(session.stationId);
    if (station) {
      station.occupiedPorts = Math.max(0, (station.occupiedPorts ?? 1) - 1);
      if (station.state === 'OUT_OF_SERVICE') {
        station.state = 'INACTIVE';
      }
      station.updatedAt = new Date().toISOString();
    }

    const endedAt = new Date().toISOString();
    const startedAt = new Date(session.startedAt);
    const durationMin = Math.max(1, Math.floor((new Date(endedAt).getTime() - startedAt.getTime()) / 60000));
    const energyKwh = Number((durationMin * 0.7).toFixed(2));
    let billingCents = 0;
    if (station?.ratePlan) {
      const maxRate = Math.max(station.ratePlan.peakRate, station.ratePlan.offPeakRate);
      billingCents = Math.round((energyKwh * maxRate) * 100);
    }

    session.endedAt = endedAt;
    session.status = 'COMPLETED';
    session.energyKwh = energyKwh;
    session.billingCents = billingCents;
    session.diagnostics = 'Session completed normally';
    return session;
  }
}

export function buildSessionsService(): SessionsService {
  return new MockSessionsService();
}
