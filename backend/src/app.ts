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
import { sessionsRouter } from './modules/sessions/sessions.routes';
import { createLogger } from './utils/logger';

const logger = createLogger('App');

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
  api.use(sessionsRouter());

  if (env.apiPrefix) {
    app.use(env.apiPrefix, api);
  } else {
    app.use('/', api);
  }

  app.use((_req, res) => {
    logger.info('Not found route');
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Not Found',
      },
    });
  });

  app.use(errorHandler);

  return app;
}
