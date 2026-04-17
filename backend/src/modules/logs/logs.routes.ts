import { Router } from 'express';
import { requireAdmin, requireSupport, verifyCognitoJwt } from '../../middlewares/auth';
import { LogsController } from './logs.controller';
import { buildLogsService } from './logs.service';

export function logsRouter(): Router {
  const router = Router();
  const controller = new LogsController(buildLogsService());

  router.use(verifyCognitoJwt);

  router.get('/support', requireSupport, controller.getSupportLogs);
  router.get('/admin', requireAdmin, controller.getAdminLogs);

  router.post('/support/:log_id', requireSupport, controller.resolveSupportLog);
  router.post('/admin/:log_id', requireAdmin, controller.resolveAdminLog);

  return router;
}

