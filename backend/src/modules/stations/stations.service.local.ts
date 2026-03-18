import type { StationDto, StationStatus, StationsService } from './stations.types';

const STATIONS: StationDto[] = [
  {
    stationId: 'st-001',
    name: 'Station 1',
    status: 'READY',
    lat: 50.12,
    lng: 30.45,
    ports: 4,
    freePorts: 2
  },
  {
    stationId: 'st-002',
    name: 'Station 2',
    status: 'IN_USE',
    lat: 50.13,
    lng: 30.46,
    ports: 2,
    freePorts: 0
  }
];

export class StationsServiceLocal implements StationsService {
  async list(_callerId: string): Promise<StationDto[]> {
    return STATIONS;
  }

  async getById(stationId: string, _callerId: string): Promise<StationDto | null> {
    return STATIONS.find((s) => s.stationId === stationId) ?? null;
  }

  async create(payload: Omit<StationDto, 'stationId' | 'status'>, _callerId: string): Promise<StationDto> {
    const station: StationDto = {
      stationId: `st-${String(STATIONS.length + 1).padStart(3, '0')}`,
      status: 'READY',
      ...payload
    };
    STATIONS.push(station);
    return station;
  }

  async updateStatus(
    stationId: string,
    status: StationStatus,
    _callerId: string,
    _callerGroups: string[]
  ): Promise<StationDto> {
    const station = STATIONS.find((s) => s.stationId === stationId);
    if (!station) {
      throw new Error('Station not found');
    }
    station.status = status;
    return station;
  }
}
