import { Router } from 'express';
import { verifyCognitoJwt, requireGroups } from '../../middlewares/auth';
import { ADMIN_GROUP, SUPPORT_GROUP } from '../../common/authRoles';
import { StationsController } from './stations.controller';
import { buildStationsService } from './stations.service';

export function stationsRouter(): Router {
  const router = Router();
  const controller = new StationsController(buildStationsService());

  // Public endpoints can be without auth. If you want auth, keep verifyCognitoJwt.
  router.get('/stations', verifyCognitoJwt, controller.list);
  router.get('/stations/:stationId', verifyCognitoJwt, controller.getById);
  
  // Support endpoints
  router.get('/support/stations', verifyCognitoJwt, requireGroups([SUPPORT_GROUP]), controller.list);
  router.get('/support/stations/:stationId', verifyCognitoJwt, requireGroups([SUPPORT_GROUP]), controller.getById);

  // Admin endpoints
  router.get('/admin/stations', verifyCognitoJwt, requireGroups([ADMIN_GROUP]), controller.list);
  router.get('/admin/stations/:stationId', verifyCognitoJwt, requireGroups([ADMIN_GROUP]), controller.getById);
  router.post('/admin/stations', verifyCognitoJwt, requireGroups([ADMIN_GROUP]), controller.create);
  router.patch('/admin/stations/:stationId/status', verifyCognitoJwt, requireGroups([ADMIN_GROUP]), controller.updateStatus);
  router.patch('/admin/stations/:stationId/state', verifyCognitoJwt, requireGroups([ADMIN_GROUP]), controller.updateStationState);

  return router;
}
