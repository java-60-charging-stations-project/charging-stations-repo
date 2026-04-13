import { apiClient } from './api';
import type { ApiArrayResponse, ApiResponse } from '@/types/apiTypes';
import type { 
    UserFullType,
    UserShortListResponseType,
    ChangeUserRoleRequestType,
    ListUsersRequestParamsType
} from '@/types/users';
import type { 
    ChangeStationStateRequest,
    AdminCreateStationRequest,
    AdminCreateStationResponse,
    AdminUpdateStationRequest,
    ChangeStationStateResponse,
    StationBase,
    StationsListParams,
    UpdateStationResponse,
} from '@/types/stations';
import { getLogger } from '@/services/logging';

const logger = getLogger("adminApi");

/** USERS */
export async function fetchAdminUsers(requestParameters: ListUsersRequestParamsType): Promise<UserShortListResponseType> {
    const {limit, paginationToken, filter} = requestParameters;
    const filterParams = filter ? { ...filter } : {};
    const paginationParams = paginationToken ? { paginationToken } : {};
    const params = {limit, ...filterParams, ...paginationParams };
    const response = await apiClient.get<ApiResponse<UserShortListResponseType>>(
        '/admin/users',
        { params },
    );
    return response.data;
}

export async function fetchAdminUserById(userId: string): Promise<UserFullType> {
    const response = await apiClient.get<ApiResponse<UserFullType>>(
        `/admin/users/${userId}`,
    );
    return response.data;
}


export async function changeUserRole(userId: string, request: ChangeUserRoleRequestType): Promise<void> {
    await apiClient.patch<ApiResponse<void>>(
        `/admin/users/${userId}/role`,
        request,
    );
};

export async function adminEnableUser(userId: string): Promise<void> {
    await apiClient.patch<ApiResponse<void>>(
        `/admin/users/${userId}/enable`,
    );
};

export async function adminDisableUser(userId: string): Promise<void> {
    await apiClient.patch<ApiResponse<void>>(
        `/admin/users/${userId}/disable`,
    );
};

export async function deleteUser(userId: string): Promise<void> {
    await apiClient.delete<ApiResponse<void>>(
        `/admin/users/${userId}`,
    );
};

/********* STATIONS *********/
export async function fetchStations(params: StationsListParams): Promise<ApiArrayResponse<StationBase>> {
    logger.debug("Fetching stations", { params });
    const response = await apiClient.get<ApiArrayResponse<StationBase>>(
        '/admin/stations',
        { params },
    );
    logger.debug("Stations fetched", { response });
    return response;
};

export async function fetchStationById(stationId: string): Promise<StationBase> {
    logger.debug("Fetching station by id", { stationId });
    const response = await apiClient.get<ApiResponse<StationBase>>(
        `/admin/stations/${stationId}`,
    );
    logger.debug("Station fetched", { response });
    return response.data;
};

export async function createStation(stationCreateRequest: AdminCreateStationRequest): Promise<AdminCreateStationResponse> {
    const response = await apiClient.post<ApiResponse<AdminCreateStationResponse>>(
        '/admin/stations',
        stationCreateRequest,
    );
    return response.data;
};

export async function updateStation(stationId: string, request: AdminUpdateStationRequest): Promise<UpdateStationResponse> {
    const response = await apiClient.patch<ApiResponse<UpdateStationResponse>>(
        `/admin/stations/${stationId}`,
        request,
    );
    return response.data;
};

export async function changeStationState(stationId: string, request: ChangeStationStateRequest): Promise<ChangeStationStateResponse> {
    const response = await apiClient.patch<ApiResponse<ChangeStationStateResponse>>(
        `/admin/stations/${stationId}/state`,
        request,
    );
    return response.data;
};

export async function deleteStation(stationId: string): Promise<void> {
    await apiClient.delete<ApiResponse<void>>(
        `/admin/stations/${stationId}`,
    );
};