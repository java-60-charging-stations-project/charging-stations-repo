import type { Request, Response } from 'express';
import { z } from 'zod';
import { wrapResponse, wrapResponseList } from '../../common/wrappers';
import type { StationsService, StationStatus } from './stations.types';

const idSchema = z.string().min(1);

const createStationSchema = z.object({
  name: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  ports: z.number().int().positive()
});

const updateStatusSchema = z.object({
  status: z.enum(['NEW', 'READY', 'IN_USE', 'OUT_OF_SERVICE', 'TO_REMOVE'])
});

function canChangeStatus(
  current: StationStatus | undefined,
  next: StationStatus,
  groups: string[]
): boolean {
  const isAdmin = groups.includes('admin');
  const isSupport = groups.includes('support');

  if (!current) return false;

  // SUPPORT or ADMIN rules
  if (isSupport || isAdmin) {
    if (current === 'NEW' && next === 'READY') return true;
    if (current === 'IN_USE' && next === 'OUT_OF_SERVICE') return true;
    if (current === 'OUT_OF_SERVICE' && next === 'IN_USE') return true;
  }

  // Only ADMIN rules
  if (isAdmin) {
    if (current === 'READY' && next === 'IN_USE') return true;
    if (current === 'IN_USE' && next === 'TO_REMOVE') return true;
  }

  return false;
}

export class StationsController {
  constructor(private readonly service: StationsService) {}

  list = async (req: Request, res: Response) => {
    const callerId = req.user?.sub ?? '';
    const data = await this.service.list(callerId);

    const groups = req.user?.groups ?? [];
    const hasRole = groups.length > 0;

    const result = hasRole
      ? data
      : data.map((s) => ({
          stationId: s.stationId,
          name: s.name,
          lat: s.lat,
          lng: s.lng
        }));

    const totalItems = result.length;
    const pageSize = totalItems || 1;

    res.status(200).json(wrapResponseList(result, totalItems, pageSize));
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

    if (!canChangeStatus(station.status, nextStatus, groups)) {
      return res.status(403).json({
        code: 403,
        error: { message: 'Status change not allowed for this role or transition' }
      });
    }

    const updated = await this.service.updateStatus(stationId, nextStatus, callerId, groups);
    res.json({ code: 200, data: updated });
  };
}
