import {
    AdminUserDetails,
    GetUserDetailsFilters,
    ListUsersFilters,
    ListUsersResult,
    UpdateProfilePayload,
    UpdateUserEnabledPayload,
    UpdateUserRolePayload,
    UserInfo,
    UserRole,
    UsersService,
} from './users.types';

export class UsersServiceAwsLocal implements UsersService {
    async getMyInfo(_userId: string): Promise<UserInfo> {
        throw new Error('Not implemented');
    }

    async getUserById(_adminId: string, _userId: string): Promise<UserInfo | null> {
        throw new Error('Not implemented');
    }

    async listUsers(_adminId: string, _filters: ListUsersFilters): Promise<ListUsersResult> {
        throw new Error('Not implemented');
    }

    async updateOwnProfile(_userId: string, _payload: UpdateProfilePayload): Promise<void> {
        throw new Error('Not implemented');
    }

    async updateUserProfileAsAdmin(_adminId: string, _userId: string, _payload: UpdateProfilePayload): Promise<void> {
        throw new Error('Not implemented');
    }

    async deleteUser(_adminId: string, _userId: string): Promise<void> {
        throw new Error('Not implemented');
    }

    async getUserRole(_adminId: string, _userId: string): Promise<UserRole | null> {
        throw new Error('Not implemented');
    }

    async getUserDetails(
        _adminId: string,
        _userId: string,
        _filters: GetUserDetailsFilters
    ): Promise<AdminUserDetails | null> {
        throw new Error('Not implemented');
    }

    async enableUser(
        _adminId: string,
        _userId: string,
        _payload: UpdateUserEnabledPayload
    ): Promise<void> {
        throw new Error('Not implemented');
    }

    async disableUser(
        _adminId: string,
        _userId: string,
        _payload: UpdateUserEnabledPayload
    ): Promise<void> {
        throw new Error('Not implemented');
    }

    async updateUserRole(
        _adminId: string,
        _userId: string,
        _payload: UpdateUserRolePayload
    ): Promise<void> {
        throw new Error('Not implemented');
    }
}
