import { env } from './config/env';
import { createApp } from './app';

const app = createApp();

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend server listening on port ${env.port}. Prefix: ${env.apiPrefix || '(none)'}`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function shutdown() {
    server.close(async () => {
        console.log("Server closed");
    });
}