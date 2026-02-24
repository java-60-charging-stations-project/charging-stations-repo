export const API_BASE = '/api' as const;

export const ROLES = {
  USER: 'USER',
  TECH_SUPPORT: 'TECH_SUPPORT',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const STATION_STATUSES = ['NEW', 'ACTIVE', 'MAINTENANCE', 'OUT_OF_ORDER'] as const;
export const PORT_STATUSES = ['FREE', 'RESERVED', 'CHARGING', 'ERROR'] as const;
export const SESSION_STATUSES = ['STARTED', 'IN_PROGRESS', 'COMPLETED', 'INTERRUPTED', 'FAILED'] as const;
export const ERROR_LOG_STATUSES = ['NEW', 'IN_PROGRESS', 'RESOLVED'] as const;
export const LOG_LEVELS = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'] as const;

export type StationStatus = (typeof STATION_STATUSES)[number];
export type PortStatus = (typeof PORT_STATUSES)[number];
export type SessionStatus = (typeof SESSION_STATUSES)[number];
export type ErrorLogStatus = (typeof ERROR_LOG_STATUSES)[number];
export type LogLevel = (typeof LOG_LEVELS)[number];

export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  NEW: 'bg-blue-100 text-blue-800',
  MAINTENANCE: 'bg-yellow-100 text-yellow-800',
  OUT_OF_ORDER: 'bg-red-100 text-red-800',
  FREE: 'bg-green-100 text-green-800',
  CHARGING: 'bg-blue-100 text-blue-800',
  RESERVED: 'bg-yellow-100 text-yellow-800',
  ERROR: 'bg-red-100 text-red-800',
  STARTED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-green-100 text-green-800',
  INTERRUPTED: 'bg-orange-100 text-orange-800',
  FAILED: 'bg-red-100 text-red-800',
  RESOLVED: 'bg-green-100 text-green-800',
};
