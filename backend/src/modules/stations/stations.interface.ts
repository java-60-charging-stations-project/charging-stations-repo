import type {
  AdminCreateStationRequest,
  AdminCreateStationResponse,
  AdminDeleteStationResponse,
  AdminUpdateStationStateResponse,
  AdminUpdateStationPortsResponse,
  StationBase,
  StationBaseCollectionResponse,
  StationState,
} from './stations.types';

export interface ListStationsParams {
  city?: string;
  owner?: string;
  state?: StationState;
  orderBy?: string;
  page?: number;
  pageSize?: number;
}

export interface StationsService {
  list(params: ListStationsParams, callerId: string): Promise<StationBaseCollectionResponse>;

  getById(stationId: string, callerId: string): Promise<StationBase>;

  create(payload: AdminCreateStationRequest, callerId: string): Promise<AdminCreateStationResponse>;

  updateStationState(
    stationId: string,
    oldState: StationState,
    newState: StationState,
    callerId: string
  ): Promise<AdminUpdateStationStateResponse>;

  updateStationPorts(stationId: string, deltaPorts: number, callerId: string): Promise<AdminUpdateStationPortsResponse>;

  deleteStation(stationId: string, callerId: string): Promise<AdminDeleteStationResponse>;
}
