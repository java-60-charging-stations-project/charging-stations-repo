import type { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { InternalServerError, ServiceError, UnauthorizedError } from '../common/serviceErrors';
import { env } from '../config/env';
import { createLogger } from '../utils/logger';

const logger = createLogger('auth');

export interface AuthUser {
  sub: string;
  email?: string;
  username?: string;
  groups?: string[];
  raw: JWTPayload;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function getBearerToken(req: Request): string | null {
  const auth = req.header('authorization') ?? req.header('Authorization');
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (jwks) return jwks;
  if (!env.cognitoUserPoolId || !env.cognitoRegion) {
    throw new InternalServerError(
      'COGNITO_USER_POOL_ID / COGNITO_REGION are not configured',
      'AUTH_CONFIG_MISSING'
    );
  }
  const issuer = `https://cognito-idp.${env.cognitoRegion}.amazonaws.com/${env.cognitoUserPoolId}`;
  jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  return jwks;
}

export async function verifyCognitoJwt(req: Request, res: Response, next: NextFunction) {
  logger.info('Verifying Cognito JWT', { path: req.path, method: req.method });
  if (env.authDisabled) {
    logger.warn('Authentication is disabled, injecting local user');
    req.user = { sub: 'local-user', username: 'local', raw: {} };
    return next();
  }

  const token = getBearerToken(req);
  if (!token) {
    logger.warn('Missing Authorization Bearer token', {
      path: req.path,
      method: req.method
    });
    return res.status(401).json({ code: 401, error: { message: 'Missing Authorization Bearer token' } });
  }

  const issuer = `https://cognito-idp.${env.cognitoRegion}.amazonaws.com/${env.cognitoUserPoolId}`;

  try {
    const { payload } = await jwtVerify(token, getJwks(), { issuer });

    const tokenIssuer = typeof payload.iss === 'string' ? payload.iss : '';
    const expectedUserPoolId = env.cognitoUserPoolId;
    const tokenUserPoolId = tokenIssuer.split('/').pop();
    if (!tokenIssuer || !tokenUserPoolId || tokenUserPoolId !== expectedUserPoolId) {
      throw new UnauthorizedError('Token user pool does not match configured user pool', 'INVALID_USER_POOL');
    }

    if (payload.token_use !== 'access') {
      throw new UnauthorizedError('Invalid token_use, expected "access"', 'INVALID_TOKEN_USE');
    }
    if (env.cognitoClientId && payload.client_id !== env.cognitoClientId) {
      throw new UnauthorizedError('Invalid client_id', 'INVALID_CLIENT_ID');
    }

    const groups = Array.isArray(payload['cognito:groups'])
      ? (payload['cognito:groups'] as string[])
      : undefined;

    req.user = {
      sub: String(payload.sub ?? ''),
      email: payload.email ? String(payload.email) : undefined,
      username: payload['cognito:username'] ? String(payload['cognito:username']) : undefined,
      groups,
      raw: payload
    };

    if (!req.user.sub) {
      logger.error('Invalid token: missing sub', { path: req.path, method: req.method });
      return res.status(401).json({ code: 401, error: { message: 'Invalid token (missing sub)' } });
    }

    return next();
  } catch (e) {
    if (e instanceof ServiceError && e.statusCode >= 500) {
      logger.error('JWT / auth configuration error', { error: e.message });
      return res.status(e.statusCode).json({
        error: { code: e.errorCode, message: e.message },
      });
    }
    const message = e instanceof Error ? e.message : 'Invalid token';
    logger.error('JWT verification failed', {
      path: req.path,
      method: req.method,
      error: message
    });
    const errCode = e instanceof UnauthorizedError ? e.errorCode : undefined;
    return res.status(401).json({
      code: 401,
      error: {
        message,
        ...(errCode ? { code: errCode } : {}),
      },
    });
  }
}

export function requireGroups(allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (env.authDisabled) return next();
    const groups = req.user?.groups ?? [];
    const ok = allowed.some((g) => groups.includes(g));
    if (!ok) {
      logger.error('Access denied: insufficient role', {
        path: req.path,
        originalUrl: req.originalUrl,
        method: req.method,
        userId: req.user?.sub,
        userGroups: groups,
        requiredGroups: allowed,
        query: req.query,
        params: req.params,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      return res.status(403).json({ code: 403, error: { message: 'Forbidden' } });
    }
    next();
  };
}
