import { UserRole } from "../../../common/authRoles";
import { ListUserParameters, UserFull, UserShort } from "./types";

export interface AdminUserService {
    getUserById(userId: string): Promise<UserFull>;
    
    listUsers(parameters: ListUserParameters): Promise<UserShort>;
    
    getUserRole(userId: string): Promise<UserRole>;
    changeUserRole(userId: string, oldRole: UserRole, newRole: UserRole): Promise<void>;

    enableUser(userId: string): Promise<void>;
    disableUser(userId: string): Promise<void>;
    deleteUser(userId: string): Promise<void>;
};