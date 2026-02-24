import { Router } from 'express';
import { verifyCognitoJwt } from '../../middlewares/auth';
import { StationsController } from './stations.controller';
import { buildStationsService } from './stations.service';

export function stationsRouter(): Router {
  const router = Router();
  const controller = new StationsController(buildStationsService());

  // Public endpoints can be without auth. If you want auth, keep verifyCognitoJwt.
  router.get('/stations', verifyCognitoJwt, controller.list);
  router.get('/stations/:stationId', verifyCognitoJwt, controller.getById);

  return router;
}
