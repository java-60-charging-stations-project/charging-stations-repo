import {
  isLambdaErrorPayload,
  type LambdaGetLogsFilterData,
  type LambdaGetLogsResponseMeta,
  type LambdaResolveLogSuccessData,
  type LambdaSuccessPayload,
} from '../../common/lambdaContracts';
import { ServiceError, ResourceNotFoundError, BadRequestError } from '../../common/serviceErrors';
import { type LambdaErrorResponse } from '../../common/wrapperTypes';
import { env } from '../../config/env';
import { AwsLambdaInvoker, type LambdaInvoker } from '../../utils/lambdaInvoker';
import { createLogger } from '../../utils/logger';
import { wrapLambdaRequest } from '../../common/wrappers';
import type { CollectorLogRecord, LogAudience } from './logs.types';
import type { LogsListQuery, LogsListResult, LogsService } from './logs.service.interface';

const logger = createLogger('logs.service.lambda');
const LAMBDA_INVOKER: LambdaInvoker = new AwsLambdaInvoker(env.awsRegion);

function throwFromLogsLambdaError(result: LambdaErrorResponse, collectorSource: string): never {
  const msg = result.error;
  const code = result.code ?? 'UNKNOWN';
  const opts = { collectorSource };
  if (code === 'NOT_FOUND') {
    throw new ResourceNotFoundError(msg, 'NOT_FOUND', opts);
  }
  if (code === 'INVALID_REQUEST') {
    throw new BadRequestError(msg, code, opts);
  }
  throw new ServiceError(`logs lambda: ${msg}`, 502, String(code), opts);
}

function isoFromUnknown(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v instanceof Date) return v.toISOString();
  return '';
}

function normalizeLevel(raw: unknown): CollectorLogRecord['level'] {
  const u = String(raw ?? 'INFO').toUpperCase();
  if (u === 'DEBUG' || u === 'INFO' || u === 'WARN' || u === 'ERROR') return u;
  return 'INFO';
}

function mapRdsRowToCollector(row: Record<string, unknown>, audience: LogAudience): CollectorLogRecord {
  return {
    level: normalizeLevel(row.level),
    message: String(row.message ?? ''),
    service: String(row.service ?? ''),
    event: String(row.event ?? ''),
    source_service: row.source_service != null ? String(row.source_service) : '',
    caller_id: String(row.caller_id ?? ''),
    request_id: row.request_id != null ? String(row.request_id) : undefined,
    timestamp: isoFromUnknown(row.timestamp) || new Date().toISOString(),
    log_id: String(row.log_id ?? ''),
    resolve_time: row.resolve_time != null ? isoFromUnknown(row.resolve_time) : undefined,
    resolver_id: row.resolver_id != null ? String(row.resolver_id) : undefined,
    resolved: Boolean(row.resolved),
    audience,
  };
}

function normalizeResolvePayload(raw: unknown): LambdaResolveLogSuccessData {
  if (!raw || typeof raw !== 'object') {
    throw new ServiceError('logs lambda: invalid resolve response', 502, 'INVALID_LAMBDA_RESPONSE', {});
  }
  const o = raw as Record<string, unknown>;
  const logId = String(o.logId ?? '');
  const resolverId = String(o.resolverId ?? '');
  let resolveTime = isoFromUnknown(o.resolveTime);
  if (!resolveTime) resolveTime = new Date().toISOString();
  if (!logId || !resolverId) {
    throw new ServiceError('logs lambda: invalid resolve response', 502, 'INVALID_LAMBDA_RESPONSE', {});
  }
  return { logId, resolverId, resolveTime };
}

export class LogsServiceLambda implements LogsService {
  async listByAudience(audience: LogAudience, query: LogsListQuery): Promise<LogsListResult> {
    const readSource = env.logsReadLambdaFunctionName;
    const envelopeCallerId = query.callerId?.trim() || 'guest';

    const data: LambdaGetLogsFilterData = {
      ...(query.level ? { level: query.level } : {}),
      ...(query.service ? { service: query.service } : {}),
      ...(query.filterCallerId ? { callerId: query.filterCallerId } : {}),
      ...(query.event ? { event: query.event } : {}),
      ...(query.resolved !== undefined ? { resolved: query.resolved } : {}),
      ...(query.orderBy ? { orderBy: query.orderBy } : {}),
    };

    const meta = { page: query.page, pageSize: query.pageSize };

    logger.debug('Invoking logs read lambda: getLogs', { envelopeCallerId, data, meta });

    const result = await LAMBDA_INVOKER.invokeJson<
      LambdaSuccessPayload<unknown[], LambdaGetLogsResponseMeta> | LambdaErrorResponse
    >(readSource, wrapLambdaRequest('getLogs', envelopeCallerId, data, meta));

    if (isLambdaErrorPayload(result)) {
      throwFromLogsLambdaError(result, readSource);
    }

    const rows = result.data;
    if (!Array.isArray(rows)) {
      throw new ServiceError('logs lambda: invalid list response', 502, 'INVALID_LAMBDA_RESPONSE', {
        collectorSource: readSource,
      });
    }

    const logs = rows.map((row) =>
      mapRdsRowToCollector(row as Record<string, unknown>, audience),
    );

    const m = result.meta;
    const totalItems = m?.total_items ?? logs.length;
    const page = m?.page ?? query.page;
    const pageSize = m?.page_size ?? query.pageSize;
    const totalPages =
      m?.total_pages ?? (totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize));

    return {
      logs,
      totalItems,
      page,
      pageSize,
      totalPages,
    };
  }

  async resolveById(
    _audience: LogAudience,
    logId: string,
    _resolveTime: string,
    resolverId: string,
  ) {
    const writeSource = env.logsWriteLambdaFunctionName;

    logger.debug('Invoking logs write lambda: resolveLog', { resolverId, logId });

    const result = await LAMBDA_INVOKER.invokeJson<
      LambdaSuccessPayload<LambdaResolveLogSuccessData> | LambdaErrorResponse
    >(writeSource, wrapLambdaRequest('resolveLog', resolverId, { logId }));

    if (isLambdaErrorPayload(result)) {
      throwFromLogsLambdaError(result, writeSource);
    }

    return normalizeResolvePayload(result.data);
  }
}
