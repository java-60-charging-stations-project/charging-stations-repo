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
    '/all',
    verifyCognitoJwt,
    requireGroups([ADMIN_GROUP, SUPPORT_GROUP]),
    controller.listAll
  );

  // User sessions routes
  router.get('/user', verifyCognitoJwt, controller.getUserSessions);
  router.post('/user/booking', verifyCognitoJwt, controller.createBooking);
  router.post('/user/charging', verifyCognitoJwt, controller.startChargingSession);
  router.post('/user/booking/stop', verifyCognitoJwt, controller.stopBooking);
  router.post('/user/charging/stop', verifyCognitoJwt, controller.stopChargingSession);

  router.get('/', verifyCognitoJwt, controller.listByUser);
  router.post('/', verifyCognitoJwt, controller.startSession);
  router.post('/:sessionId/stop', verifyCognitoJwt, controller.stopSession);

  router.get('/:sessionId', verifyCognitoJwt, controller.getById);

  return router;
}
