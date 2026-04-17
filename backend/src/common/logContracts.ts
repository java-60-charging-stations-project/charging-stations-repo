import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

export interface RequestLogContext {
  method: string;
  path: string;
  userId?: string;
  query: ParsedQs;
  params: ParamsDictionary;
}

export interface AuthRequestLogContext extends RequestLogContext {
  userGroups?: string[];
  ip?: string;
  userAgent?: string;
}

export interface ForbiddenLogContext extends RequestLogContext {
  errorCode: string;
  message: string;
  userGroups: string[];
  ip?: string;
  userAgent?: string;
}

export interface ServiceErrorLogContext extends RequestLogContext {
  errorCode: string;
  statusCode: number;
  message: string;
}

export interface ValidationErrorLogContext extends RequestLogContext {
  message: string;
}

export interface UnhandledErrorLogContext extends RequestLogContext {
  message: string;
  stack?: string;
}

export interface LambdaInvokeLogContext {
  functionName: string;
  action?: string;
  callerId?: string;
}

export interface LambdaResultLogContext extends LambdaInvokeLogContext {
  payloadSize?: number;
  functionError?: string;
}

export interface SessionAccessDeniedLogContext extends RequestLogContext {
  requesterUserId: string;
  requestedUserId: string;
  viewerRole: 'USER' | 'SUPPORT' | 'ADMIN';
  userGroups: string[];
  ip?: string;
  userAgent?: string;
}
