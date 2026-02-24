import { Router } from 'express';
import { HealthController } from './health.controller';
import { buildHealthService } from './health.service';

export function healthRouter(): Router {
  const router = Router();
  const controller = new HealthController(buildHealthService());

  router.get('/health', controller.getHealth);
  return router;
}
