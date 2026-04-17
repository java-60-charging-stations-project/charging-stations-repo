import type { Request, Response } from 'express';
import { z } from 'zod';
import { wrapResponse } from '../../common/wrappers';
import type { LogsService } from './logs.service';

const logIdParamSchema = z.object({ log_id: z.string().trim().min(1) });
const resolveBodySchema = z.object({
  resolve_time: z.string().datetime({ offset: true }),
});

export class LogsController {
  constructor(private readonly service: LogsService) {}

  getSupportLogs = async (_req: Request, res: Response) => {
    const logs = await this.service.listByAudience('support');
    res.status(200).json(wrapResponse({ logs }));
  };

  getAdminLogs = async (_req: Request, res: Response) => {
    const logs = await this.service.listByAudience('admin');
    res.status(200).json(wrapResponse({ logs }));
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

