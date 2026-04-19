import { ResourceNotFoundError } from '../../common/serviceErrors';
import { env } from '../../config/env';
import type { CollectorLogRecord, LogAudience } from './logs.types';
import type { LogsListQuery, LogsListResult, LogsService } from './logs.service.interface';
import { LogsServiceLambda } from './logs.service.lambda';
import { createLogger } from '../../utils/logger';

export type { LogsListQuery, LogsListResult, LogsService } from './logs.service.interface';

const logger = createLogger("logs");

const LOGS_STORE: CollectorLogRecord[] = [
  {
    level: 'ERROR',
    message: 'Failed to connect to charging station API',
    service: 'stations',
    event: 'api_connection_failed',
    source_service: 'charging-station-001',
    caller_id: 'user-123',
    request_id: 'req-abc-123',
    timestamp: '2026-04-19T10:00:00.000Z',
    log_id: 'log-001',
    resolved: false,
    audience: 'support',
  },
  {
    level: 'ERROR',
    message: 'Session timeout warning for user session',
    service: 'sessions',
    event: 'session_timeout_warning',
    source_service: 'session-manager',
    caller_id: 'user-456',
    request_id: 'req-def-456',
    timestamp: '2026-04-19T11:30:00.000Z',
    log_id: 'log-002',
    resolved: false,
    audience: 'support',
  },
  {
    level: 'ERROR',
    message: 'Session timeout warning for user session',
    service: 'sessions',
    event: 'session_timeout_warning',
    source_service: 'session-manager',
    caller_id: 'user-456',
    request_id: 'req-def-456',
    timestamp: '2026-04-19T11:30:00.000Z',
    log_id: 'log-003',
    resolved: true,
    resolver_id: '7a33b28c-c021-703d-33e4-844c9bbc4cf6',
    audience: 'support',
  },
  {
    level: 'ERROR',
    message: 'User authentication unsuccessful',
    service: 'auth',
    event: 'user_login_success',
    source_service: 'auth-service',
    caller_id: 'user-789',
    request_id: 'req-ghi-789',
    timestamp: '2026-04-19T12:15:00.000Z',
    log_id: 'log-004',
    resolved: false,
    audience: 'admin',
  },
];

function logTimestampMs(record: CollectorLogRecord): number {
  const ms = new Date(record.timestamp).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

class LogsServiceLocal implements LogsService {
  constructor() {
    logger.debug("STARTING LogsServiceLocal...");
  }
  async listByAudience(audience: LogAudience, query: LogsListQuery): Promise<LogsListResult> {
    const dateFromMs = query.dateFrom ? new Date(query.dateFrom).getTime() : undefined;
    const dateToMs = query.dateTo ? new Date(query.dateTo).getTime() : undefined;

    let filtered = LOGS_STORE.filter((log) => log.audience === audience);

    if (query.level) {
      filtered = filtered.filter((log) => log.level === query.level);
    }
    if (query.service) {
      const s = query.service.toLowerCase();
      filtered = filtered.filter((log) => log.service.toLowerCase().includes(s));
    }
    if (query.filterCallerId) {
      filtered = filtered.filter((log) => log.caller_id === query.filterCallerId);
    }
    if (query.event) {
      const e = query.event.toLowerCase();
      filtered = filtered.filter((log) => log.event.toLowerCase().includes(e));
    }
    if (query.resolved !== undefined) {
      filtered = filtered.filter((log) => log.resolved === query.resolved);
    }

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
    resolverId: string,
  ) {
    const log = LOGS_STORE.find((entry) => entry.audience === audience && entry.log_id === logId);
    if (!log) {
      throw new ResourceNotFoundError('Log not found', 'LOG_NOT_FOUND');
    }

    log.resolve_time = resolveTime;
    log.resolver_id = resolverId;
    log.resolved = true;
    return {
      logId: log.log_id,
      resolverId,
      resolveTime,
    };
  }
}

export function buildLogsService(): LogsService {
  if (env.environment === 'local') {
    return new LogsServiceLocal();
  }
  return new LogsServiceLambda();
}
