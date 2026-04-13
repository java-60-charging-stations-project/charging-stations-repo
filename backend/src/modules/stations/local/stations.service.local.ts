import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BadRequestError, ConflictError, ResourceNotFoundError } from '../../../common/serviceErrors';
import { DEFAULT_PAGE_SIZE } from '../../../common/constants';
import { randomUUID } from 'node:crypto';
import type {
  AddPortsRequest,
  AdminCreateStationRequest,
  AdminCreateStationResponse,
  AdminDeleteStationResponse,
  AdminUpdateStationRequest,
  AdminUpdateStationResponse,
  AdminUpdateStationStateResponse,
  AdminUpdateStationPortsResponse,
  ApiPort,
  SupportUpdatePortStateRequest,
  SupportUpdatePortStateResponse,
  StationBase,
  StationBaseCollectionResponse,
  StationLifecycleState,
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

export function findStationById(stationId: string): StationBase | undefined {
  return STATIONS.find((s) => s.id === stationId);
}

export function updateStationStateLocal(stationId: string, newState: StationLifecycleState): StationBase {
  const station = findStationById(stationId);
  if (!station) throw new ResourceNotFoundError('Station not found');
  station.state = newState;
  station.updatedAt = new Date().toISOString();
  return station;
}

export function updateStationPortsLocal(stationId: string, deltaPorts: number): StationBase {
  const station = findStationById(stationId);
  if (!station) throw new ResourceNotFoundError('Station not found');
  if (deltaPorts <= 0) {
    throw new BadRequestError('deltaPorts must be positive');
  }
  station.portsCount += deltaPorts;
  station.occupiedPorts = station.occupiedPorts ?? 0;
  station.updatedAt = new Date().toISOString();
  return station;
}

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
    const paged = stations.slice(start, start + pageSize).map(({ ports: _ports, ...s }) => ({
      ...s,
      hasFreePorts: (s.portsCount - (s.occupiedPorts ?? 0)) > 0,
    }));

    return { data: paged, meta: { page, pageSize, totalItems, totalPages } };
  }

  async getById(stationId: string, _callerId: string, includePorts?: boolean): Promise<StationBase> {
    const station = STATIONS.find((s) => s.id === stationId);
    if (!station) {
      throw new ResourceNotFoundError('Station not found');
    }
    const { ports: storedPorts, ...rest } = station;
    const result: StationBase = {
      ...rest,
      hasFreePorts: (rest.portsCount - (rest.occupiedPorts ?? 0)) > 0,
    };
    if (includePorts) {
      result.ports = storedPorts ?? [];
    }
    return result;
  }

  async getPorts(stationId: string, _callerId: string): Promise<ApiPort[]> {
    const station = STATIONS.find((s) => s.id === stationId);
    if (!station) {
      throw new ResourceNotFoundError('Station not found');
    }
    return station.ports ?? [];
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
      portsCount: 0,
      occupiedPorts: 0,
      blockedUntil: null,
      state: 'INACTIVE',
      ratePlan: payload.ratePlan,
      createdAt: now,
      updatedAt: now,
      location: payload.location,
      ports: [],
    };

    STATIONS.push(newStation);
    return { stationId: nextId };
  }

  async updateStationState(
    stationId: string,
    oldState: StationLifecycleState,
    newState: StationLifecycleState,
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

  async updateStationPorts(
    stationId: string,
    deltaPorts: number,
    _callerId: string
  ): Promise<AdminUpdateStationPortsResponse> {
    if (deltaPorts <= 0) {
      throw new BadRequestError('deltaPorts must be positive');
    }
    const station = STATIONS.find((s) => s.id === stationId);
    if (!station) {
      throw new ResourceNotFoundError('Station not found');
    }

    station.portsCount = (station.portsCount ?? 0) + deltaPorts;
    station.occupiedPorts = station.occupiedPorts ?? 0;
    station.updatedAt = new Date().toISOString();

    return {
      updatedAt: station.updatedAt,
      portsCount: station.portsCount,
      occupiedPorts: station.occupiedPorts,
    };
  }

  async updatePortState(
    stationId: string,
    payload: SupportUpdatePortStateRequest,
    _callerId: string
  ): Promise<SupportUpdatePortStateResponse> {
    if (
      payload.newState === 'FREE' &&
      (payload.oldState === 'BOOKED' || payload.oldState === 'OCCUPIED')
    ) {
      throw new BadRequestError('Invalid transition to FREE from BOOKED or OCCUPIED');
    }

    const station = STATIONS.find((s) => s.id === stationId);
    if (!station) {
      throw new ResourceNotFoundError('Station not found');
    }
    const ports = station.ports ?? [];
    const port = ports.find((p) => p.portCode === payload.portCode);
    if (!port) {
      throw new ResourceNotFoundError('Port not found');
    }
    if (port.status !== payload.oldState) {
      throw new ConflictError('Port state has changed; please refresh and try again');
    }
    if (payload.oldState === payload.newState) {
      throw new BadRequestError('Old state and new state are the same');
    }

    port.status = payload.newState;
    port.updatedAt = new Date().toISOString();
    station.updatedAt = port.updatedAt;

    return {
      stationId,
      entityKey: port.portId,
      newState: payload.newState,
      updatedAt: port.updatedAt,
    };
  }

  async updateStation(
    stationId: string,
    patch: AdminUpdateStationRequest,
    _callerId: string
  ): Promise<AdminUpdateStationResponse> {
    const station = STATIONS.find((s) => s.id === stationId);
    if (!station) {
      throw new ResourceNotFoundError('Station not found');
    }

    if (patch.name !== undefined) station.name = patch.name;
    if (patch.owner !== undefined) station.owner = patch.owner;
    if (patch.city !== undefined) station.city = patch.city;
    if (patch.address !== undefined) station.address = patch.address;
    if (patch.ratePlan !== undefined) station.ratePlan = patch.ratePlan;
    if (patch.email !== undefined) station.email = patch.email;
    if (patch.phone !== undefined) station.phone = patch.phone;
    if (patch.siteTechnician !== undefined) station.siteTechnician = patch.siteTechnician;
    if (patch.maxPowerKw !== undefined) station.maxPowerKw = patch.maxPowerKw;

    const nextLocation = patch.location
      ? patch.location
      : (patch.longitude !== undefined || patch.latitude !== undefined)
        ? {
          latitude: patch.latitude ?? (station.location?.latitude ?? 0),
          longitude: patch.longitude ?? (station.location?.longitude ?? 0),
        }
        : undefined;

    if (nextLocation) {
      station.location = nextLocation;
    }

    station.updatedAt = new Date().toISOString();
    return { stationId };
  }

  async addPorts(stationId: string, payload: AddPortsRequest, _callerId: string): Promise<ApiPort[]> {
    const station = STATIONS.find((s) => s.id === stationId);
    if (!station) {
      throw new ResourceNotFoundError('Station not found');
    }

    if (station.state !== 'INACTIVE' && station.state !== 'OUT_OF_SERVICE') {
      throw new ConflictError(`Cannot add ports while station is in ${station.state} state`);
    }

    const existingCodes = new Set((station.ports ?? []).map((p) => p.portCode));
    for (const item of payload.ports) {
      if (existingCodes.has(item.portCode)) {
        throw new ConflictError(`Port code ${item.portCode} already exists on this station`);
      }
    }

    const now = new Date().toISOString();
    const created: ApiPort[] = payload.ports.map((item) => ({
      portId: randomUUID(),
      portCode: item.portCode,
      status: 'DISABLED',
      lastMeterKw: 0,
      createdAt: now,
      updatedAt: now,
    }));

    station.ports = [...(station.ports ?? []), ...created];
    station.portsCount = station.ports.length;
    station.updatedAt = now;

    return created;
  }

  async deletePort(stationId: string, portId: string, _callerId: string): Promise<void> {
    const station = STATIONS.find((s) => s.id === stationId);
    if (!station) {
      throw new ResourceNotFoundError('Station not found');
    }

    if (station.state !== 'INACTIVE' && station.state !== 'OUT_OF_SERVICE') {
      throw new ConflictError(`Cannot delete port while station is in ${station.state} state`);
    }

    const ports = station.ports ?? [];
    const idx = ports.findIndex((p) => p.portId === portId);
    if (idx === -1) {
      throw new ResourceNotFoundError('Port not found');
    }

    ports.splice(idx, 1);
    station.ports = ports;
    station.portsCount = ports.length;
    station.updatedAt = new Date().toISOString();
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
