import { env } from './config/env';
import { createApp } from './app';

const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend server listening on port ${env.port}. Prefix: ${env.apiPrefix || '(none)'}`);
});
