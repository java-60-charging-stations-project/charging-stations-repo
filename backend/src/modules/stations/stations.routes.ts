import { Router } from 'express';
import { verifyCognitoJwt, requireGroups } from '../../middlewares/auth';
import { ADMIN_GROUP, SUPPORT_GROUP } from '../../common/authRoles';
import { StationsController } from './stations.controller';
import { buildStationsService } from './stations.service';

export function stationsRouter(): Router {
  const router = Router();
  const controller = new StationsController(buildStationsService());

  // Public endpoints can be without auth. If you want auth, keep verifyCognitoJwt.
  router.get('/stations', controller.list);

  router.use('/stations', verifyCognitoJwt);
  router.get('/stations/:stationId/ports', controller.getPorts);
  router.get('/stations/:stationId', controller.getById);

  /** Каталог для конечного пользователя (JWT; группы ADMIN/SUPPORT не требуются). Дублирует `/stations`. */
  router.use('/user', verifyCognitoJwt);
  router.get('/user/stations', controller.list);
  router.get('/user/stations/:stationId/ports', controller.getPorts);
  router.get('/user/stations/:stationId', controller.getById);

  // Support endpoints
  router.use('/support', verifyCognitoJwt, requireGroups([SUPPORT_GROUP]));
  router.get('/support/stations', controller.list);
  router.get('/support/stations/:stationId/ports', controller.getPorts);
  router.post('/support/stations/:stationId/ports', controller.addPorts);
  router.delete('/support/stations/:stationId/ports/:portId', controller.deletePort);
  router.get('/support/stations/:stationId', controller.getById);
  router.patch('/support/stations/:stationId/state', controller.updateStationState);
  router.patch('/support/stations/:stationId/ports', controller.updateStationPorts);

  // Admin endpoints
  router.use('/admin', verifyCognitoJwt, requireGroups([ADMIN_GROUP]));
  router.get('/admin/stations', controller.list);
  router.get('/admin/stations/:stationId/ports', controller.getPorts);
  router.patch('/admin/stations/:stationId/ports', controller.updateStationPorts);
  router.get('/admin/stations/:stationId', controller.getById);
  router.post('/admin/stations', controller.create);
  router.patch('/admin/stations/:stationId', controller.updateStation);
  router.patch('/admin/stations/:stationId/state', controller.updateStationState);
  router.delete('/admin/stations/:stationId', controller.deleteStation);

  return router;
}
