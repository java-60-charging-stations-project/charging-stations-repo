export type StationStatus = 'NEW' | 'READY' | 'IN_USE' | 'OUT_OF_SERVICE' | 'TO_REMOVE';

export interface StationDto {
  stationId: string;
  name: string;
  lat?: number; // широта
  lng?: number; // долгота
  ports?: number;
  freePorts?: number;
  address?: string;
  status?: StationStatus;
}

export interface StationsService {
  list(callerId: string): Promise<StationDto[]>;
  getById(stationId: string, callerId: string): Promise<StationDto | null>;
  create(payload: Omit<StationDto, 'stationId' | 'status'>, callerId: string): Promise<StationDto>;
  updateStatus(
    stationId: string,
    status: StationStatus,
    callerId: string,
    callerGroups: string[]
  ): Promise<StationDto>;
}

