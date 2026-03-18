import { apiClient } from './api';
import type { ApiArrayResponse, ApiResponse } from '@/types/apiTypes';
import type { AdminUser } from '@/types/responseTypes';
import type { AdminCreateStationRequest, AdminCreateStationResponse, StationBase } from '@/types/stations';

export async function fetchAdminUsers(): Promise<AdminUser[]> {
    const response = await apiClient.get<ApiArrayResponse<AdminUser>>(
        '/admin/users',
        { params: { page: 1, pageSize: 200 } },
    );
    return response.data;
}

export async function fetchAdminUserById(userId: string): Promise<AdminUser> {
    const response = await apiClient.get<ApiResponse<AdminUser>>(
        `/admin/users/${userId}`,
    );
    return response.data;
}

export async function updateUserRole(
    userId: string,
    role: string,
    updatedAt: string,
): Promise<AdminUser> {
    const response = await apiClient.patch<ApiResponse<AdminUser>>(
        `/admin/users/${userId}/role`,
        { role, updatedAt },
    );
    return response.data;
}

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