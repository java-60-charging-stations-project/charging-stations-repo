import { Router } from 'express';
import { verifyCognitoJwt, requireGroups } from '../../middlewares/auth';
import { ADMIN_GROUP, SUPPORT_GROUP } from '../../common/authRoles';
import { SessionsController } from './sessions.controller';
import { buildSessionsService } from './sessions.service';

export function sessionsRouter(): Router {
  const router = Router();
  const controller = new SessionsController(buildSessionsService());

  // Register static paths before /:sessionId
  router.get(
    '/sessions/all',
    verifyCognitoJwt,
    requireGroups([ADMIN_GROUP, SUPPORT_GROUP]),
    controller.listAll
  );

  router.get('/sessions', verifyCognitoJwt, controller.listByUser);

  router.get('/sessions/:sessionId', verifyCognitoJwt, controller.getById);

  return router;
}
