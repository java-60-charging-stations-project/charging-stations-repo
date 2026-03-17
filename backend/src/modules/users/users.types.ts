export interface UsersService {
    getMyInfo(userId: string): Promise<UserInfo>;
    getUserById(adminId: string, userId: string): Promise<UserInfo | null>;
    listUsers(adminId: string, filters: ListUsersFilters): Promise<ListUsersResult>;
    updateOwnProfile(userId: string, payload: UpdateProfilePayload): Promise<void>;
    updateUserProfileAsAdmin(adminId: string, userId: string, payload: UpdateProfilePayload): Promise<void>;
    updateUserRole(adminId: string, userId: string, role: string): Promise<void>;
    deleteUser(adminId: string, userId: string): Promise<void>;
}

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