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
  router.get('/stations/:stationId/ports', verifyCognitoJwt, controller.getPorts);
  router.get('/stations/:stationId', verifyCognitoJwt, controller.getById);

  /** Каталог для конечного пользователя (JWT; группы ADMIN/SUPPORT не требуются). Дублирует `/stations`. */
  router.get('/user/stations', verifyCognitoJwt, controller.list);
  router.get('/user/stations/:stationId/ports', verifyCognitoJwt, controller.getPorts);
  router.get('/user/stations/:stationId', verifyCognitoJwt, controller.getById);

  // Support endpoints
  router.get('/support/stations', verifyCognitoJwt, requireGroups([SUPPORT_GROUP]), controller.list);
  router.get('/support/stations/:stationId/ports', verifyCognitoJwt, requireGroups([SUPPORT_GROUP]), controller.getPorts);
  router.get('/support/stations/:stationId', verifyCognitoJwt, requireGroups([SUPPORT_GROUP]), controller.getById);
  router.patch('/support/stations/:stationId/state', verifyCognitoJwt, requireGroups([SUPPORT_GROUP]), controller.updateStationState);
  router.patch('/support/stations/:stationId/ports', verifyCognitoJwt, requireGroups([SUPPORT_GROUP]), controller.updateStationPorts);

  // Admin endpoints
  router.get('/admin/stations', verifyCognitoJwt, requireGroups([ADMIN_GROUP]), controller.list);
  router.get('/admin/stations/:stationId/ports', verifyCognitoJwt, requireGroups([ADMIN_GROUP]), controller.getPorts);
  router.patch('/admin/stations/:stationId/ports', verifyCognitoJwt, requireGroups([ADMIN_GROUP]), controller.updateStationPorts);
  router.get('/admin/stations/:stationId', verifyCognitoJwt, requireGroups([ADMIN_GROUP]), controller.getById);
  router.post('/admin/stations', verifyCognitoJwt, requireGroups([ADMIN_GROUP]), controller.create);
  router.patch('/admin/stations/:stationId/state', verifyCognitoJwt, requireGroups([ADMIN_GROUP]), controller.updateStationState);
  router.delete('/admin/stations/:stationId', verifyCognitoJwt, requireGroups([ADMIN_GROUP]), controller.deleteStation);

  return router;
}
