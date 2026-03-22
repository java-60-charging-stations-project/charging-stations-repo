import { apiClient } from './api';
import type { ApiArrayResponse, ApiResponse } from '@/types/apiTypes';
import type { 
    AdminGetUserResponse,
    AdminUserDetailsResponse,
    AdminUserRoleResponse,
    UpdateUserRoleRequest,
} from '@/types/users';
import type { AdminChangeStationStateRequest, AdminCreateStationRequest, AdminCreateStationResponse, AdminUpdateStationStateResponse, StationBase } from '@/types/stations';

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

/** STATIONS */
export async function fetchStations(): Promise<StationBase[]> {
    const response = await apiClient.get<ApiArrayResponse<StationBase>>(
        '/admin/stations',
    );
    return response.data;
};

export async function fetchStationById(stationId: string): Promise<StationBase> {
    const response = await apiClient.get<ApiResponse<StationBase>>(
        `/admin/stations/${stationId}`,
    );
    return response.data;
};

export async function createStation(stationCreateRequest: AdminCreateStationRequest): Promise<AdminCreateStationResponse> {
    const response = await apiClient.post<ApiResponse<AdminCreateStationResponse>>(
        '/admin/stations',
        stationCreateRequest,
    );
    return response.data;
};

export async function changeStationState(stationId: string, request: AdminChangeStationStateRequest): Promise<AdminUpdateStationStateResponse> {
    const response = await apiClient.patch<ApiResponse<AdminUpdateStationStateResponse>>(
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