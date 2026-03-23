import type { Request, Response } from 'express';
import { z } from 'zod';
import { wrapResponse } from '../../common/wrappers';
import { ADMIN_GROUP, SUPPORT_GROUP } from '../../common/authRoles';
import type { StationState } from './stations.types';
import type { StationsService } from './stations.interface';

const idSchema = z.string().min(1);

const listQuerySchema = z.object({
  city: z.string().optional(),
  owner: z.string().optional(),
  state: z.enum(['INACTIVE', 'ACTIVE', 'OUT_OF_SERVICE']).optional(),
  orderBy: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(200),
});

const ratePlanSchema = z.object({
  currencyCode: z.string().min(1),
  currencyName: z.string().min(1),
  peakRate: z.number(),
  offPeakRate: z.number()
});

const locationSchema = z.object({
  latitude: z.number(),
  longitude: z.number()
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
  email: z.string().nullable(),
  location: locationSchema,
  maxPowerKw: z.number()
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
    const params = listQuerySchema.parse(req.query);
    const callerId = req.user?.sub ?? '';
    const result = await this.service.list(params, callerId);
    res.status(200).json(result);
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
