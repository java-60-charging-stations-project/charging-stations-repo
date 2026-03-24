import { UserRole } from "../../../common/authRoles";

export type UserFull = {
    userId: string;
    username: string;
    email: string;
    name: string;
    createDate: string | null;
    lastModifiedDate: string | null;
    enabled: boolean;
    status: string;
    role: UserRole;
};

export type UserShort = Omit<UserFull, "role">;

export type AttributeName = "email" | "name";

export type ListUserFilter = {
    attributeName: AttributeName;
    attributeValue: string;
};

export type ListUserParameters = {
    limit: number;
    filter?: ListUserFilter;
    paginationToken?: string;
}
