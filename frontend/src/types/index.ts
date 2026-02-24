export interface Station {
  stationId: string;
  name: string;
  address: string;
  status: 'NEW' | 'ACTIVE' | 'MAINTENANCE' | 'OUT_OF_ORDER';
  powerKw: number;
  tariffPerKwh: number;
  latitude?: number;
  longitude?: number;
  ports?: Port[];
}

export interface Port {
  portId: string;
  stationId: string;
  portNumber: number;
  status: 'FREE' | 'RESERVED' | 'CHARGING' | 'ERROR';
}

export interface Session {
  sessionId: string;
  userId: string;
  stationId: string;
  portId: string;
  status: 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'INTERRUPTED' | 'FAILED';
  chargePercent: number;
  energyConsumedKwh: number;
  totalCost: number;
  tariffPerKwh: number;
  batteryCapacityKwh: number;
  startedAt: string;
  stoppedAt?: string;
}

export interface User {
  userId: string;
  email: string;
  name?: string;
  role: 'USER' | 'TECH_SUPPORT' | 'ADMIN';
  blocked?: boolean;
  accessToken?: string;
  refreshToken?: string;
}

export interface ErrorLog {
  errorId: string;
  level: string;
  service: string;
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
  message: string;
  timestamp: string;
}

export interface HealthResponse {
  service: string;
  status: string;
  timestamp: string;
  totalResponseTimeMs: number;
  checks?: Record<string, unknown>;
}

export interface TechSupportStats {
  activeSessions?: number;
  totalStations?: number;
  unresolvedErrors?: number;
  [key: string]: unknown;
}

export interface StartChargingParams {
  stationId: string;
  portId: string;
  batteryCapacityKwh: number;
  targetChargePercent: number;
}

export interface ErrorFilters {
  level?: string;
  service?: string;
  status?: string;
  from?: string;
  to?: string;
}
