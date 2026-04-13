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

  getById(stationId: string, callerId: string, includePorts?: boolean): Promise<StationBase>;

  getPorts(stationId: string, callerId: string): Promise<ApiPort[]>;

  create(payload: AdminCreateStationRequest, callerId: string): Promise<AdminCreateStationResponse>;

  updateStationState(
    stationId: string,
    oldState: StationLifecycleState,
    newState: StationLifecycleState,
    callerId: string
  ): Promise<AdminUpdateStationStateResponse>;

  updateStationPorts(stationId: string, deltaPorts: number, callerId: string): Promise<AdminUpdateStationPortsResponse>;

  updatePortState(
    stationId: string,
    payload: SupportUpdatePortStateRequest,
    callerId: string
  ): Promise<SupportUpdatePortStateResponse>;

  updateStation(
    stationId: string,
    patch: AdminUpdateStationRequest,
    callerId: string
  ): Promise<AdminUpdateStationResponse>;

  addPorts(stationId: string, payload: AddPortsRequest, callerId: string): Promise<ApiPort[]>;

  deletePort(stationId: string, portId: string, callerId: string): Promise<void>;

  deleteStation(stationId: string, callerId: string): Promise<AdminDeleteStationResponse>;
}
