import type { Request, Response } from 'express';
import { z } from 'zod';
import { BadRequestError } from '../../common/serviceErrors';
import { wrapLogsCollectionResponse, wrapResponse } from '../../common/wrappers';
import type { LogsService } from './logs.service';

const logIdParamSchema = z.object({ log_id: z.string().trim().min(1) });
const resolveBodySchema = z.object({
  resolve_time: z.string().datetime({ offset: true }),
});

const dateParam = z.string().datetime({ offset: true });
const pageParam = z.coerce.number().int().min(1).default(1);
const pageSizeParam = z.coerce.number().int().min(1).max(200).default(50);

function parseOptionalDateQueryParam(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return dateParam.parse(value.trim());
}

function parseOptionalTrimmed(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = typeof value === 'string' ? value.trim() : String(value).trim();
  return s === '' ? undefined : s;
}

function parseOptionalResolved(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const s = String(value).toLowerCase();
  if (s === 'true') return true;
  if (s === 'false') return false;
  throw new BadRequestError('resolved must be true or false', 'INVALID_REQUEST');
}

function parseLogsListQuery(req: Request) {
  const dateFromIso = parseOptionalDateQueryParam(req.query.date_from);
  const dateToIso = parseOptionalDateQueryParam(req.query.date_to);
  const page = pageParam.parse(req.query.page);
  const pageSize = pageSizeParam.parse(req.query.pageSize);

  const dateFromMs = dateFromIso ? new Date(dateFromIso).getTime() : undefined;
  const dateToMs = dateToIso ? new Date(dateToIso).getTime() : undefined;
  if (dateFromMs !== undefined && dateToMs !== undefined && dateFromMs > dateToMs) {
    throw new BadRequestError('date_from must be less than or equal to date_to', 'INVALID_REQUEST');
  }

  const filterCallerId = parseOptionalTrimmed(req.query.caller_id);
  const level = parseOptionalTrimmed(req.query.level);
  const service = parseOptionalTrimmed(req.query.service);
  const event = parseOptionalTrimmed(req.query.event);
  const resolved = parseOptionalResolved(req.query.resolved);
  const orderBy = parseOptionalTrimmed(req.query.order_by);

  return {
    page,
    pageSize,
    ...(dateFromIso ? { dateFrom: dateFromIso } : {}),
    ...(dateToIso ? { dateTo: dateToIso } : {}),
    ...(filterCallerId ? { filterCallerId } : {}),
    ...(level ? { level } : {}),
    ...(service ? { service } : {}),
    ...(event ? { event } : {}),
    ...(resolved !== undefined ? { resolved } : {}),
    ...(orderBy ? { orderBy } : {}),
  };
}

export class LogsController {
  constructor(private readonly service: LogsService) {}

  getSupportLogs = async (req: Request, res: Response) => {
    const query = parseLogsListQuery(req);
    const callerId = req.user?.sub ?? 'guest';
    const result = await this.service.listByAudience('support', { ...query, callerId });
    res.status(200).json(
      wrapLogsCollectionResponse(
        result.logs,
        result.totalItems,
        result.pageSize,
        result.page,
        result.totalPages,
      ),
    );
  };

  getAdminLogs = async (req: Request, res: Response) => {
    const query = parseLogsListQuery(req);
    const callerId = req.user?.sub ?? 'guest';
    const result = await this.service.listByAudience('admin', { ...query, callerId });
    res.status(200).json(
      wrapLogsCollectionResponse(
        result.logs,
        result.totalItems,
        result.pageSize,
        result.page,
        result.totalPages,
      ),
    );
  };

  resolveSupportLog = async (req: Request, res: Response) => {
    const { log_id } = logIdParamSchema.parse(req.params);
    const { resolve_time } = resolveBodySchema.parse(req.body);
    const resolverId = req.user?.sub ?? 'guest';
    const payload = await this.service.resolveById('support', log_id, resolve_time, resolverId);
    res.status(200).json(wrapResponse(payload));
  };

  resolveAdminLog = async (req: Request, res: Response) => {
    const { log_id } = logIdParamSchema.parse(req.params);
    const { resolve_time } = resolveBodySchema.parse(req.body);
    const resolverId = req.user?.sub ?? 'guest';
    const payload = await this.service.resolveById('admin', log_id, resolve_time, resolverId);
    res.status(200).json(wrapResponse(payload));
  };
}
