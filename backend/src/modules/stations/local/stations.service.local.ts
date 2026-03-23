import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BadRequestError, ConflictError, ResourceNotFoundError } from '../../../common/serviceErrors';
import { DEFAULT_PAGE_SIZE } from '../../../common/constants';
import type {
  AdminCreateStationRequest,
  AdminCreateStationResponse,
  AdminDeleteStationResponse,
  AdminUpdateStationStateResponse,
  StationBase,
  StationBaseCollectionResponse,
  StationState,
} from '../stations.types';
import type { ListStationsParams, StationsService } from '../stations.interface';

function loadStations(): StationBase[] {
  const filePath = join(__dirname, 'stations.json');
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as StationBase[];
  } catch {
    console.warn('[StationsServiceLocal] stations.json not found – run stations.rand.js to generate it');
    return [];
  }
}

const STATIONS: StationBase[] = loadStations();

export class StationsServiceLocal implements StationsService {
  async list(params: ListStationsParams, _callerId: string): Promise<StationBaseCollectionResponse> {
    let stations = [...STATIONS];

    if (params.city) {
      const prefix = params.city.toLowerCase();
      stations = stations.filter((s) => s.city.toLowerCase().startsWith(prefix));
    }
    if (params.owner) {
      const prefix = params.owner.toLowerCase();
      stations = stations.filter((s) => s.owner.toLowerCase().startsWith(prefix));
    }
    if (params.state) {
      stations = stations.filter((s) => s.state === params.state);
    }

    const tokens = params.orderBy
      ? params.orderBy.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    stations.sort((a, b) => {
      for (const token of tokens) {
        let cmp = 0;
        if (token === 'name+') cmp = a.name.localeCompare(b.name);
        else if (token === 'name-') cmp = b.name.localeCompare(a.name);
        else if (token === 'owner+') cmp = a.owner.localeCompare(b.owner);
        else if (token === 'owner-') cmp = b.owner.localeCompare(a.owner);
        if (cmp !== 0) return cmp;
      }
      return a.id.localeCompare(b.id);
    });

    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const totalItems = stations.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const start = (page - 1) * pageSize;
    const paged = stations.slice(start, start + pageSize);

    return { data: paged, meta: { page, pageSize, totalItems, totalPages } };
  }

  async getById(stationId: string, _callerId: string): Promise<StationBase> {
    const station = STATIONS.find((s) => s.id === stationId);
    if (!station) {
      throw new ResourceNotFoundError('Station not found');
    }
    return station;
  }

  async create(
    payload: AdminCreateStationRequest,
    _callerId: string
  ): Promise<AdminCreateStationResponse> {
    const nextId = `st-${String(STATIONS.length + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const newStation: StationBase = {
      id: nextId,
      code: payload.code,
      name: payload.name,
      owner: payload.owner,
      city: payload.city,
      address: payload.address,
      phone: payload.phone,
      email: payload.email,
      siteTechnician: payload.siteTechnician,
      maxPowerKw: 0,
      ports: 0,
      state: 'INACTIVE',
      ratePlan: payload.ratePlan,
      createdAt: now,
      updatedAt: now,
      location: payload.location,
    };

    STATIONS.push(newStation);
    return { stationId: nextId };
  }

  async updateStationState(
    stationId: string,
    oldState: StationState,
    newState: StationState,
    _callerId: string
  ): Promise<AdminUpdateStationStateResponse> {
    const station = STATIONS.find((s) => s.id === stationId);
    if (!station) {
      throw new ResourceNotFoundError('Station not found');
    }
    if (station.state !== oldState) {
      throw new ConflictError('Station state has changed; please refresh and try again');
    }
    if (oldState === newState) {
      throw new BadRequestError('Old state and new state are the same');
    }

    station.state = newState;
    station.updatedAt = new Date().toISOString();
    return { updatedAt: station.updatedAt };
  }

  async deleteStation(
    stationId: string,
    _callerId: string
  ): Promise<AdminDeleteStationResponse> {
    const stationIndex = STATIONS.findIndex((s) => s.id === stationId);
    if (stationIndex === -1) {
      throw new ResourceNotFoundError('Station not found');
    }
    const station = STATIONS[stationIndex];
    if (station.state !== 'INACTIVE') {
      throw new BadRequestError('Station cannot be deleted in state: ' + station.state);
    }
    STATIONS.splice(stationIndex, 1);

    return { deletedAt: new Date().toISOString() };
  }
}
