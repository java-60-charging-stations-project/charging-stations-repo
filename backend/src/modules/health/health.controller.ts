import type { Request, Response } from 'express';
import type { HealthService } from './health.service';

export class HealthController {
  constructor(private readonly service: HealthService) {}

  getHealth = async (_req: Request, res: Response) => {
    const result = await this.service.check();
    res.status(result.code).json(result);
  };
}
