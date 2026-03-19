import type { Request, Response } from 'express';
import { z } from 'zod';
import { wrapResponse, wrapResponseList } from '../../common/wrappers';
import { ADMIN_GROUP, SUPPORT_GROUP } from '../../common/authRoles';
import type { StationsService, StationState } from './stations.types';

const idSchema = z.string().min(1);

const ratePlanSchema = z.object({
  currencyCode: z.string().min(1),
  currencyName: z.string().min(1),
  peakRate: z.number(),
  offPeakRate: z.number()
});

const createStationSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  owner: z.string().min(1),
  city: z.string().min(1),
  address: z.string().min(1),
  ratePlan: ratePlanSchema,
  siteTechnician: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable()
});

const updateStatusSchema = z.object({
  status: z.enum(['INACTIVE', 'ACTIVE', 'OUT_OF_SERVICE'])
});

const updateStationStateSchema = z.object({
  oldState: z.enum(['INACTIVE', 'ACTIVE', 'OUT_OF_SERVICE']),
  newState: z.enum(['INACTIVE', 'ACTIVE', 'OUT_OF_SERVICE']),
  updatedAt: z.string().min(1),
});

function canChangeStatus(
  current: StationState | undefined,
  next: StationState,
  groups: string[]
): boolean {
  const isAdmin = groups.includes(ADMIN_GROUP);
  const isSupport = groups.includes(SUPPORT_GROUP);

  if (!current) return false;

  return true;
}

export class StationsController {
  constructor(private readonly service: StationsService) {}

  list = async (req: Request, res: Response) => {
    const callerId = req.user?.sub ?? '';
    const data = await this.service.list(callerId);

    const totalItems = data.length;
    const pageSize = totalItems || 1;

    res.status(200).json(wrapResponseList(data, totalItems, pageSize));
  };

  getById = async (req: Request, res: Response) => {
    const stationId = idSchema.parse(req.params.stationId);
    const callerId = req.user?.sub ?? '';
    const data = await this.service.getById(stationId, callerId);
    if (!data) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Station not found' } });
    }
    res.status(200).json(wrapResponse(data));
  };

  create = async (req: Request, res: Response) => {
    const payload = createStationSchema.parse(req.body);
    const callerId = req.user?.sub ?? '';
    const station = await this.service.create(payload, callerId);
    res.status(201).json({ code: 201, data: station });
  };

  updateStatus = async (req: Request, res: Response) => {
    const stationId = idSchema.parse(req.params.stationId);
    const { status: nextStatus } = updateStatusSchema.parse(req.body);

    const callerId = req.user?.sub ?? '';
    const station = await this.service.getById(stationId, callerId);
    if (!station) {
      return res.status(404).json({ code: 404, error: { message: 'Station not found' } });
    }

    const groups = req.user?.groups ?? [];

    const updated = await this.service.updateStatus(stationId, nextStatus, callerId, groups);
    res.json({ code: 200, data: updated });
  };

  updateStationState = async (req: Request, res: Response) => {
    const stationId = idSchema.parse(req.params.stationId);
    const { oldState, newState } = updateStationStateSchema.parse(req.body);

    const callerId = req.user?.sub ?? '';

    const result = await this.service.updateStationState(stationId, oldState, newState, callerId);
    res.json({ code: 200, data: result });
  };

  deleteStation = async (req: Request, res: Response) => {
    const stationId = idSchema.parse(req.params.stationId);
    const callerId = req.user?.sub ?? '';

    const result = await this.service.deleteStation(stationId, callerId);
    res.json({ code: 200, data: result });
  };
}
