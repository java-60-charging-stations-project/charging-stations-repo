import type { Request, Response } from 'express';
import type { HealthService } from './health.service';

export class HealthController {
  constructor(private readonly service: HealthService) {}

  getHealth = async (_req: Request, res: Response) => {
    const deep = _req.query.deep === 'true';
    const result = await this.service.check(deep);
    res.status(result.code).json(result);
  };
}
