import { ListUsersFilters, ListUsersResult, UpdateProfilePayload, UserInfo, UsersService } from './users.types';

export class UsersServiceLocal implements UsersService {
    async getMyInfo(userId: string): Promise<UserInfo> {
        return {} as UserInfo;
    }

    async getUserById(_adminId: string, _userId: string): Promise<UserInfo | null> {
        return {} as UserInfo;
    }

    async listUsers(_adminId: string, _filters: ListUsersFilters): Promise<ListUsersResult> {
    return {
        data: [],
        totalItems: 0,
    };
    }

    async updateOwnProfile(_userId: string, _payload: UpdateProfilePayload): Promise<void> {}

    async updateUserProfileAsAdmin(_adminId: string, _userId: string, _payload: UpdateProfilePayload): Promise<void> {}

    async updateUserRole(_adminId: string, _userId: string, _role: string): Promise<void> {}

    async deleteUser(_adminId: string, _userId: string): Promise<void> {}
}