import type { CollectorLogRecord, LogAudience, LogsResolvePayload } from './logs.types';

export interface LogsListQuery {
  page: number;
  pageSize: number;
  dateFrom?: string;
  dateTo?: string;
  /** Cognito `sub` for Lambda invoke envelope `service.callerId` (audit). */
  callerId?: string;
  /** Filter `logs.caller_id` (query `caller_id`). */
  filterCallerId?: string;
  level?: string;
  service?: string;
  event?: string;
  resolved?: boolean;
  orderBy?: string;
}

export interface LogsListResult {
  logs: CollectorLogRecord[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LogsService {
  listByAudience(audience: LogAudience, query: LogsListQuery): Promise<LogsListResult>;
  resolveById(
    audience: LogAudience,
    logId: string,
    resolveTime: string,
    resolverId: string
  ): Promise<LogsResolvePayload>;
}
