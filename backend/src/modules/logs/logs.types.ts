export type LogAudience = 'support' | 'admin';

export interface CollectorLogRecord {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  service: string;
  event: string;
  source_service: string;
  caller_id: string;
  request_id?: string;
  timestamp: string;
  log_id: string;
  resolve_time?: string;
  resolver_id?: string;
  resolved: boolean;
  /** Route scope (support vs admin); not persisted in RDS — set by the API layer. */
  audience: LogAudience;
}

/** Successful `POST /logs/.../:log_id` when backed by RDS Lambda (`resolveLog`). */
export interface LogsResolvePayload {
  logId: string;
  resolverId: string;
  resolveTime: string;
}

