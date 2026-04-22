import { env } from './config/env';
import { createApp } from './app';
import { closeValkey } from './cache/valkeyClient';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`Backend server listening on port ${env.port}. Prefix: ${env.apiPrefix || '(none)'}`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function shutdown() {
    await closeValkey().catch(() => undefined);
    server.close(async () => {
        console.log("Server closed");
    });
}