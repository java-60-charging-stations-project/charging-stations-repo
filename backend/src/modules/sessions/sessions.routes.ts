import { Router } from 'express';
import { verifyCognitoJwt, requireGroups } from '../../middlewares/auth';
import { ADMIN_GROUP, SUPPORT_GROUP } from '../../common/authRoles';
import { SessionsController } from './sessions.controller';
import { buildSessionsService } from './sessions.service';
import { buildUserSessionsService } from './users/userSessions.service';

export function sessionsRouter(): Router {
  const router = Router();
  const controller = new SessionsController(buildSessionsService(), buildUserSessionsService());

  // Register static paths before /:sessionId
  router.get(
    '/sessions/all',
    verifyCognitoJwt,
    requireGroups([ADMIN_GROUP, SUPPORT_GROUP]),
    controller.listAll
  );

  // User sessions routes
  router.get('/sessions/user', verifyCognitoJwt, controller.getUserSessions);
  router.post('/sessions/user/booking', verifyCognitoJwt, controller.createBooking);
  router.post('/sessions/user/charging', verifyCognitoJwt, controller.startChargingSession);

  router.get('/sessions', verifyCognitoJwt, controller.listByUser);
  router.post('/sessions', verifyCognitoJwt, controller.startSession);
  router.post('/sessions/:sessionId/stop', verifyCognitoJwt, controller.stopSession);

  router.get('/sessions/:sessionId', verifyCognitoJwt, controller.getById);

  return router;
}
