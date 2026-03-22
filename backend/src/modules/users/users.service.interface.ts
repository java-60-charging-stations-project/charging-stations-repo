import { AdminUserDetails, GetUserDetailsFilters, ListUsersFilters, ListUsersResult, UpdateProfilePayload, UpdateUserEnabledPayload, UpdateUserRolePayload, UserInfo, UserRole } from "./users.types";

export interface UsersService {
    getMyInfo(userId: string): Promise<UserInfo>;
    getUserById(adminId: string, userId: string): Promise<UserInfo>;
    listUsers(adminId: string, filters: ListUsersFilters): Promise<ListUsersResult>;
    updateOwnProfile(userId: string, payload: UpdateProfilePayload): Promise<void>;
    updateUserProfileAsAdmin(adminId: string, userId: string, payload: UpdateProfilePayload): Promise<void>;
    
    // COGNITO METHODS GROUP
    getUserRole(adminId: string, userId: string): Promise<UserRole>;
    getUserDetails(adminId: string, userId: string, filters: GetUserDetailsFilters): Promise<AdminUserDetails>;
    enableUser(adminId: string, userId: string, payload: UpdateUserEnabledPayload): Promise<void>;
    disableUser(adminId: string, userId: string, payload: UpdateUserEnabledPayload): Promise<void>;
    updateUserRole(adminId: string, userId: string, payload: UpdateUserRolePayload): Promise<void>;
    deleteUser(adminId: string, userId: string): Promise<void>;
}