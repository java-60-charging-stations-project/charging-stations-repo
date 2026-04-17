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
  audience: LogAudience;
}

