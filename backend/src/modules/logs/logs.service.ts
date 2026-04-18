import { ResourceNotFoundError } from '../../common/serviceErrors';
import type { CollectorLogRecord, LogAudience } from './logs.types';

export interface LogsListQuery {
  page: number;
  pageSize: number;
  dateFrom?: string;
  dateTo?: string;
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

const LOGS_STORE: CollectorLogRecord[] = [];

function logTimestampMs(record: CollectorLogRecord): number {
  const ms = new Date(record.timestamp).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

class LogsServiceLocal implements LogsService {
  async listByAudience(audience: LogAudience, query: LogsListQuery): Promise<LogsListResult> {
    const dateFromMs = query.dateFrom ? new Date(query.dateFrom).getTime() : undefined;
    const dateToMs = query.dateTo ? new Date(query.dateTo).getTime() : undefined;

    let filtered = LOGS_STORE.filter((log) => log.audience === audience);

    if (dateFromMs !== undefined) {
      filtered = filtered.filter((log) => logTimestampMs(log) >= dateFromMs);
    }
    if (dateToMs !== undefined) {
      filtered = filtered.filter((log) => logTimestampMs(log) <= dateToMs);
    }

    filtered.sort((a, b) => logTimestampMs(b) - logTimestampMs(a));

    const totalItems = filtered.length;
    const safePage = Math.max(1, query.page);
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
    const offset = (safePage - 1) * query.pageSize;
    const logs = filtered.slice(offset, offset + query.pageSize);

    return {
      logs,
      totalItems,
      page: safePage,
      pageSize: query.pageSize,
      totalPages,
    };
  }

  async resolveById(
    audience: LogAudience,
    logId: string,
    resolveTime: string,
    resolverId: string
  ): Promise<CollectorLogRecord> {
    const log = LOGS_STORE.find((entry) => entry.audience === audience && entry.log_id === logId);
    if (!log) {
      throw new ResourceNotFoundError('Log not found', 'LOG_NOT_FOUND');
    }

    log.resolve_time = resolveTime;
    log.resolver_id = resolverId;
    return log;
  }
}

export function buildLogsService(): LogsService {
  return new LogsServiceLocal();
}

