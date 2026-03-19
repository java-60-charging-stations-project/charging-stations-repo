import { BadRequestError, ConflictError, ResourceNotFoundError } from '../../common/serviceErrors';
import type {
  AdminCreateStationRequest,
  AdminCreateStationResponse,
  AdminUpdateStationStateResponse,
  StationBase,
  StationState,
  StationsService
} from './stations.types';

const STATIONS: StationBase[] = [
  {
    id: 'st-001',
    code: 'EV-TLV-001',
    name: 'Tel Aviv Central Charging Hub',
    owner: 'Israel Charge Ltd',
    city: 'Tel Aviv',
    address: 'Dizengoff Street 100, 62038 Tel Aviv',
    phone: '+972 3 123 4567',
    email: 'support@israelcharge.co.il',
    siteTechnician: 'David Cohen',
    location: { latitude: 32.0853, longitude: 34.7818 },
    maxPowerKw: 150,
    ports: 4,
    state: 'ACTIVE',
    ratePlan: {
      currencyCode: 'ILS',
      currencyName: 'Israeli New Shekel',
      peakRate: 2.4,
      offPeakRate: 1.6
    },
    createdAt: '2024-01-15T08:30:00.000Z',
    updatedAt: '2025-03-10T14:22:00.000Z'
  },
  {
    id: 'st-002',
    code: 'EV-HFA-002',
    name: 'Haifa Port Fast Chargers',
    owner: 'Northern Power EV',
    city: 'Haifa',
    address: 'Ben Gurion Avenue 45, 35052 Haifa',
    phone: '+972 4 765 4321',
    email: null,
    siteTechnician: 'Sarah Levi',
    location: { latitude: 32.794, longitude: 34.9896 },
    maxPowerKw: 350,
    ports: 6,
    state: 'ACTIVE',
    ratePlan: {
      currencyCode: 'ILS',
      currencyName: 'Israeli New Shekel',
      peakRate: 2.6,
      offPeakRate: 1.8
    },
    createdAt: '2024-02-20T10:00:00.000Z',
    updatedAt: '2025-03-12T09:15:00.000Z'
  },
  {
    id: 'st-003',
    code: 'EV-JLM-003',
    name: 'Jerusalem Old City Station',
    owner: 'Holy Land Charge',
    city: 'Jerusalem',
    address: 'Jaffa Road 88, 94383 Jerusalem',
    phone: null,
    email: 'info@holycharge.com',
    siteTechnician: null,
    location: { latitude: 31.7683, longitude: 35.2137 },
    maxPowerKw: 120,
    ports: 2,
    state: 'INACTIVE',
    ratePlan: {
      currencyCode: 'USD',
      currencyName: 'US Dollar',
      peakRate: 0.45,
      offPeakRate: 0.28
    },
    createdAt: '2024-03-05T14:45:00.000Z',
    updatedAt: '2025-02-28T16:00:00.000Z'
  }
];

export class StationsServiceLocal implements StationsService {
  async list(_callerId: string): Promise<StationBase[]> {
    return [...STATIONS];
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
      maxPowerKw: null,
      ports: 0,
      state: 'INACTIVE',
      ratePlan: payload.ratePlan,
      createdAt: now,
      updatedAt: now
    };

    STATIONS.push(newStation);
    return { stationId: nextId };
  }

  async updateStatus(
    stationId: string,
    status: StationState,
    _callerId: string,
    _callerGroups: string[]
  ): Promise<StationBase> {
    const station = STATIONS.find((s) => s.id === stationId);
    if (!station) {
      throw new ResourceNotFoundError('Station not found');
    }
    if (station.state === status) {
      throw new BadRequestError('Station already has this status');
    }

    station.state = status;
    station.updatedAt = new Date().toISOString();
    return station;
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
}
