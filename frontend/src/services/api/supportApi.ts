import type {
    ChangeStationStateRequest,
    ChangeStationStateResponse,
    StationBase,
    StationsListParams
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

export async function fetchStationById(stationId: string): Promise<StationBase> {
    const response = await apiClient.get<ApiResponse<StationBase>>(
        `/support/stations/${stationId}`,
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