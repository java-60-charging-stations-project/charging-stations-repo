"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCognitoJwt = verifyCognitoJwt;
exports.requireGroups = requireGroups;
const jose_1 = require("jose");
const env_1 = require("../config/env");
function getBearerToken(req) {
    const auth = req.header('authorization') ?? req.header('Authorization');
    if (!auth)
        return null;
    const m = auth.match(/^Bearer\s+(.+)$/i);
    return m ? m[1] : null;
}
let jwks = null;
function getJwks() {
    if (jwks)
        return jwks;
    if (!env_1.env.cognitoUserPoolId || !env_1.env.cognitoRegion) {
        throw new Error('COGNITO_USER_POOL_ID / COGNITO_REGION are not configured');
    }
    const issuer = `https://cognito-idp.${env_1.env.cognitoRegion}.amazonaws.com/${env_1.env.cognitoUserPoolId}`;
    jwks = (0, jose_1.createRemoteJWKSet)(new URL(`${issuer}/.well-known/jwks.json`));
    return jwks;
}
async function verifyCognitoJwt(req, res, next) {
    if (env_1.env.authDisabled) {
        req.user = { sub: 'local-user', username: 'local', raw: {} };
        return next();
    }
    const token = getBearerToken(req);
    if (!token) {
        return res.status(401).json({ code: 401, error: { message: 'Missing Authorization Bearer token' } });
    }
    const issuer = `https://cognito-idp.${env_1.env.cognitoRegion}.amazonaws.com/${env_1.env.cognitoUserPoolId}`;
    try {
        const { payload } = await (0, jose_1.jwtVerify)(token, getJwks(), {
            issuer,
            audience: env_1.env.cognitoClientId || undefined
        });
        const groups = Array.isArray(payload['cognito:groups'])
            ? payload['cognito:groups']
            : undefined;
        req.user = {
            sub: String(payload.sub ?? ''),
            email: payload.email ? String(payload.email) : undefined,
            username: payload['cognito:username'] ? String(payload['cognito:username']) : undefined,
            groups,
            raw: payload
        };
        if (!req.user.sub) {
            return res.status(401).json({ code: 401, error: { message: 'Invalid token (missing sub)' } });
        }
        return next();
    }
    catch (e) {
        const message = e instanceof Error ? e.message : 'Invalid token';
        return res.status(401).json({ code: 401, error: { message } });
    }
}
function requireGroups(allowed) {
    return (req, res, next) => {
        if (env_1.env.authDisabled)
            return next();
        const groups = req.user?.groups ?? [];
        const ok = allowed.some((g) => groups.includes(g));
        if (!ok) {
            return res.status(403).json({ code: 403, error: { message: 'Forbidden' } });
        }
        next();
    };
}
