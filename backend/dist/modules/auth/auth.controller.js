"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const env_1 = require("../../config/env");
class AuthController {
    // Gateway does not implement login itself (Cognito does).
    // This endpoint helps frontend discover Cognito configuration.
    getCognitoConfig = async (_req, res) => {
        res.json({
            code: 200,
            data: {
                region: env_1.env.cognitoRegion,
                userPoolId: env_1.env.cognitoUserPoolId,
                clientId: env_1.env.cognitoClientId
            }
        });
    };
}
exports.AuthController = AuthController;
