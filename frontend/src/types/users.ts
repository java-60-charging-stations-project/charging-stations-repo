import type { UserRole } from ".";

// Types for admin's users management system
export type UserFullType = {
    userId: string;
    email: string;
    name: string;
    createDate: string | null;
    lastModifiedDate: string | null;
    enabled: boolean;
    status: string;
    role: UserRole;
};

export type UserShortType = Omit<UserFullType, "role">;

export type UserShortListResponseType = {
    users: UserShortType[];
    paginationToken: string | undefined;
    attemptsMade?: number;
};


// Requests
export type ChangeUserRoleRequestType = {
    oldRole: UserRole;
    newRole: UserRole;
};

export type ListUsersFilterKeyType = "email" | "name";

export type ListUsersFilterType = {
    filterKey: ListUsersFilterKeyType;
    filterValue: string;
};

export type ListUsersRequestParamsType = {
    limit: number;
    filter?: ListUsersFilterType;
    paginationToken?: string;
}
