export const ADMIN_GROUP = 'ADMIN';
export const SUPPORT_GROUP = 'SUPPORT';

export type UserRole = "ADMIN" | "SUPPORT" | "USER";

export function getGroupByRole(role: UserRole): string | null {
    if (role == "ADMIN") {
        return ADMIN_GROUP;
    }
    else if (role == "SUPPORT") {
        return SUPPORT_GROUP;
    }
    return null;
};