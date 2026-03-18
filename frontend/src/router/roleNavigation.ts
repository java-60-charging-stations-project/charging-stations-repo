import type { UserRole } from "@/types";

export const LOGIN_PATH = "/login";
export const REGISTER_PATH = "/register";
export const APP_PATH = "/app";

export const ROLE_HOME: Record<UserRole, string> = {
  USER: "/user",
  ADMIN: "/admin",
  SUPPORT: "/support",
};

export function getHomePath(role: UserRole): string {
  return ROLE_HOME[role];
}