import { AdminUserDetails, GetUserDetailsFilters, ListUsersFilters, ListUsersResult, UpdateProfilePayload, UpdateUserEnabledPayload, UpdateUserRolePayload, UserInfo, UserRole } from "./users.types";

export interface UsersService {
    getMyInfo(userId: string): Promise<UserInfo>;
    updateOwnProfile(userId: string, payload: UpdateProfilePayload): Promise<void>;
    listUsers(adminId: string, filters: ListUsersFilters): Promise<ListUsersResult>;
    getUserById(adminId: string, userId: string): Promise<UserInfo>
};