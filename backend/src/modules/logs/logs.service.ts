import { ResourceNotFoundError } from '../../common/serviceErrors';
import type { CollectorLogRecord, LogAudience } from './logs.types';

export interface LogsService {
  listByAudience(audience: LogAudience): Promise<CollectorLogRecord[]>;
  resolveById(
    audience: LogAudience,
    logId: string,
    resolveTime: string,
    resolverId: string
  ): Promise<CollectorLogRecord>;
}

const LOGS_STORE: CollectorLogRecord[] = [];

class LogsServiceLocal implements LogsService {
  async listByAudience(audience: LogAudience): Promise<CollectorLogRecord[]> {
    return LOGS_STORE.filter((log) => log.audience === audience);
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

