import type { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { env } from '../config/env';

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
    throw new Error('COGNITO_USER_POOL_ID / COGNITO_REGION are not configured');
  }
  const issuer = `https://cognito-idp.${env.cognitoRegion}.amazonaws.com/${env.cognitoUserPoolId}`;
  jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  return jwks;
}

export async function verifyCognitoJwt(req: Request, res: Response, next: NextFunction) {
  if (env.authDisabled) {
    req.user = { sub: 'local-user', username: 'local', raw: {} };
    return next();
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ code: 401, error: { message: 'Missing Authorization Bearer token' } });
  }

  const issuer = `https://cognito-idp.${env.cognitoRegion}.amazonaws.com/${env.cognitoUserPoolId}`;

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer,
      audience: env.cognitoClientId || undefined
    });

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
      return res.status(401).json({ code: 401, error: { message: 'Invalid token (missing sub)' } });
    }

    return next();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Invalid token';
    return res.status(401).json({ code: 401, error: { message } });
  }
}

export function requireGroups(allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (env.authDisabled) return next();
    const groups = req.user?.groups ?? [];
    const ok = allowed.some((g) => groups.includes(g));
    if (!ok) {
      return res.status(403).json({ code: 403, error: { message: 'Forbidden' } });
    }
    next();
  };
}
