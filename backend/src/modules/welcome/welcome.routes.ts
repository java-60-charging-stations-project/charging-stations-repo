import { Router, type Request, type Response, type NextFunction } from 'express';
import { wrapResponseList } from '../../common/wrappers';
import { buildStationsService } from '../stations/stations.service';

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

        const all = await service.list('');
        const filtered = all
          .filter((s) => s.state === 'Active')
          .filter((s) => (city ? s.city.toLowerCase().includes(city.toLowerCase()) : true))
          .filter((s) =>
            provider ? s.owner.toLowerCase().includes(provider.toLowerCase()) : true
          );

        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / pageSize) || 1;
        const start = (page - 1) * pageSize;
        const data = filtered.slice(start, start + pageSize);

        res.status(200).json(wrapResponseList(data, totalItems, pageSize, page, totalPages));
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}