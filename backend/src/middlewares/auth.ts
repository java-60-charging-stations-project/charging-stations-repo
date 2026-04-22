import type { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { AuthRequestLogContext } from '../common/logContracts';
import { ForbiddenError, InternalServerError, ServiceError, UnauthorizedError } from '../common/serviceErrors';
import { env } from '../config/env';
import { createLogger } from '../utils/logger';
import { ADMIN_GROUP, SUPPORT_GROUP } from '../common/authRoles';

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

function buildAuthRequestLogContext(req: Request): AuthRequestLogContext {
  return {
    method: req.method,
    path: req.path,
    userId: req.user?.sub,
    userGroups: req.user?.groups ?? [],
    query: req.query,
    params: req.params,
    ip: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

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
  logger.info('Verifying Cognito JWT', buildAuthRequestLogContext(req));
  if (env.authDisabled) {
    logger.warn('Authentication is disabled, injecting local user');
    req.user = { sub: 'local-user', username: 'local', raw: {} };
    return next();
  }

  const token = getBearerToken(req);
  if (!token) {
    logger.warn('Missing Authorization Bearer token', buildAuthRequestLogContext(req));
    return next(new UnauthorizedError('Missing Authorization Bearer token', 'MISSING_AUTH_TOKEN'));
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
      logger.error('Invalid token: missing sub', buildAuthRequestLogContext(req));
      return next(new UnauthorizedError('Invalid token (missing sub)', 'INVALID_TOKEN_SUB'));
    }

    return next();
  } catch (e) {
    if (e instanceof ServiceError) {
      logger.error('JWT / auth configuration error', {
        ...buildAuthRequestLogContext(req),
        error: e.message,
      });
      return next(e);
    }
    const message = e instanceof Error ? e.message : 'Invalid token';
    logger.error('JWT verification failed', {
      ...buildAuthRequestLogContext(req),
      error: message,
    });
    const errCode = e instanceof UnauthorizedError ? e.errorCode : undefined;
    return next(new UnauthorizedError(message, errCode ?? 'INVALID_TOKEN'));
  }
}

export function requireGroups(allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (env.authDisabled) return next();
    const groups = req.user?.groups ?? [];
    const ok = allowed.some((g) => groups.includes(g));
    if (!ok) {
      logger.error('Access denied: insufficient role', {
        ...buildAuthRequestLogContext(req),
        originalUrl: req.originalUrl,
        requiredGroups: allowed,
      });
      return next(new ForbiddenError('Forbidden'));
    }
    next();
  };
};

export const requireSupport = requireGroups([SUPPORT_GROUP]);

export const requireAdmin = requireGroups([ADMIN_GROUP]);
