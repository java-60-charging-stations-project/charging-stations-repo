"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./config/env");
const app_1 = require("./app");
const app = (0, app_1.createApp)();
app.listen(env_1.env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend server listening on port ${env_1.env.port}. Prefix: ${env_1.env.apiPrefix || '(none)'}`);
});
