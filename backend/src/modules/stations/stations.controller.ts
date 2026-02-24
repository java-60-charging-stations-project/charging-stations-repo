import type { Request, Response } from 'express';
import { z } from 'zod';
import type { StationsService } from './stations.service';

const idSchema = z.string().min(1);

export class StationsController {
  constructor(private readonly service: StationsService) {}

  list = async (_req: Request, res: Response) => {
    const data = await this.service.list();
    res.json({ code: 200, data });
  };

  getById = async (req: Request, res: Response) => {
    const stationId = idSchema.parse(req.params.stationId);
    const data = await this.service.getById(stationId);
    if (!data) {
      return res.status(404).json({ code: 404, error: { message: 'Station not found' } });
    }
    res.json({ code: 200, data });
  };
}
