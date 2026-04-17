import type { Request, Response } from 'express';
import { z } from 'zod';
import type {
  RequestLogContext,
  SessionAccessDeniedLogContext,
} from '../../common/logContracts';
import { wrapResponse, wrapResponseList } from '../../common/wrappers';
import type { SessionsService } from './sessions.service';
import { projectSession, resolveViewerRole, type ViewerRole } from './sessions.types';
import type { UserSessionsIService } from './users/userSessions.service.interface';
import { createLogger } from '../../utils/logger';
import { BadRequestError, ForbiddenError, ResourceNotFoundError } from '../../common/serviceErrors';

const sessionIdParam = z.string().min(1);
const userIdParam = z.string().min(1);
const stationIdParam = z.string().min(1);
const dateParam = z.string().datetime({ offset: true });
const pageParam = z.coerce.number().int().min(1).default(1);
const pageSizeParam = z.coerce.number().int().min(1).max(200).default(50);
const userSessionStateParam = z.enum(['BOOKED', 'ACTIVE', 'UNPAID']);

const logger = createLogger('SessionsController');

function buildRequestLogContext(req: Request): RequestLogContext {
  return {
    method: req.method,
    path: req.path,
    userId: req.user?.sub,
    query: req.query,
    params: req.params,
  };
}

function parseOptionalBooleanQueryParam(value: unknown, paramName: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new BadRequestError(`Query parameter ${paramName} must be a boolean`, 'INVALID_REQUEST');
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;

  throw new BadRequestError(
    `Query parameter ${paramName} must be one of: true, false, 1, 0`,
    'INVALID_REQUEST'
  );
}

function parseOptionalDateQueryParam(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return dateParam.parse(value.trim());
}

const startSessionSchema = z.object({
  stationId: z.string().min(1),
  portId: z.string().min(1),
});

const createBookingSchema = z.object({
  stationId: z.string().min(1),
  portCode: z.string().min(1),
  oldState: z.literal('FREE'),
});

const startChargingSessionSchema = z.object({
  stationId: z.string().min(1),
  portCode: z.string().min(1),
  oldState: z.enum(['FREE', 'BOOKED']),
});

const stopBookingSchema = z.object({
  stationId: z.string().min(1),
  portCode: z.string().min(1),
  oldState: z.literal('BOOKED'),
});

const stopChargingSchema = z.object({
  stationId: z.string().min(1),
  portCode: z.string().min(1),
  oldState: z.literal('OCCUPIED'),
});

const supportSessionsCurrentQuerySchema = z
  .object({
    userId: z.string().trim().min(1).optional(),
    stationId: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    const hasUserId = Boolean(value.userId);
    const hasStationId = Boolean(value.stationId);

    if (!hasUserId && !hasStationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['userId'],
        message: 'Either userId or stationId must be provided',
      });
      return;
    }

    if (hasUserId && hasStationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['userId'],
        message: 'Provide only one parameter: userId or stationId',
      });
    }
  });

const postManualPaymentSchema = z.object({
  stationId: z.string().trim().min(1),
  entityKey: z.string().trim().min(1),
});

export class SessionsController {
  constructor(
    private readonly service: SessionsService,
    private readonly userSessionsService: UserSessionsIService,
  ) { }
  // User Sessions routes
  getUserSessions = async (req: Request, res: Response) => {
    logger.info('Getting user sessions', buildRequestLogContext(req));
    const callerId = req.user!.sub!;
    const groups = req.user?.groups ?? [];
    const viewer = resolveViewerRole(groups);
    const queryUserId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
    const targetUserId = queryUserId || callerId;
    const latest = parseOptionalBooleanQueryParam(req.query.latest, 'latest');

    if (viewer === 'USER' && targetUserId !== callerId) {
      const meta: SessionAccessDeniedLogContext = {
        ...buildRequestLogContext(req),
        requesterUserId: callerId,
        requestedUserId: targetUserId,
        viewerRole: viewer,
        userGroups: groups,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      };
      logger.warn('Forbidden: user attempted to fetch sessions for another user', meta);
      throw new ForbiddenError('Forbidden: can only list your own sessions', 'FORBIDDEN');
    }

    const sessions = await this.userSessionsService.getUserSessions(targetUserId, latest);
    logger.info('User sessions fetched successfully', {
      ...buildRequestLogContext(req),
      requesterUserId: callerId,
      targetUserId,
      latest,
      count: sessions.length,
    });
    res.status(200).json(wrapResponse({ sessions }));
  };

  getUserHistory = async (req: Request, res: Response) => {
    const callerId = req.user!.sub!;
    const groups = req.user?.groups ?? [];
    const viewer = resolveViewerRole(groups);
    const queryUserId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
    const targetUserId = queryUserId || callerId;
    const dateFromIso = parseOptionalDateQueryParam(req.query.date_from);
    const dateToIso = parseOptionalDateQueryParam(req.query.date_to);
    const page = pageParam.parse(req.query.page);
    const pageSize = pageSizeParam.parse(req.query.pageSize);

    if (viewer === 'USER' && targetUserId !== callerId) {
      throw new ForbiddenError('Forbidden: can only list your own history', 'FORBIDDEN');
    }

    const dateFromMs = dateFromIso ? new Date(dateFromIso).getTime() : undefined;
    const dateToMs = dateToIso ? new Date(dateToIso).getTime() : undefined;
    if (dateFromMs !== undefined && dateToMs !== undefined && dateFromMs > dateToMs) {
      throw new BadRequestError('date_from must be less than or equal to date_to', 'INVALID_REQUEST');
    }

    const qSessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId.trim() : '';
    const qStationId = typeof req.query.stationId === 'string' ? req.query.stationId.trim() : '';
    const qStateRaw = typeof req.query.state === 'string' ? req.query.state.trim() : '';
    const qState = qStateRaw ? userSessionStateParam.parse(qStateRaw) : undefined;
    const qOrderBy = typeof req.query.orderBy === 'string' ? req.query.orderBy.trim() : '';

    const history = await this.userSessionsService.getUserHistory({
      userId: targetUserId,
      ...(qSessionId ? { sessionId: qSessionId } : {}),
      ...(qStationId ? { stationId: qStationId } : {}),
      ...(qState ? { state: qState } : {}),
      ...(qOrderBy ? { orderBy: qOrderBy } : {}),
      ...(dateFromIso ? { dateFrom: dateFromIso } : {}),
      ...(dateToIso ? { dateTo: dateToIso } : {}),
      page,
      pageSize,
    });

    res.status(200).json(wrapResponseList(
      history.sessions,
      history.totalItems,
      history.pageSize,
      history.page,
      history.totalPages
    ));
  };

  getSupportUserSessions = async (req: Request, res: Response) => {
    const userId = userIdParam.parse(req.params.userId);
    const sessions = await this.userSessionsService.getUserSessions(userId);
    res.status(200).json(wrapResponse({ sessions }));
  };

  getSupportStationSessions = async (req: Request, res: Response) => {
    const stationId = stationIdParam.parse(req.params.stationId);
    const sessions = await this.userSessionsService.getSessionsByStation(stationId);
    res.status(200).json(wrapResponse({ sessions }));
  };

  getSupportCurrentSessions = async (req: Request, res: Response) => {
    const query = supportSessionsCurrentQuerySchema.parse(req.query);
    const sessions = query.userId
      ? await this.userSessionsService.getUserSessions(query.userId, false)
      : await this.userSessionsService.getSessionsByStation(query.stationId!);
    res.status(200).json(wrapResponse({ sessions }));
  };

  createBooking = async (req: Request, res: Response) => {
    const userId = req.user!.sub!;
    const payload = createBookingSchema.parse(req.body);
    const data = await this.userSessionsService.createBooking(
      userId,
      payload.stationId,
      payload.portCode,
      payload.oldState,
    );

    res.status(200).json(wrapResponse(data));
  };

  startChargingSession = async (req: Request, res: Response) => {
    const userId = req.user!.sub!;
    const payload = startChargingSessionSchema.parse(req.body);
    const data = await this.userSessionsService.startChargingSession(
      userId,
      payload.stationId,
      payload.portCode,
      payload.oldState,
    );

    res.status(200).json(wrapResponse(data));
  };

  stopBooking = async (req: Request, res: Response) => {
    const userId = req.user!.sub!;
    const payload = stopBookingSchema.parse(req.body);
    const data = await this.userSessionsService.stopBooking(
      userId,
      payload.stationId,
      payload.portCode,
      payload.oldState,
    );
    res.status(200).json(wrapResponse(data));
  };

  stopChargingSession = async (req: Request, res: Response) => {
    const userId = req.user!.sub!;
    const payload = stopChargingSchema.parse(req.body);
    const data = await this.userSessionsService.stopChargingSession(
      userId,
      payload.stationId,
      payload.portCode,
      payload.oldState,
    );
    res.status(200).json(wrapResponse(data));
  };

  postManualPayment = async (req: Request, res: Response) => {
    const userId = req.user!.sub!;
    const {stationId, entityKey} = postManualPaymentSchema.parse(req.body);
    const serviceResponse = await this.userSessionsService.createManualPayment({
      userId, stationId, entityKey
    });

    res.status(200).json(wrapResponse(serviceResponse));
  };


  /**
   * GET /sessions/all — ADMIN or SUPPORT only; all sessions with role-shaped items.
   */
  listAll = async (req: Request, res: Response) => {
    const groups = req.user?.groups ?? [];
    const viewer = resolveViewerRole(groups);
    const rows = await this.service.listAll();
    const data = rows.map((r) => projectSession(r, viewer));
    res.status(200).json({ code: 200, data, meta: { count: data.length, role: viewer } });
  };

  /**
   * GET /sessions?userId= — list sessions for a user.
   * USER: only own userId (must equal `sub`). SUPPORT/ADMIN: any userId.
   */
  listByUser = async (req: Request, res: Response) => {
    const sub = req.user!.sub!;

    const q = req.query.userId;
    if (typeof q !== 'string' || !q.trim()) {
      return res.status(400).json({
        code: 400,
        error: { message: 'Query parameter userId is required (e.g. GET /sessions?userId=<id>)' }
      });
    }
    const userId = z.string().min(1).parse(q.trim());
    const groups = req.user?.groups ?? [];
    const viewer = resolveViewerRole(groups);

    if (viewer === 'USER' && userId !== sub) {
      const meta: SessionAccessDeniedLogContext = {
        ...buildRequestLogContext(req),
        requesterUserId: sub,
        requestedUserId: userId,
        viewerRole: viewer,
        userGroups: groups,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      };
      logger.warn('Forbidden: user attempted to list another user sessions', meta);
      return res.status(403).json({ code: 403, error: { message: 'Forbidden: can only list your own sessions' } });
    }

    const rows = await this.service.listByUserId(userId);
    const data = rows.map((r) => projectSession(r, viewer));
    res.status(200).json({ code: 200, data, meta: { count: data.length, role: viewer } });
  };
  /**
   * GET /sessions/:sessionId — one session; USER only if owner; SUPPORT/ADMIN any.
   */
  getById = async (req: Request, res: Response) => {
    const sub = req.user!.sub!;

    const sessionId = sessionIdParam.parse(req.params.sessionId);
    const groups = req.user?.groups ?? [];
    const viewer: ViewerRole = resolveViewerRole(groups);

    const row = await this.service.getById(sessionId);
    if (!row) throw new ResourceNotFoundError('Session not found', 'SESSION_NOT_FOUND');

    if (viewer === 'USER' && row.userId !== sub) {
      throw new ForbiddenError('Forbidden', 'FORBIDDEN');
    }

    const data = projectSession(row, viewer);
    res.status(200).json({ code: 200, data, meta: { role: viewer } });
  };

  startSession = async (req: Request, res: Response) => {
    const sub = req.user!.sub!;

    const payload = startSessionSchema.parse(req.body);
    const session = await this.service.startSession(sub, payload.stationId, payload.portId);
    res.status(201).json({ code: 201, data: session });
  };

  stopSession = async (req: Request, res: Response) => {
    const sub = req.user!.sub!;

    const sessionId = sessionIdParam.parse(req.params.sessionId);
    const session = await this.service.stopSession(sub, sessionId);
    res.status(200).json({ code: 200, data: session });
  };
}
