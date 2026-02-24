import 'express-async-errors';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';

import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import { healthRouter } from './modules/health/health.routes';
import { stationsRouter } from './modules/stations/stations.routes';
import { bookingsRouter } from './modules/bookings/bookings.routes';
import { usersRouter } from './modules/users/users.routes';
import { authRouter } from './modules/auth/auth.routes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(morgan('dev'));
  app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin }));
  app.use(express.json({ limit: '1mb' }));

  // Health is available without prefix, because current frontend calls /health
  app.use('/', healthRouter());

  const api = express.Router();
  api.use(healthRouter());
  api.use(authRouter());
  api.use(usersRouter());
  api.use(stationsRouter());
  api.use(bookingsRouter());

  // Optional prefix (e.g. /api/v1)
  if (env.apiPrefix) {
    app.use(env.apiPrefix, api);
  } else {
    app.use('/', api);
  }

  // Not found
  app.use(( _req: import("express").Request, res: import("express").Response) => {
    res.status(404).json({ code: 404, error: { message: 'Not Found' } });
  });

  app.use(errorHandler);

  return app;
}
