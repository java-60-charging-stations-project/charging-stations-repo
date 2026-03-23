import type {
  AdminCreateStationRequest,
  AdminCreateStationResponse,
  AdminDeleteStationResponse,
  AdminUpdateStationStateResponse,
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

  deleteStation(stationId: string, callerId: string): Promise<AdminDeleteStationResponse>;
}
