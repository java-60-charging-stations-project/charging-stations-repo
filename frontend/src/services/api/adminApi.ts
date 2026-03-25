import { apiClient } from './api';
import type { ApiArrayResponse, ApiResponse } from '@/types/apiTypes';
import type { 
    AdminChangeLockStateUserRequest,
    AdminGetUserResponse,
    AdminUserDetailsResponse,
    AdminUserRoleResponse,
    UpdateUserRoleRequest,
} from '@/types/users';
import type { 
    ChangeStationStateRequest,
    AdminCreateStationRequest,
    AdminCreateStationResponse,
    ChangeStationStateResponse,
    StationBase,
    StationsListParams,
} from '@/types/stations';
import { getLogger } from '@/services/logging';

const logger = getLogger("adminApi");

/** USERS */
export async function fetchAdminUsers(): Promise<AdminGetUserResponse[]> {
    const response = await apiClient.get<ApiArrayResponse<AdminGetUserResponse>>(
        '/admin/users',
        { params: { page: 1, pageSize: 200 } },
    );
    return response.data;
}

export async function fetchAdminUserById(userId: string): Promise<AdminGetUserResponse> {
    const response = await apiClient.get<ApiResponse<AdminGetUserResponse>>(
        `/admin/users/${userId}`,
    );
    return response.data;
}

export async function fetchAdminUserDetails(userId: string): Promise<AdminUserDetailsResponse> {
    const response = await apiClient.get<ApiResponse<AdminUserDetailsResponse>>(
        `/admin/users/${userId}/details`,
    );
    return response.data;
}

export async function fetchAdminUserRole(userId: string): Promise<AdminUserRoleResponse> {
    const response = await apiClient.get<ApiResponse<AdminUserRoleResponse>>(
        `/admin/users/${userId}/role`,
    );
    return response.data;
}

export async function updateUserRole(userId: string, request: UpdateUserRoleRequest): Promise<void> {
    await apiClient.patch<ApiResponse<void>>(
        `/admin/users/${userId}/role`,
        request,
    );
};

export async function adminEnableUser(userId: string, request:AdminChangeLockStateUserRequest): Promise<void> {
    await apiClient.patch<ApiResponse<void>>(
        `/admin/users/${userId}/enable`,
        request,
    );
};

export async function adminDisableUser(userId: string, request:AdminChangeLockStateUserRequest): Promise<void> {
    await apiClient.patch<ApiResponse<void>>(
        `/admin/users/${userId}/disable`,
        request,
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

export async function changeStationState(stationId: string, request: ChangeStationStateRequest): Promise<ChangeStationStateResponse> {
    const response = await apiClient.patch<ApiResponse<ChangeStationStateResponse>>(
        `/admin/stations/${stationId}/state`,
        request,
    );
    return response.data;
};

export async function addStationPorts(stationId: string, deltaPorts: number): Promise<{ updatedAt: string; ports: number; occupiedPorts: number; }> {
    const response = await apiClient.patch<ApiResponse<{ updatedAt: string; ports: number; occupiedPorts: number; }>>(
        `/admin/stations/${stationId}/ports`,
        { deltaPorts },
    );
    return response.data;
};

export async function deleteStation(stationId: string): Promise<void> {
    await apiClient.delete<ApiResponse<void>>(
        `/admin/stations/${stationId}`,
    );
};