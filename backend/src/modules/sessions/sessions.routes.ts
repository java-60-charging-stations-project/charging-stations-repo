import { Router } from 'express';
import { verifyCognitoJwt, requireGroups, requireSupport } from '../../middlewares/auth';
import { ADMIN_GROUP, SUPPORT_GROUP } from '../../common/authRoles';
import { SessionsController } from './sessions.controller';
import { buildSessionsService } from './sessions.service';
import { buildUserSessionsService } from './users/userSessions.service';

export function sessionsRouter(): Router {
  const router = Router();
  const controller = new SessionsController(buildSessionsService(), buildUserSessionsService());

  // Register static paths before /:sessionId
  router.get('/all', verifyCognitoJwt, requireGroups([ADMIN_GROUP, SUPPORT_GROUP]), controller.listAll);
  router.get('/', verifyCognitoJwt, controller.listByUser);
  router.post('/', verifyCognitoJwt, controller.startSession);
  router.post('/:sessionId/stop', verifyCognitoJwt, controller.stopSession);
  router.get('/:sessionId', verifyCognitoJwt, controller.getById);

  // Require basic authentication for USER and SUPPORT
  router.use(['/user', '/support'], verifyCognitoJwt);
  // User sessions routes
  router.get('/user', controller.getUserSessions);
  router.get('/user/history', controller.getUserHistory);
  router.post('/user/booking', controller.createBooking);
  router.post('/user/charging', controller.startChargingSession);
  router.post('/user/booking/stop', controller.stopBooking);
  router.post('/user/charging/stop', controller.stopChargingSession);
  router.post('/user/manual-payment', controller.postManualPayment);

  //Require SUPPORT group for support routes
  router.use('/support', requireSupport);
  // Support routes 
  router.get('/support/user/:userId', controller.getSupportUserSessions);
  router.get('/support/station/:stationId', controller.getSupportStationSessions);
  router.get('/support/sessions-current', controller.getSupportCurrentSessions);

  return router;
};
