import {
  isLambdaErrorPayload,
  type LambdaSuccessPayload,
  type LambdaListCollectorLogsData,
  type LambdaResolveCollectorLogData,
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

function throwFromLogsLambdaError(result: LambdaErrorResponse): never {
  const msg = result.error;
  const code = result.code ?? 'UNKNOWN';
  if (code === 'NOT_FOUND' || code === 'LOG_NOT_FOUND') {
    throw new ResourceNotFoundError(msg, code === 'LOG_NOT_FOUND' ? 'LOG_NOT_FOUND' : 'NOT_FOUND');
  }
  if (code === 'INVALID_REQUEST') {
    throw new BadRequestError(msg, code);
  }
  throw new ServiceError(`logs lambda: ${msg}`, 502, String(code));
}

/** Lambda success body for list — `data.logs` snake_case rows per API contract. */
interface LambdaListLogsSuccess {
  logs: CollectorLogRecord[];
}

interface LambdaListLogsMeta {
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class LogsServiceLambda implements LogsService {
  async listByAudience(audience: LogAudience, query: LogsListQuery): Promise<LogsListResult> {
    const callerId = query.callerId?.trim() || 'guest';
    const payload: LambdaListCollectorLogsData = {
      audience,
      page: query.page,
      pageSize: query.pageSize,
      ...(query.dateFrom ? { dateFrom: query.dateFrom } : {}),
      ...(query.dateTo ? { dateTo: query.dateTo } : {}),
    };

    logger.debug('Invoking logs lambda: listCollectorLogs', { callerId, payload });

    const result = await LAMBDA_INVOKER.invokeJson<
      LambdaSuccessPayload<LambdaListLogsSuccess, LambdaListLogsMeta> | LambdaErrorResponse
    >(env.logsLambdaFunctionName!, wrapLambdaRequest('listCollectorLogs', callerId, payload));

    if (isLambdaErrorPayload(result)) {
      throwFromLogsLambdaError(result);
    }

    const logs = result.data?.logs;
    if (!Array.isArray(logs)) {
      throw new ServiceError('logs lambda: invalid list response', 502, 'INVALID_LAMBDA_RESPONSE');
    }

    const meta = result.meta;
    const totalItems = meta?.totalItems ?? logs.length;
    const page = meta?.page ?? query.page;
    const pageSize = meta?.pageSize ?? query.pageSize;
    const totalPages =
      meta?.totalPages ??
      (totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize));

    return {
      logs,
      totalItems,
      page,
      pageSize,
      totalPages,
    };
  }

  async resolveById(
    audience: LogAudience,
    logId: string,
    resolveTime: string,
    resolverId: string
  ): Promise<CollectorLogRecord> {
    const payload: LambdaResolveCollectorLogData = {
      logId,
      resolveTime,
      resolverId,
      audience,
    };

    logger.debug('Invoking logs lambda: resolveCollectorLog', { resolverId, logId });

    const result = await LAMBDA_INVOKER.invokeJson<
      LambdaSuccessPayload<{ log: CollectorLogRecord }> | LambdaErrorResponse
    >(
      env.logsLambdaFunctionName!,
      wrapLambdaRequest('resolveCollectorLog', resolverId, payload),
    );

    if (isLambdaErrorPayload(result)) {
      throwFromLogsLambdaError(result);
    }

    const log = result.data?.log;
    if (!log || typeof log !== 'object') {
      throw new ServiceError('logs lambda: invalid resolve response', 502, 'INVALID_LAMBDA_RESPONSE');
    }

    return log;
  }
}
