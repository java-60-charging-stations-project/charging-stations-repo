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

export interface LambdaUserInfo {
    user_id?: string;
    userId?: string;
    full_name?: string | null;
    username?: string | null;
    email: string;
    phone?: string | null;
    role?: string | null;
    status?: string | null;
    created_at?: string | null;
    createdAt?: string | null;
    updated_at?: string | null;
    updatedAt?: string | null;
}

export function mapLambdaUser(raw: LambdaUserInfo): UserInfo {
    return {
        userId: raw.userId ?? raw.user_id ?? '',
        username: raw.username ?? raw.full_name ?? raw.email,
        email: raw.email,
        phone: raw.phone ?? '',
        role: raw.role ?? '',
        status: raw.status ?? '',
        createdAt: raw.createdAt ?? raw.created_at ?? null,
        updatedAt: raw.updatedAt ?? raw.updated_at ?? null,
    };
}

export function mapLambdaUsers(raw: LambdaUserInfo[]): UserInfo[] {
    return raw.map(mapLambdaUser);
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