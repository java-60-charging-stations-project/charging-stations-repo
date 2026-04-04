import type { Request, Response } from 'express';
import { z } from 'zod';
import { wrapResponse } from '../../common/wrappers';
import type { SessionsService } from './sessions.service';
import { projectSession, resolveViewerRole, type ViewerRole } from './sessions.types';
import type { UserSessionsIService } from './users/userSessions.service.interface';
import { createLogger } from '../../utils/logger';
import { ForbiddenError, ResourceNotFoundError } from '../../common/serviceErrors';

const sessionIdParam = z.string().min(1);

const logger = createLogger('SessionsController');

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

export class SessionsController {
  constructor(
    private readonly service: SessionsService,
    private readonly userSessionsService: UserSessionsIService,
  ) {}
  // User Sessions routes
  getUserSessions = async (req: Request, res: Response) => {
    logger.info('Getting user sessions');
    const callerId = req.user!.sub!;
    const sessions = await this.userSessionsService.getUserSessions(callerId);
    logger.info('User sessions fetched successfully', { sessions });
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
