import { UserRole } from "../../../common/authRoles";
import { ChangeRoleParameters, ListUserParameters, UserFull, UserShort, UsersListResponse } from "./types";

export interface AdminUserService {
    getUserById(userId: string): Promise<UserFull>;
    
    listUsers(parameters: ListUserParameters): Promise<UsersListResponse>;
    
    getUserRole(userId: string): Promise<UserRole>;
    changeUserRole(parameters: ChangeRoleParameters): Promise<void>;

    enableUser(userId: string): Promise<void>;
    disableUser(userId: string): Promise<void>;
    deleteUser(userId: string): Promise<void>;
};