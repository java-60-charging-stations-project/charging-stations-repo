import type {
    AdminUpdateStationRequest,
    ChangeStationStateRequest,
    ChangeStationStateResponse,
    StationBase,
    StationPort,
    StationPortCreate,
    StationPortsCreateRequest,
    StationPortsCreateResponse,
    StationPortsListResponse,
    StationsListParams,
    SupportUpdatePortStateRequest,
    SupportUpdatePortStateResponse,
    UpdateStationResponse,
} from '@/types/stations';
import { apiClient } from './api';
import type { ApiArrayResponse, ApiResponse } from '@/types/apiTypes';

/** STATIONS */
export async function fetchStations(params: StationsListParams): Promise<ApiArrayResponse<StationBase>> {
    const response = await apiClient.get<ApiArrayResponse<StationBase>>(
        '/support/stations',
        { params },
    );
    return response;
};

export async function fetchStationById(stationId: string, includePorts: boolean = false): Promise<StationBase> {
    const response = await apiClient.get<ApiResponse<StationBase>>(
        `/support/stations/${stationId}`,
        { params: { includePorts } },
    );
    return response.data;
};

export async function updateStation(stationId: string, request: AdminUpdateStationRequest): Promise<UpdateStationResponse> {
    const response = await apiClient.patch<ApiResponse<UpdateStationResponse>>(
        `/support/stations/${stationId}`,
        request,
    );
    return response.data;
};

export async function updateStationPortState(stationId: string, request: SupportUpdatePortStateRequest): Promise<SupportUpdatePortStateResponse> {
    const response = await apiClient.patch<ApiResponse<SupportUpdatePortStateResponse>>(
        `/support/stations/${stationId}/ports/state`,
        request,
    );
    return response.data;
};

export async function changeStationState(stationId: string, request: ChangeStationStateRequest): Promise<ChangeStationStateResponse> {
    const response = await apiClient.patch<ApiResponse<ChangeStationStateResponse>>(
        `/support/stations/${stationId}/state`,
        request,
    );
    return response.data;
};

export async function addStationPorts(stationId: string, ports: StationPortCreate[]): Promise<StationPort[]> {
    const body: StationPortsCreateRequest = { ports };
    const response = await apiClient.post<ApiResponse<StationPortsCreateResponse>>(
        `/support/stations/${stationId}/ports`,
        body,
    );
    return response.data.ports;
};

export async function fetchStationPorts(stationId: string): Promise<StationPort[]> {
    const response = await apiClient.get<ApiResponse<StationPortsListResponse>>(
        `/support/stations/${stationId}/ports`,
    );
    return response.data.ports;
};

export async function deleteStationPort(stationId: string, portId: string): Promise<void> {
    await apiClient.delete<void>(
        `/support/stations/${stationId}/ports/${portId}`,
    );
};