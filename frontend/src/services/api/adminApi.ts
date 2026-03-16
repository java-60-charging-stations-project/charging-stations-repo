import { apiClient } from './api';
import type { ApiArrayResponse, ApiResponse } from '@/types/apiTypes';
import type { AdminUser } from '@/types/responseTypes';

export async function fetchAdminUsers(): Promise<AdminUser[]> {
    const response = await apiClient.get<ApiArrayResponse<AdminUser>>(
        '/admin/users',
        { params: { page: 1, pageSize: 200 } },
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
