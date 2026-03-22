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

export interface UserRole {
    role: string;
}

export interface AdminUserDetails {
    userId: string;
    username: string;
    email: string;
    name: string;
    createDate: string | null;
    lastModifiedDate: string | null;
    enabled: boolean;
    status: string;
    role: string;
}

export interface GetUserDetailsFilters {
    includeGroups?: boolean;
}

export interface UpdateUserEnabledPayload {
    email: string;
    updatedAt: string;
}

export interface UpdateUserRolePayload {
    email: string;
    oldRole: string;
    newRole: string;
    updatedAt: string;
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