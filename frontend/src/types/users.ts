export interface AdminGetUserResponse {
    userId: string;
    email: string;
    role: string;
    username: string;
    phone: string;
    status: string;
    createdAt: string;
    updatedAt: string;
};

export interface AdminUserDetailsResponse {
    userId: string;
    username: string;
    email: string;
    name: string;
    createDate: string | null;
    lastModifiedDate: string | null;
    enabled: boolean;
    status: string;
    role: string;
};

export interface AdminUserRoleResponse {
    role: string;
};

export interface UpdateUserRoleRequest {
    email: string;
    oldRole: string;
    newRole: string;
    updatedAt: string;
};

export interface AdminChangeLockStateUserRequest {
    email: string;
    updatedAt: string | null;
};