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

  return {
    page,
    pageSize,
    ...(dateFromIso ? { dateFrom: dateFromIso } : {}),
    ...(dateToIso ? { dateTo: dateToIso } : {}),
  };
}

export class LogsController {
  constructor(private readonly service: LogsService) {}

  getSupportLogs = async (req: Request, res: Response) => {
    const query = parseLogsListQuery(req);
    const result = await this.service.listByAudience('support', query);
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
    const result = await this.service.listByAudience('admin', query);
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
    const log = await this.service.resolveById('support', log_id, resolve_time, resolverId);
    res.status(200).json(wrapResponse({ log }));
  };

  resolveAdminLog = async (req: Request, res: Response) => {
    const { log_id } = logIdParamSchema.parse(req.params);
    const { resolve_time } = resolveBodySchema.parse(req.body);
    const resolverId = req.user?.sub ?? 'guest';
    const log = await this.service.resolveById('admin', log_id, resolve_time, resolverId);
    res.status(200).json(wrapResponse({ log }));
  };
}

