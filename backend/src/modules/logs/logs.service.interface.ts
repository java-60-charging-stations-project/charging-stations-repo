import type { CollectorLogRecord, LogAudience } from './logs.types';

export interface LogsListQuery {
  page: number;
  pageSize: number;
  dateFrom?: string;
  dateTo?: string;
  /** Cognito `sub` for Lambda `callerId` (list). */
  callerId?: string;
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
  ): Promise<CollectorLogRecord>;
}
