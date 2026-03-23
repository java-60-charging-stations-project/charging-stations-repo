import { Router, type Request, type Response, type NextFunction } from 'express';
import { wrapResponseList } from '../../common/wrappers';
import { buildStationsService } from '../stations/stations.service';
import { DEFAULT_PAGE_SIZE } from '../../common/constants';

export function welcomeRouter(): Router {
  const router = Router();
  const service = buildStationsService();

  router.get(
    '/welcome',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const city = typeof req.query.city === 'string' ? req.query.city : undefined;
        const provider = typeof req.query.provider === 'string' ? req.query.provider : undefined;
        const page = Math.max(1, Number(req.query.page) || 1);
        const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 200));

        const stations = await service.list({
          state: 'ACTIVE',
          page: 1,
          pageSize: DEFAULT_PAGE_SIZE,
        }, 'GUEST_USER');



        res.status(200).json(stations);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}