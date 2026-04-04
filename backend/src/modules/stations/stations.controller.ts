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
  state: z.enum(['INACTIVE', 'ACTIVE', 'OUT_OF_SERVICE', 'DELETED']).optional(),
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

/** POST /admin/stations — no port count; ports are added via separate APIs / Lambda. Unknown keys (e.g. `ports`) are rejected. */
const createStationSchema = z
  .object({
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
  })
  .strict();

const updateStatusSchema = z.object({
  status: z.enum(['INACTIVE', 'ACTIVE', 'OUT_OF_SERVICE'])
});

const updateStationStateSchema = z.object({
  oldState: z.enum(['INACTIVE', 'ACTIVE', 'OUT_OF_SERVICE']),
  newState: z.enum(['INACTIVE', 'ACTIVE', 'OUT_OF_SERVICE']),
  updatedAt: z.string().min(1),
});
const updateStationPortsSchema = z.object({
  deltaPorts: z.number().int().min(1)
});

const addPortsSchema = z.object({
  ports: z.array(z.object({ portCode: z.string().min(1) })).min(1),
});

const updateStationSchema = z
  .object({
    name: z.string().min(1).optional(),
    owner: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    address: z.string().min(1).optional(),
    ratePlan: ratePlanSchema.optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    siteTechnician: z.string().nullable().optional(),
    maxPowerKw: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    latitude: z.number().nullable().optional(),
  })
  .strict();
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
    const includePorts = req.query.includePorts === 'true';
    const callerId = req.user?.sub ?? '';
    const data = await this.service.getById(stationId, callerId, includePorts);
    if (!data) {
      return res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Station not found' } });
    }
    res.status(200).json(wrapResponse(data));
  };

  getPorts = async (req: Request, res: Response) => {
    const stationId = idSchema.parse(req.params.stationId);
    const callerId = req.user?.sub ?? '';
    const ports = await this.service.getPorts(stationId, callerId);
    res.status(200).json(wrapResponse({ ports }));
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

  updateStationPorts = async (req: Request, res: Response) => {
    const stationId = idSchema.parse(req.params.stationId);
    const { deltaPorts } = updateStationPortsSchema.parse(req.body);
    const callerId = req.user?.sub ?? '';

    const result = await this.service.updateStationPorts(stationId, deltaPorts, callerId);
    res.json({ code: 200, data: result });
  };

  updateStation = async (req: Request, res: Response) => {
    const stationId = idSchema.parse(req.params.stationId);
    const patch = updateStationSchema.parse(req.body);
    const callerId = req.user?.sub ?? '';

    const data = await this.service.updateStation(stationId, patch, callerId);
    res.status(200).json({ code: 200, data });
  };

  addPorts = async (req: Request, res: Response) => {
    const stationId = idSchema.parse(req.params.stationId);
    const payload = addPortsSchema.parse(req.body);
    const callerId = req.user?.sub ?? '';

    const ports = await this.service.addPorts(stationId, payload, callerId);
    res.status(201).json(wrapResponse({ ports }));
  };

  deletePort = async (req: Request, res: Response) => {
    const stationId = idSchema.parse(req.params.stationId);
    const portId = idSchema.parse(req.params.portId);
    const callerId = req.user?.sub ?? '';

    await this.service.deletePort(stationId, portId, callerId);
    res.status(204).send();
  };

  deleteStation = async (req: Request, res: Response) => {
    const stationId = idSchema.parse(req.params.stationId);
    const callerId = req.user?.sub ?? '';

    const result = await this.service.deleteStation(stationId, callerId);
    res.json({ code: 200, data: result });
  };
}
