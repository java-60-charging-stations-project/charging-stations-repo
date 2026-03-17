export interface UpdateProfilePayload {
    email?: string;
    address?: string;
    phone?: string;
    role?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface UserInfo {
    userId: string;
    username: string;
    email: string;
    phone: string;
    role: string;
    status: string;
    createdAt: string | null;
    updatedAt: string | null;
}

export interface ListUsersFilters {
    role?: string;
    status?: string;
    page?: number;
    pageSize?: number;
}

export interface ListUsersResult {
    data: UserInfo[];
    totalItems: number;
}